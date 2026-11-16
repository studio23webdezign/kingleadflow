/* eslint-disable @typescript-eslint/no-explicit-any -- Gmail tables are introduced by this branch migration and are not yet present in generated Supabase database types. */

import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, Mail, ShieldCheck, Unplug } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GmailSyncButton } from "./sync-button";
import { GmailInbox } from "./inbox";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (typeof userId !== "string") redirect("/login");
  const { data: memberships } = await supabase.from("organization_memberships").select("organization_id,role").eq("user_id", userId);
  const organizationIds = (memberships ?? []).map((item) => item.organization_id);
  const db = supabase as any;
  const { data: connections } = organizationIds.length
    ? await db.from("email_connections").select("id,organization_id,provider_email,connected_at,status,last_sync_at").in("organization_id", organizationIds).eq("provider","google")
    : { data: [] };
  const connection = connections?.[0];
  const { data: syncedMessages } = connection
    ? await db.from("gmail_messages").select("id,provider_thread_id,subject,rfc_message_id,from_name,from_email,to_addresses,snippet,text_body,received_at,lead_id").eq("email_connection_id", connection.id).order("received_at", { ascending: false }).limit(100)
    : { data: [] };

  return <div className="mx-auto max-w-5xl space-y-7">
    <section>
      <p className="text-[10px] font-bold tracking-[.18em] text-blue-300">WORKSPACE SETTINGS</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[30px]">Email integrations</h1>
      <p className="mt-1.5 max-w-2xl text-sm text-slate-400">Connect your mailbox to bring conversations closer to your leads. Your credentials stay encrypted and server-side.</p>
    </section>
    {params.status === "connected" && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">Gmail connected successfully.</div>}
    {params.error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">Gmail connection could not be completed ({params.error}). Check the OAuth configuration and try again.</div>}
    <section className="rounded-2xl border border-white/[.08] bg-[#111c2e] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-red-500/10 text-red-300"><Mail size={23}/></span><div><h2 className="text-base font-semibold text-white">Gmail / Google Workspace</h2><p className="mt-1 text-xs text-slate-400">Connect a Google mailbox</p></div></div>
        {connection ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300"><CheckCircle2 size={13}/> Connected</span> : <span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200">Not connected</span>}
      </div>
      {connection ? <div className="mt-6 rounded-xl border border-white/[.07] bg-[#0b1220] p-4"><p className="text-sm font-semibold text-white">{connection.provider_email}</p><p className="mt-1 text-[11px] text-slate-500">Connected {new Date(connection.connected_at).toLocaleString()}</p><p className="mt-1 text-[11px] text-slate-500">{connection.last_sync_at ? `Last sync ${new Date(connection.last_sync_at).toLocaleString()}` : "No messages synced yet"}</p><p className="mt-3 text-xs text-slate-400">Sync recent conversations into this workspace. Outbound email is not enabled and nothing is sent automatically.</p><GmailSyncButton organizationId={connection.organization_id}/></div> : <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="max-w-xl text-xs leading-6 text-slate-400"><p>Google will ask you to approve mailbox access. AI-generated replies remain drafts and require your approval before sending.</p><p className="mt-2 inline-flex items-center gap-1.5 text-slate-500"><ShieldCheck size={13}/> OAuth tokens are encrypted at rest.</p></div><form action="/api/integrations/google/start" method="post"><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white transition hover:bg-blue-500"><Mail size={15}/> Connect Gmail</button></form></div>}
    </section>
    <section className="rounded-2xl border border-dashed border-white/[.1] bg-[#101a2a]/70 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-slate-700/40 text-slate-400"><Unplug size={20}/></span><div><h2 className="text-sm font-semibold text-white">Outlook / Microsoft 365</h2><p className="mt-1 text-xs text-slate-500">Microsoft mailbox integration</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700/50 px-3 py-1.5 text-[10px] font-semibold text-slate-300"><Clock3 size={12}/> Coming soon</span></div>
      <p className="mt-4 text-xs text-slate-500">Outlook is reserved in the integration roadmap. No Microsoft permissions or connection are requested.</p>
    </section>
  </div>;
}
