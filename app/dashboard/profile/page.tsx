import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveContractorProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContractorProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") redirect("/login");
  const { data: memberships } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", userId).eq("role", "contractor_owner");
  const ids = (memberships ?? []).map((m) => m.organization_id);
  const { data: orgs } = ids.length ? await supabase.from("organizations").select("id, name").in("id", ids) : { data: [] };
  const { data: profiles } = ids.length ? await supabase.from("contractor_profiles").select("*").in("organization_id", ids) : { data: [] };
  const profileByOrg = new Map((profiles ?? []).map((p) => [p.organization_id, p]));
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
    <Link href="/dashboard" className="text-sm text-lime-300">← Dashboard</Link>
    <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-lime-300">CONTRACTOR SETTINGS</p>
    <h1 className="mt-2 text-4xl font-semibold">Business profiles</h1>
    <p className="mt-3 text-slate-400">Keep services, service areas and contact details accurate for lead qualification.</p>
    <div className="mt-8 space-y-6">
      {(orgs ?? []).map((org) => { const profile = profileByOrg.get(org.id); return <form key={org.id} action={saveContractorProfile} className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
        <input type="hidden" name="organizationId" value={org.id}/>
        <h2 className="text-xl font-semibold">{org.name}</h2>
        <label className="block text-sm text-slate-400">Business name<input required name="businessName" minLength={2} maxLength={180} defaultValue={profile?.business_name ?? org.name} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm text-slate-400">Phone<input name="phone" defaultValue={profile?.phone ?? ""} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"/></label><label className="block text-sm text-slate-400">Website<input name="website" type="url" defaultValue={profile?.website ?? ""} placeholder="https://" className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"/></label></div>
        <label className="block text-sm text-slate-400">Services (comma or line separated)<textarea name="services" rows={3} defaultValue={(profile?.services ?? []).join(", ")} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"/></label>
        <label className="block text-sm text-slate-400">Service areas (comma or line separated)<textarea name="serviceAreas" rows={3} defaultValue={(profile?.service_areas ?? []).join(", ")} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"/></label>
        <label className="block text-sm text-slate-400">Timezone<input required name="timezone" defaultValue={profile?.timezone ?? "Africa/Johannesburg"} className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"/></label>
        <button className="rounded-lg bg-lime-300 px-5 py-3 font-bold text-slate-950">Save business profile</button>
      </form>; })}
      {(!orgs || orgs.length === 0) && <p className="rounded-xl border border-white/10 p-6 text-slate-400">No contractor-owner workspace is available on this account.</p>}
    </div>
  </main>;
}
