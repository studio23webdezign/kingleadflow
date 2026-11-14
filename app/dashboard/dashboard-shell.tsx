"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  Crown,
  LayoutDashboard,
  Menu,
  Search,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

const navigation = [
  {
    label: "WORKSPACE",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/leads", label: "Lead pipeline", icon: UsersRound },
    ],
  },
  {
    label: "GROWTH TOOLS",
    items: [
      { href: "/dashboard/ai", label: "AI receptionist", icon: Sparkles, accent: true },
      { href: "/dashboard/clients", label: "Client workspaces", icon: Building2 },
      { href: "/dashboard/profile", label: "Business profiles", icon: BriefcaseBusiness },
    ],
  },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-5" aria-label="KING LEADFLOW AI">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-950/30">
        <Crown size={21} fill="currentColor" strokeWidth={1.7} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-extrabold tracking-[.13em] text-white">KING</span>
        <span className="block text-[10px] font-semibold tracking-[.17em] text-blue-300">LEADFLOW AI</span>
      </span>
    </Link>
  );
}

export function DashboardShell({ children, email }: { children: ReactNode; email: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = email.slice(0, 1).toUpperCase();
  const displayName = email.split("@")[0] || "Workspace member";

  const sidebar = (
    <>
      <Brand />
      <div className="mt-5 space-y-7 px-3">
        {navigation.map((group) => (
          <section key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-bold tracking-[.16em] text-slate-500">{group.label}</p>
            <nav className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={active
                      ? "group flex h-11 items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-500/15 px-3 text-sm font-semibold text-blue-200 shadow-sm"
                      : "group flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 transition hover:bg-white/[.05] hover:text-white"}
                  >
                    <Icon size={18} strokeWidth={2.1} className={active ? "text-blue-300" : "text-slate-500 group-hover:text-slate-200"} />
                    <span>{item.label}</span>
                    {item.accent && <span className="ml-auto rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-violet-300">AI</span>}
                    {active && !item.accent && <span className="ml-auto size-1.5 rounded-full bg-blue-400" />}
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-blue-400/15 bg-gradient-to-br from-blue-500/15 to-violet-500/10 p-4">
          <div className="mb-3 grid size-8 place-items-center rounded-lg bg-blue-500/20 text-blue-200">
            <Sparkles size={17} fill="currentColor" />
          </div>
          <p className="text-xs font-semibold text-white">Make every lead count</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Use AI qualification to prioritise the enquiries that matter.</p>
          <Link href="/dashboard/ai" onClick={() => setMobileOpen(false)} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300 hover:text-blue-200">
            Open AI receptionist <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-white/[.07] pt-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-blue-300/20 bg-blue-500/20 text-xs font-bold text-blue-100">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-slate-200">{displayName}</span>
            <span className="block text-[10px] text-slate-500">Workspace member</span>
          </span>
          <ChevronDown size={15} className="text-slate-500" />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-white/[.07] bg-[#0e1728] lg:flex">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/70" />
          <aside className="relative flex h-full w-[290px] max-w-[85vw] flex-col border-r border-white/10 bg-[#0e1728] shadow-2xl">
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="absolute right-3 top-5 z-10 rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={19} /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="min-h-screen lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-white/[.07] bg-[#0b1220]/90 px-4 backdrop-blur-xl sm:px-7">
          <button onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="grid size-9 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 lg:hidden">
            <Menu size={19} />
          </button>
          <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <span className="font-medium text-slate-300">KING LEADFLOW AI</span>
            <span>/</span>
            <span>{pathname === "/dashboard" ? "Overview" : navigation.flatMap((g) => g.items).find((i) => pathname.startsWith(i.href))?.label ?? "Workspace"}</span>
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <div className="hidden h-9 w-[230px] items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.03] px-3 text-xs text-slate-500 xl:flex">
              <Search size={15} />
              <span>Search your workspace</span>
              <kbd className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[9px]">⌘ K</kbd>
            </div>
            <span className="hidden rounded-full border border-emerald-400/15 bg-emerald-400/[.07] px-3 py-1.5 text-[10px] font-semibold text-emerald-300 sm:inline-flex">Workspace secure</span>
            <div className="flex items-center gap-2.5 border-l border-white/[.08] pl-3 sm:pl-5">
              <span className="grid size-9 place-items-center rounded-full border border-blue-300/20 bg-blue-500/20 text-xs font-bold text-blue-100">{initials}</span>
              <span className="hidden max-w-[150px] sm:block">
                <span className="block truncate text-xs font-semibold text-slate-200">{displayName}</span>
                <span className="block text-[10px] text-slate-500">Signed in</span>
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
