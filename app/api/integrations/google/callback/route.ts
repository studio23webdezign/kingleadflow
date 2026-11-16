import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptMailboxTokens } from "@/lib/integrations/email/crypto";

export const runtime = "nodejs";

const CONNECT_ROLES = ["agency_owner", "agency_admin", "contractor_owner"];
const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

function fail(request: NextRequest, reason: string) {
  const response = NextResponse.redirect(
    new URL("/dashboard/integrations?error=" + encodeURIComponent(reason), request.url),
  );
  for (const key of ["gmail_oauth_state", "gmail_oauth_verifier", "gmail_oauth_org"]) {
    response.cookies.delete(key);
  }
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("gmail_oauth_state")?.value;
  const verifier = request.cookies.get("gmail_oauth_verifier")?.value;
  const organizationId = request.cookies.get("gmail_oauth_org")?.value;

  if (request.nextUrl.searchParams.get("error")) return fail(request, "consent_denied");
  if (!code || !state || !expectedState || state !== expectedState || !verifier || !organizationId) {
    return fail(request, "invalid_state");
  }

  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (authError || typeof userId !== "string") return fail(request, "session_expired");

  // Re-check both tenant membership and the role at callback time. A role may
  // have changed while the user was on Google's consent screen.
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .in("role", CONNECT_ROLES)
    .maybeSingle();
  if (membershipError || !membership) return fail(request, "workspace_access");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) return fail(request, "token_exchange");

  const tokens = await tokenResponse.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
  if (!tokens.access_token || !tokens.refresh_token || tokens.token_type?.toLowerCase() !== "bearer") {
    return fail(request, "missing_refresh_token");
  }
  const grantedScopes = (tokens.scope ?? "").split(" ").filter(Boolean);
  if (!REQUIRED_SCOPES.every((scope) => grantedScopes.includes(scope))) {
    return fail(request, "missing_permissions");
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: "Bearer " + tokens.access_token },
    cache: "no-store",
  });
  if (!profileResponse.ok) return fail(request, "profile_lookup");
  const profile = await profileResponse.json() as { email?: string; sub?: string };
  if (!profile.email || !profile.sub) return fail(request, "profile_invalid");

  let encryptedTokens: string;
  try {
    encryptedTokens = encryptMailboxTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      scope: grantedScopes.join(" "),
    });
  } catch {
    return fail(request, "encryption_configuration");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_connections is introduced by this branch migration and is not yet in generated DB types.\n  const db = supabase as any;
  const { error: saveError } = await db.from("email_connections").upsert({
    organization_id: organizationId,
    connected_by: userId,
    provider: "google",
    provider_account_id: profile.sub,
    provider_email: profile.email,
    encrypted_tokens: encryptedTokens,
    granted_scopes: grantedScopes,
    status: "connected",
    connected_at: new Date().toISOString(),
  }, { onConflict: "organization_id,provider,provider_account_id" });
  if (saveError) return fail(request, "save_connection");

  const response = NextResponse.redirect(
    new URL("/dashboard/integrations?status=connected", request.url),
  );
  for (const key of ["gmail_oauth_state", "gmail_oauth_verifier", "gmail_oauth_org"]) {
    response.cookies.delete(key);
  }
  return response;
}
