/* eslint-disable @typescript-eslint/no-explicit-any -- Gmail tables are introduced by this branch migration and are not yet present in generated Supabase database types. */

import "server-only";

import { decryptMailboxTokens, encryptMailboxTokens } from "@/lib/integrations/email/crypto";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["agency_owner", "agency_admin", "contractor_owner"];
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

type StoredTokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope: string;
};

type GmailThreadList = {
  threads?: Array<{ id: string; historyId?: string; snippet?: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
};
type GmailHistoryList = {
  history?: Array<{ id: string; messagesAdded?: Array<{ message?: { id?: string; threadId?: string } }> }>;
  historyId?: string;
  nextPageToken?: string;
};
type GmailProfile = { emailAddress?: string; historyId?: string };

export class GmailIntegrationError extends Error {
  constructor(
    message: string,
    readonly code: "not_connected" | "reauthorization_required" | "provider_error" | "invalid_response",
  ) {
    super(message);
    this.name = "GmailIntegrationError";
  }
}

/** Resolves a mailbox only after checking the signed-in user's workspace role. */
async function loadConnection(organizationId: string) {
  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") {
    throw new GmailIntegrationError("Sign in again to access Gmail.", "not_connected");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .in("role", ADMIN_ROLES)
    .maybeSingle();
  if (membershipError || !membership) {
    throw new GmailIntegrationError("You do not have permission to access this mailbox.", "not_connected");
  }

  const db = supabase as any;
  const { data: connection, error } = await db
    .from("email_connections")
    .select("id,organization_id,provider_email,encrypted_tokens,status,last_sync_history_id")
    .eq("organization_id", organizationId)
    .eq("provider", "google")
    .eq("status", "connected")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !connection) {
    throw new GmailIntegrationError("No Gmail mailbox is connected to this workspace.", "not_connected");
  }
  return { supabase, connection, userId };
}

/** Refreshes credentials server-side; encrypted tokens never leave this module. */
export async function getGoogleAccessToken(organizationId: string): Promise<string> {
  const { supabase, connection } = await loadConnection(organizationId);
  let tokens: StoredTokens;
  try {
    tokens = decryptMailboxTokens(connection.encrypted_tokens);
  } catch {
    throw new GmailIntegrationError("The saved Gmail credentials could not be read.", "reauthorization_required");
  }

  if (tokens.expires_at > Date.now() + 60_000) return tokens.access_token;
  if (!tokens.refresh_token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_connections is not yet in generated DB types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_connections is not yet in generated DB types.
    await (supabase as any).from("email_connections")
      .update({ status: "reauthorization_required" })
      .eq("id", connection.id);
    throw new GmailIntegrationError("Reconnect Gmail to continue.", "reauthorization_required");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    await (supabase as any).from("email_connections")
      .update({ status: "reauthorization_required" })
      .eq("id", connection.id);
    throw new GmailIntegrationError("Google rejected the refresh token. Reconnect Gmail.", "reauthorization_required");
  }

  const refreshed = await response.json() as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!refreshed.access_token || refreshed.token_type?.toLowerCase() !== "bearer") {
    throw new GmailIntegrationError("Google returned an invalid token response.", "invalid_response");
  }

  const updatedTokens: StoredTokens = {
    access_token: refreshed.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
    scope: refreshed.scope ?? tokens.scope,
  };
  const { error: updateError } = await (supabase as any)
    .from("email_connections")
    .update({ encrypted_tokens: encryptMailboxTokens(updatedTokens) })
    .eq("id", connection.id);
  if (updateError) throw new GmailIntegrationError("Could not persist refreshed Gmail credentials.", "provider_error");
  return updatedTokens.access_token;
}

