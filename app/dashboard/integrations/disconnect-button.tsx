"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unplug } from "lucide-react";

export function GmailDisconnectButton({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function disconnect() {
    if (!window.confirm("Disconnect this Gmail mailbox from the workspace? Synced CRM messages and send audit records will remain, but mailbox access and sync will stop.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Gmail could not be disconnected.");
      if (!result.providerRevoked) setError(result.message);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gmail could not be disconnected.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-4">
    <button type="button" onClick={disconnect} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-400/20 px-3 text-[11px] font-semibold text-rose-300 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-50">
      <Unplug size={13} /> {busy ? "Disconnecting…" : "Disconnect Gmail"}
    </button>
    {error && <p role="status" className="mt-2 max-w-xl text-[10px] leading-5 text-amber-200">{error}</p>}
  </div>;
}
