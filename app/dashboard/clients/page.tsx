import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateAgencyClient } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") redirect("/login");
  const { data: memberships, error: membershipError } = await supabase.from("organization_memberships")
    .select("organization_id, role").eq("user_id", userId);
  if (membershipError) throw new Error("Could not load memberships.");
  const agencyIds = (memberships ?? []).filter((m) => m.role.startsWith("agency_")).map((m) => m.organization_id);
  if (!agencyIds.length) return <main className="mx-auto max-w-5xl px-6 py-12"><Link href="/dashboard" className="text-lime-300">← Dashboard</Link><h1 className="mt-8 text-3xl font-semibold">Agency clients</h1><p className="mt-3 text-slate-400">This directory is available to agency workspaces.</p></main>;
  const { data: links, error } = await supabase.from("agency_clients")
    .select("id, agency_organization_id, contractor_organization_id, display_name, status, created_at")
    .in("agency_organization_id", agencyIds).order("created_at", { ascending: false });
  if (error) throw new Error("Could not load agency clients.");
  const contractorIds = [...new Set((links ?? []).map((l) => l.contractor_organization_id))];
  const { data: orgs } = contractorIds.length ? await supabase.from("organizations").select("id, name").in("id", contractorIds) : { data: [] };
  const names = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  return <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
    <Link href="/dashboard" className="text-sm text-lime-300">← Dashboard</Link>
    <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-lime-300">AGENCY OPERATIONS</p>
    <h1 className="mt-2 text-4xl font-semibold">Client directory</h1>
    <p className="mt-3 text-slate-400">Manage contractor workspaces already connected to your agency. Changes are protected by workspace membership and database policies.</p>
    <div className="mt-8 space-y-4">
      {(links ?? []).map((client) => <form key={client.id} action={updateAgencyClient} className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input type="hidden" name="clientId" value={client.id}/>
        <label className="block text-sm text-slate-400">Client display name<input name="displayName" required minLength={2} maxLength={160} defaultValue={client.display_name} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"/></label>
        <label className="block text-sm text-slate-400">Contractor workspace<input readOnly value={names.get(client.contractor_organization_id) ?? "Linked workspace"} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-slate-300"/></label>
        <div className="flex gap-2"><select name="status" defaultValue={client.status} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select><button className="rounded-lg bg-lime-300 px-4 py-2 text-sm font-bold text-slate-950">Save</button></div>
      </form>)}
      {(!links || links.length === 0) && <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-slate-400">No contractor workspaces are linked yet. Secure invitations and connection approval are planned next.</div>}
    </div>
  </main>;
}
