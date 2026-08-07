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
      image: "/images/be_earth_wise.png",
      badge: "Incentive-Driven Network"
    },
    {
      title: "Empower Kabadiwalas",
      subtitle: "Convert informal scrap collectors into verified EcoLoop partners with UID verification and fixed pickup commissions.",
      image: "/images/empower_kabadiwalas.png",
      badge: "Partner UID: KBD-9402"
    },
    {
      title: "EasyOCR & Vision AI",
      subtitle: "Sub-second brand identification for OnePlus, iPhones, Laptops, RAM, & SSDs with CPU-Z hardware verification.",
      image: "/images/easyocr_vision_ai.png",
      badge: "Advanced Vision AI"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col items-center justify-center p-3 sm:p-6">
      {/* MOBILE APPLICATION CONTAINER FRAME (White & Purple Theme) */}
      <div className="w-full max-w-[430px] bg-white border border-purple-200 rounded-[38px] shadow-2xl overflow-hidden flex flex-col min-h-[760px] relative">
        {/* Mobile Status Bar Simulation */}
        <div className="bg-[#7C3AED] text-white px-6 py-2 flex justify-between items-center text-[11px] font-mono font-bold">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <span>5G</span>
            <span>⚡ 100%</span>
          </span>
        </div>

        {/* ECOLOOP MOBILE APP BRAND HEADER */}
        <header className="bg-[#7C3AED] px-5 py-4 flex justify-between items-center text-white shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#F3E8FF] text-[#7C3AED] font-black flex items-center justify-center shadow">
              <Zap className="w-5.5 h-5.5 fill-current" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-wider uppercase font-mono text-white flex items-center gap-1">
                ECOLOOP <span className="bg-[#F3E8FF] text-[#7C3AED] text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">E-WASTE</span>
              </h1>
              <p className="text-[10px] text-purple-100 font-mono">Kabadiwala Exchange Layer</p>
            </div>
          </div>

          <Link
            to="/login"
            className="px-3 py-1.5 rounded-xl bg-[#F3E8FF] text-[#7C3AED] hover:bg-white text-xs font-black font-mono shadow-sm transition"
          >
            Sign In
          </Link>
        </header>

        {/* MOBILE ONBOARDING HERO CONTENT (Matches Image 2) */}
        <main className="flex-1 px-6 py-6 flex flex-col justify-between items-center text-center space-y-6">
          {/* Top Badge */}
          <span className="px-3.5 py-1 rounded-full bg-[#F3E8FF] text-[#7C3AED] border border-purple-200 text-[10px] font-mono font-black uppercase tracking-wider shadow-sm">
            {slides[slide].badge}
          </span>

          {/* Onboarding Graphic Box */}
          <div className="w-full h-56 rounded-3xl border border-purple-200 relative overflow-hidden shadow-inner group bg-slate-50 flex items-center justify-center">
            <img 
              src={slides[slide].image} 
              alt={slides[slide].title}
              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            />
            {/* Overlay tag for context */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 p-2 px-3 rounded-xl bg-white/95 backdrop-blur-sm border border-purple-100 text-[10px] font-mono font-black text-[#7C3AED] shadow-md truncate max-w-[90%]">
              {slide === 0 && "Sustainable E-Waste Recycling Flow"}
              {slide === 1 && "Verified Kabadiwala Pickups & Payouts"}
              {slide === 2 && "Real-time AI Inspection & Verification"}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-2 max-w-xs">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {slides[slide].title}
            </h2>
            <p className="text-xs text-slate-600 font-sans leading-relaxed">
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
                  slide === idx ? "w-7 bg-[#7C3AED]" : "w-2.5 bg-slate-300"
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
                  navigate("/login");
                }
              }}
              className="w-full py-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-black font-mono shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 active:scale-95 transition"
            >
              {slide < slides.length - 1 ? "Next Step" : "Get Started"} <ArrowRight size={16} />
            </button>

            <Link
              to="/login"
              className="block w-full text-center py-2 text-xs font-mono font-bold text-[#7C3AED] hover:underline"
            >
              Skip Onboarding &amp; Open Scanner →
            </Link>
          </div>
        </main>

        {/* Mobile Bottom Footer */}
        <footer className="bg-slate-50 border-t border-purple-100 px-6 py-3 text-center text-[10px] text-slate-500 font-mono">
          EcoLoop Mobile App • White &amp; Purple Theme
        </footer>
      </div>
    </div>
  );
}
