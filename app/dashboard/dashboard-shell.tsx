"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/dashboard/leads", label: "Leads", icon: "users" },
  { href: "/dashboard/ai", label: "AI Assistant", icon: "sparkles" },
  { href: "/dashboard/clients", label: "Clients", icon: "building" },
  { href: "/dashboard/profile", label: "Business profiles", icon: "briefcase" },
];

function Glyph({ name, size = 19 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/><path d="M2 10 12 2l10 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></>,
    users: <><path d="M16 21v-1.5a4.5 4.5 0 0 0-4.5-4.5h-5A4.5 4.5 0 0 0 2 19.5V21z"/><circle cx="9" cy="7" r="4"/><path d="M16 3.2a4 4 0 0 1 0 7.6M17 15h.5a4.5 4.5 0 0 1 4.5 4.5V21h-4"/></>,
    sparkles: <><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z"/><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9zM5 2l.7 1.8L7.5 4.5l-1.8.7L5 7l-.7-1.8-1.8-.7 1.8-.7z"/></>,
    building: <><path d="M3 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16z"/><path d="M16 10h3a2 2 0 0 1 2 2v9h-5" /><path d="M7 7h2m3 0h1M7 11h2m3 0h1M7 15h2m3 0h1" stroke="#071326" strokeWidth="1.5" strokeLinecap="round"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="m16 16 5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></>,
    chart: <><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18" fill="none" stroke="#071326" strokeWidth="1.7" strokeLinecap="round"/><path d="M8 14h2m4 0h2m-8 3h2" stroke="#071326" strokeWidth="1.7" strokeLinecap="round"/></>,
    logout: <><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5v-2H5V5h5z"/><path d="m15 7 5 5-5 5v-3H9v-4h6z"/></>,
  };
  return <svg {...common}>{paths[name] ?? paths.sparkles}</svg>;
}

export function DashboardShell({ children, email }: { children: ReactNode; email: string }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/dashboard" className="brand-lockup"><span className="brand-crown">♛</span><span>KING</span><small>LEADFLOW AI</small></Link>
      <div className="sidebar-label">WORKSPACE</div>
      <nav className="side-nav">{nav.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}><Glyph name={item.icon}/><span>{item.label}</span>{active && <i/>}</Link>;
      })}</nav>
      <div className="upgrade-card"><span className="upgrade-crown">♛</span><strong>Upgrade to Pro</strong><p>Unlock more features and grow faster.</p><Link href="/dashboard/clients">Explore features <span>→</span></Link></div>
      <div className="sidebar-account"><div className="avatar">{email.slice(0,1).toUpperCase()}</div><div className="account-copy"><strong>{email.split("@")[0]}</strong><small>Marketing Agency</small></div></div>
      <Link href="/login" className="signout-link"><Glyph name="logout"/> Sign out</Link>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="mobile-brand">♛ <b>KING LEADFLOW AI</b></div><div className="searchbox"><Glyph name="search" size={20}/><span>Search leads, clients, or campaigns...</span><kbd>⌘ K</kbd></div><div className="topbar-right"><button className="icon-button" aria-label="Notifications"><Glyph name="bell" size={20}/><i/></button><div className="top-user"><div className="avatar">{email.slice(0,1).toUpperCase()}</div><div><strong>{email.split("@")[0]}</strong><small>Marketing Agency</small></div><span>⌄</span></div></div></header>
      <main className="dashboard-content">{children}</main>
    </div>
    <nav className="mobile-nav">{nav.slice(0,4).map((item) => <Link key={item.href} href={item.href} className={pathname === item.href ? "selected" : ""}><Glyph name={item.icon} size={20}/><span>{item.label === "AI Assistant" ? "AI" : item.label}</span></Link>)}</nav>
  </div>;
}
