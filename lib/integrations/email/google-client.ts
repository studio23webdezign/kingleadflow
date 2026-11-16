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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email tables are introduced by this branch migration and are not yet in generated DB types.
  const db = supabase as any;
  const { data: connection, error } = await db
    .from("email_connections")
    .select("id,organization_id,encrypted_tokens,status")
    .eq("organization_id", organizationId)
    .eq("provider", "google")
    .eq("status", "connected")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !connection) {
    throw new GmailIntegrationError("No Gmail mailbox is connected to this workspace.", "not_connected");
  }
  return { supabase, connection };
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_connections is not yet in generated DB types.
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
  const listParams = new URLSearchParams({ maxResults: String(maxThreads) });
  if (input.query) listParams.set("q", input.query);

  const listResponse = await fetch(`${GMAIL_API}/threads?${listParams}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!listResponse.ok) {
    if (listResponse.status === 401 || listResponse.status === 403) {
      throw new GmailIntegrationError("Gmail access needs to be renewed.", "reauthorization_required");
    }
    throw new GmailIntegrationError("Gmail could not list threads for synchronization.", "provider_error");
  }
  const list = await listResponse.json() as GmailThreadList;
  let saved = 0;
  let failedThreads = 0;

  for (const item of (list.threads ?? []).slice(0, maxThreads)) {
    const threadResponse = await fetch(`${GMAIL_API}/threads/${encodeURIComponent(item.id)}?format=full`, {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_connections is not yet in generated DB types.
  const { error: checkpointError } = await (supabase as any)
    .from("email_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", connection.id);
  if (checkpointError) {
    throw new GmailIntegrationError("Messages were synced, but the sync timestamp could not be saved.", "provider_error");
  }

  return {
    syncedMessages: saved,
    failedThreads,
    threadsProcessed: (list.threads ?? []).length,
    nextPageToken: list.nextPageToken ?? null,
    lastSyncAt: new Date().toISOString(),
  };
}
