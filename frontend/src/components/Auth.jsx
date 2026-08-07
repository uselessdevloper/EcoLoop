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
  CheckCircle2,
  ChevronRight,
  User,
} from "lucide-react";
import { ROUTES } from "../utils/constants.js";
import { useAuth } from "../hooks/useAuth.js";
import { Button } from "./Common.jsx";

const ROLE_PRESETS = {
  admin: {
    label: "Admin Workspace",
    email: "admin@verivision.com",
    password: "admin123",
  },
  user: {
    label: "Operator Workspace",
    email: "user@verivision.com",
    password: "user123",
  },
};

function GoogleGlyph() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function LoginForm() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = searchParams.get("role") === "admin" ? "admin" : "user";
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialMode === "login" ? ROLE_PRESETS[role].email : "");
  const [password, setPassword] = useState(initialMode === "login" ? ROLE_PRESETS[role].password : "");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const isSignup = mode === "signup";

  const switchMode = (newMode) => {
    setError(null);
    setMessage(null);
    setMode(newMode);
    setSearchParams({ role, mode: newMode });
  };

  const switchRole = (newRole) => {
    setError(null);
    setMessage(null);
    setSearchParams({ role: newRole, mode });
    setEmail(ROLE_PRESETS[newRole].email);
    setPassword(ROLE_PRESETS[newRole].password);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignup) {
        await register({ name, email, password, role });
        setMessage(`Account created for ${role === "admin" ? "Admin" : "Operator"} workspace! Please sign in.`);
        switchMode("login");
      } else {
        await login(email, password);
        navigate(role === "admin" ? ROUTES.TRIAGE : ROUTES.HUMAN_REVIEW);
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError(null);
    setMessage("Google OAuth sign-in is in UI preview mode. Please sign in with workspace credentials.");
  };

  const roleOptions = useMemo(
    () => [
      { key: "admin", label: "Admin Workspace", icon: ShieldCheck },
      { key: "user", label: "Operator Workspace", icon: Fingerprint },
    ],
    []
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 font-sans antialiased">
      {/* Header */}
      <header className="h-16 shrink-0 bg-[#090d16] border-b border-slate-800 px-6 flex justify-between items-center">
        <Link to={ROUTES.LANDING} className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl overflow-hidden bg-[#090d16] border border-sky-500/30 flex items-center justify-center shadow-md">
            <img src="/images/logo.png" alt="VeriVision Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs font-black tracking-widest text-white uppercase font-mono">
              VERIVISION <span className="text-sky-400">AI</span>
            </p>
            <p className="text-[10px] text-slate-400 font-mono">Visual Hardware Verification</p>
          </div>
        </Link>
        <Link
          to={ROUTES.LANDING}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-sky-400 transition"
        >
          Overview <ChevronRight size={14} />
        </Link>
      </header>

      {/* Main Form */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-4xl w-full bg-[#0e1626] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl grid grid-cols-1 md:grid-cols-12">
          {/* Left Column */}
          <div className="md:col-span-5 bg-[#0a0f1d] border-b md:border-b-0 md:border-r border-slate-800 p-7 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <h1 className="text-lg font-extrabold text-white leading-snug">
                  AI Hardware Verification &amp; Fraud Detection
                </h1>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  Scan hardware parts and verify quality against OEM reference standards.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">SSIM Visual Diff</p>
                    <p className="text-[11px] text-slate-400">Structural alignment &amp; anomaly detection</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Fuzzy OCR Serial Check</p>
                    <p className="text-[11px] text-slate-400">Serial &amp; revision tag distance matching</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">HITL Review Log</p>
                    <p className="text-[11px] text-slate-400">Interactive overrides &amp; audit trail</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-800/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>AUDIT SYSTEM</span>
              <span className="text-sky-400 font-bold">VERIVISION AI</span>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="md:col-span-7 p-7 sm:p-8 bg-[#0e1626] flex flex-col justify-center space-y-4">
            <div className="flex justify-between items-center mb-1">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 font-mono">
                  {isSignup ? "Create Access Account" : ROLE_PRESETS[role].label}
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  {isSignup ? `Register ${role === "admin" ? "Admin" : "Operator"}` : "Sign In"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => switchMode(isSignup ? "login" : "signup")}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
              >
                {isSignup ? "Sign In Instead" : "Create Account"}
              </button>
            </div>

            {/* Role Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#090d16] rounded-xl border border-slate-800">
              {roleOptions.map((item) => {
                const Icon = item.icon;
                const selected = role === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => switchRole(item.key)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition ${
                      selected
                        ? "bg-sky-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-xs text-rose-400">
                {error}
              </div>
            )}
            {message && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 text-xs text-emerald-400">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignup && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full h-10 pl-10 pr-3 bg-[#090d16] border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none transition"
                      placeholder="Inspector Name"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    className="w-full h-10 pl-10 pr-3 bg-[#090d16] border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none transition font-mono"
                    placeholder="user@verivision.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    className="w-full h-10 pl-10 pr-10 bg-[#090d16] border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none transition font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={<ArrowRight size={15} />}
                className="w-full mt-2 h-10"
              >
                {isSignup ? "Create Account" : "Sign In to Workspace"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-800" />
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400">OR</span>
              <div className="h-px flex-1 bg-slate-800" />
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleGoogleLogin}
              icon={<GoogleGlyph />}
              className="w-full h-10 bg-[#090d16] border-slate-700/80 hover:border-slate-600 text-slate-200"
            >
              Continue with Google
            </Button>
          </div>
        </div>
      </main>

      <footer className="h-12 shrink-0 border-t border-slate-800 px-6 flex justify-between items-center text-xs text-slate-400">
        <span>© 2026 VERIVISION AI — Precision Hardware Audit System</span>
      </footer>
    </div>
  );
}
