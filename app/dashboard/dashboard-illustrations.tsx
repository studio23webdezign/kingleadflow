import { Rocket, Target } from "lucide-react";

export function HeroRobot() {
  return (
    <svg viewBox="0 0 520 330" role="img" aria-label="Friendly crowned AI robot analysing lead performance" className="h-full w-full">
      <defs>
        <linearGradient id="robotShell" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset=".55" stopColor="#c9e8ff"/><stop offset="1" stopColor="#5aa9ff"/></linearGradient>
        <linearGradient id="robotBlue" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#25d7ff"/><stop offset="1" stopColor="#2457ff"/></linearGradient>
        <linearGradient id="screenGlow" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#086bff"/><stop offset="1" stopColor="#692cff"/></linearGradient>
        <filter id="robotShadow"><feGaussianBlur stdDeviation="10"/></filter>
      </defs>
      <ellipse cx="280" cy="302" rx="190" ry="17" fill="#08baff" opacity=".28" filter="url(#robotShadow)"/>
      <g opacity=".95">
        <rect x="324" y="86" width="150" height="108" rx="13" fill="url(#screenGlow)" stroke="#5acbff" strokeWidth="2"/>
        <path d="M345 166 L375 145 L401 151 L438 111" fill="none" stroke="#5de9ff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M428 111h12v12" fill="none" stroke="#5de9ff" strokeWidth="4" strokeLinecap="round"/>
        <rect x="347" y="169" width="12" height="13" rx="3" fill="#16d6ff"/><rect x="369" y="157" width="12" height="25" rx="3" fill="#16d6ff"/><rect x="391" y="143" width="12" height="39" rx="3" fill="#16d6ff"/><rect x="413" y="128" width="12" height="54" rx="3" fill="#16d6ff"/><rect x="435" y="115" width="12" height="67" rx="3" fill="#16d6ff"/>
      </g>
      <g transform="translate(80 20)">
        <path d="M155 33 L177 2 L201 32 L226 4 L231 49 L151 49Z" fill="#ffbd35" stroke="#ffe58b" strokeWidth="4" strokeLinejoin="round"/>
        <circle cx="177" cy="7" r="5" fill="#fff0a6"/><circle cx="226" cy="8" r="5" fill="#fff0a6"/>
        <rect x="112" y="54" width="166" height="136" rx="53" fill="url(#robotShell)" stroke="#7ccaff" strokeWidth="5"/>
        <rect x="129" y="73" width="132" height="97" rx="36" fill="#071b43" stroke="#318bff" strokeWidth="4"/>
        <path d="M164 119 Q171 105 179 119 M213 119 Q220 105 228 119" stroke="#16dfff" strokeWidth="7" fill="none" strokeLinecap="round"/>
        <path d="M181 139 Q197 151 213 139" stroke="#16dfff" strokeWidth="4" fill="none" strokeLinecap="round"/>
        <circle cx="116" cy="116" r="24" fill="url(#robotBlue)" stroke="#9beaff" strokeWidth="5"/><circle cx="286" cy="116" r="24" fill="url(#robotBlue)" stroke="#9beaff" strokeWidth="5"/>
        <rect x="164" y="187" width="66" height="26" rx="13" fill="#8bcaff"/>
        <path d="M144 198 Q104 206 90 254 L96 280 Q111 293 132 281 L164 223Z" fill="url(#robotShell)" stroke="#6cb9ff" strokeWidth="4"/>
        <path d="M247 197 Q281 190 310 149 L330 158 Q315 209 266 236 L240 222Z" fill="url(#robotShell)" stroke="#6cb9ff" strokeWidth="4"/>
        <circle cx="324" cy="151" r="15" fill="#d9efff" stroke="#6cb9ff" strokeWidth="4"/>
        <path d="M157 212 Q188 198 224 212 L244 286 Q204 307 150 286Z" fill="url(#robotShell)" stroke="#6cb9ff" strokeWidth="4"/>
        <circle cx="202" cy="240" r="18" fill="url(#robotBlue)" stroke="#a9eaff" strokeWidth="4"/>
        <path d="M158 281 Q146 299 119 298 L104 286 Q99 274 111 269 L144 267Z M246 282 Q260 300 284 298 L296 286 Q299 275 288 269 L259 267Z" fill="#174dba" stroke="#7acbff" strokeWidth="3"/>
        <path d="M337 157 L365 140" stroke="#d9f4ff" strokeWidth="8" strokeLinecap="round"/>
      </g>
      <g transform="translate(420 205)">
        <path d="M22 2 C-4 24 0 58 20 70 C39 58 44 24 22 2Z" fill="#22d69a"/><path d="M23 12 L22 67" stroke="#a4ffd9" strokeWidth="2"/>
        <path d="M0 34 C-17 20 -22 2 -10 -4 C8 1 17 17 17 39Z" fill="#38e8ad"/><path d="M26 37 C37 13 54 9 60 20 C58 39 42 50 25 51Z" fill="#15bd8b"/>
        <path d="M-5 65 H53 L46 101 H3Z" fill="#d9e9ff"/><ellipse cx="24" cy="65" rx="29" ry="7" fill="#fff"/>
      </g>
      <g fill="#b7eaff"><path d="M52 90l5 13 13 5-13 5-5 13-5-13-13-5 13-5Z"/><path d="M474 50l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z"/></g>
    </svg>
  );
}

export function RocketIllustration() {
  return <div className="relative grid size-20 place-items-center text-blue-200">
    <div className="absolute inset-2 rounded-full bg-blue-500/20 blur-xl" />
    <Rocket size={52} strokeWidth={1.5} className="relative -rotate-45 drop-shadow-[0_8px_15px_rgba(37,99,235,.55)]" />
    <span className="absolute bottom-1 left-1 text-amber-300">✦</span><span className="absolute right-0 top-1 text-cyan-200">✦</span>
  </div>;
}

export function TargetIllustration() {
  return <div className="relative grid size-28 place-items-center">
    <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl" />
    <Target size={96} strokeWidth={1.6} className="relative text-cyan-200 drop-shadow-[0_8px_20px_rgba(14,165,233,.4)]" />
    <span className="absolute right-1 top-2 rotate-[-35deg] text-3xl text-amber-300">➤</span>
  </div>;
}
