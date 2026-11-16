"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MailSearch, Search } from "lucide-react";

type Message = {
  id: string;
  provider_thread_id: string;
  subject: string;
  from_name: string | null;
  from_email: string;
  to_addresses: Array<{ name?: string | null; email?: string }>;
  snippet: string;
  text_body: string | null;
  received_at: string | null;
  lead_id: string | null;
};

export function GmailInbox({ messages }: { messages: Message[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const conversations = useMemo(() => {
    const grouped = new Map<string, Message[]>();
    for (const message of messages) {
      const items = grouped.get(message.provider_thread_id) ?? [];
      items.push(message);
      grouped.set(message.provider_thread_id, items);
    }
    return [...grouped.entries()].map(([id, items]) => ({
      id,
      messages: items.sort((a, b) => (a.received_at ?? "").localeCompare(b.received_at ?? "")),
      latest: [...items].sort((a, b) => (b.received_at ?? "").localeCompare(a.received_at ?? ""))[0],
    })).filter((thread) => {
      const haystack = [thread.latest.subject, thread.latest.from_email, thread.latest.from_name, thread.latest.snippet,
        ...thread.messages.map((message) => message.text_body ?? "")].join(" ").toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    }).sort((a, b) => (b.latest.received_at ?? "").localeCompare(a.latest.received_at ?? ""));
  }, [messages, query]);

  return <section className="overflow-hidden rounded-2xl border border-white/[.07] bg-[#111c2e]">
    <div className="flex flex-col gap-3 border-b border-white/[.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-sm font-semibold text-white">Mailbox conversations</h2><p className="mt-1 text-[10px] text-slate-500">{conversations.length} conversations · latest 100 synced messages</p></div>
      <label className="relative block w-full sm:max-w-xs"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sender, subject or message" className="h-9 w-full rounded-xl border border-white/10 bg-[#0b1220] pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"/></label>
    </div>
    {!conversations.length ? <div className="px-6 py-12 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white/[.04] text-slate-400"><MailSearch size={20}/></span><p className="mt-3 text-xs font-semibold text-slate-200">{query ? "No matching conversations" : "Your synced inbox is empty"}</p><p className="mt-1 text-[11px] text-slate-500">{query ? "Try another search term." : "Use Sync recent messages above to import conversations from Gmail."}</p></div> : <div className="divide-y divide-white/[.06]">
      {conversations.map((thread) => {
        const latest = thread.latest;
        const isOpen = expanded === thread.id;
        return <article key={thread.id}>
          <button type="button" onClick={() => setExpanded(isOpen ? null : thread.id)} aria-expanded={isOpen} className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-white/[.025]">
            <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-xs font-semibold text-blue-200">{(latest.from_name || latest.from_email || "M").slice(0,1).toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-xs font-semibold text-slate-100">{latest.from_name || latest.from_email}</span><span className="text-[10px] text-slate-500">{thread.messages.length} {thread.messages.length === 1 ? "message" : "messages"}</span>{latest.lead_id && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">Linked lead</span>}</span><span className="mt-1 block truncate text-xs font-medium text-slate-300">{latest.subject || "(no subject)"}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{latest.snippet || latest.text_body || "No preview available"}</span></span>
            <span className="flex shrink-0 items-center gap-2 text-[10px] text-slate-500">{latest.received_at ? new Date(latest.received_at).toLocaleDateString() : ""}{isOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
          </button>
          {isOpen && <div className="space-y-3 border-t border-white/[.05] bg-[#0b1220]/60 px-5 py-4 sm:pl-[4.25rem]">
            {thread.messages.map((message) => <div key={message.id} className="rounded-xl border border-white/[.07] bg-[#111c2e] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-semibold text-slate-200">{message.from_name || message.from_email}</p><p className="text-[10px] text-slate-500">{message.received_at ? new Date(message.received_at).toLocaleString() : "Date unavailable"}</p></div>
              <p className="mt-1 text-[10px] text-slate-500">To: {message.to_addresses?.map((address) => address.email).filter(Boolean).join(", ") || "Not available"}</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">{message.text_body || message.snippet || "Message body unavailable in the synced record."}</p>
            </div>)}
            <p className="text-[10px] text-slate-500">Read-only preview. Reply and send controls will be added with explicit recipient confirmation and approval logging.</p>
          </div>}
        </article>;
      })}
    </div>}
  </section>;
}
