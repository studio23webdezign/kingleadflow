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
