import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Coins,
  Gift,
  UserCheck,
  Sparkles,
  Recycle,
  Smartphone,
  ChevronRight
} from "lucide-react";
import { ROUTES } from "../utils/constants.js";

export default function LandingPage() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      title: "Be Earth Wise",
      subtitle: "Turn informal e-waste into instant UPI payouts, brand exchange bonuses (+₹1,500), and EcoPoints rewards.",
      icon: "🌱",
      badge: "Incentive-Driven Network"
    },
    {
      title: "Empower Kabadiwalas",
      subtitle: "Convert informal scrap collectors into verified EcoLoop partners with UID verification and fixed pickup commissions.",
      icon: "🛵",
      badge: "Partner UID: KBD-9402"
    },
    {
      title: "EasyOCR & Vision AI",
      subtitle: "Sub-second brand identification for OnePlus, iPhones, Laptops, RAM, & SSDs with CPU-Z hardware verification.",
      icon: "⚡",
      badge: "Gemini 2.5 Flash AI"
    }
  ];

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 font-sans antialiased flex flex-col items-center justify-center p-3 sm:p-6">
      {/* MOBILE APPLICATION CONTAINER FRAME (Max 440px) */}
      <div className="w-full max-w-[430px] bg-[#0b1426] border border-[#3D74B6]/40 rounded-[38px] shadow-2xl overflow-hidden flex flex-col min-h-[760px] relative">
        {/* Mobile Status Bar Simulation */}
        <div className="bg-[#3D74B6] text-[#FEFFC4] px-6 py-2 flex justify-between items-center text-[11px] font-mono font-bold">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <span>5G</span>
            <span>⚡ 100%</span>
          </span>
        </div>

        {/* ECOLOOP MOBILE APP BRAND HEADER */}
        <header className="bg-[#3D74B6] px-5 py-4 flex justify-between items-center text-white border-b border-[#2F5F99]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FEFFC4] text-[#3D74B6] font-black flex items-center justify-center shadow">
              <Zap className="w-5.5 h-5.5 fill-current" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase font-mono text-white flex items-center gap-1">
                ECOLOOP <span className="bg-[#FEFFC4] text-[#3D74B6] text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">E-WASTE</span>
              </h1>
              <p className="text-[10px] text-blue-100 font-mono">Kabadiwala Exchange Layer</p>
            </div>
          </div>

          <Link
            to="/login"
            className="px-3 py-1.5 rounded-xl bg-[#FEFFC4] text-[#3D74B6] hover:bg-white text-xs font-black font-mono shadow-sm transition"
          >
            Sign In
          </Link>
        </header>

        {/* MOBILE ONBOARDING HERO CONTENT (Matches Image 2) */}
        <main className="flex-1 px-6 py-6 flex flex-col justify-between items-center text-center space-y-6">
          {/* Top Badge */}
          <span className="px-3 py-1 rounded-full bg-[#FEFFC4] text-[#3D74B6] text-[10px] font-mono font-black uppercase tracking-wider shadow-sm">
            {slides[slide].badge}
          </span>

          {/* Onboarding Graphic Box */}
          <div className="w-full h-56 rounded-3xl bg-gradient-to-br from-[#3D74B6]/20 via-[#060a14] to-[#3D74B6]/10 border border-[#3D74B6]/40 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group">
            <div className="text-6xl mb-2 animate-bounce duration-1000">
              {slides[slide].icon}
            </div>
            <div className="p-3 rounded-2xl bg-[#0b1426]/90 border border-[#3D74B6]/40 text-[11px] font-mono font-bold text-white max-w-[85%] shadow-lg">
              Consumer → Kabadiwala Partner → EcoLoop AI
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-2 max-w-xs">
            <h2 className="text-2xl font-black text-white tracking-tight">
              {slides[slide].title}
            </h2>
            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              {slides[slide].subtitle}
            </p>
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSlide(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  slide === idx ? "w-7 bg-[#3D74B6]" : "w-2.5 bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Primary Action Button (Matches Image 2 "Get Started") */}
          <div className="w-full space-y-2 pt-2">
            <button
              onClick={() => {
                if (slide < slides.length - 1) {
                  setSlide(slide + 1);
                } else {
                  navigate("/mobile");
                }
              }}
              className="w-full py-4 rounded-2xl bg-[#3D74B6] hover:bg-[#2F5F99] text-white text-sm font-black font-mono shadow-lg shadow-[#3D74B6]/30 border border-[#538ACD] flex items-center justify-center gap-2 active:scale-95 transition"
            >
              {slide < slides.length - 1 ? "Next Step" : "Get Started"} <ArrowRight size={16} />
            </button>

            <Link
              to="/mobile"
              className="block w-full text-center py-2 text-xs font-mono font-bold text-[#FEFFC4] hover:underline"
            >
              Skip Onboarding &amp; Open Scanner →
            </Link>
          </div>
        </main>

        {/* Mobile Bottom Footer */}
        <footer className="bg-[#070c18] border-t border-slate-800 px-6 py-3 text-center text-[10px] text-slate-400 font-mono">
          EcoLoop Mobile App • Certified Circular Economy
        </footer>
      </div>
    </div>
  );
}
