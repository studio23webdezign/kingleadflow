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

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", userId);
  if (membershipError) throw new Error("We could not load your workspace memberships.");
  if (!memberships || memberships.length === 0) redirect("/onboarding");

  const accountEmail = typeof data?.claims?.email === "string" ? data.claims.email : "Verified user";
  const organizationIds = memberships.map((membership) => membership.organization_id);
  const { data: organizations, error: organizationError } = await supabase
    .from("organizations").select("id, name, kind, slug").in("id", organizationIds);
  if (organizationError) throw new Error("We could not load your workspaces.");

  return <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 sm:px-10">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
      <Link href="/" className="text-sm font-bold tracking-[0.18em]">KING <span className="text-lime-300">LEADFLOW</span> AI</Link>
      <form action={signOut}><button className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-lime-300/40">Sign out</button></form>
    </header>
    <section className="py-14">
      <p className="text-xs font-semibold tracking-[0.24em] text-lime-300">SECURE WORKSPACE</p>
      <h1 className="mt-3 text-4xl font-semibold">Your command centre</h1>
      <p className="mt-3 max-w-2xl text-slate-400">Your account and workspace membership are verified on the server.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard/clients" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-lime-300 hover:bg-white/5">Agency client directory →</Link><Link href="/dashboard/profile" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-lime-300 hover:bg-white/5">Contractor business profiles →</Link><Link href="/dashboard/leads" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-lime-300 hover:bg-white/5">Lead pipeline →</Link><Link href="/dashboard/ai" className="rounded-xl border border-lime-300/30 px-4 py-3 text-sm font-semibold text-lime-300 hover:bg-lime-300/10">AI receptionist →</Link></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><p className="text-sm text-slate-500">Account</p><p className="mt-2 break-all font-medium">{accountEmail}</p></div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"><p className="text-sm text-slate-500">Workspaces</p><p className="mt-2 text-2xl font-semibold">{organizations?.length ?? 0}</p></div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {organizations?.map((organization) => <article key={organization.id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-wider text-lime-300">{organization.kind}</p>
          <h2 className="mt-2 text-xl font-semibold">{organization.name}</h2>
          <p className="mt-1 text-sm text-slate-500">/{organization.slug}</p><Link href="/dashboard/leads" className="mt-4 inline-flex rounded-lg border border-lime-300/30 px-3 py-2 text-sm font-semibold text-lime-300 hover:bg-lime-300/10">Open lead pipeline →</Link>
        </article>)}
      </div>
    </section>
  </main>;
}
