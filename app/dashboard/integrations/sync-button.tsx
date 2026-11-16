"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function GmailSyncButton({ organizationId }: { organizationId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sync() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/google/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId, maxThreads: 15 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Gmail synchronization failed.");
      setMessage(`Synced ${result.syncedMessages} messages from ${result.threadsProcessed} threads.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gmail synchronization failed.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-4">
    <button type="button" onClick={sync} disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-4 text-xs font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
      <RefreshCw size={14} className={busy ? "animate-spin" : ""}/>
      {busy ? "Syncing mailbox…" : "Sync recent messages"}
    </button>
    {message && <p role="status" className="mt-2 text-xs text-slate-400">{message}</p>}
  </div>;
}
