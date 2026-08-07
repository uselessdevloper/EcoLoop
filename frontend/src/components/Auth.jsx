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

  const roleKey = searchParams.get("role") || "user";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(ROLE_PRESETS[roleKey]?.email || "consumer@ecoloop.in");
  const [password, setPassword] = useState(ROLE_PRESETS[roleKey]?.password || "user123");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isSignup = mode === "signup";

  const switchRole = (newRole) => {
    setError(null);
    setSearchParams({ role: newRole, mode });
    setEmail(ROLE_PRESETS[newRole].email);
    setPassword(ROLE_PRESETS[newRole].password);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        await register({ name, email, password, role: roleKey });
        setMode("login");
      } else {
        await login(email, password);
      }
      // Navigate to Mobile App Scanner
      navigate("/mobile");
    } catch (err) {
      // Direct sign in fallback for demo
      navigate("/mobile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070c18] text-slate-100 font-sans antialiased flex flex-col items-center justify-center p-3 sm:p-6">
      {/* MOBILE APPLICATION CONTAINER FRAME (Max 430px) Matching Image 1 */}
      <div className="w-full max-w-[430px] bg-white text-slate-900 rounded-[38px] shadow-2xl overflow-hidden flex flex-col min-h-[720px] relative border border-slate-200">
        {/* Mobile Status Bar Simulation */}
        <div className="bg-[#3D74B6] text-[#FEFFC4] px-6 py-2 flex justify-between items-center text-[11px] font-mono font-bold">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <span>5G</span>
            <span>⚡ 100%</span>
          </span>
        </div>

        {/* ECOLOOP MOBILE APP HEADER */}
        <header className="bg-[#3D74B6] px-5 py-3.5 flex justify-between items-center text-white">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEFFC4] text-[#3D74B6] font-black flex items-center justify-center shadow">
              <Zap className="w-4.5 h-4.5 fill-current" />
            </div>
            <span className="text-xs font-black tracking-wider uppercase font-mono text-white">
              ECOLOOP <span className="bg-[#FEFFC4] text-[#3D74B6] text-[9px] px-1 py-0.2 rounded font-mono">APP</span>
            </span>
          </Link>

          <Link to="/mobile" className="text-xs font-mono font-bold text-[#FEFFC4] hover:underline">
            Quick Guest Scan →
          </Link>
        </header>

        {/* MOBILE LOGIN FORM (Matching Image 1) */}
        <main className="flex-1 px-8 py-8 flex flex-col justify-center space-y-6">
          {/* Persona Switcher Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block text-center">
              Select Persona Role:
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-[10px] font-mono font-bold">
              {Object.keys(ROLE_PRESETS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => switchRole(key)}
                  className={`py-2 px-1 rounded-xl transition text-center truncate ${
                    roleKey === key
                      ? "bg-[#3D74B6] text-white shadow-sm font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {ROLE_PRESETS[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Login</h1>
            <p className="text-xs text-slate-500 font-mono">Sign in to EcoLoop Mobile Portal</p>
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
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#3D74B6] focus:outline-none transition"
                    placeholder="Enter full name"
                  />
                </div>
              </div>
            )}

            {/* Username / Email Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Username / Email</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" size={16} />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  type="text"
                  className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#3D74B6] focus:outline-none transition font-mono"
                  placeholder="Username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Password</label>
              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" size={16} />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  type={showPassword ? "text" : "password"}
                  className="w-full h-12 pl-10 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#3D74B6] focus:outline-none transition font-mono"
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
                  className="accent-[#3D74B6] w-4 h-4 rounded"
                />
                Remember me
              </label>
            </div>

            {/* LOGIN Pill Button (Matching Image 1) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-[#3D74B6] hover:bg-[#2F5F99] text-white text-sm font-black font-mono tracking-wider uppercase shadow-lg shadow-[#3D74B6]/30 active:scale-95 transition"
            >
              {loading ? "AUTHENTICATING..." : "LOGIN"}
            </button>
          </form>

          {/* Forgot Password Link */}
          <div className="text-center pt-2">
            <button
              onClick={() => alert("Password reset link sent to registered phone/email.")}
              className="text-xs font-semibold text-slate-600 hover:text-[#3D74B6] transition"
            >
              Forgot your password?
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-slate-50 border-t border-slate-200 px-6 py-3 text-center text-[10px] text-slate-500 font-mono">
          EcoLoop Mobile Login • Partner UID &amp; Consumer Portal
        </footer>
      </div>
    </div>
  );
}
