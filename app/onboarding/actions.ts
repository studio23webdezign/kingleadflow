"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  kind: z.enum(["agency", "contractor"])
});

export async function createOrganization(formData: FormData) {
  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    kind: formData.get("kind")
  });
  if (!parsed.success) redirect("/onboarding?error=invalid");

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || typeof claims?.claims?.sub !== "string") redirect("/login");

  const { error } = await supabase.rpc("create_organization_for_current_user", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_kind: parsed.data.kind
  });

  if (error?.code === "23505") redirect("/onboarding?error=slug-taken");
  if (error) redirect("/onboarding?error=provisioning");
  redirect("/dashboard");
}
