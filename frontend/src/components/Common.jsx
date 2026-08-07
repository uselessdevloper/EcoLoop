// Common components: Badge, Button, EmptyState, Loader, Modal, Pagination, SearchBar, Table
import { Loader2, Search, X, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, ShieldAlert } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function Badge({ status, size = "md" }) {
  const normalized = (status || "").toString().toUpperCase();

  const configs = {
    // Clean / Approved
    "AUTO-APPROVED": {
      label: "AUTO-APPROVED",
      classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      icon: CheckCircle2,
    },
    CLEAN: {
      label: "CLEAN",
      classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      icon: CheckCircle2,
    },
    PASSED: {
      label: "PASSED",
      classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      icon: CheckCircle2,
    },

    // Warning / Pending QA
    "PENDING QA": {
      label: "PENDING QA",
      classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      icon: AlertTriangle,
    },
    WARNING: {
      label: "WARNING",
      classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      icon: AlertTriangle,
    },
    LOW: {
      label: "LOW RISK",
      classes: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
      icon: CheckCircle2,
    },

    // Mismatch / Retake
    "RETAKE REQUESTED": {
      label: "RETAKE REQUESTED",
      classes: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
      icon: AlertCircle,
    },
    MISMATCH: {
      label: "MISMATCH",
      classes: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25",
      icon: AlertCircle,
    },
    MEDIUM: {
      label: "MEDIUM RISK",
      classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      icon: AlertTriangle,
    },

    // Critical / Quarantine
    QUARANTINE: {
      label: "QUARANTINE",
      classes: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 font-bold",
      icon: ShieldAlert,
    },
    CRITICAL: {
      label: "CRITICAL",
      classes: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 font-bold",
      icon: ShieldAlert,
    },
    HIGH: {
      label: "HIGH RISK",
      classes: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 font-bold",
      icon: ShieldAlert,
    },
  };

  const current = configs[normalized] || {
    label: status || "UNKNOWN",
    classes: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
    icon: null,
  };

  const Icon = current.icon;
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"} font-semibold rounded-md border font-tech-code tracking-wide uppercase ${current.classes}`}
    >
      {Icon && <Icon size={isSm ? 11 : 13} className="shrink-0" />}
      {current.label}
    </span>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  className = "",
}) {
  const variants = {
    primary:
      "bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white border border-sky-500/30 shadow-sm",
    secondary:
      "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700",
    outline:
      "bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700",
    danger:
      "bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/30 shadow-sm",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/30 shadow-sm",
    ghost:
      "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs font-semibold",
    md: "px-4 py-2 text-sm font-semibold",
    lg: "px-5 py-2.5 text-base font-semibold",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-sans transition-all duration-150 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 size={15} className="animate-spin shrink-0" /> : icon}
      {children}
    </button>
  );
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title = "No data available",
  description = "There are no inspection records matching your criteria.",
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
        {typeof Icon === "string" ? (
          <span className="material-symbols-outlined text-2xl">{Icon}</span>
        ) : (
          <Icon size={24} />
        )}
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loader({ fullPage = false, size = "md", label = "Loading audit data…" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizes[size] ?? sizes.md} rounded-full border-sky-500/20 border-t-sky-500 animate-spin`}
      />
      {label && (
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium font-mono">
          {label}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-12">{spinner}</div>;
}

export function Modal({ open = false, onClose, title, children, footer, size = "md" }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/75 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`${sizes[size] ?? sizes.md} w-full lab-card bg-white dark:bg-[#0e1626] border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] animate-slide-up overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-4 w-1 rounded-full bg-sky-500 shrink-0" />
            {typeof title === "string" ? (
              <h2
                id="modal-title"
                className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate"
              >
                {title}
              </h2>
            ) : (
              <div id="modal-title" className="min-w-0">{title}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-slate-700 dark:text-slate-300">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
      <p className="text-slate-500 dark:text-slate-400">
        Showing <span className="font-tech-code text-slate-800 dark:text-slate-200">{start}–{end}</span> of{" "}
        <span className="font-tech-code text-slate-800 dark:text-slate-200">{totalItems}</span> records
      </p>
      <div className="flex items-center gap-1.5">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex items-center justify-center h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index}
            onClick={() => onPageChange(index + 1)}
            className={`h-8 w-8 rounded-md font-mono text-xs font-semibold transition ${
              currentPage === index + 1
                ? "bg-sky-600 text-white border border-sky-500"
                : "border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {index + 1}
          </button>
        ))}
        <button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex items-center justify-center h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search inspections by serial or ID..." }) {
  return (
    <div className="relative w-full">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full py-2 pl-9 pr-9 text-xs font-sans lab-input"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function Table({ columns = [], rows = [], onRowClick, emptyState = null, stickyHeader = true }) {
  if (!rows.length && emptyState) return emptyState;

  return (
    <div className="overflow-x-auto lab-card overflow-hidden">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className={`${stickyHeader ? "sticky top-0 z-10" : ""} bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800`}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap text-[10px]"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
          {rows.map((row, ri) => (
            <tr
              key={row.id ?? ri}
              onClick={() => onRowClick?.(row)}
              className={`transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/40 ${
                onRowClick ? "cursor-pointer" : ""
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 whitespace-nowrap text-slate-800 dark:text-slate-200">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}