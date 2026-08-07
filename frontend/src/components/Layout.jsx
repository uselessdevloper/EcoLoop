import { Link, NavLink, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Fingerprint, LogOut, Menu, UploadCloud, FileText, ShieldCheck, Activity, Settings, Sun, Moon, LayoutDashboard } from "lucide-react";
import { ROUTES } from "../utils/constants.js";
import { useAuth } from "../hooks/useAuth.js";
import { Loader } from "./Common.jsx";
import { useState, useEffect } from "react";
import UploadInspectionModal from "./UploadInspectionModal.jsx";

const NAV_ITEMS = [
  { to: ROUTES.TRIAGE, icon: LayoutDashboard, label: "Triage Queue", desc: "Live monitoring" },
  { to: ROUTES.CASE_DETAIL, icon: FileText, label: "Reports", desc: "Inspection detail" },
  { to: ROUTES.HUMAN_REVIEW, icon: ShieldCheck, label: "QA Review", desc: "Human review" },
  { to: ROUTES.ANALYTICS, icon: Activity, label: "Analytics", desc: "Fraud insights" },
];

function BrandMark({ compact = false }) {
  return (
    <Link to={ROUTES.TRIAGE} className="flex items-center gap-3 group min-w-0">
      <div className="h-9 w-9 flex items-center justify-center rounded-xl overflow-hidden bg-[#090d16] border border-sky-500/30 shadow-xs transition-transform group-hover:scale-105 shrink-0">
        <img src="/images/logo.png" alt="VeriVision Logo" className="w-full h-full object-cover" />
      </div>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-black tracking-widest text-slate-900 dark:text-white uppercase truncate">
            VERIVISION <span className="text-sky-500 font-extrabold">AI</span>
          </p>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
            Visual Hardware Verification
          </p>
        </div>
      )}
    </Link>
  );
}

function UserAvatar({ user }) {
  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 py-1 pl-1 pr-3">
      <div className="h-6 w-6 rounded-full bg-sky-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
        {initial}
      </div>
      <div className="leading-none hidden sm:block">
        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">{user.name}</p>
        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{user.role}</p>
      </div>
    </div>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
      document.documentElement.classList.remove("dark");
      document.body.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("theme-light");
      document.documentElement.classList.add("dark");
      document.body.classList.remove("light-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Brand + Navigation */}
        <div className="flex items-center gap-8">
          <BrandMark />

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                    }`
                  }
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Right: Controls & User */}
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-8 w-8 rounded-md flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu size={18} />
          </button>

          {/* Inspect / Upload CTA */}
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition shadow-xs"
          >
            <UploadCloud size={15} />
            <span>New Scan</span>
          </button>

          {user?.role === "admin" && (
            <Link
              to={ROUTES.CATALOG}
              className="hidden md:flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-semibold transition"
            >
              <Settings size={14} />
              <span>Catalog</span>
            </Link>
          )}

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-md border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {user && <UserAvatar user={user} />}

          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] px-4 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 p-2 rounded-md text-xs font-semibold ${
                      isActive
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>

          {user?.role === "admin" && (
            <Link
              to={ROUTES.CATALOG}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 p-2 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings size={16} />
              <span>Admin Calibration Catalog</span>
            </Link>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setIsUploadOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-600 text-white text-xs font-semibold"
            >
              <UploadCloud size={15} />
              <span>New Hardware Scan</span>
            </button>

            {user && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}

      <UploadInspectionModal open={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </header>
  );
}

export function Layout({ title, subtitle, actions, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-app text-slate-900 dark:text-slate-100 font-sans antialiased">
      <Header />
      {(title || subtitle || actions) && (
        <section className="mx-auto w-full max-w-[1440px] px-4 pt-6 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            {title && (
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </section>
      )}
      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 flex-1">{children}</main>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader fullPage label="Authenticating VeriVision session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return children;
}

export function Sidebar({ collapsed = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-56"
      } flex h-screen flex-shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] transition-all`}
    >
      <div className="border-b border-slate-200 dark:border-slate-800 p-3.5">
        <BrandMark compact={collapsed} />
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              <Icon size={16} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
        {user && !collapsed && (
          <div className="rounded-md bg-slate-100 dark:bg-slate-900 p-2 text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{user.name}</p>
            <p className="text-[9px] font-mono text-slate-500 uppercase">{user.role}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition"
        >
          <LogOut size={15} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

export function TopNavigation({ title, subtitle, actions }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090d16] px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          {title || "VERIVISION AI"}
        </p>
        {subtitle && <p className="truncate text-[10px] text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  );
}