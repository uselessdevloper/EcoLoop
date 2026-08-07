import { Link } from "react-router-dom";
import {
  ArrowRight,
  Cpu,
  ScanSearch,
  Fingerprint,
  ShieldCheck,
  Zap,
  Coins,
  Gift,
  Trophy,
  UserCheck,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Building2,
  RefreshCw,
  Award
} from "lucide-react";
import { ROUTES } from "../utils/constants.js";

const ecoloopIncentives = [
  {
    id: 1,
    title: "1. EcoPoints Rewards",
    tag: "CONSUMER INCENTIVE",
    description: "Earn EcoPoints for every item (Charger: 10, Router: 25, Phone: 500, Laptop: 1000) redeemable for movie tickets, food vouchers, & shopping discounts.",
    icon: Coins,
    badge: "500 PTS / Phone"
  },
  {
    id: 2,
    title: "2. Brand Exchange Bonus",
    tag: "SPONSORED BY BRANDS",
    description: "Get up to +₹1,500 extra value over normal buyback prices, funded by electronics manufacturers seeking EPR compliance & customer acquisition.",
    icon: Gift,
    badge: "+₹1,500 Bonus"
  },
  {
    id: 3,
    title: "3. GreenScore Impact",
    tag: "SUSTAINABILITY TRACKER",
    description: "Every kg of e-waste contributes to a personal GreenScore. Unlock tier rewards (Gold / Platinum) based on your landfill diversion.",
    icon: Trophy,
    badge: "4.2 kg Offset"
  },
  {
    id: 4,
    title: "4. Community Challenges",
    tag: "VIRAL ADOPTION",
    description: "Hostels, apartments, corporates, and colleges compete on sustainability leaderboards for fest sponsorships & community grants.",
    icon: Award,
    badge: "Hostel Leaderboard"
  },
];

