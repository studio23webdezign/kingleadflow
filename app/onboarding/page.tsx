import Link from "next/link";
import { redirect } from "next/navigation";
import { createOrganization } from "@/app/onboarding/actions";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (authError || typeof userId !== "string") redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("organization_memberships").select("id").eq("user_id", userId).limit(1);
  if (membershipError) throw new Error("We could not verify your workspace membership.");
  if (memberships && memberships.length > 0) redirect("/dashboard");

  return <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-16">
    <header className="mb-8 flex items-center justify-between">
      <Link href="/" className="text-sm font-bold tracking-[0.18em]">KING <span className="text-lime-300">LEADFLOW</span> AI</Link>
      <form action={signOut}><button className="text-sm text-slate-400 hover:text-white">Sign out</button></form>
    </header>
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
      <p className="text-xs font-semibold tracking-[0.24em] text-lime-300">WORKSPACE SETUP</p>
      <h1 className="mt-3 text-3xl font-semibold">Create your workspace</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Start with your agency or contractor business. You can connect contractor clients after setup.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error === "invalid" ? "Check the name, slug, and workspace type." : error === "slug-taken" ? "That workspace URL is already in use. Choose another slug." : "We could not create the workspace. Please try again."}</p>}
      <form action={createOrganization} className="mt-7 space-y-4">
        <label className="block text-sm text-slate-300">Workspace name
          <input name="name" required minLength={2} maxLength={160} placeholder="Example Agency" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-lime-300" />
        </label>
        <label className="block text-sm text-slate-300">Workspace URL slug
          <input name="slug" required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="example-agency" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-lime-300" />
          <span className="mt-1 block text-xs text-slate-500">Lowercase letters, numbers, and hyphens only.</span>
        </label>
        <label className="block text-sm text-slate-300">Workspace type
          <select name="kind" defaultValue="agency" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-lime-300">
            <option value="agency">Marketing agency</option>
            <option value="contractor">Contractor business</option>
          </select>
        </label>
        <button className="w-full rounded-xl bg-lime-300 px-5 py-3 font-bold text-slate-950">Create workspace</button>
      </form>
    </div>
  </main>;
}
