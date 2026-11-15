import Link from "next/link";
import { HeroRobot } from "@/app/dashboard/dashboard-illustrations";
import { signIn } from "@/app/auth/actions";
type Props = { searchParams: Promise<{ error?: string }> };
export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return <main className="app-auth-shell flex min-h-screen w-full flex-col justify-center px-5 py-12 sm:px-6"><div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]"><section className="hidden min-w-0 lg:block"><p className="app-auth-kicker">YOUR GROWTH, UNDER CONTROL</p><h2 className="mt-4 max-w-lg text-4xl font-bold leading-tight tracking-tight text-white">Turn every enquiry into your next opportunity.</h2><p className="mt-4 max-w-md text-sm leading-7 text-slate-400">A smarter workspace for lead capture, qualification and client growth.</p><div className="mt-6 h-72 max-w-xl"><HeroRobot /></div></section><section className="mx-auto w-full max-w-md">
    <Link href="/" className="app-auth-brand mb-8">KING <span className="text-blue-300">LEADFLOW</span> AI</Link>
    <div className="app-auth-panel p-6 sm:p-8">
      <p className="app-auth-kicker">WELCOME BACK</p><h1 className="app-auth-title">Sign in</h1>
      <p className="app-auth-copy">Access your agency workspace.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error === "invalid" ? "Enter a valid email and a password of at least 8 characters." : error === "confirmation" ? "That confirmation link could not be verified. Please try again." : "Email or password was not accepted."}</p>}
      <form action={signIn} className="mt-7 space-y-4">
        <label className="block text-sm text-slate-300">Email<input name="email" type="email" autoComplete="email" required maxLength={254} className="app-auth-field" /></label>
        <label className="block text-sm text-slate-300">Password<input name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128} className="app-auth-field" /></label>
        <button className="app-auth-submit">Sign in</button>
      </form>
      <p className="mt-6 text-sm text-slate-400">New here? <Link href="/signup" className="font-semibold text-blue-300">Create an account</Link></p>
    </div><p className="mt-6 text-center text-xs text-slate-600">Independent platform · Early access</p>
  </section></div></main>;
}
