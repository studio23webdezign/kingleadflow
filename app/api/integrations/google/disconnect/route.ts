import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { decryptMailboxTokens } from "@/lib/integrations/email/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ organizationId: z.string().uuid() });
const ADMIN_ROLES = ["agency_owner", "agency_admin", "contractor_owner"];

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid workspace is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (claimsError || typeof userId !== "string") {
    return NextResponse.json({ error: "Sign in again before disconnecting Gmail." }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", userId)
    .in("role", ADMIN_ROLES)
    .maybeSingle();
  if (membershipError || !membership) {
    return NextResponse.json({ error: "You do not have permission to disconnect this mailbox." }, { status: 403 });
  }

  // Gmail tables are introduced by this branch migration and are not yet in generated Supabase types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient();
  const { data: connection, error: connectionError } = await db
    .from("email_connections")
    .select("id,encrypted_tokens")
    .eq("organization_id", parsed.data.organizationId)
    .eq("provider", "google")
    .eq("status", "connected")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (connectionError || !connection) {
    return NextResponse.json({ error: "No connected Gmail mailbox was found." }, { status: 404 });
  }

  let revocationToken: string | null = null;
  try {
    const tokens = decryptMailboxTokens(connection.encrypted_tokens);
    revocationToken = tokens.refresh_token || tokens.access_token || null;
  } catch {
    // Local disconnection must still be possible if a legacy token cannot be decrypted.
  }

  // Remove local access first. Provider revocation is best-effort because a
  // network failure must never leave a mailbox active in this workspace.
  const { error: updateError } = await db
    .from("email_connections")
    .update({
      status: "disconnected",
      encrypted_tokens: "",
      last_sync_history_id: null,
      last_sync_at: null,
    })
    .eq("id", connection.id)
    .eq("organization_id", parsed.data.organizationId);

  if (updateError) {
    return NextResponse.json({ error: "Gmail could not be disconnected locally. No provider revocation was attempted." }, { status: 500 });
  }

  let providerRevoked = false;
  if (revocationToken) {
    try {
      const response = await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: revocationToken }),
        cache: "no-store",
      });
      providerRevoked = response.ok;
    } catch {
      providerRevoked = false;
    }
  }

  return NextResponse.json({
    ok: true,
    providerRevoked,
    message: providerRevoked
      ? "Gmail disconnected and Google access revoked."
      : "Gmail disconnected in this workspace. Google access could not be revoked automatically; remove KING LEADFLOW AI from your Google Account third-party access settings.",
  });
}