export async function listGmailThreads(input: {
  organizationId: string;
  pageToken?: string;
  maxResults?: number;
  query?: string;
}) {
  const accessToken = await getGoogleAccessToken(input.organizationId);
  const params = new URLSearchParams({
    maxResults: String(Math.min(Math.max(input.maxResults ?? 20, 1), 50)),
  });
  if (input.pageToken) params.set("pageToken", input.pageToken);
  if (input.query) params.set("q", input.query);

  const response = await fetch(`${GMAIL_API}/threads?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GmailIntegrationError("Gmail access needs to be renewed.", "reauthorization_required");
    }
    throw new GmailIntegrationError("Gmail could not load the mailbox threads.", "provider_error");
  }
  const result = await response.json() as GmailThreadList;
  return {
    threads: (result.threads ?? []).map((thread) => ({
      id: thread.id,
      snippet: thread.snippet ?? "",
      historyId: thread.historyId ?? null,
    })),
    nextPageToken: result.nextPageToken ?? null,
    resultSizeEstimate: result.resultSizeEstimate ?? 0,
  };
}

type GmailHeader = { name: string; value: string };
type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};
type GmailMessage = {
  id: string;
  threadId: string;
  internalDate?: string;
  snippet?: string;
  labelIds?: string[];
  payload?: { headers?: GmailHeader[]; mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
};
type GmailThread = { id: string; messages?: GmailMessage[] };

function decodeBody(data?: string): string | null {
  if (!data) return null;
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return null;
  }
}

function collectBodies(part?: GmailPart): { text: string | null; html: string | null } {
  if (!part) return { text: null, html: null };
  const own = decodeBody(part.body?.data);
  let text = part.mimeType === "text/plain" ? own : null;
  let html = part.mimeType === "text/html" ? own : null;
  for (const child of part.parts ?? []) {
    const nested = collectBodies(child);
    text ??= nested.text;
    html ??= nested.html;
  }
  return { text, html };
}

function parseMailbox(value: string): { name: string | null; email: string } {
  const match = value.match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
  if (match) return { name: match[1]?.trim() || null, email: match[2].trim().toLowerCase() };
  return { name: null, email: value.trim().toLowerCase() };
}

function splitAddresses(value: string): Array<{ name: string | null; email: string }> {
  return value.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((item) => parseMailbox(item)).filter((item) => item.email.includes("@"));
}

function headerValue(headers: GmailHeader[], name: string): string {
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Fetch and idempotently upsert a bounded batch of Gmail messages for one workspace. */
export async function syncGmailMessages(input: {
  organizationId: string;
  maxThreads?: number;
  query?: string;
}) {
  const { supabase, connection } = await loadConnection(input.organizationId);
  const accessToken = await getGoogleAccessToken(input.organizationId);
  const maxThreads = Math.min(Math.max(Math.floor(input.maxThreads ?? 15), 1), 25);
  const threadIds = new Set<string>();
  let syncMode: "initial" | "incremental" | "search" = input.query ? "search" : "initial";
  let candidateHistoryId: string | null = null;
  let historyPageToken: string | undefined;
  let historyExpired = false;

  // Gmail history cursors are valid only for a limited period. A 404 means
  // the cursor expired; recover with a bounded recent-thread import.
  if (connection.last_sync_history_id && !input.query) {
    syncMode = "incremental";
    do {
      const params = new URLSearchParams({ startHistoryId: connection.last_sync_history_id, historyTypes: "messageAdded" });
      if (historyPageToken) params.set("pageToken", historyPageToken);
      const response = await fetch(`${GMAIL_API}/history?${params.toString()}`, {
        headers: { authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (response.status === 404) { historyExpired = true; break; }
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new GmailIntegrationError("Gmail access needs to be renewed.", "reauthorization_required");
        throw new GmailIntegrationError("Gmail could not read mailbox history.", "provider_error");
      }
      const page = await response.json() as GmailHistoryList;
      candidateHistoryId = page.historyId ?? candidateHistoryId;
      for (const event of page.history ?? []) {
        for (const added of event.messagesAdded ?? []) {
          if (added.message?.threadId) threadIds.add(added.message.threadId);
        }
      }
      historyPageToken = page.nextPageToken;
    } while (historyPageToken);
  }

  if (!connection.last_sync_history_id || input.query || historyExpired) {
    syncMode = input.query ? "search" : "initial";
    // Capture the baseline before listing threads so arrivals during import
    // are picked up by the next History API pass.
    const profileResponse = await fetch(`${GMAIL_API}/profile`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (profileResponse.ok) {
      const profile = await profileResponse.json() as GmailProfile;
      candidateHistoryId = profile.historyId ?? null;
    } else if (profileResponse.status === 401 || profileResponse.status === 403) {
      throw new GmailIntegrationError("Gmail access needs to be renewed.", "reauthorization_required");
    } else {
      throw new GmailIntegrationError("Gmail could not establish a synchronization checkpoint.", "provider_error");
    }
    const params = new URLSearchParams({ maxResults: String(maxThreads) });
    if (input.query) params.set("q", input.query);
    const response = await fetch(`${GMAIL_API}/threads?${params.toString()}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new GmailIntegrationError("Gmail access needs to be renewed.", "reauthorization_required");
      throw new GmailIntegrationError("Gmail could not list threads for synchronization.", "provider_error");
    }
    const list = await response.json() as GmailThreadList;
    for (const item of (list.threads ?? []).slice(0, maxThreads)) threadIds.add(item.id);
  }
  const threadsToFetch = [...threadIds];
  let saved = 0;
  let failedThreads = 0;

  for (const threadId of threadsToFetch) {
    const threadResponse = await fetch(`${GMAIL_API}/threads/${encodeURIComponent(threadId)}?format=full`, {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!threadResponse.ok) {
      failedThreads += 1;
      continue;
    }
    const thread = await threadResponse.json() as GmailThread;
    const rows = (thread.messages ?? []).map((message) => {
      const headers = message.payload?.headers ?? [];
      const from = parseMailbox(headerValue(headers, "From"));
      const to = splitAddresses(headerValue(headers, "To"));
      const bodies = collectBodies(message.payload);
      const internalDate = message.internalDate ? Number(message.internalDate) : NaN;
      return {
        organization_id: input.organizationId,
        email_connection_id: connection.id,
        provider_message_id: message.id,
        provider_thread_id: message.threadId || thread.id,
        subject: headerValue(headers, "Subject"),
        from_name: from.name,
        from_email: from.email,
        to_addresses: to,
        snippet: message.snippet ?? "",
        text_body: bodies.text,
        html_body: bodies.html,
        received_at: Number.isFinite(internalDate) ? new Date(internalDate).toISOString() : null,
        internal_date_ms: Number.isFinite(internalDate) ? Math.trunc(internalDate) : null,
        label_ids: message.labelIds ?? [],
        synced_at: new Date().toISOString(),
      };
    });
    if (!rows.length) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- gmail_messages is introduced by this branch migration.
    const { error } = await (supabase as any).from("gmail_messages").upsert(rows, {
      onConflict: "email_connection_id,provider_message_id",
    });
    if (error) {
      failedThreads += 1;
      continue;
    }
    saved += rows.length;
  }

  // Link only exact, unique email matches inside this contractor workspace.
  // Ambiguous matches are deliberately left unlinked for a human to resolve.
  const { data: workspaceLeads } = await supabase
    .from("leads")
    .select("id,email,contractor_organization_id")
    .eq("contractor_organization_id", input.organizationId)
    .not("email", "is", null);

  const leadByEmail = new Map<string, Array<{ id: string }>>();
  for (const lead of workspaceLeads ?? []) {
    const email = lead.email?.trim().toLowerCase();
    if (!email) continue;
    const matches = leadByEmail.get(email) ?? [];
    matches.push({ id: lead.id });
    leadByEmail.set(email, matches);
  }

  const { data: syncedRows } = await (supabase as any)
    .from("gmail_messages")
    .select("id,provider_message_id,from_email,to_addresses,subject,received_at,lead_id")
    .eq("email_connection_id", connection.id)
    .is("lead_id", null)
    .order("received_at", { ascending: false })
    .limit(250);

  let linkedMessages = 0;
  for (const message of syncedRows ?? []) {
    const sender = String(message.from_email ?? "").trim().toLowerCase();
    const recipients = Array.isArray(message.to_addresses)
      ? message.to_addresses.map((entry: { email?: string } | string) =>
          (typeof entry === "string" ? entry : entry?.email ?? "").trim().toLowerCase())
      : [];
    const senderMatches = leadByEmail.get(sender) ?? [];
    const recipientMatches = recipients.flatMap((email: string) => leadByEmail.get(email) ?? []);
    const uniqueCandidates = [...new Map([...senderMatches, ...recipientMatches].map((lead) => [lead.id, lead])).values()];
    if (uniqueCandidates.length !== 1) continue;

    const lead = uniqueCandidates[0];
    const { error: linkError } = await (supabase as any)
      .from("gmail_messages")
      .update({ lead_id: lead.id })
      .eq("id", message.id)
      .is("lead_id", null);
    if (linkError) continue;

    const eventType = senderMatches.length === 1 ? "email_received" : "email_sent";
    const { data: existingEvent } = await supabase
      .from("lead_events")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("event_type", eventType)
      .contains("payload", { gmail_message_id: message.provider_message_id })
      .limit(1)
      .maybeSingle();
    if (!existingEvent) {
      const { error: eventError } = await supabase.from("lead_events").insert({
        contractor_organization_id: input.organizationId,
        lead_id: lead.id,
        event_type: eventType,
        payload: { source: "gmail", gmail_message_id: message.provider_message_id, subject: message.subject ?? "", received_at: message.received_at, mailbox: connection.provider_email },
      });
      if (!eventError) linkedMessages += 1;
    }
  }

  // Incremental sync uses the latest historyId from the final history page.


  const checkpointUpdate: Record<string, unknown> = { last_sync_at: new Date().toISOString() };
  // Never advance the history cursor if any thread failed; the next run will retry it.
  if (candidateHistoryId && failedThreads === 0) checkpointUpdate.last_sync_history_id = candidateHistoryId;
  const { error: checkpointError } = await (supabase as any)
    .from("email_connections")
    .update(checkpointUpdate)
    .eq("id", connection.id);
  if (checkpointError) {
    throw new GmailIntegrationError("Messages were synced, but the sync checkpoint could not be saved.", "provider_error");
  }

  return {
    syncMode,
    syncedMessages: saved,
    linkedMessages,
    failedThreads,
    threadsProcessed: threadsToFetch.length,
    historyCursorReset: historyExpired,
    lastSyncAt: new Date().toISOString(),
  };
}