const revenueStreams = [
  { name: "Refurbishment", pct: "45%", desc: "Buy → Repair → Resell phones, laptops, and tablets (Largest stream)." },
  { name: "Component Recovery", pct: "20%", desc: "Extract and resell high-value SSDs, RAM, AMOLED displays, and logic boards." },
  { name: "EPR Compliance Services", pct: "15%", desc: "Provide mandatory e-waste collection, documentation, and traceability for brands." },
  { name: "Material Recycling", pct: "10%", desc: "Extract precious industrial metals: Copper, Aluminum, Gold, and Silver." },
  { name: "Exchange Partnerships", pct: "10%", desc: "Brand-funded trade-in campaigns and co-marketing promotions." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070c18] text-slate-100 font-sans antialiased">
      {/* ECOLOOP NAVIGATION HEADER (Blue Orbit & Morning Lemon) */}
      <header className="sticky top-0 z-50 border-b border-[#2F5F99] bg-[#3D74B6] text-white shadow-lg">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <Link to={ROUTES.LANDING} className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-[#FEFFC4] text-[#3D74B6] border border-[#FEFFC4] flex items-center justify-center shadow-md">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <p className="text-sm font-black tracking-widest text-white uppercase font-mono flex items-center gap-1.5">
                ECOLOOP <span className="bg-[#FEFFC4] text-[#3D74B6] text-[9px] px-1.5 py-0.5 rounded font-mono font-bold">E-WASTE</span>
              </p>
              <p className="text-[10px] text-blue-100 font-mono">Incentive-Driven Circular Network</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/mobile">
              <button className="px-3.5 py-2 rounded-xl bg-[#FEFFC4] text-[#3D74B6] hover:bg-white text-xs font-black font-mono shadow-md flex items-center gap-1.5 transition">
                <Zap size={14} className="fill-current text-[#3D74B6]" />
                📱 Mobile AI Scanner
              </button>
            </Link>
            <Link to={`${ROUTES.LOGIN}?role=user`}>
              <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs font-bold font-mono transition">
                Operator Sign In
              </button>
            </Link>
            <Link to={`${ROUTES.LOGIN}?role=admin`}>
              <button className="px-3.5 py-2 rounded-xl bg-white text-[#3D74B6] hover:bg-blue-50 text-xs font-black font-mono shadow-md flex items-center gap-1 transition">
                Admin Portal <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero */}
      <main className="flex-1 max-w-[1360px] mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Hero Left */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEFFC4] border border-[#FEFFC4] text-[#3D74B6] text-xs font-mono font-black shadow-sm">
              <Sparkles size={14} /> Empowering Informal Kabadiwalas into a Formal Circular Economy
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Incentive-Driven E-Waste Exchange Platform
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              EcoLoop transforms India's informal kabadiwala network into a formal circular economy platform. By combining instant payouts, EcoPoints rewards, brand-funded exchange bonuses (+₹1,500), and EasyOCR + Gemini 2.5 Vision AI, we make responsible e-waste disposal more rewarding than the informal scrap market.
            </p>

            {/* ONE-LINE PITCH BANNER */}
            <div className="p-4 rounded-2xl bg-[#0b1426] border border-[#3D74B6]/50 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#FEFFC4] uppercase">ONE-LINE PITCH</span>
              <p className="text-xs text-slate-200 font-mono italic leading-relaxed">
                "EcoLoop empowers informal kabadiwalas with Partner UIDs and high-value buyers, giving consumers instant UPI payouts &amp; rewards while solving brand EPR compliance."
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/mobile">
                <button className="px-6 py-3.5 rounded-2xl bg-[#3D74B6] hover:bg-[#2F5F99] text-white text-sm font-black font-mono shadow-lg shadow-[#3D74B6]/30 border border-[#538ACD] flex items-center gap-2 transition active:scale-95">
                  <Zap size={18} className="text-[#FEFFC4]" /> Launch Mobile AI Scanner
                </button>
              </Link>
              <Link to={`${ROUTES.LOGIN}?role=user`}>
                <button className="px-5 py-3.5 rounded-2xl bg-[#0b1426] hover:bg-[#0e1930] text-slate-200 text-sm font-bold font-mono border border-[#3D74B6]/40 flex items-center gap-2 transition">
                  <UserCheck size={18} className="text-[#FEFFC4]" /> Kabadiwala Partner Portal
                </button>
              </Link>
            </div>
          </div>

          {/* Hero Right — LIVE ECOLOOP MODEL DIAGRAM CARD */}
          <div className="lg:col-span-5 bg-[#0b1426] border border-[#3D74B6] rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FEFFC4] text-[#3D74B6] font-bold flex items-center justify-center">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-mono">ECOLOOP CIRCULAR MODEL</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Consumer → Partner → AI Network</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                ● Live AI Network
              </span>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-2xl bg-[#060a14] border border-slate-800 space-y-1">
                <span className="text-[10px] text-rose-400 font-bold block">❌ Current Informal Model:</span>
                <p className="text-slate-400 text-[11px]">Consumer → Kabadiwala (Guesses Value) → Local Scrap Dealer</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#3D74B6]/20 border border-[#3D74B6] space-y-1.5">
                <span className="text-[10px] text-[#FEFFC4] font-bold block">✨ EcoLoop Circular Model:</span>
                <p className="text-white text-[11px] font-bold">
                  Consumer → Kabadiwala Partner (UID: KBD-9402) → EasyOCR + Gemini Vision AI → Refurbishers / Recyclers / Brands
                </p>
                <div className="pt-1 flex gap-2 text-[10px] text-slate-300">
                  <span className="bg-[#FEFFC4] text-[#3D74B6] px-2 py-0.5 rounded font-bold">Instant UPI</span>
                  <span className="bg-[#FEFFC4] text-[#3D74B6] px-2 py-0.5 rounded font-bold">+₹1,500 Bonus</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 flex justify-between items-center text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">VERIFIED PARTNERS</span>
                <strong className="text-white">1,420 Kabadiwalas</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">E-WASTE SAVED</span>
                <strong className="text-emerald-400">12,450 kg</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 4 PILLARS OF CONSUMER INCENTIVE ENGINE */}
        <section className="space-y-6 pt-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="px-3 py-1 rounded-full bg-[#FEFFC4] text-[#3D74B6] text-xs font-mono font-black uppercase">
              CONSUMER INCENTIVE ENGINE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Why Disposal with EcoLoop Wins Over Informal Scrap
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              Empowering consumers with higher perceived value, instant digital payments, and brand rewards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ecoloopIncentives.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="bg-[#0b1426] border border-[#3D74B6]/40 hover:border-[#3D74B6] rounded-3xl p-5 space-y-3 shadow-lg transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-2xl bg-[#3D74B6] text-[#FEFFC4] flex items-center justify-center shadow">
                      <Icon size={20} />
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-[#FEFFC4] text-[#3D74B6] text-[9px] font-mono font-black">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-mono">{item.title}</h3>
                    <p className="text-[10px] text-[#3D74B6] font-mono font-bold mt-0.5">{item.tag}</p>
                    <p className="text-xs text-slate-300 font-sans mt-2 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5 CIRCULAR REVENUE STREAMS */}
        <section className="bg-[#0b1426] border border-[#3D74B6] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-2">
            <div>
              <span className="px-3 py-1 rounded-full bg-[#FEFFC4] text-[#3D74B6] text-xs font-mono font-black uppercase">
                SUSTAINABLE REVENUE MODEL
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                5 Circular Economy Revenue Streams
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">100% Circular Recovery</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {revenueStreams.map((rev, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#060a14] border border-slate-800 space-y-2">
                <span className="text-2xl font-black font-mono text-[#FEFFC4] block">{rev.pct}</span>
                <h4 className="text-xs font-bold text-white font-mono">{rev.name}</h4>
                <p className="text-[11px] text-slate-400 leading-snug">{rev.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#090d16] py-6 text-center text-xs text-slate-400 font-mono">
        <p>EcoLoop — Incentive-Driven E-Waste Network &amp; Circular Economy Platform</p>
      </footer>
    </div>
  );
}
