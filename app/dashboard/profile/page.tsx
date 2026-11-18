import { redirect } from "next/navigation";
import { BriefcaseBusiness, Globe2, MapPin, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { saveContractorProfile } from "./actions";

export const dynamic = "force-dynamic";

export default async function ContractorProfilePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (typeof userId !== "string") redirect("/login");
  const { data: memberships } = await supabase.from("organization_memberships").select("organization_id,role").eq("user_id", userId).eq("role", "contractor_owner");
  const ids = (memberships ?? []).map((m) => m.organization_id);
  const { data: orgs } = ids.length ? await supabase.from("organizations").select("id,name").in("id", ids) : { data: [] };
  const { data: profiles } = ids.length ? await supabase.from("contractor_profiles").select("*").in("organization_id", ids) : { data: [] };
  const profileByOrg = new Map((profiles ?? []).map((profile) => [profile.organization_id, profile]));

  return (
    <div className="space-y-7">
      <section>
        <p className="app-page-kicker">CONTRACTOR SETTINGS</p>
        <h1 className="app-page-title">Business profiles</h1>
        <p className="app-page-copy">Keep services, service areas and contact details accurate so AI qualification has the right business context.</p>
      </section>

      <div className="space-y-4">
        {(orgs ?? []).map((org) => {
          const profile = profileByOrg.get(org.id);
          return (
            <form key={org.id} action={saveContractorProfile} className="app-surface p-5 sm:p-6">
              <input type="hidden" name="organizationId" value={org.id} />
              <div className="mb-5 flex items-center gap-3 border-b border-white/[.06] pb-4">
                <span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><BriefcaseBusiness size={19} /></span>
                <div><h2 className="text-sm font-semibold text-white">{org.name}</h2><p className="mt-1 text-[10px] text-slate-500">Business information and service coverage</p></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-[11px] font-medium text-slate-300 md:col-span-2">Business name<input required name="businessName" minLength={2} maxLength={180} defaultValue={profile?.business_name ?? org.name} className="mt-2 h-10 w-full rounded-xl app-field px-3 text-xs text-white" /></label>
                <label className="block text-[11px] font-medium text-slate-300">Phone<input name="phone" defaultValue={profile?.phone ?? ""} className="mt-2 h-10 w-full rounded-xl app-field px-3 text-xs text-white" /></label>
                <label className="block text-[11px] font-medium text-slate-300"><span className="inline-flex items-center gap-1"><Globe2 size={12} /> Website</span><input name="website" type="url" defaultValue={profile?.website ?? ""} placeholder="https://" className="mt-2 h-10 w-full rounded-xl app-field px-3 text-xs text-white placeholder:text-slate-600" /></label>
                <label className="block text-[11px] font-medium text-slate-300 md:col-span-2">Services (comma or line separated)<textarea name="services" rows={3} defaultValue={(profile?.services ?? []).join(", ")} className="mt-2 w-full rounded-xl app-field px-3 py-2.5 text-xs text-white" /></label>
                <label className="block text-[11px] font-medium text-slate-300 md:col-span-2"><span className="inline-flex items-center gap-1"><MapPin size={12} /> Service areas (comma or line separated)</span><textarea name="serviceAreas" rows={3} defaultValue={(profile?.service_areas ?? []).join(", ")} className="mt-2 w-full rounded-xl app-field px-3 py-2.5 text-xs text-white" /></label>
                <label className="block text-[11px] font-medium text-slate-300 md:col-span-2">Timezone<input required name="timezone" defaultValue={profile?.timezone ?? "Africa/Johannesburg"} className="mt-2 h-10 w-full rounded-xl app-field px-3 text-xs text-white" /></label>
              </div>
              <div className="mt-5 flex justify-end border-t border-white/[.06] pt-4">
                <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-500"><Save size={14} /> Save business profile</button>
              </div>
            </form>
          );
        })}
        {(!orgs || orgs.length === 0) && <div className="app-surface flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><BriefcaseBusiness size={19} /></span><div><p className="text-sm font-semibold text-slate-100">No contractor business is connected yet</p><p className="mt-1 max-w-xl text-xs leading-6 text-slate-400">Business profiles belong to contractor workspaces. Your agency workspace can manage contractor businesses from Clients. Once a contractor client is connected, their profile can be configured here by an authorised contractor owner.</p></div></div><a href="/dashboard/clients" className="app-primary shrink-0 px-4 py-2.5 text-xs">Open client directory <span aria-hidden="true">→</span></a></div>}
      </div>
    </div>
  );
}