/** Sends one plain-text message only after the authenticated route has recorded explicit approval. */
export async function sendGoogleMessage(input: {
  organizationId: string;
  to: string;
  subject: string;
  textBody: string;
}) {
  const { connection } = await loadConnection(input.organizationId);
  const accessToken = await getGoogleAccessToken(input.organizationId);
  const safeTo = input.to.trim();
  const safeSubject = input.subject.replace(/[\\r\\n]+/g, " ").trim();
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(safeTo) || /[\\r\\n]/.test(safeTo)) {
    throw new GmailIntegrationError("Enter one valid recipient email address.", "invalid_response");
  }
  if (!safeSubject || !input.textBody.trim()) {
    throw new GmailIntegrationError("A subject and message are required.", "invalid_response");
  }
  const mime = [
    `To: ${safeTo}`,
    `Subject: =?UTF-8?B?${Buffer.from(safeSubject, "utf8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    input.textBody.replace(/\\r?\\n/g, "\\r\\n"),
  ].join("\\r\\n");
  const raw = Buffer.from(mime, "utf8").toString("base64url");
  const response = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ raw, ...(input.threadId && input.inReplyTo ? { threadId: input.threadId } : {}) }),
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GmailIntegrationError("Gmail access needs to be renewed.", "reauthorization_required");
    }
    throw new GmailIntegrationError("Gmail did not accept the message.", "provider_error");
  }
  const result = await response.json() as { id?: string; threadId?: string };
  if (!result.id) throw new GmailIntegrationError("Gmail returned no message ID.", "invalid_response");
  return { providerMessageId: result.id, providerThreadId: result.threadId ?? null, mailbox: connection.provider_email };
}
