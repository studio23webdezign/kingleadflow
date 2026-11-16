"use client";

import { type FormEvent, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MailSearch, Search, Send, X } from "lucide-react";

type Message = {
  id: string;
  provider_thread_id: string;
  rfc_message_id: string | null;
  subject: string;
  from_name: string | null;
  from_email: string;
  to_addresses: Array<{ name?: string | null; email?: string }>;
  snippet: string;
  text_body: string | null;
  received_at: string | null;
  lead_id: string | null;
};

type Draft = { to: string; subject: string; textBody: string; threadId: string; approvalRequestId: string; inReplyTo?: string };

export function GmailInbox({ messages, organizationId, mailboxEmail }: {
  messages: Message[];
  organizationId: string;
  mailboxEmail: string;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

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

  function startReply(threadId: string, threadMessages: Message[]) {
    const latest = threadMessages[threadMessages.length - 1];
    const sentByMailbox = latest.from_email.toLowerCase() === mailboxEmail.toLowerCase();
    const recipient = sentByMailbox
      ? latest.to_addresses.find((address) => address.email?.toLowerCase() !== mailboxEmail.toLowerCase())?.email ?? ""
      : latest.from_email;
    const subject = /^re:/i.test(latest.subject) ? latest.subject : `Re: ${latest.subject}`;
    setDraft({ to: recipient, subject, textBody: "", threadId, approvalRequestId: draft.approvalRequestId, inReplyTo: latest.rfc_message_id ?? undefined });
    setConfirmed(false);
    setNotice(null);
  }

  async function sendApprovedEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !confirmed || sending) return;
    setSending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/integrations/google/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          approvalRequestId: draft.approvalRequestId,
          to: draft.to,
          subject: draft.subject,
          textBody: draft.textBody,
          ...(draft.inReplyTo ? { threadId: draft.threadId, inReplyTo: draft.inReplyTo } : {}),
          confirmRecipient: true,
          confirmSend: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The email could not be sent.");
      setNotice({ kind: "success", text: `Gmail accepted the email to ${draft.to}.` });
      setDraft(null);
      setConfirmed(false);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "The email could not be sent." });
    } finally {
      setSending(false);
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-white/[.07] bg-[#111c2e]">
    <div className="flex flex-col gap-3 border-b border-white/[.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 className="text-sm font-semibold text-white">Mailbox conversations</h2><p className="mt-1 text-[10px] text-slate-500">{conversations.length} conversations · latest 100 synced messages</p></div>
      <label className="relative block w-full sm:max-w-xs"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sender, subject or message" className="h-9 w-full rounded-xl border border-white/10 bg-[#0b1220] pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"/></label>
    </div>
    {notice && <div role="status" className={`mx-5 mt-4 rounded-xl border p-3 text-xs ${notice.kind === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-rose-400/20 bg-rose-400/10 text-rose-200"}`}>{notice.text}</div>}
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
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] text-slate-500">Replies are sent only after explicit recipient and send confirmation. Older messages without a stored Message-ID are sent as a new email with the reply subject.</p><button type="button" onClick={() => startReply(thread.id, thread.messages)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500"><Send size={13}/> Reply</button></div>
          </div>}
        </article>;
      })}
    </div>}
    {draft && <div className="border-t border-white/[.08] bg-[#0b1220] p-5">
      <div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-white">Review email before sending</h3><p className="mt-1 text-[10px] text-slate-500">This message will be sent from {mailboxEmail}.</p></div><button type="button" onClick={() => { setDraft(null); setConfirmed(false); }} aria-label="Close composer" className="rounded-lg p-2 text-slate-400 hover:bg-white/[.06]"><X size={16}/></button></div>
      <form onSubmit={sendApprovedEmail} className="space-y-3">
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-400">Recipient</span><input type="email" required maxLength={320} value={draft.to} onChange={(event) => { setDraft({ ...draft, to: event.target.value }); setConfirmed(false); }} className="h-10 w-full rounded-lg border border-white/10 bg-[#111c2e] px-3 text-xs text-white outline-none focus:border-blue-400/50"/></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-400">Subject</span><input required maxLength={998} value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} className="h-10 w-full rounded-lg border border-white/10 bg-[#111c2e] px-3 text-xs text-white outline-none focus:border-blue-400/50"/></label>
        <label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-400">Message</span><textarea required maxLength={100000} rows={7} value={draft.textBody} onChange={(event) => setDraft({ ...draft, textBody: event.target.value })} placeholder="Write your reply…" className="w-full resize-y rounded-lg border border-white/10 bg-[#111c2e] px-3 py-3 text-xs leading-6 text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50"/></label>
        <label className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[.06] p-3 text-[11px] leading-5 text-amber-100"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 accent-blue-500"/><span>I have checked the recipient and full message. I explicitly approve sending this email to <strong>{draft.to || "the entered recipient"}</strong>.</span></label>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-slate-500">The approval and delivery result are recorded in the workspace audit log.</p><button type="submit" disabled={!confirmed || sending || !draft.to || !draft.subject.trim() || !draft.textBody.trim()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"><Send size={13}/>{sending ? "Sending…" : `Send to ${draft.to || "recipient"}`}</button></div>
      </form>
    </div>}
  </section>;
}
