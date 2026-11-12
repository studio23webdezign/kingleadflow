"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  clientId: z.string().uuid(),
  displayName: z.string().trim().min(2).max(160),
  status: z.enum(["active", "paused", "archived"]),
});

export async function updateAgencyClient(formData: FormData) {
  const parsed = schema.safeParse({
    clientId: formData.get("clientId"),
    displayName: formData.get("displayName"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (typeof claims?.claims?.sub !== "string") return;
  const { error } = await supabase.from("agency_clients").update({
    display_name: parsed.data.displayName,
    status: parsed.data.status,
  }).eq("id", parsed.data.clientId);
  if (error) throw new Error("Could not update this client relationship.");
  revalidatePath("/dashboard/clients");
}
