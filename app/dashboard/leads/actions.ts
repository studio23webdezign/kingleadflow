"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const leadSchema = z.object({ contractorOrganizationId: z.string().uuid(), contactName: z.string().trim().max(160).optional(), email: z.string().trim().email().max(254).optional().or(z.literal("")), phone: z.string().trim().max(40).optional(), serviceRequested: z.string().trim().max(160).optional(), description: z.string().trim().max(3000).optional(), source: z.enum(["manual", "website_form", "api", "import", "ai_receptionist", "meta_lead_ads", "google_ads", "whatsapp", "other"]) }).refine((v) => Boolean(v.contactName || v.email || v.phone), { message: "Add a name, email or phone number." });
const statusSchema = z.object({ leadId: z.string().uuid(), status: z.enum(["new", "contacted", "qualified", "appointment_requested", "appointment_booked", "proposal_sent", "won", "lost"]) });

export async function createLead(formData: FormData) {
 const parsed = leadSchema.safeParse({ contractorOrganizationId: formData.get("contractorOrganizationId"), contactName: formData.get("contactName") ?? "", email: formData.get("email") ?? "", phone: formData.get("phone") ?? "", serviceRequested: formData.get("serviceRequested") ?? "", description: formData.get("description") ?? "", source: formData.get("source") });
 if (!parsed.success) redirect("/dashboard/leads?error=invalid");
 const supabase = await createClient();
 const { data: claims, error: authError } = await supabase.auth.getClaims();
 if (authError || typeof claims?.claims?.sub !== "string") redirect("/login");
 const v = parsed.data;
 const { data: lead, error } = await supabase.from("leads").insert({ contractor_organization_id: v.contractorOrganizationId, contact_name: v.contactName || null, email: v.email || null, phone: v.phone || null, service_requested: v.serviceRequested || null, description: v.description || null, source: v.source }).select("id, contractor_organization_id").single();
 if (error || !lead) redirect("/dashboard/leads?error=save");
 await supabase.from("lead_events").insert({ contractor_organization_id: lead.contractor_organization_id, lead_id: lead.id, actor_user_id: claims.claims.sub, event_type: "lead_created", payload: { source: v.source } });
 redirect("/dashboard/leads?created=1");
}

export async function updateLeadStatus(formData: FormData) {
 const parsed = statusSchema.safeParse({ leadId: formData.get("leadId"), status: formData.get("status") });
 if (!parsed.success) redirect("/dashboard/leads?error=invalid");
 const supabase = await createClient();
 const { data: claims, error: authError } = await supabase.auth.getClaims();
 if (authError || typeof claims?.claims?.sub !== "string") redirect("/login");
 const { data: before } = await supabase.from("leads").select("id, contractor_organization_id, status").eq("id", parsed.data.leadId).single();
 if (!before) redirect("/dashboard/leads?error=not-found");
 const { error } = await supabase.from("leads").update({ status: parsed.data.status }).eq("id", before.id);
 if (error) redirect("/dashboard/leads?error=update");
 await supabase.from("lead_events").insert({ contractor_organization_id: before.contractor_organization_id, lead_id: before.id, actor_user_id: claims.claims.sub, event_type: "status_changed", payload: { from: before.status, to: parsed.data.status } });
 redirect("/dashboard/leads?updated=1");
}
