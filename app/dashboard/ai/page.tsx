import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { qualifyInquiry } from "./actions";

export const dynamic = "force-dynamic";

export default async function AiQualificationPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") redirect("/login");

  const { data: memberships } = await supabase.from("organization_memberships")
    .select("organization_id,role").eq("user_id", userId);
  const ownIds = (memberships ?? []).filter((m) => ["contractor_owner","contractor_staff"].includes(m.role)).map((m) => m.organization_id);
  const agencyIds = (memberships ?? []).filter((m) => m.role.startsWith("agency_")).map((m) => m.organization_id);
  const [{ data: ownOrgs }, { data: links }] = await Promise.all([
    ownIds.length ? supabase.from("organizations").select("id,name").in("id", ownIds) : Promise.resolve({ data: [] }),
    agencyIds.length ? supabase.from("agency_clients").select("contractor_organization_id,display_name")
      .in("agency_organization_id", agencyIds).eq("status","active") : Promise.resolve({ data: [] }),
  ]);
  const linkedIds = [...new Set((links ?? []).map((link) => link.contractor_organization_id))];
  const { data: linkedOrgs } = linkedIds.length
    ? await supabase.from("organizations").select("id,name").in("id", linkedIds)
    : { data: [] };
  const workspaces = [...(ownOrgs ?? []), ...(linkedOrgs ?? [])]
    .filter((org, index, all) => all.findIndex((item) => item.id === org.id) === index);

  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <header className="flex items-center justify-between border-b border-white/10 pb-6">
      <Link href="/" className="text-sm font-bold tracking-[0.18em]">KING <span className="text-lime-300">LEADFLOW</span> AI</Link>
      <Link href="/dashboard" className="text-sm text-slate-300 hover:text-lime-300">← Command centre</Link>
    </header>
    <section className="py-10">
      <p className="text-xs font-semibold tracking-[0.2em] text-lime-300">AI RECEPTIONIST · SPRINT 6</p>
      <h1 className="mt-3 text-4xl font-semibold">Qualify an inquiry</h1>
      <p className="mt-3 max-w-2xl text-slate-400">Paste a website enquiry or customer message. Gemini extracts the lead details and drafts a reply; a transparent five-factor score is calculated by the application.</p>
      {params.error && <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-rose-200">{params.error === "workspace" ? "You do not have access to that active contractor workspace." : params.error === "save" ? "The lead could not be saved. Check workspace permissions." : params.error === "invalid" ? "Enter an inquiry between 10 and 8,000 characters." : params.error}</p>}
      <form action={qualifyInquiry} className="mt-8 max-w-3xl space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <label className="block text-sm text-slate-300">Contractor workspace
          <select name="contractorOrganizationId" required className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white">
            {(workspaces ?? []).map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
        </label>
        <label className="block text-sm text-slate-300">Customer inquiry
          <textarea name="message" required minLength={10} maxLength={8000} rows={9} placeholder="Hi, I'm looking for a quote to repair a leaking roof at my home in Durban North. My name is..." className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white"/>
        </label>
        <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 text-xs leading-6 text-slate-400">
          <p><strong className="text-slate-200">Privacy:</strong> inquiry text is sent to Gemini for processing with request storage disabled. Use test or consented customer information only.</p>
          <p><strong className="text-slate-200">Human review:</strong> suggested replies are drafts only. No email, WhatsApp message or appointment is sent or booked.</p>
        </div>
        <button disabled={!workspaces?.length} className="rounded-xl bg-lime-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">Extract, score and save lead</button>
        {!workspaces?.length && <p className="text-sm text-slate-500">Create a contractor workspace or link an active contractor client first.</p>}
      </form>
    </section>
  </main>;
}
