import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  BriefcaseBusiness,
  CheckCircle2,
  CirclePlus,
  Clock3,
  Flame,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  appointment_requested: "Appointment requested",
  appointment_booked: "Appointment booked",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof UsersRound;
  tone: "blue" | "violet" | "green" | "amber";
}) {
  const tones = {
    blue: "bg-blue-500/15 text-blue-300 ring-blue-400/10",
    violet: "bg-violet-500/15 text-violet-300 ring-violet-400/10",
    green: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/10",
    amber: "bg-amber-500/15 text-amber-300 ring-amber-400/10",
  };
  return (
    <article className="rounded-2xl border border-white/[.07] bg-[#111c2e] p-5 shadow-[0_10px_35px_rgba(0,0,0,.12)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-[30px] font-semibold leading-none tracking-tight text-white">{value.toLocaleString("en-ZA")}</p>
          <p className="mt-2 text-[11px] text-slate-500">{detail}</p>
        </div>
        <span className={"grid size-11 place-items-center rounded-xl ring-1 " + tones[tone]}>
          <Icon size={20} strokeWidth={2.1} />
        </span>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "won" || status === "qualified" || status === "appointment_booked"
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    : status === "lost"
      ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
      : status === "new"
        ? "border-blue-400/20 bg-blue-400/10 text-blue-300"
        : "border-amber-400/20 bg-amber-400/10 text-amber-200";
  return <span className={"inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold " + tone}>{statusLabel[status] ?? status.replaceAll("_", " ")}</span>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId);
  if (membershipError) throw new Error("We could not load your workspace memberships.");
  if (!memberships?.length) redirect("/onboarding");

  const ids = memberships.map((m) => m.organization_id);
  const { data: organizations, error: orgError } = await supabase
    .from("organizations")
    .select("id,name,kind,slug")
    .in("id", ids);
  if (orgError) throw new Error("We could not load your workspaces.");

  const agencyIds = (organizations ?? []).filter((o) => o.kind === "agency").map((o) => o.id);
  const contractorIds = (organizations ?? []).filter((o) => o.kind === "contractor").map((o) => o.id);
  const { data: links } = agencyIds.length
    ? await supabase.from("agency_clients").select("contractor_organization_id").in("agency_organization_id", agencyIds).eq("status", "active")
    : { data: [] };
  const workspaceIds = [...new Set([...contractorIds, ...(links ?? []).map((x) => x.contractor_organization_id)])];

  const [leadCount, qualifiedCount, wonCount, leadRows] = await Promise.all([
    workspaceIds.length ? supabase.from("leads").select("id", { count: "exact", head: true }).in("contractor_organization_id", workspaceIds) : Promise.resolve({ count: 0, error: null }),
    workspaceIds.length ? supabase.from("leads").select("id", { count: "exact", head: true }).in("contractor_organization_id", workspaceIds).in("status", ["qualified", "appointment_requested", "appointment_booked", "proposal_sent", "won"]) : Promise.resolve({ count: 0, error: null }),
    workspaceIds.length ? supabase.from("leads").select("id", { count: "exact", head: true }).in("contractor_organization_id", workspaceIds).eq("status", "won") : Promise.resolve({ count: 0, error: null }),
    workspaceIds.length ? supabase.from("leads").select("id,contact_name,email,service_requested,status,priority,created_at").in("contractor_organization_id", workspaceIds).order("created_at", { ascending: false }).limit(6) : Promise.resolve({ data: [], error: null }),
  ]);

  const recent = leadRows.data ?? [];
  const total = leadCount.count ?? 0;
  const qualified = qualifiedCount.count ?? 0;
  const won = wonCount.count ?? 0;
  const qualificationRate = total > 0 ? Math.round((qualified / total) * 100) : 0;
  const dateLabel = new Intl.DateTimeFormat("en-ZA", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const metrics = [
    { label: "Total leads", value: total, detail: "Across your accessible workspaces", icon: UsersRound, tone: "blue" as const },
    { label: "Qualified opportunities", value: qualified, detail: "Ready for the next step", icon: Target, tone: "violet" as const },
    { label: "Won opportunities", value: won, detail: "Marked as successfully closed", icon: CheckCircle2, tone: "green" as const },
    { label: "Active contractor clients", value: (links ?? []).length, detail: "Connected to your agency", icon: Building2, tone: "amber" as const },
  ];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[.18em] text-blue-300">AGENCY COMMAND CENTRE</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[30px]">Good to see you.</h1>
          <p className="mt-1.5 text-sm text-slate-400">Here is what is happening across your lead pipeline.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden text-xs text-slate-500 sm:inline">{dateLabel}</span>
          <Link href="/dashboard/leads" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-4 text-xs font-semibold text-slate-200 transition hover:bg-white/[.08]">
            View pipeline <ArrowUpRight size={15} />
          </Link>
          <Link href="/dashboard/ai" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500">
            <Sparkles size={15} fill="currentColor" /> Qualify a lead
          </Link>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-blue-400/15 bg-gradient-to-r from-[#142e54] via-[#17264a] to-[#25204c] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-24 size-72 rounded-full border border-blue-300/10" />
        <div className="pointer-events-none absolute -right-2 -top-16 size-52 rounded-full border border-violet-300/10" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200/15 bg-blue-200/[.08] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-blue-100">
            <Sparkles size={12} fill="currentColor" /> YOUR AI-POWERED WORKSPACE
          </span>
          <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">Every enquiry deserves<br className="hidden sm:block" /> a faster next step.</h2>
          <p className="mt-3 max-w-lg text-xs leading-6 text-blue-100/70 sm:text-sm">Capture opportunities, qualify customer intent and keep agency client workspaces moving from one clear command centre.</p>
          <Link href="/dashboard/ai" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-slate-900 transition hover:bg-blue-50">
            Explore AI qualification <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_.85fr]">
        <article className="rounded-2xl border border-white/[.07] bg-[#111c2e] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Pipeline health</h2>
              <p className="mt-1 text-[11px] text-slate-500">A snapshot of your current qualification progress</p>
            </div>
            <span className="rounded-lg bg-white/[.04] px-2.5 py-1.5 text-[10px] font-medium text-slate-400">All time</span>
          </div>
          <div className="mt-7 flex items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-semibold tracking-tight text-white">{qualificationRate}%</p>
              <p className="mt-1 text-xs text-slate-400">Qualified or further along</p>
            </div>
            <div className="text-right text-[11px] text-slate-500">{qualified.toLocaleString("en-ZA")} of {total.toLocaleString("en-ZA")} leads</div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700/70">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-400 transition-all" style={{ width: qualificationRate + "%" }} />
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-blue-400" /> Total enquiries: {total}</span>
            <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-violet-400" /> Qualified: {qualified}</span>
            <span className="inline-flex items-center gap-2"><i className="size-2 rounded-full bg-emerald-400" /> Won: {won}</span>
          </div>
        </article>

        <article className="rounded-2xl border border-white/[.07] bg-[#111c2e] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Quick actions</h2>
              <p className="mt-1 text-[11px] text-slate-500">Get straight to the work</p>
            </div>
            <CirclePlus size={18} className="text-slate-500" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Link href="/dashboard/leads" className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-white/[.07] bg-white/[.025] p-3 transition hover:border-blue-400/30 hover:bg-blue-500/[.07]">
              <UsersRound size={19} className="text-blue-300" /><span className="text-[11px] font-semibold text-slate-200">Manage leads</span>
            </Link>
            <Link href="/dashboard/ai" className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-white/[.07] bg-white/[.025] p-3 transition hover:border-violet-400/30 hover:bg-violet-500/[.07]">
              <Sparkles size={19} className="text-violet-300" /><span className="text-[11px] font-semibold text-slate-200">AI qualification</span>
            </Link>
            <Link href="/dashboard/clients" className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-white/[.07] bg-white/[.025] p-3 transition hover:border-emerald-400/30 hover:bg-emerald-500/[.07]">
              <Building2 size={19} className="text-emerald-300" /><span className="text-[11px] font-semibold text-slate-200">Client workspaces</span>
            </Link>
            <Link href="/dashboard/profile" className="group flex min-h-[88px] flex-col justify-between rounded-xl border border-white/[.07] bg-white/[.025] p-3 transition hover:border-amber-400/30 hover:bg-amber-500/[.07]">
              <BriefcaseBusiness size={19} className="text-amber-300" /><span className="text-[11px] font-semibold text-slate-200">Business profile</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-white/[.07] bg-[#111c2e] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Recent leads</h2>
            <p className="mt-1 text-[11px] text-slate-500">The latest enquiries across your accessible workspaces</p>
          </div>
          <Link href="/dashboard/leads" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-blue-200">View all leads <ArrowRight size={14} /></Link>
        </div>
        {recent.length ? (
          <div className="mt-4 divide-y divide-white/[.06]">
            {recent.map((lead) => (
              <Link key={lead.id} href="/dashboard/leads" className="flex flex-wrap items-center gap-3 py-3.5 transition hover:bg-white/[.02] sm:flex-nowrap">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-xs font-semibold text-blue-200">{(lead.contact_name || lead.email || "L").slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-200">{lead.contact_name || lead.email || "New contact"}</span>
                  <span className="mt-1 block truncate text-[10px] text-slate-500">{lead.service_requested || "Service not specified"} · {new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short" }).format(new Date(lead.created_at))}</span>
                </span>
                {lead.priority === "hot" && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-300"><Flame size={12} fill="currentColor" /> Hot</span>}
                <StatusBadge status={lead.status} />
                <ArrowUpRight size={14} className="hidden text-slate-600 sm:block" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-xl bg-white/[.04] text-slate-400"><Clock3 size={18} /></span>
            <p className="mt-3 text-xs font-semibold text-slate-200">No leads yet</p>
            <p className="mt-1 text-[11px] text-slate-500">Your new enquiries will appear here once they are captured.</p>
            <Link href="/dashboard/leads" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-500"><CirclePlus size={14} /> Add your first lead</Link>
          </div>
        )}
      </section>
      <p className="pb-2 text-center text-[10px] text-slate-600">KING LEADFLOW AI · Independent agency-first platform</p>
    </div>
  );
}
