"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
const updateSchema = z.object({ clientId:z.string().uuid(), displayName:z.string().trim().min(2).max(160), status:z.enum(["active","paused","archived"]) });
export async function updateAgencyClient(formData:FormData) {
 const p=updateSchema.safeParse({clientId:formData.get("clientId"),displayName:formData.get("displayName"),status:formData.get("status")}); if(!p.success)return;
 const s=await createClient(); const {data:a}=await s.auth.getClaims(); if(typeof a?.claims?.sub!=="string")return;
 const {error}=await s.from("agency_clients").update({display_name:p.data.displayName,status:p.data.status}).eq("id",p.data.clientId);
 if(error)throw new Error("Could not update this client relationship."); revalidatePath("/dashboard/clients");
}
export async function createClientInvitation(formData:FormData) {
 const p=z.object({agencyId:z.string().uuid(),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase())}).safeParse({agencyId:formData.get("agencyId"),email:formData.get("email")});if(!p.success)return;
 const s=await createClient();const {data:a}=await s.auth.getClaims();const uid=a?.claims?.sub;if(typeof uid!=="string")return;
 const {error}=await s.from("agency_client_invitations").insert({agency_organization_id:p.data.agencyId,invited_email:p.data.email,invited_by:uid});
 if(error)throw new Error("Could not create invitation. Check agency permissions.");revalidatePath("/dashboard/clients");
}
export async function revokeClientInvitation(formData:FormData) {
 const p=z.string().uuid().safeParse(formData.get("invitationId"));if(!p.success)return;
 const s=await createClient();const {data:a}=await s.auth.getClaims();if(typeof a?.claims?.sub!=="string")return;
 const {error}=await s.from("agency_client_invitations").update({status:"revoked"}).eq("id",p.data).eq("status","pending");
 if(error)throw new Error("Could not revoke invitation.");revalidatePath("/dashboard/clients");
}
export async function acceptClientInvitation(formData:FormData) {
 const p=z.object({invitationId:z.string().uuid(),contractorOrganizationId:z.string().uuid()}).safeParse({invitationId:formData.get("invitationId"),contractorOrganizationId:formData.get("contractorOrganizationId")});if(!p.success)return;
 const s=await createClient();const {data:a}=await s.auth.getClaims();const uid=a?.claims?.sub;if(typeof uid!=="string")return;
 const {data:m}=await s.from("organization_memberships").select("organization_id").eq("organization_id",p.data.contractorOrganizationId).eq("user_id",uid).eq("role","contractor_owner").maybeSingle();if(!m)throw new Error("Choose a contractor workspace you own.");
 const {data:o}=await s.from("organizations").select("id,name,kind").eq("id",p.data.contractorOrganizationId).eq("kind","contractor").maybeSingle();if(!o)throw new Error("Contractor workspace not found.");
 const {data:i,error:ie}=await s.from("agency_client_invitations").select("id,agency_organization_id,status,expires_at").eq("id",p.data.invitationId).maybeSingle();
 if(ie||!i||i.status!=="pending"||new Date(i.expires_at)<=new Date())throw new Error("Invitation unavailable or expired.");
 const {error:ae}=await s.from("agency_client_invitations").update({status:"accepted",contractor_organization_id:o.id,accepted_at:new Date().toISOString(),accepted_by:uid}).eq("id",i.id).eq("status","pending");
 if(ae)throw new Error("Could not accept. Sign in using the email address the agency invited.");
 const {error:le}=await s.from("agency_clients").insert({agency_organization_id:i.agency_organization_id,contractor_organization_id:o.id,display_name:o.name,status:"active"});
 if(le)throw new Error("Invitation accepted, but the workspace link could not be created. Contact the agency.");
 revalidatePath("/dashboard/clients");revalidatePath("/dashboard");
}
