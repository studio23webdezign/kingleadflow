"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, BarChart3, Building2, CalendarDays, ChevronDown, Crown, Headset, LayoutDashboard, Menu, Search, Settings, Sparkles, UsersRound, Workflow, X, Zap, Funnel } from "lucide-react";
import { RocketIllustration } from "./dashboard-illustrations";

const navigation = [
  { label:"WORKSPACE", items:[
    {href:"/dashboard",label:"Dashboard",icon:LayoutDashboard},
    {href:"/dashboard/leads",label:"Leads",icon:UsersRound},
    {href:"/dashboard/pipeline",label:"Pipeline",icon:Funnel},
    {href:"/dashboard/appointments",label:"Appointments",icon:CalendarDays},
  ]},
  { label:"GROWTH TOOLS", items:[
    {href:"/dashboard/analytics",label:"Analytics",icon:BarChart3},
    {href:"/dashboard/automations",label:"Automations",icon:Zap},
    {href:"/dashboard/ai",label:"AI Qualification",icon:Sparkles,accent:true},
    {href:"/dashboard/integrations",label:"Integrations",icon:Workflow},
    {href:"/dashboard/clients",label:"Clients",icon:Building2},
  ]},
  { label:"PREFERENCES", items:[
    {href:"/dashboard/settings",label:"Settings",icon:Settings},
    {href:"/dashboard/help",label:"Help & Support",icon:Headset},
  ]},
];

function Brand(){return <Link href="/dashboard" className="flex items-center gap-3 px-4 py-5" aria-label="KING LEADFLOW AI"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-gradient-to-br from-[#ffdf70] via-[#f5b82e] to-[#b87513] text-[#3b2500] shadow-lg shadow-amber-950/30"><Crown size={25} fill="currentColor" strokeWidth={1.7}/></span><span><span className="block text-[15px] font-extrabold tracking-[.12em] text-white">KING</span><span className="block text-[10px] font-semibold tracking-[.17em] text-cyan-300">LEADFLOW AI</span></span></Link>}

export function DashboardShell({children,email}:{children:ReactNode;email:string}){
 const pathname=usePathname();const [mobileOpen,setMobileOpen]=useState(false);const initials=email.slice(0,1).toUpperCase();const displayName=email.split("@")[0]||"Workspace member";
 const sidebar=<><Brand/><div className="mt-2 space-y-6 px-3 pb-4">{navigation.map(group=><section key={group.label}><p className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-slate-500">{group.label}</p><nav className="space-y-1">{group.items.map((item)=>{const active=item.href==="/dashboard"?pathname==="/dashboard":pathname===item.href||pathname.startsWith(item.href+"/");const Icon=item.icon;return <Link key={item.label} href={item.href} onClick={()=>setMobileOpen(false)} aria-current={active?"page":undefined} className={active?"group flex h-11 items-center gap-3 rounded-xl border border-blue-400/20 bg-gradient-to-r from-blue-600 to-violet-600 px-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30":"group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[.05] hover:text-white"}><Icon size={19} strokeWidth={2.1} className={active?"text-white":"text-slate-500 group-hover:text-slate-200"}/><span>{item.label}</span>{item.accent&&<span className="ml-auto rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-200">AI</span>}</Link>})}</nav></section>)}</div>
 <div className="mt-auto p-3"><div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#0b1b3a] via-[#111a43] to-[#24144b] p-3.5"><div className="flex justify-center"><RocketIllustration/></div><p className="mt-1 text-center text-sm font-semibold text-white">Upgrade to Pro</p><p className="mt-1 text-[10px] leading-5 text-slate-400">Unlock more leads, powerful AI tools and advanced features.</p><Link href="/dashboard/ai" className="mt-3 flex h-9 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-blue-500 text-[11px] font-semibold text-white shadow-lg shadow-blue-950/40">Explore AI <ArrowUpRight size={13}/></Link></div><div className="mt-4 flex items-center gap-3 rounded-xl border border-white/[.07] bg-white/[.025] p-3"><span className="grid size-9 place-items-center rounded-full border border-amber-300/30 bg-amber-400/10 text-xs font-bold text-amber-200">{initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-200">{displayName}</span><span className="block text-[10px] text-slate-500">Workspace member</span></span><ChevronDown size={14} className="text-slate-500"/></div></div></>;
 return <div className="min-h-screen bg-[#080f20] text-slate-100"><aside className="fixed inset-y-0 left-0 z-30 hidden w-[238px] flex-col border-r border-blue-300/[.09] bg-[#0a1428] lg:flex">{sidebar}</aside>{mobileOpen&&<div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" onClick={()=>setMobileOpen(false)} className="absolute inset-0 bg-black/70"/><aside className="relative flex h-full w-[290px] max-w-[85vw] flex-col overflow-y-auto border-r border-white/10 bg-[#0a1428] shadow-2xl"><button onClick={()=>setMobileOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 z-10 rounded-lg p-2 text-slate-400 hover:bg-white/10"><X size={19}/></button>{sidebar}</aside></div>}
 <div className="min-h-screen lg:pl-[238px]"><header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-blue-300/[.08] bg-[#080f20]/95 px-4 backdrop-blur-xl sm:px-7"><button onClick={()=>setMobileOpen(true)} aria-label="Open navigation" className="grid size-9 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 lg:hidden"><Menu size={19}/></button><form action="/dashboard/leads" method="get" role="search" className="hidden w-full max-w-[450px] items-center gap-3 rounded-2xl border border-blue-300/15 bg-[#0d1930] px-4 py-2.5 sm:flex"><Search size={18} className="shrink-0 text-slate-400"/><input name="q" type="search" aria-label="Search leads" placeholder="Search leads..." className="min-w-0 flex-1 bg-transparent text-xs text-slate-100 outline-none placeholder:text-slate-500"/></form><div className="ml-auto flex items-center gap-3 sm:gap-5"><div className="flex items-center gap-2 border-l border-white/[.08] pl-3 sm:pl-5"><span className="grid size-9 place-items-center rounded-full border border-amber-300/30 bg-gradient-to-br from-amber-400/25 to-violet-500/25 text-xs font-bold text-white">{initials}</span><span className="hidden max-w-[150px] sm:block"><span className="block truncate text-xs font-semibold text-slate-200">{displayName}</span><span className="block text-[10px] text-slate-500">Signed in</span></span><ChevronDown size={14} className="hidden text-slate-500 sm:block"/></div></div></header><main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8">{children}</main></div></div>;
}
