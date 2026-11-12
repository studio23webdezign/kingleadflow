"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractContractorInquiry } from "@/lib/ai/gemini";
import { scoreLead } from "@/lib/ai/scoring";

const schema = z.object({
  contractorOrganizationId: z.string().uuid(),
  message: z.string().trim().min(10).max(8000),
});

export async function qualifyInquiry(formData: FormData) {
  const parsed = schema.safeParse({
    contractorOrganizationId: formData.get("contractorOrganizationId"),
    message: formData.get("message"),
  });
  if (!parsed.success) redirect("/dashboard/ai?error=invalid");

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (authError || typeof userId !== "string") redirect("/login");

  const organizationId = parsed.data.contractorOrganizationId;
  const [{ data: ownMembership }, { data: agencyLink }] = await Promise.all([
    supabase.from("organization_memberships").select("organization_id")
      .eq("organization_id", organizationId).eq("user_id", userId)
      .in("role", ["contractor_owner", "contractor_staff"]).maybeSingle(),
    supabase.from("agency_clients").select("id")
      .eq("contractor_organization_id", organizationId).eq("status", "active").limit(1).maybeSingle(),
  ]);
  if (!ownMembership && !agencyLink) redirect("/dashboard/ai?error=workspace");

  const { data: profile } = await supabase.from("contractor_profiles")
    .select("business_name,services,service_areas")
    .eq("organization_id", organizationId).maybeSingle();
  const services = profile?.services ?? [];
  const serviceAreas = profile?.service_areas ?? [];
  let extracted;
  try {
    extracted = await extractContractorInquiry({
      message: parsed.data.message,
      businessName: profile?.business_name ?? "Contractor business",
      services,
      serviceAreas,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI qualification failed.";
    redirect(`/dashboard/ai?error=${encodeURIComponent(message.slice(0, 180))}`);
  }

  const score = scoreLead(extracted, { services, serviceAreas });
  const email = z.string().email().safeParse(extracted.email);
  const { data: lead, error: insertError } = await supabase.from("leads").insert({
    contractor_organization_id: organizationId,
    contact_name: extracted.contact_name || null,
    email: email.success ? email.data : null,
    phone: extracted.phone || null,
    service_requested: extracted.service_requested || null,
    postal_code: extracted.postal_code || null,
    description: parsed.data.message,
    source: "ai_receptionist",
    score: score.score,
    priority: score.priority,
    score_reasons: score.reasons,
  }).select("id").single();

  if (insertError || !lead) redirect("/dashboard/ai?error=save");

  const { error: eventError } = await supabase.from("lead_events").insert({
    contractor_organization_id: organizationId,
    lead_id: lead.id,
    actor_user_id: userId,
    event_type: "ai_qualified",
    payload: {
      intent: extracted.intent,
      summary: extracted.summary,
      suggested_reply: extracted.suggested_reply,
      confidence: extracted.confidence,
      score: score.score,
      priority: score.priority,
      scoring_method: "deterministic_five_factor",
    },
  });

  if (eventError) redirect(`/dashboard/leads/${lead.id}?aiEventError=1`);
  redirect(`/dashboard/leads/${lead.id}?ai=1`);
}
