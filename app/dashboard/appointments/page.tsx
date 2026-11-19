import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Clock3, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function AppointmentsPage(){
 const supabase=await createClient();
 const {data:claims,error}=await supabase.auth.getClaims();
 const userId=claims?.claims?.sub;
 if(error||typeof userId!=="string") redirect("/login");
 const {data:memberships}=await supabase.from("organization_memberships").select("organization_id").eq("user_id",userId);
 if(!memberships?.length) redirect("/onboarding");
 const ids=memberships.map(x=>x.organization_id);
 const {data:orgs}=await supabase.from("organizations").select("id,kind").in("id",ids);
 const agencyIds=(orgs??[]).filter(x=>x.kind==="agency").map(x=>x.id);
 const contractorIds=(orgs??[]).filter(x=>x.kind==="contractor").map(x=>x.id);
 const {data:links}=agencyIds.length?await supabase.from("agency_clients").select("contractor_organization_id").in("agency_organization_id",agencyIds).eq("status","active"):{data:[]};
 const workspaceIds=[...new Set([...contractorIds,...(links??[]).map(x=>x.contractor_organization_id)])];
 const {data:rows,error:queryError}=workspaceIds.length?await supabase.from("leads").select("id,contact_name,email,phone,service_requested,status,created_at").in("contractor_organization_id",workspaceIds).in("status",["appointment_requested","appointment_booked"]).order("created_at",{ascending:false}).limit(100):{data:[],error:null};
 const items=rows??[];
 return <div className="space-y-6"><header><p className="app-page-kicker">WORKSPACE</p><h1 className="app-page-title">Appointments</h1><p className="app-page-copy">Review leads that have requested or booked an appointment. Appointment records are currently represented by lead pipeline status.</p></header>
 <div className="grid grid-cols-2 gap-3"><div className="app-surface p-4"><p className="text-xs text-slate-400">Requested</p><p className="mt-2 text-3xl font-bold text-white">{items.filter(x=>x.status==="appointment_requested").length}</p></div><div className="app-surface p-4"><p className="text-xs text-slate-400">Booked</p><p className="mt-2 text-3xl font-bold text-white">{items.filter(x=>x.status==="appointment_booked").length}</p></div></div>
 <section className="app-surface overflow-hidden"><div className="flex items-center gap-2 border-b border-white/[.07] px-5 py-4"><CalendarDays size={18} className="text-amber-300"/><h2 className="text-sm font-semibold text-white">Appointment enquiries</h2></div>{queryError?<p className="p-5 text-xs text-rose-300">Could not load appointment enquiries.</p>:items.length?<div className="divide-y divide-white/[.06]">{items.map(item=><div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4"><span className="grid size-10 place-items-center rounded-xl bg-amber-400/10 text-amber-200"><Clock3 size={18}/></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{item.contact_name||item.email||item.phone||"New contact"}</p><p className="mt-1 truncate text-[10px] text-slate-400">{item.service_requested||"Service not specified"}</p></div><span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] text-amber-200">{item.status==="appointment_booked"?"Booked":"Requested"}</span><Link href={"/dashboard/leads/"+item.id} aria-label="Open lead" className="text-blue-300"><ArrowUpRight size={16}/></Link></div>)}</div>:<div className="px-6 py-14 text-center"><CalendarDays size={28} className="mx-auto text-slate-600"/><p className="mt-3 text-xs font-semibold text-white">No appointment enquiries yet</p><p className="mt-1 text-[11px] text-slate-500">Move a lead to Appointment requested or Appointment booked to see it here.</p><Link href="/dashboard/leads" className="mt-4 inline-flex text-xs font-semibold text-cyan-300">Open leads →</Link></div>}</section></div>;
}
