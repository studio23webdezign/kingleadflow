import Link from "next/link";
import { signUp } from "@/app/auth/actions";
type Props = { searchParams: Promise<{ error?: string; message?: string }> };
export default async function SignupPage({ searchParams }: Props) {
  const { error, message } = await searchParams;
  return <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
    <Link href="/" className="mb-10 text-sm font-bold tracking-[0.18em]">KING <span className="text-blue-300">LEADFLOW</span> AI</Link>
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8">
      <p className="text-xs font-semibold tracking-[0.24em] text-blue-300">EARLY ACCESS</p><h1 className="mt-3 text-3xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-slate-400">Set up your secure sign-in. Workspace onboarding comes next.</p>
      {message === "check-email" && <p role="status" className="mt-5 rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-sm text-blue-100">Check your inbox for the confirmation link before signing in.</p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error === "invalid" ? "Enter a valid email and a password of at least 8 characters." : "We could not create that account. The email may already be registered or signup may be unavailable."}</p>}
      <form action={signUp} className="mt-7 space-y-4">
        <label className="block text-sm text-slate-300">Email<input name="email" type="email" autoComplete="email" required maxLength={254} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400" /></label>
        <label className="block text-sm text-slate-300">Password<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400" /></label>
        <button className="w-full rounded-xl bg-blue-500 px-5 py-3 font-bold text-white">Create account</button>
      </form><p className="mt-6 text-sm text-slate-400">Already registered? <Link href="/login" className="font-semibold text-blue-300">Sign in</Link></p>
    </div>
  </main>;
}
