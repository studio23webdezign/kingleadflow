import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, Mail, MessageSquareText, Sparkles, Target, Workflow } from "lucide-react";

const stages=[{name:"New leads",tone:"bg-sky-400"},{name:"Contacted",tone:"bg-violet-400"},{name:"Qualified",tone:"bg-amber-400"},{name:"Proposal",tone:"bg-emerald-400"},{name:"Won",tone:"bg-blue-400"}];

export function PipelinePanel({total,qualified,won}:{total:number;qualified:number;won:number}){
 const values=[total,Math.max(0,total-qualified),qualified,Math.max(0,qualified-won),won];
 const max=Math.max(1,...values);
 return <section className="kl-panel p-5 sm:p-6">
  <div className="mb-5 flex items-center justify-between gap-3"><div><p className="kl-eyebrow">Conversion engine</p><h2 className="mt-1 text-base font-semibold text-white">Lead pipeline</h2></div><Link href="/dashboard/leads" className="kl-text-link">View pipeline <ArrowUpRight size={14}/></Link></div>
  <div className="grid grid-cols-[minmax(0,1fr)_minmax(112px,.8fr)] items-center gap-4 sm:gap-7">
   <div className="space-y-2.5">{stages.map((stage,i)=><div key={stage.name} className="flex items-center gap-2.5"><span className={`h-3 w-3 shrink-0 rounded-full ${stage.tone}`}/><span className="min-w-0 flex-1 truncate text-xs text-slate-300">{stage.name}</span><span className="text-xs font-semibold tabular-nums text-white">{values[i].toLocaleString("en-ZA")}</span></div>)}</div>
   <div className="mx-auto flex w-full max-w-[180px] flex-col items-center gap-1.5" aria-label="Lead funnel visual">{[100,82,64,46,28].map((w,i)=><div key={w} className={`kl-funnel-stage ${stages[i].tone}`} style={{width:`${w}%`}}/>)}</div>
  </div>
  <p className="mt-4 border-t border-white/[.07] pt-3 text-[10px] text-slate-500">Live totals from your accessible contractor workspaces</p>
 </section>
}

export function QualificationPanel({qualified,total}:{qualified:number;total:number}){
 const rate=total?Math.round(qualified/total*100):0;
 return <section className="kl-panel relative overflow-hidden p-5 sm:p-6">
  <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-violet-600/15 blur-3xl"/>
  <div className="relative flex items-start justify-between gap-3"><div><p className="kl-eyebrow">Intelligence layer</p><h2 className="mt-1 text-base font-semibold text-white">AI lead qualification</h2><p className="mt-1 text-[11px] text-slate-400">Prioritise enquiries with AI assistance</p></div><span className="grid size-11 place-items-center rounded-2xl border border-violet-300/20 bg-violet-500/15 text-violet-200"><Sparkles size={21}/></span></div>
  <div className="relative mt-6 flex items-center gap-5"><div className="kl-score-ring" style={{"--score":`${rate}%`} as React.CSSProperties}><span>{rate}%</span></div><div><p className="text-sm font-semibold text-white">{qualified.toLocaleString("en-ZA")} qualified</p><p className="mt-1 text-[10px] leading-5 text-slate-400">of {total.toLocaleString("en-ZA")} total leads</p><p className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-300"><CheckCircle2 size={13}/> Based on current pipeline statuses</p></div></div>
  <Link href="/dashboard/ai" className="kl-action-button mt-6"><Target size={15}/> Open AI qualification <ArrowUpRight size={14}/></Link>
 </section>
}

export function IntegrationsPanel(){
 return <section className="kl-panel p-5 sm:p-6">
  <div className="mb-4 flex items-center justify-between"><div><p className="kl-eyebrow">Connected workspace</p><h2 className="mt-1 text-base font-semibold text-white">Integrations</h2></div><Workflow size={21} className="text-cyan-300"/></div>
  <div className="grid grid-cols-2 gap-3">
   <div className="kl-integration-card"><span className="grid size-10 place-items-center rounded-xl bg-white text-[#ea4335]"><Mail size={22}/></span><div className="mt-3 text-xs font-semibold text-white">Gmail</div><div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400"><Circle size={7}/> Connect account</div><Link href="/dashboard" className="mt-3 inline-flex text-[10px] font-semibold text-cyan-300">Setup available in integrations <ArrowUpRight size={12}/></Link></div>
   <div className="kl-integration-card opacity-75"><span className="grid size-10 place-items-center rounded-xl bg-[#dbeafe] text-[#1674ce]"><MessageSquareText size={22}/></span><div className="mt-3 text-xs font-semibold text-white">Outlook</div><div className="mt-1 text-[10px] text-amber-200">Coming soon</div><div className="mt-3 text-[10px] text-slate-500">Microsoft connection placeholder</div></div>
  </div>
 </section>
}
