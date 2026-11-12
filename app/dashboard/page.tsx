import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const money = (value: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value);

function Sparkline({ color, variant = 0 }: { color: string; variant?: number }) {
  const lines = ["M2 27 C20 24 19 20 32 23 S51 12 63 18 S82 4 96 10 S115 17 130 2", "M2 27 C17 29 20 14 34 19 S52 25 67 11 S85 17 99 5 S115 12 130 1", "M2 28 C18 20 25 25 37 18 S56 20 68 10 S87 18 101 8 S117 5 130 1", "M2 27 C18 27 24 20 36 23 S55 10 69 15 S88 19 101 7 S119 10 130 1"];
  return <svg className="metric-spark" viewBox="0 0 132 32" aria-hidden="true"><path d={lines[variant]} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round"/><path d={`${lines[variant]} L130 32 L2 32Z`} fill={color} opacity=".12"/></svg>;
}

function TrendChart() {
  return <div className="chart-wrap"><svg viewBox="0 0 560 190" role="img" aria-label="Lead performance trend illustration"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0b8dff" stopOpacity=".42"/><stop offset="100%" stopColor="#0b8dff" stopOpacity="0"/></linearGradient></defs>{[25,65,105,145,180].map(y=><line key={y} x1="35" x2="550" y1={y} y2={y} stroke="#25436a" strokeDasharray="3 5" strokeWidth="1"/>)}{[35,145,255,365,475,550].map(x=><line key={x} x1={x} x2={x} y1="15" y2="180" stroke="#1a3458" strokeWidth="1"/>)}<path d="M35 150 C60 132 68 144 88 131 S120 139 145 111 S180 128 205 103 S238 116 260 87 S300 105 325 92 S356 118 382 79 S420 100 445 68 S478 85 505 51 S530 58 550 31 L550 180 L35 180Z" fill="url(#area)"/><path d="M35 150 C60 132 68 144 88 131 S120 139 145 111 S180 128 205 103 S238 116 260 87 S300 105 325 92 S356 118 382 79 S420 100 445 68 S478 85 505 51 S530 58 550 31" fill="none" stroke="#12a9ff" strokeWidth="3.5" strokeLinecap="round"/><circle cx="550" cy="31" r="5" fill="#fff" stroke="#168cff" strokeWidth="4"/></svg></div>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/login");
  const { data: memberships, error: membershipError } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", userId);
  if (membershipError) throw new Error("We could not load your workspace memberships.");
  if (!memberships?.length) redirect("/onboarding");
  const ids = memberships.map((m) => m.organization_id);
  const { data: organizations, error: orgError } = await supabase.from("organizations").select("id,name,kind,slug").in("id", ids);
  if (orgError) throw new Error("We could not load your workspaces.");
  const agencyIds = (organizations ?? []).filter((o) => o.kind === "agency").map((o) => o.id);
  const contractorIds = (organizations ?? []).filter((o) => o.kind === "contractor").map((o) => o.id);
  const { data: links } = agencyIds.length ? await supabase.from("agency_clients").select("contractor_organization_id").in("agency_organization_id", agencyIds).eq("status","active") : { data: [] };
  const workspaceIds = [...new Set([...contractorIds, ...(links ?? []).map((x) => x.contractor_organization_id)])];
  const [leadCount, qualifiedCount, wonCount, leadRows] = await Promise.all([
    workspaceIds.length ? supabase.from("leads").select("id", { count: "exact", head: true }).in("contractor_organization_id", workspaceIds) : Promise.resolve({ count: 0, error: null }),
    workspaceIds.length ? supabase.from("leads").select("id", { count: "exact", head: true }).in("contractor_organization_id", workspaceIds).in("status",["qualified","appointment_requested","appointment_booked","proposal_sent","won"]) : Promise.resolve({ count: 0, error: null }),
    workspaceIds.length ? supabase.from("leads").select("id", { count: "exact", head: true }).in("contractor_organization_id", workspaceIds).eq("status","won") : Promise.resolve({ count: 0, error: null }),
    workspaceIds.length ? supabase.from("leads").select("id,contact_name,email,service_requested,status,priority,created_at").in("contractor_organization_id", workspaceIds).order("created_at",{ascending:false}).limit(4) : Promise.resolve({ data: [], error: null }),
  ]);
  const recent = leadRows.data ?? [];
  const fmt = (date: string) => new Intl.DateTimeFormat("en-ZA",{day:"numeric",month:"short"}).format(new Date(date));
  const stats = [
    { label:"Total Leads", value:leadCount.count ?? 0, change:"Live workspace data", color:"blue", icon:"users" },
    { label:"Qualified", value:qualifiedCount.count ?? 0, change:"Across your pipeline", color:"green", icon:"check" },
    { label:"Won", value:wonCount.count ?? 0, change:"Closed opportunities", color:"purple", icon:"chart" },
    { label:"Clients", value:(links ?? []).length, change:"Active contractor clients", color:"gold", icon:"building" },
  ];
  return <div>
    <div className="page-heading"><div><div className="eyebrow">AGENCY COMMAND CENTRE</div><h1>Welcome back.</h1><p>Your AI-powered lead generation workspace at a glance.</p></div><Link className="gold-button" href="/dashboard/leads">✦ View your leads <span>→</span></Link></div>
    <section className="hero-banner"><div className="hero-copy"><h2>Build More.<br/>Grow <span>Faster.</span></h2><p>Your AI-powered lead generation machine keeps every contractor opportunity moving.</p><Link className="gold-button" href="/dashboard/leads">✦ View Your Leads →</Link></div><div className="hero-script">Build More.<br/>Grow Faster.</div></section>
    <section className="metric-grid">{stats.map((s,i)=><article className="metric-card" key={s.label}><div className="metric-top"><div className={`metric-icon ${s.color}`}>{s.icon==="users"?"♟":s.icon==="check"?"✓":s.icon==="chart"?"▮":"⌂"}</div><div><div className="metric-value">{s.value.toLocaleString("en-ZA")}</div><div className="metric-label">{s.label}</div></div></div><div className="metric-change">{s.change}</div><Sparkline color={["#11aaff","#16d995","#a744ff","#ffc22e"][i]} variant={i}/></article>)}</section>
    <div className="dashboard-grid"><section className="surface"><div className="surface-heading"><h3>▥ &nbsp; Lead Performance</h3><span>All-time snapshot</span></div><TrendChart/><div className="chart-labels"><span>Workspace data</span><span>{leadCount.count ?? 0} total leads</span></div></section><section className="surface"><div className="surface-heading"><h3>⚡ &nbsp; Quick Actions</h3><span>Get things moving</span></div><div className="quick-grid"><Link href="/dashboard/leads" className="quick-action blue"><span>⌕</span>Find Leads</Link><Link href="/dashboard/ai" className="quick-action purple"><span>✦</span>AI Qualify</Link><Link href="/dashboard/clients" className="quick-action green"><span>▦</span>Manage Clients</Link><Link href="/dashboard/profile" className="quick-action gold"><span>▥</span>Business Setup</Link></div></section></div>
    <div className="lower-grid"><section className="surface"><div className="surface-heading"><h3>♟ &nbsp; Recent Leads</h3><Link href="/dashboard/leads" className="text-xs text-sky-300">View all →</Link></div>{recent.length ? recent.map((lead,i)=><Link href="/dashboard/leads" key={lead.id} className="lead-row"><span className="lead-number">{i+1}</span><span className={`lead-thumb t${i+1}`}/><span className="lead-info"><strong>{lead.contact_name || lead.email || "New contact"}</strong><small>{lead.service_requested || "Service not specified"} · {fmt(lead.created_at)}</small></span><span className={`status-pill ${lead.status==="qualified"||lead.status==="won"?"qualified":lead.priority==="hot"?"":"warm"}`}>{lead.status.replaceAll("_"," ")}</span><span className="lead-time">→</span></Link>) : <div className="py-8 text-center"><strong>No leads yet</strong><p className="text-xs text-slate-400">Create your first lead to populate this view.</p><Link className="gold-button mt-3" href="/dashboard/leads">Add a lead</Link></div>}</section><section className="surface ai-card"><div className="surface-heading"><h3>✦ &nbsp; AI Assistant</h3><span>Gemini powered</span></div><p>Turn incoming contractor enquiries into structured, scored leads with AI-assisted qualification.</p><Link href="/dashboard/ai">Open AI Assistant &nbsp; →</Link></section></div>
    <p className="mt-5 text-center text-[10px] text-slate-600">KING LEADFLOW AI · Independent agency-first platform</p>
  </div>;
}
