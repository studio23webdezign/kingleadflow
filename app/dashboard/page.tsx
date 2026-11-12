import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") redirect("/login");
  const { data: memberships, error: membershipError } = await supabase.from("organization_memberships").select("organization_id, role").eq("user_id", userId);
  if (membershipError) throw new Error("We could not load your workspace memberships.");
  return <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 sm:px-10">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
      <Link href="/" className="text-sm font-bold tracking-[0.18em]">KING <span className="text-lime-300">LEADFLOW</span> AI</Link>
      <form action={signOut}><button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-lime-300/40">Sign out</button></form>
    </header>
    <section className="py-14"><p className="text-xs font-semibold tracking-[0.24em] text-lime-300">SECURE WORKSPACE</p>
      <h1 className="mt-3 text-4xl font-semibold">Your command centre</h1>
      <p className="mt-3 max-w-2xl text-slate-400">You are signed in. The next onboarding step will connect your account to an agency or contractor workspace.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><p className="text-sm text-slate-500">Account</p><p className="mt-2 break-all font-medium">{typeof data.claims.email === "string" ? data.claims.email : "Verified user"}</p></div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><p className="text-sm text-slate-500">Workspaces</p><p className="mt-2 text-2xl font-semibold">{memberships?.length ?? 0}</p></div>
      </div>
      {memberships?.length === 0 && <p className="mt-6 rounded-xl border border-lime-300/20 bg-lime-300/5 p-4 text-sm text-slate-300">No workspace has been assigned yet. Workspace creation and invitations will be added in the onboarding sprint.</p>}
    </section>
  </main>;
}
