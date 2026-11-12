import Link from "next/link";

const capabilities = [
  { number: "01", title: "Capture every opportunity", description: "Bring website enquiries and campaign leads into one organised workspace." },
  { number: "02", title: "Respond with context", description: "An AI receptionist will qualify enquiries and collect the details your team needs." },
  { number: "03", title: "Move leads forward", description: "Give your agency and contractor clients a clear view of pipeline, follow-ups and outcomes." }
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10">
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <Link href="/" className="flex items-center gap-3" aria-label="KING LEADFLOW AI home">
          <span className="grid size-10 place-items-center rounded-xl bg-lime-300 font-black text-slate-950">K</span>
          <span className="text-sm font-bold tracking-[0.18em]">KING <span className="text-lime-300">LEADFLOW</span> AI</span>
        </Link>
        <span className="rounded-full border border-lime-300/25 px-3 py-1 text-xs font-medium text-lime-200">MVP IN DEVELOPMENT</span>
      </header>

      <section className="grid flex-1 items-center gap-14 py-20 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-6 text-xs font-semibold tracking-[0.28em] text-lime-300">THE AGENCY LEAD OPERATING SYSTEM</p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.06] tracking-tight sm:text-7xl">
            Turn more enquiries into <span className="text-lime-300">real opportunities.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
            One command centre for agencies managing contractor clients. Capture leads, qualify conversations and keep every follow-up moving.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <span className="rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-slate-950">Built for agencies</span>
            <span className="text-sm text-slate-500">Independent platform · Multi-client ready</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-white/10 pb-5">
            <div>
              <p className="text-xs text-slate-500">WORKSPACE PREVIEW</p>
              <h2 className="mt-1 font-semibold">Agency command centre</h2>
            </div>
            <span className="size-2 rounded-full bg-lime-300 shadow-[0_0_12px_#a3e635]" />
          </div>
          <div className="grid grid-cols-2 gap-3 py-5">
            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="text-xs text-slate-500">Contractor clients</p>
              <p className="mt-2 text-3xl font-semibold">—</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="text-xs text-slate-500">New leads</p>
              <p className="mt-2 text-3xl font-semibold">—</p>
            </div>
          </div>
          <div className="space-y-3">
            {["Lead capture", "AI qualification", "Follow-up pipeline"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-white/[0.07] px-4 py-3">
                <span className="grid size-7 place-items-center rounded-lg bg-lime-300/10 text-xs font-semibold text-lime-300">0{index + 1}</span>
                <span className="text-sm text-slate-300">{item}</span>
                <span className="ml-auto text-xs text-slate-600">Planned</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-600">Preview only. No customer data or live integrations are connected yet.</p>
        </div>
      </section>

      <section className="grid gap-4 border-t border-white/10 py-10 md:grid-cols-3">
        {capabilities.map((item) => (
          <article key={item.number} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <p className="text-xs font-semibold text-lime-300">{item.number}</p>
            <h2 className="mt-4 font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
          </article>
        ))}
      </section>

      <footer className="flex flex-wrap justify-between gap-3 border-t border-white/10 py-6 text-xs text-slate-600">
        <span>© {new Date().getFullYear()} KING LEADFLOW AI</span>
        <span>Independent product · Early development</span>
      </footer>
    </main>
  );
}