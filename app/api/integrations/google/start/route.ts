import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (error || typeof userId !== "string") return NextResponse.redirect(new URL("/login", request.url), 303);

  const required = ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REDIRECT_URI", "EMAIL_TOKEN_ENCRYPTION_KEY"];
  if (required.some((key) => !process.env[key])) return NextResponse.redirect(new URL("/dashboard/integrations?error=configuration", request.url), 303);
  const { data: memberships } = await supabase.from("organization_memberships").select("organization_id,role").eq("user_id", userId).in("role", ["agency_owner", "agency_admin", "contractor_owner"]).limit(1);
  if (!memberships?.[0]) return NextResponse.redirect(new URL("/dashboard/integrations?error=no_workspace", request.url), 303);

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: "code",
    scope: "openid email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const response = NextResponse.redirect("https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(), 303);
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 };
  response.cookies.set("gmail_oauth_state", state, options);
  response.cookies.set("gmail_oauth_verifier", verifier, options);
  response.cookies.set("gmail_oauth_org", memberships[0].organization_id, options);
  return response;
}
