"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
const taskSchema=z.object({leadId:z.string().uuid(),title:z.string().trim().min(2).max(180),description:z.string().trim().max(2000).optional(),dueAt:z.string().optional()});
const taskStatusSchema=z.object({taskId:z.string().uuid(),status:z.enum(["open","in_progress","completed","cancelled"])});
export async function createFollowUpTask(formData:FormData){
 const parsed=taskSchema.safeParse({leadId:formData.get("leadId"),title:formData.get("title"),description:formData.get("description")??"",dueAt:formData.get("dueAt")??""});
 if(!parsed.success) redirect("/dashboard/leads?error=task");
 const supabase=await createClient(); const {data:claims,error:authError}=await supabase.auth.getClaims(); const userId=claims?.claims?.sub; if(authError||typeof userId!=="string") redirect("/login");
 const {data:lead}=await supabase.from("leads").select("id,contractor_organization_id").eq("id",parsed.data.leadId).single(); if(!lead) redirect("/dashboard/leads?error=not-found");
 let dueAt:string|null=null; if(parsed.data.dueAt){const date=new Date(parsed.data.dueAt);if(Number.isNaN(date.getTime())) redirect(`/dashboard/leads/${lead.id}?error=task-date`);dueAt=date.toISOString();}
 const {error}=await supabase.from("follow_up_tasks").insert({contractor_organization_id:lead.contractor_organization_id,lead_id:lead.id,created_by:userId,assigned_to:userId,title:parsed.data.title,description:parsed.data.description||null,due_at:dueAt});
 if(error) redirect(`/dashboard/leads/${lead.id}?error=task-save`); redirect(`/dashboard/leads/${lead.id}?taskCreated=1`);
}
export async function updateFollowUpTaskStatus(formData:FormData){
 const parsed=taskStatusSchema.safeParse({taskId:formData.get("taskId"),status:formData.get("status")}); if(!parsed.success) redirect("/dashboard/leads?error=task");
 const supabase=await createClient();const {data:claims,error:authError}=await supabase.auth.getClaims();if(authError||typeof claims?.claims?.sub!=="string") redirect("/login");
 const {data:task}=await supabase.from("follow_up_tasks").select("id,lead_id").eq("id",parsed.data.taskId).single();if(!task?.lead_id) redirect("/dashboard/leads?error=task-not-found");
 const {error}=await supabase.from("follow_up_tasks").update({status:parsed.data.status}).eq("id",task.id);if(error) redirect(`/dashboard/leads/${task.lead_id}?error=task-update`);redirect(`/dashboard/leads/${task.lead_id}?taskUpdated=1`);
}
