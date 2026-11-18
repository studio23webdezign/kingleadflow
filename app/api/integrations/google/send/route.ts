/* eslint-disable @typescript-eslint/no-explicit-any -- email audit table is introduced by this branch migration. */

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { GmailIntegrationError, sendGoogleMessage } from "@/lib/integrations/email/google-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  organizationId: z.string().uuid(),
  approvalRequestId: z.string().uuid(),
  to: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(998),
  textBody: z.string().trim().min(1).max(100000),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),
  confirmRecipient: z.literal(true),
  confirmSend: z.literal(true),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirm the recipient and message before sending.", code: "invalid_request" }, { status: 400 });
  }

  const input = parsed.data;
  if ((input.threadId && !input.inReplyTo) || (input.inReplyTo && !input.threadId) || (input.inReplyTo && /[\r\n]/.test(input.inReplyTo))) {
    return NextResponse.json({ error: "The reply thread reference is invalid.", code: "invalid_thread" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  const actorUserId = claims?.claims?.sub;
  if (claimsError || typeof actorUserId !== "string") {
    return NextResponse.json({ error: "Sign in again before sending email." }, { status: 401 });
  }

  const db = supabase as any;
  const { data: connection, error: connectionError } = await db
    .from("email_connections")
    .select("id,organization_id")
    .eq("organization_id", input.organizationId)
    .eq("provider", "google")
    .eq("status", "connected")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (connectionError || !connection) {
    return NextResponse.json({ error: "No connected Gmail mailbox is available for this workspace." }, { status: 409 });
  }

  const bodyHash = createHash("sha256").update(input.textBody, "utf8").digest("hex");
  const { data: audit, error: auditError } = await db.from("email_send_audit").insert({
    approval_request_id: input.approvalRequestId,
    organization_id: input.organizationId,
    email_connection_id: connection.id,
    actor_user_id: actorUserId,
    recipient_email: input.to,
    subject: input.subject,
    body_sha256: bodyHash,
    status: "approved",
  }).select("id").single();

  if (auditError || !audit) {
    const duplicate = auditError?.code === "23505";
    return NextResponse.json({
      error: duplicate ? "This approval has already been submitted. Check the mailbox before trying again." : "The approval could not be recorded; no email was sent.",
      code: duplicate ? "duplicate_approval" : "audit_failed",
    }, { status: duplicate ? 409 : 500 });
  }

  try {
    const sent = await sendGoogleMessage({
      organizationId: input.organizationId,
      to: input.to,
      subject: input.subject,
      textBody: input.textBody,
      threadId: input.threadId,
      inReplyTo: input.inReplyTo,
    });
    const { error: outcomeError } = await db.from("email_send_audit").update({
      status: "sent",
      provider_message_id: sent.providerMessageId,
      sent_at: new Date().toISOString(),
    }).eq("id", audit.id);
    if (outcomeError) {
      return NextResponse.json({ error: "Gmail accepted the message, but the audit outcome could not be saved. Do not resend until you check Sent mail.", code: "audit_outcome_failed" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, providerMessageId: sent.providerMessageId, mailbox: sent.mailbox });
  } catch (error) {
    const code = error instanceof GmailIntegrationError ? error.code : "provider_error";
    await db.from("email_send_audit").update({ status: "failed", error_code: code }).eq("id", audit.id);
    const status = code === "not_connected" ? 403 : code === "reauthorization_required" ? 409 : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gmail could not send the message.", code }, { status });
  }
}
