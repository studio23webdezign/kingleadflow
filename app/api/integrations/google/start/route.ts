import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CONNECT_ROLES = ["agency_owner", "agency_admin", "contractor_owner"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (error || typeof userId !== "string") {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const required = [
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "GOOGLE_OAUTH_REDIRECT_URI",
    "EMAIL_TOKEN_ENCRYPTION_KEY",
  ];
  if (required.some((key) => !process.env[key]?.trim())) {
    return NextResponse.redirect(new URL("/dashboard/integrations?error=configuration", request.url), 303);
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id,role")
    .eq("user_id", userId)
    .in("role", CONNECT_ROLES)
    .limit(1);
  if (membershipError || !memberships?.[0]) {
    return NextResponse.redirect(new URL("/dashboard/integrations?error=no_workspace", request.url), 303);
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: "code",
    scope: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const response = NextResponse.redirect(
    "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(),
    303,
  );
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  response.cookies.set("gmail_oauth_state", state, cookieOptions);
  response.cookies.set("gmail_oauth_verifier", verifier, cookieOptions);
  response.cookies.set("gmail_oauth_org", memberships[0].organization_id, cookieOptions);
  return response;
}
