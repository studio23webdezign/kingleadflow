import { redirect } from "next/navigation";
import { BrainCircuit, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { qualifyInquiry } from "./actions";
import { HeroRobot } from "../dashboard-illustrations";

export const dynamic = "force-dynamic";

export default async function AiQualificationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") redirect("/login");

  const { data: memberships } = await supabase.from("organization_memberships").select("organization_id,role").eq("user_id", userId);
  const ownIds = (memberships ?? []).filter((m) => ["contractor_owner", "contractor_staff"].includes(m.role)).map((m) => m.organization_id);
  const agencyIds = (memberships ?? []).filter((m) => m.role.startsWith("agency_")).map((m) => m.organization_id);
  const [{ data: ownOrgs }, { data: links }] = await Promise.all([
    ownIds.length ? supabase.from("organizations").select("id,name").in("id", ownIds) : Promise.resolve({ data: [] }),
    agencyIds.length ? supabase.from("agency_clients").select("contractor_organization_id,display_name").in("agency_organization_id", agencyIds).eq("status", "active") : Promise.resolve({ data: [] }),
  ]);
  const linkedIds = [...new Set((links ?? []).map((link) => link.contractor_organization_id))];
  const { data: linkedOrgs } = linkedIds.length ? await supabase.from("organizations").select("id,name").in("id", linkedIds) : { data: [] };
  const workspaces = [...(ownOrgs ?? []), ...(linkedOrgs ?? [])].filter((org, index, all) => all.findIndex((item) => item.id === org.id) === index);

  return (
    <div className="space-y-7">
      <section>
        <p className="app-page-kicker">AI RECEPTIONIST · SPRINT 6</p>
        <h1 className="app-page-title">AI lead qualification</h1>
        <p className="app-page-copy">Turn unstructured enquiries into organised lead records, suggested replies and transparent qualification scores.</p>
      </section>

      {params.error && <p className="rounded-xl border border-rose-400/20 bg-rose-400/[.06] px-4 py-3 text-xs text-rose-200">{params.error === "workspace" ? "You do not have access to that active contractor workspace." : params.error === "save" ? "The lead could not be saved. Check workspace permissions." : params.error === "invalid" ? "Enter an inquiry between 10 and 8,000 characters." : params.error}</p>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <form action={qualifyInquiry} className="app-surface p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><BrainCircuit size={20} /></span>
            <div><h2 className="text-sm font-semibold text-white">Analyse a customer enquiry</h2><p className="mt-1 text-[10px] text-slate-500">Gemini extracts details; your app calculates the lead score.</p></div>
          </div>
          <label className="block text-[11px] font-medium text-slate-300">Contractor workspace
            <select name="contractorOrganizationId" required className="mt-2 h-11 w-full rounded-xl app-field px-3 text-xs text-white">
              {workspaces.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
            </select>
          </label>
          <label className="mt-5 block text-[11px] font-medium text-slate-300">Customer inquiry
            <textarea name="message" required minLength={10} maxLength={8000} rows={10} placeholder="Paste the customer's website enquiry or message here..." className="mt-2 w-full resize-y rounded-xl app-field px-3 py-3 text-xs leading-6 text-white placeholder:text-slate-600" />
          </label>
          <div className="mt-4 flex flex-wrap items-start gap-2 rounded-xl border border-white/[.06] bg-white/[.025] p-3.5 text-[10px] leading-5 text-slate-400">
            <LockKeyhole size={14} className="mt-0.5 shrink-0 text-emerald-300" />
            <p><strong className="text-slate-200">Privacy:</strong> inquiry text is sent to Gemini for processing with request storage disabled. Use test or consented customer information only.</p>
          </div>
          <button disabled={!workspaces.length} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
            <Sparkles size={15} fill="currentColor" /> Extract, score and save lead
          </button>
          {!workspaces.length && <p className="mt-3 text-[11px] text-slate-500">Create a contractor workspace or link an active contractor client first.</p>}
        </form>

        <aside className="space-y-3">
          <section className="app-surface overflow-hidden bg-gradient-to-br from-[#102d63] via-[#171b56] to-[#27144d] p-5">
            <div className="mx-auto -mb-1 h-36 max-w-[250px]"><HeroRobot /></div>
            <span className="grid size-9 place-items-center rounded-xl bg-violet-500/20 text-violet-200"><Sparkles size={18} fill="currentColor" /></span>
            <h2 className="mt-4 text-sm font-semibold text-white">From enquiry to opportunity</h2>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">AI helps structure the conversation so your team can focus on the next best action.</p>
            <ul className="mt-4 space-y-3 text-[10px] text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Extract contact and service details</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Classify intent and urgency</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Calculate a qualification score</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-300" /> Draft a reply for human review</li>
            </ul>
          </section>
          <section className="app-surface-soft p-4">
            <p className="text-[10px] font-semibold text-amber-200">Human approval required</p>
            <p className="mt-1.5 text-[10px] leading-5 text-slate-400">Suggested replies are drafts only. This action does not send email or WhatsApp messages, or book appointments.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
