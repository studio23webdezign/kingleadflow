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
    supabase.from("agency_clients").select("agency_organization_id")
      .eq("contractor_organization_id", organizationId).eq("status", "active").limit(1).maybeSingle(),
  ]);

  // The agency_clients query is RLS-filtered, but explicitly verify the user's
  // agency role as a second authorization check before processing customer data.
  let agencyMembership = null;
  if (agencyLink?.agency_organization_id) {
    const { data } = await supabase.from("organization_memberships").select("organization_id")
      .eq("organization_id", agencyLink.agency_organization_id).eq("user_id", userId)
      .in("role", ["agency_owner", "agency_admin", "agency_manager", "agency_staff"]).maybeSingle();
    agencyMembership = data;
  }
  if (!ownMembership && !agencyMembership) redirect("/dashboard/ai?error=workspace");

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
  const { data: leadId, error: saveError } = await supabase.rpc("create_ai_qualified_lead", {
    p_contractor_organization_id: organizationId,
    p_contact_name: extracted.contact_name,
    p_email: email.success ? email.data : "",
    p_phone: extracted.phone,
    p_service_requested: extracted.service_requested,
    p_postal_code: extracted.postal_code,
    p_description: parsed.data.message,
    p_score: score.score,
    p_priority: score.priority,
    p_score_reasons: score.reasons,
    p_event_payload: {
      intent: extracted.intent,
      summary: extracted.summary,
      suggested_reply: extracted.suggested_reply,
      confidence: extracted.confidence,
      score: score.score,
      priority: score.priority,
      scoring_method: "deterministic_five_factor",
    },
  });

  if (saveError || typeof leadId !== "string") redirect("/dashboard/ai?error=save");
  redirect(`/dashboard/leads/${leadId}?ai=1`);
}
