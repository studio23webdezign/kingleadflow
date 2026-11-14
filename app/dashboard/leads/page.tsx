import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Flame, Plus, Target, Trophy, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createLead, updateLeadStatus } from "./actions";

export const dynamic = "force-dynamic";

const statuses = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["qualified", "Qualified"],
  ["appointment_requested", "Appointment requested"],
  ["appointment_booked", "Appointment booked"],
  ["proposal_sent", "Proposal sent"],
  ["won", "Won"],
  ["lost", "Lost"],
] as const;

function statusStyle(status: string) {
  if (["qualified", "appointment_booked", "won"].includes(status)) return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (status === "lost") return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  if (status === "new") return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ created?: string; updated?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (authError || typeof userId !== "string") redirect("/login");

  const { data: memberships, error: membershipError } = await supabase.from("organization_memberships").select("organization_id").eq("user_id", userId);
  if (membershipError || !memberships?.length) redirect("/onboarding");
  const ids = memberships.map((m) => m.organization_id);
  const { data: ownOrgs } = await supabase.from("organizations").select("id,name,kind").in("id", ids);
  const contractorOrgs = (ownOrgs ?? []).filter((o) => o.kind === "contractor");
  const agencyIds = (ownOrgs ?? []).filter((o) => o.kind === "agency").map((o) => o.id);
  let linkedOrgs: { id: string; name: string; kind: string }[] = [];
  if (agencyIds.length) {
    const { data: links } = await supabase.from("agency_clients").select("contractor_organization_id").in("agency_organization_id", agencyIds).eq("status", "active");
    const linkedIds = [...new Set((links ?? []).map((x) => x.contractor_organization_id))];
    if (linkedIds.length) {
      const { data } = await supabase.from("organizations").select("id,name,kind").in("id", linkedIds);
      linkedOrgs = data ?? [];
    }
  }
  const workspaces = [...contractorOrgs, ...linkedOrgs].filter((o, i, all) => all.findIndex((x) => x.id === o.id) === i);
  const { data: leads, error: leadsError } = await supabase.from("leads")
    .select("id,contractor_organization_id,contact_name,email,phone,service_requested,source,status,priority,score,created_at")
    .order("created_at", { ascending: false }).limit(100);
  const orgNames = new Map(workspaces.map((o) => [o.id, o.name]));
  const rows = leads ?? [];
  const qualified = rows.filter((lead) => ["qualified", "appointment_requested", "appointment_booked", "proposal_sent", "won"].includes(lead.status)).length;
  const hot = rows.filter((lead) => lead.priority === "hot").length;
  const won = rows.filter((lead) => lead.status === "won").length;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="app-page-kicker">SALES WORKSPACE</p>
          <h1 className="app-page-title">Lead pipeline</h1>
          <p className="app-page-copy">Capture, review and move customer enquiries forward.</p>
        </div>
        <a href="#create-lead" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500">
          <Plus size={15} /> Add a lead
        </a>
      </section>

      {(params.created || params.updated || params.error) && (
        <div className={params.error ? "rounded-xl border border-rose-400/20 bg-rose-400/[.07] px-4 py-3 text-xs text-rose-200" : "rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-4 py-3 text-xs text-emerald-200"}>
          {params.created ? "Lead created successfully." : params.updated ? "Lead status updated." : "We could not complete that action. Check the details and workspace access."}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Leads loaded", value: rows.length, detail: "Latest 100 accessible records", icon: UsersRound, tone: "text-blue-300 bg-blue-500/15" },
          { label: "Qualified", value: qualified, detail: "Ready for the next step", icon: Target, tone: "text-violet-300 bg-violet-500/15" },
          { label: "Hot priority", value: hot, detail: "Marked for urgent attention", icon: Flame, tone: "text-orange-300 bg-orange-500/15" },
          { label: "Won", value: won, detail: "Successfully closed", icon: Trophy, tone: "text-emerald-300 bg-emerald-500/15" },
        ].map((item) => {
          const Icon = item.icon;
          return <article key={item.label} className="app-surface p-4">
            <div className="flex items-center gap-3">
              <span className={"grid size-10 place-items-center rounded-xl " + item.tone}><Icon size={19} /></span>
              <div><p className="text-[11px] text-slate-400">{item.label}</p><p className="mt-0.5 text-xl font-semibold text-white">{item.value.toLocaleString("en-ZA")}</p></div>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">{item.detail}</p>
          </article>;
        })}
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <form id="create-lead" action={createLead} className="app-surface p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Plus size={18} /></span>
            <div><h2 className="text-sm font-semibold text-white">Add a lead</h2><p className="mt-0.5 text-[10px] text-slate-500">Create a new customer record</p></div>
          </div>
          <label className="block text-[11px] font-medium text-slate-300">Contractor workspace
            <select name="contractorOrganizationId" required className="mt-2 w-full rounded-xl app-field px-3 py-2.5 text-xs text-white">
              {workspaces.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <div className="mt-4 space-y-3">
            <label className="block text-[11px] font-medium text-slate-300">Contact name<input name="contactName" maxLength={160} placeholder="e.g. Jordan Smith" className="mt-2 w-full rounded-xl app-field px-3 py-2.5 text-xs text-white placeholder:text-slate-600" /></label>
            <label className="block text-[11px] font-medium text-slate-300">Email<input name="email" type="email" maxLength={254} placeholder="jordan@example.com" className="mt-2 w-full rounded-xl app-field px-3 py-2.5 text-xs text-white placeholder:text-slate-600" /></label>
            <label className="block text-[11px] font-medium text-slate-300">Phone<input name="phone" maxLength={40} placeholder="+27 ..." className="mt-2 w-full rounded-xl app-field px-3 py-2.5 text-xs text-white placeholder:text-slate-600" /></label>
            <label className="block text-[11px] font-medium text-slate-300">Service requested<input name="serviceRequested" maxLength={160} placeholder="Roof repair" className="mt-2 w-full rounded-xl app-field px-3 py-2.5 text-xs text-white placeholder:text-slate-600" /></label>
            <label className="block text-[11px] font-medium text-slate-300">Notes<textarea name="description" maxLength={3000} rows={3} placeholder="Project details..." className="mt-2 w-full resize-y rounded-xl app-field px-3 py-2.5 text-xs text-white placeholder:text-slate-600" /></label>
            <label className="block text-[11px] font-medium text-slate-300">Lead source
              <select name="source" className="mt-2 w-full rounded-xl app-field px-3 py-2.5 text-xs text-white">
                {["manual", "website_form", "api", "import", "ai_receptionist", "meta_lead_ads", "google_ads", "whatsapp", "other"].map((source) => <option key={source} value={source}>{source.replaceAll("_", " ")}</option>)}
              </select>
            </label>
          </div>
          <button disabled={!workspaces.length} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus size={14} /> Save lead
          </button>
          {!workspaces.length && <p className="mt-3 text-[10px] leading-5 text-slate-500">Create a contractor workspace or connect a contractor client to begin.</p>}
        </form>

        <section className="overflow-hidden app-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-5 py-4">
            <div><h2 className="text-sm font-semibold text-white">All leads</h2><p className="mt-1 text-[10px] text-slate-500">Latest 100 records visible to your account</p></div>
            <span className="rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-1.5 text-[10px] font-medium text-slate-400">{rows.length} records</span>
          </div>
          {leadsError ? <p className="p-6 text-xs text-rose-300">Unable to load leads. Verify the Supabase Data API configuration.</p> : !rows.length ? (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white/[.04] text-slate-400"><UsersRound size={20} /></span>
              <p className="mt-3 text-xs font-semibold text-slate-200">No leads yet</p>
              <p className="mt-1 text-[11px] text-slate-500">Add your first lead to start building the pipeline.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[.06]">
              {rows.map((lead) => (
                <article key={lead.id} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-white/[.02] sm:flex-row sm:items-center">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-xs font-semibold text-blue-200">{(lead.contact_name || lead.email || lead.phone || "L").slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-xs font-semibold text-slate-100"><Link href={"/dashboard/leads/" + lead.id} className="hover:text-blue-300">{lead.contact_name || lead.email || lead.phone || "New contact"}</Link></h3>
                      {lead.priority === "hot" && <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-orange-300"><Flame size={11} fill="currentColor" /> Hot</span>}
                      {lead.score !== null && <span className="text-[9px] font-medium text-violet-300">AI score {lead.score}/100</span>}
                    </div>
                    <p className="mt-1 truncate text-[10px] text-slate-400">{lead.service_requested || "Service not specified"} · {orgNames.get(lead.contractor_organization_id) || "Contractor workspace"}</p>
                    <p className="mt-1 truncate text-[10px] text-slate-600">{lead.email || lead.phone || "No contact details"} · {lead.source.replaceAll("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span className={"rounded-full border px-2.5 py-1 text-[9px] font-semibold " + statusStyle(lead.status)}>{lead.status.replaceAll("_", " ")}</span>
                    <form action={updateLeadStatus} className="flex items-center gap-1.5">
                      <input type="hidden" name="leadId" value={lead.id} />
                      <select name="status" defaultValue={lead.status} aria-label={"Status for " + (lead.contact_name || lead.email || "lead")} className="max-w-[130px] rounded-lg app-field px-2 py-2 text-[10px] text-slate-300">
                        {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button aria-label="Update lead status" className="grid size-8 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:border-blue-400/30 hover:text-blue-300"><ArrowUpRight size={14} /></button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
