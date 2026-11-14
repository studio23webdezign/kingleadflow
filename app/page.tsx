import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Crown, Sparkles, UsersRound } from "lucide-react";

const capabilities = [
  { number: "01", title: "Capture every opportunity", description: "Bring website enquiries and campaign leads into one organised workspace.", icon: UsersRound },
  { number: "02", title: "Respond with context", description: "Use AI to structure enquiries, identify intent and prepare a reply for review.", icon: Sparkles },
  { number: "03", title: "Manage client workspaces", description: "Give agencies and contractor clients a clear view of leads and next steps.", icon: Building2 },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-6 sm:px-10 sm:py-8">
      <header className="flex items-center justify-between border-b border-white/[.07] pb-5">
        <Link href="/" className="flex items-center gap-3" aria-label="KING LEADFLOW AI home">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/30"><Crown size={21} fill="currentColor" /></span>
          <span><span className="block text-[13px] font-extrabold tracking-[.13em]">KING</span><span className="block text-[10px] font-semibold tracking-[.17em] text-blue-300">LEADFLOW AI</span></span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden rounded-full border border-blue-400/20 bg-blue-400/[.06] px-3 py-1.5 text-[10px] font-semibold tracking-wide text-blue-200 sm:inline-flex">EARLY ACCESS</span>
          <Link href="/login" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[.05] hover:text-white">Sign in</Link>
          <Link href="/signup" className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition hover:bg-blue-500">Get started <ArrowRight size={14} /></Link>
        </div>
      </header>

      <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.08fr_.92fr] lg:py-24">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/[.06] px-3 py-1.5 text-[10px] font-semibold tracking-[.14em] text-blue-200"><Sparkles size={12} /> THE AGENCY LEAD OPERATING SYSTEM</p>
          <h1 className="max-w-3xl text-[42px] font-semibold leading-[1.08] tracking-[-.045em] text-white sm:text-6xl xl:text-[68px]">Turn more enquiries into <span className="text-blue-300">real opportunities.</span></h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">One command centre for agencies managing contractor clients. Capture leads, qualify conversations and keep every follow-up moving.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500">Create your workspace <ArrowRight size={15} /></Link>
            <Link href="/login" className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/[.03] px-5 text-xs font-semibold text-slate-200 transition hover:bg-white/[.07]">Sign in to your account</Link>
          </div>
          <p className="mt-5 text-[10px] text-slate-600">Built for independent agencies and the contractor businesses they serve.</p>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-[36px] bg-blue-500/[.08] blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/[.09] bg-[#111c2e] p-5 shadow-2xl shadow-black/30 sm:p-6">
            <div className="flex items-center justify-between border-b border-white/[.07] pb-4">
              <div><p className="text-[9px] font-bold tracking-[.16em] text-slate-500">WORKSPACE PREVIEW</p><h2 className="mt-1 text-sm font-semibold text-white">Agency command centre</h2></div>
              <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[.06] px-2.5 py-1 text-[9px] font-semibold text-emerald-300">Live workspace view</span>
            </div>
            <div className="grid grid-cols-2 gap-3 py-4">
              {[["Total leads", "—"], ["Qualified", "—"], ["Contractor clients", "—"], ["Won opportunities", "—"]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.06] bg-white/[.025] p-3.5"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-white">{value}</p></div>)}
            </div>
            <div className="rounded-xl border border-white/[.06] bg-white/[.025] p-4">
              <div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-slate-200">Lead workflow</p><span className="text-[9px] text-slate-500">Product preview</span></div>
              <div className="mt-4 space-y-2.5">
                {["Capture enquiry", "AI qualification", "Human-reviewed follow-up"].map((item, index) => <div key={item} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-lg bg-blue-500/15 text-[9px] font-bold text-blue-200">0{index + 1}</span><span className="text-[10px] text-slate-300">{item}</span><CheckCircle2 size={13} className="ml-auto text-blue-300/70" /></div>)}
              </div>
            </div>
            <p className="mt-4 text-[9px] leading-5 text-slate-600">Illustrative preview only. Workspace figures populate after account setup and data connection.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 border-t border-white/[.07] py-8 md:grid-cols-3">
        {capabilities.map((item) => {
          const Icon = item.icon;
          return <article key={item.number} className="rounded-2xl border border-white/[.07] bg-[#111c2e]/70 p-5 transition hover:border-blue-400/20 hover:bg-[#111c2e]">
            <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-blue-300">{item.number}</span><Icon size={18} className="text-slate-500" /></div>
            <h2 className="mt-5 text-sm font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-[11px] leading-6 text-slate-400">{item.description}</p>
          </article>;
        })}
      </section>

      <footer className="flex flex-wrap justify-between gap-3 border-t border-white/[.07] py-5 text-[10px] text-slate-600">
        <span>© {new Date().getFullYear()} KING LEADFLOW AI</span><span>Independent product · Early access</span>
      </footer>
    </main>
  );
}
