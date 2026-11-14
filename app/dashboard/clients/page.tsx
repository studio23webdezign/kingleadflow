import { redirect } from "next/navigation";
import { Building2, Check, Clock3, MailPlus, UsersRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { acceptClientInvitation, createClientInvitation, revokeClientInvitation, updateAgencyClient } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const s = await createClient();
  const { data: auth } = await s.auth.getClaims();
  const uid = auth?.claims?.sub;
  if (typeof uid !== "string") redirect("/login");
  const email = typeof auth?.claims?.email === "string" ? auth.claims.email.toLowerCase() : "";

  const { data: memberships, error: membershipError } = await s.from("organization_memberships").select("organization_id,role").eq("user_id", uid);
  if (membershipError) throw new Error("Could not load memberships.");
  const agencies = (memberships ?? []).filter((m) => m.role.startsWith("agency_"));
  const contractors = (memberships ?? []).filter((m) => m.role === "contractor_owner");
  const agencyIds = agencies.map((m) => m.organization_id);
  const contractorIds = contractors.map((m) => m.organization_id);

  const [linkedResult, invitationResult, incomingResult, contractorResult] = await Promise.all([
    agencyIds.length ? s.from("agency_clients").select("id,contractor_organization_id,display_name,status,created_at").in("agency_organization_id", agencyIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    agencyIds.length ? s.from("agency_client_invitations").select("id,agency_organization_id,invited_email,status,created_at,expires_at").in("agency_organization_id", agencyIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    email ? s.from("agency_client_invitations").select("id,agency_organization_id,status,expires_at").eq("invited_email", email).eq("status", "pending").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    contractorIds.length ? s.from("organizations").select("id,name").in("id", contractorIds) : Promise.resolve({ data: [] }),
  ]);
  if (linkedResult.error) throw new Error("Could not load connected clients.");
  const contractorWorkspaceIds = [...new Set((linkedResult.data ?? []).map((x) => x.contractor_organization_id))];
  const { data: organizations } = contractorWorkspaceIds.length ? await s.from("organizations").select("id,name").in("id", contractorWorkspaceIds) : { data: [] };
  const names = new Map((organizations ?? []).map((org) => [org.id, org.name]));
  const canInvite = agencies.filter((m) => ["agency_owner", "agency_admin", "agency_manager"].includes(m.role));

  return (
    <div className="space-y-7">
      <section>
        <p className="app-page-kicker">AGENCY MANAGEMENT</p>
        <h1 className="app-page-title">Client workspaces</h1>
        <p className="app-page-copy">Connect contractor businesses to your agency and manage their workspace access.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="app-surface p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><Building2 size={18} /></span><div><p className="text-[10px] text-slate-500">Connected clients</p><p className="text-xl font-semibold text-white">{linkedResult.data?.length ?? 0}</p></div></div></article>
        <article className="app-surface p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-amber-500/15 text-amber-300"><Clock3 size={18} /></span><div><p className="text-[10px] text-slate-500">Pending invitations</p><p className="text-xl font-semibold text-white">{(invitationResult.data ?? []).filter((item) => item.status === "pending").length}</p></div></div></article>
        <article className="app-surface p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300"><UsersRound size={18} /></span><div><p className="text-[10px] text-slate-500">Your contractor spaces</p><p className="text-xl font-semibold text-white">{contractorResult.data?.length ?? 0}</p></div></div></article>
      </section>

      {canInvite.length > 0 && (
        <section className="app-surface p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-500/15 text-blue-300"><MailPlus size={19} /></span><div><h2 className="text-sm font-semibold text-white">Invite a contractor</h2><p className="mt-1 text-[10px] text-slate-500">The invited owner must accept using the same email address.</p></div></div>
          <p className="mb-4 rounded-lg border border-amber-400/15 bg-amber-400/[.06] px-3 py-2.5 text-[10px] leading-5 text-amber-100/80">Invitations expire after 14 days. Automatic email delivery is not configured yet, so share the invitation with the recipient separately.</p>
          <div className="space-y-3">
            {canInvite.map((membership) => (
              <form key={membership.organization_id} action={createClientInvitation} className="flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="agencyId" value={membership.organization_id} />
                <input name="email" type="email" required placeholder="contractor@example.com" aria-label="Contractor email address" className="h-10 min-w-0 flex-1 rounded-xl app-field px-3 text-xs text-white placeholder:text-slate-600" />
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-500"><MailPlus size={14} /> Create invitation</button>
              </form>
            ))}
          </div>
        </section>
      )}

      {incomingResult.data && incomingResult.data.length > 0 && (
        <section className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.04] p-5">
          <div className="flex items-center gap-2"><Check size={17} className="text-emerald-300" /><h2 className="text-sm font-semibold text-white">Invitations addressed to {email}</h2></div>
          {incomingResult.data.map((invitation) => (
            <div key={invitation.id} className="mt-4 rounded-xl border border-white/[.08] bg-[#111c2e] p-4">
              <p className="text-xs text-slate-300">Agency invitation · expires {new Date(invitation.expires_at).toLocaleDateString()}</p>
              {contractorResult.data && contractorResult.data.length > 0 ? (
                <form action={acceptClientInvitation} className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input type="hidden" name="invitationId" value={invitation.id} />
                  <select name="contractorOrganizationId" required className="h-10 min-w-0 flex-1 rounded-xl app-field px-3 text-xs text-white">{contractorResult.data.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select>
                  <button className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-500">Accept invitation</button>
                </form>
              ) : <p className="mt-3 text-[11px] text-slate-400">Create a contractor workspace first, then return here to accept.</p>}
            </div>
          ))}
        </section>
      )}

      {agencyIds.length > 0 && (
        <section className="app-surface p-5 sm:p-6">
          <div className="mb-4"><h2 className="text-sm font-semibold text-white">Connected contractors</h2><p className="mt-1 text-[10px] text-slate-500">Update display names and workspace access status.</p></div>
          <div className="space-y-3">
            {(linkedResult.data ?? []).map((client) => (
              <form key={client.id} action={updateAgencyClient} className="grid gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <input type="hidden" name="clientId" value={client.id} />
                <label className="block text-[10px] font-medium text-slate-400">Client display name<input name="displayName" required minLength={2} maxLength={160} defaultValue={client.display_name} className="mt-2 h-9 w-full rounded-lg app-field px-3 text-xs text-white" /></label>
                <label className="block text-[10px] font-medium text-slate-400">Contractor workspace<input readOnly value={names.get(client.contractor_organization_id) ?? "Linked workspace"} className="mt-2 h-9 w-full rounded-lg app-field px-3 text-xs text-slate-300" /></label>
                <div className="flex gap-2">
                  <select name="status" defaultValue={client.status} aria-label="Client connection status" className="h-9 min-w-0 flex-1 rounded-lg app-field px-2 text-xs text-white"><option value="active">Active</option><option value="paused">Paused</option><option value="archived">Archived</option></select>
                  <button className="h-9 rounded-lg border border-blue-400/25 px-3 text-[10px] font-semibold text-blue-300 hover:bg-blue-500/10">Save</button>
                </div>
              </form>
            ))}
            {(!linkedResult.data || linkedResult.data.length === 0) && <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-xs text-slate-500">No contractor workspaces connected yet.</p>}
          </div>
        </section>
      )}

      {agencyIds.length > 0 && (
        <section className="app-surface p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-white">Invitation history</h2>
          <div className="mt-3 divide-y divide-white/[.06]">
            {(invitationResult.data ?? []).map((invitation) => (
              <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-xs">
                <span className="text-slate-300">{invitation.invited_email}<span className="ml-2 text-slate-500">· {invitation.status} · expires {new Date(invitation.expires_at).toLocaleDateString()}</span></span>
                {invitation.status === "pending" && <form action={revokeClientInvitation}><input type="hidden" name="invitationId" value={invitation.id} /><button className="text-[10px] font-semibold text-rose-300 hover:text-rose-200">Revoke invitation</button></form>}
              </div>
            ))}
            {(!invitationResult.data || invitationResult.data.length === 0) && <p className="py-4 text-[11px] text-slate-500">No invitations created.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
