"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  organizationId: z.string().uuid(),
  businessName: z.string().trim().min(2).max(180),
  phone: z.string().trim().max(40).optional(),
  website: z.string().trim().max(240).optional(),
  services: z.string().max(2000),
  serviceAreas: z.string().max(2000),
  timezone: z.string().trim().min(3).max(80),
});

function lines(value: string) {
  return [...new Set(value.split(/[\n,;]/).map((item) => item.trim()).filter(Boolean))].slice(0, 30);
}

export async function saveContractorProfile(formData: FormData) {
  const parsed = schema.safeParse({
    organizationId: formData.get("organizationId"),
    businessName: formData.get("businessName"),
    phone: formData.get("phone") || "",
    website: formData.get("website") || "",
    services: formData.get("services"),
    serviceAreas: formData.get("serviceAreas"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") return;
  const { data: membership } = await supabase.from("organization_memberships")
    .select("organization_id, role").eq("organization_id", parsed.data.organizationId).eq("user_id", userId).eq("role", "contractor_owner").maybeSingle();
  if (!membership) throw new Error("Only the contractor workspace owner can edit this profile.");
  const { error } = await supabase.from("contractor_profiles").upsert({
    organization_id: parsed.data.organizationId,
    business_name: parsed.data.businessName,
    phone: parsed.data.phone || null,
    website: parsed.data.website || null,
    services: lines(parsed.data.services),
    service_areas: lines(parsed.data.serviceAreas),
    timezone: parsed.data.timezone,
  }, { onConflict: "organization_id" });
  if (error) throw new Error("Could not save the contractor profile.");
  revalidatePath("/dashboard/profile");
}
