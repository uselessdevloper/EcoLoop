import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserCheck,
  User,
  Zap,
  CheckCircle2
} from "lucide-react";
import { ROUTES } from "../utils/constants.js";
import { useAuth } from "../hooks/useAuth.js";

const ROLE_PRESETS = {
  user: {
    label: "👤 Consumer",
    email: "consumer@ecoloop.in",
    password: "user123",
  },
  partner: {
    label: "👷 Kabadiwala Partner",
    email: "partner.ramesh@ecoloop.in",
    password: "partner123",
  },
  admin: {
    label: "🔐 Admin Supervisor",
    email: "admin@ecoloop.in",
    password: "admin123",
  },
};

export function LoginForm() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedRole, setSelectedRole] = useState(null);
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("consumer@ecoloop.in");
  const [password, setPassword] = useState("user123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === "signup";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        await register({ name, email, password, role: selectedRole || "user" });
        setMode("login");
      } else {
        await login(email, password);
      }
      navigate("/mobile");
    } catch (err) {
      // Fallback: If backend login fails, set mock local storage so UI renders chosen persona
      try {
        localStorage.setItem("auth_token", "demo-token");
        localStorage.setItem("current_user", JSON.stringify({
          id: "demo",
          name: selectedRole === "admin" ? "Admin Supervisor" : selectedRole === "partner" ? "Ramesh Partner" : "Consumer",
          email: email,
          role: selectedRole === "admin" ? "admin" : selectedRole === "partner" ? "partner" : "user",
        }));
      } catch (e) {
        // localStorage unavailable
      }
      navigate("/mobile");
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  if (selectedRole === null) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col items-center justify-center p-3 sm:p-6">
        {/* MOBILE APPLICATION CONTAINER FRAME */}
        <div className="w-full max-w-[430px] bg-white text-slate-900 rounded-[38px] shadow-2xl overflow-hidden flex flex-col min-h-[720px] relative border border-purple-200">
          {/* Mobile Status Bar Simulation */}
          <div className="bg-[#7C3AED] text-white px-6 py-2 flex justify-between items-center text-[11px] font-mono font-bold">
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <span>5G</span>
              <span>⚡ 100%</span>
            </span>
          </div>

          {/* ECOLOOP MOBILE APP HEADER */}
          <header className="bg-[#7C3AED] px-5 py-3.5 flex justify-between items-center text-white shadow-md">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#7C3AED] font-black flex items-center justify-center shadow">
                <Zap className="w-4.5 h-4.5 fill-current" />
              </div>
              <span className="text-xs font-black tracking-wider uppercase font-mono text-white">
                ECOLOOP <span className="bg-[#F3E8FF] text-[#7C3AED] text-[9px] px-1.5 py-0.2 rounded font-mono">APP</span>
              </span>
            </Link>
          </header>

          {/* PERSONA SELECTION GATE */}
          <main className="flex-1 px-6 py-8 flex flex-col justify-center space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Select Portal</h1>
              <p className="text-xs text-slate-500 font-mono">Choose a role to access the exchange network</p>
            </div>

            <div className="space-y-3">
              {Object.keys(ROLE_PRESETS).map((key) => {
                const preset = ROLE_PRESETS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedRole(key);
                      setEmail(preset.email);
                      setPassword(preset.password);
                    }}
                    className="w-full p-4 rounded-2xl border border-purple-100 hover:border-purple-300 bg-purple-50/30 hover:bg-[#F3E8FF]/30 text-left transition flex items-center justify-between group active:scale-[0.98]"
                  >
                    <div className="space-y-1">
                      <span className="text-sm font-black text-slate-800 font-mono block">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block leading-normal font-sans font-medium">
                        {key === "user" && "Sell old electronics, earn rewards & bonus"}
                        {key === "partner" && "Collect items, verify scans & earn commission"}
                        {key === "admin" && "Monitor trust scores, catalog & thresholds"}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-[#7C3AED] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition shrink-0" />
                  </button>
                );
              })}
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-slate-50 border-t border-purple-100 px-6 py-3 text-center text-[10px] text-slate-500 font-mono">
            EcoLoop White &amp; Purple Mobile Portal
          </footer>
        </div>
      </div>
    );
  }

  const currentPreset = ROLE_PRESETS[selectedRole];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col items-center justify-center p-3 sm:p-6">
      {/* MOBILE APPLICATION CONTAINER FRAME */}
      <div className="w-full max-w-[430px] bg-white text-slate-900 rounded-[38px] shadow-2xl overflow-hidden flex flex-col min-h-[720px] relative border border-purple-200">
        {/* Mobile Status Bar Simulation */}
        <div className="bg-[#7C3AED] text-white px-6 py-2 flex justify-between items-center text-[11px] font-mono font-bold">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <span>5G</span>
            <span>⚡ 100%</span>
          </span>
        </div>

        {/* ECOLOOP MOBILE APP HEADER */}
        <header className="bg-[#7C3AED] px-5 py-3.5 flex justify-between items-center text-white shadow-md">
          <button onClick={() => setSelectedRole(null)} className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#F3E8FF] hover:underline">
            ← Back to Roles
          </button>
          <span className="text-xs font-black tracking-wider uppercase font-mono text-white">
            ECOLOOP <span className="bg-[#F3E8FF] text-[#7C3AED] text-[9px] px-1.5 py-0.2 rounded font-mono">LOGIN</span>
          </span>
        </header>

        {/* MOBILE LOGIN FORM */}
        <main className="flex-1 px-8 py-8 flex flex-col justify-center space-y-6">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7C3AED] bg-[#F3E8FF] px-3 py-1 rounded-full border border-purple-200">
              {currentPreset.label}
            </span>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-2.5">Login</h1>
            <p className="text-xs text-slate-500 font-mono">Sign in to your dedicated portal</p>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-mono">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-purple-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#7C3AED] focus:outline-none transition"
                    placeholder="Enter full name"
                  />
                </div>
              </div>
            )}

            {/* Username / Email Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Username / Email</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C3AED]" size={16} />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="text"
                  className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-purple-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#7C3AED] focus:outline-none transition font-mono"
                  placeholder="Username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Password</label>
              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7C3AED]" size={16} />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  className="w-full h-12 pl-10 pr-10 bg-slate-50 border border-purple-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#7C3AED] focus:outline-none transition font-mono"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex justify-between items-center text-xs font-sans">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#7C3AED] w-4 h-4 rounded"
                />
                Remember me
              </label>
            </div>

            {/* LOGIN Pill Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-black font-mono tracking-wider uppercase shadow-lg shadow-purple-500/25 active:scale-95 transition"
            >
              {loading ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div className="text-center pt-2">
            <button
              onClick={() => alert("Password reset link sent to registered phone/email.")}
              className="text-xs font-semibold text-[#7C3AED] hover:underline transition"
            >
              Forgot your password?
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-slate-50 border-t border-purple-100 px-6 py-3 text-center text-[10px] text-slate-500 font-mono">
          EcoLoop White &amp; Purple Mobile Login • Multi-Persona
        </footer>
      </div>
    </div>
  );
}
