import { useState } from "react";
import { formatDateTime } from "../utils/formatDate.js";
import { formatScore } from "../utils/formatScore.js";
import { REVIEW_DECISION } from "../utils/constants.js";
import {
  BarChart2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  FileText,
  Thermometer,
  Eye,
  EyeOff,
  ZoomIn,
  X,
  Sparkles,
} from "lucide-react";

export function DetectorMetrics({ metrics = [] }) {
  if (!metrics.length) {
    return (
      <div className="lab-card p-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-2">
          <BarChart2 size={16} className="text-sky-500" /> Detector Metrics
        </h3>
        <p className="text-slate-500 text-xs italic">No detector metrics logged.</p>
      </div>
    );
  }

  function getBarStyles(name, score, max) {
    const val = (score / max) * 100;
    const isRisk = name.toLowerCase().includes("fraud");
    const isConfidence = name.toLowerCase().includes("confidence");

    if (isConfidence) return "bg-sky-500";

    if (isRisk) {
      if (val >= 70) return "bg-rose-500";
      if (val >= 40) return "bg-amber-500";
      return "bg-emerald-500";
    } else {
      if (val < 50) return "bg-rose-500";
      if (val < 80) return "bg-amber-500";
      return "bg-emerald-500";
    }
  }

  return (
    <div className="lab-card p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
        <BarChart2 size={16} className="text-sky-500" /> Perception Pipeline Metrics
      </h3>

      <div className="space-y-3">
        {metrics.map((m) => {
          const max = m.unit === "%" ? 100 : 1;
          const pct = Math.min((m.score / max) * 100, 100);
          const barStyle = getBarStyles(m.name, m.score, max);

          return (
            <div key={m.name} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{m.name}</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {m.unit === "%" ? `${Math.round(m.score)}%` : formatScore(m.score)}
                  {m.unit && m.unit !== "%" ? ` ${m.unit}` : ""}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barStyle}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {m.description && <p className="text-[10px] text-slate-500">{m.description}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EvidenceTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <div className="lab-card p-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-2">
          <Activity size={16} className="text-sky-500" /> Evidence Audit Timeline
        </h3>
        <p className="text-slate-500 text-xs italic">No timeline events recorded.</p>
      </div>
    );
  }

  return (
    <div className="lab-card p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
        <Activity size={16} className="text-sky-500" /> Audit Trail Timeline
      </h3>

      <ol className="relative border-l border-slate-200 dark:border-slate-800 ml-2 space-y-4 pl-4 text-xs">
        {events.map((event, i) => (
          <li key={event.id ?? i} className="relative">
            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-sky-500 border-2 border-white dark:border-slate-900" />
            <div className="flex justify-between items-baseline">
              <span className="font-bold text-slate-800 dark:text-slate-200">{event.label}</span>
              <span className="font-mono text-[10px] text-slate-500">{formatDateTime(event.timestamp)}</span>
            </div>
            {event.description && <p className="text-[11px] text-slate-500 mt-0.5">{event.description}</p>}
            {event.user && <p className="text-[10px] text-slate-400 font-mono mt-0.5">Inspector: {event.user}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function FraudScore({ score = 0, showLabel = true, size = "md" }) {
  const normalised = Math.min(Math.max(score, 0), 100);
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const progress = circ * (1 - normalised / 100);

  const getScoreColor = (val) => {
    if (val >= 75) return "#ef4444";
    if (val >= 50) return "#f97316";
    if (val >= 25) return "#f59e0b";
    return "#10b981";
  };

  const color = getScoreColor(normalised);
  const dims = size === "sm" ? "w-16 h-16" : size === "lg" ? "w-32 h-32" : "w-24 h-24";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`${dims} relative`}>
        <svg viewBox="0 0 90 90" className="w-full h-full -rotate-90">
          <circle cx="45" cy="45" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-800" />
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={progress}
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{Math.round(normalised)}</span>
          <span className="text-[9px] text-slate-400 uppercase">/100</span>
        </div>
      </div>
      {showLabel && (
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
          Risk Score
        </span>
      )}
    </div>
  );
}

export function HeatmapViewer({
  imageUrl,
  heatmapUrl,
  region,
  alt = "Part under review",
  label = "AI Attention Hotspot",
}) {
  const [showOverlay, setShowOverlay] = useState(true);

  return (
    <div className="lab-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Thermometer size={16} className="text-sky-500" /> Visual SSIM Heatmap Overlay
        </h3>
        <button
          onClick={() => setShowOverlay((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
        >
          {showOverlay ? <EyeOff size={13} /> : <Eye size={13} />}
          {showOverlay ? "Hide Heatmap" : "Show Heatmap"}
        </button>
      </div>

      <div className="relative aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center p-2">
        <img src={imageUrl} alt={alt} className="w-full h-full object-contain" />
        {heatmapUrl && (
          <img
            src={heatmapUrl}
            alt="Heatmap overlay"
            className={`absolute inset-0 w-full h-full object-contain transition-opacity ${
              showOverlay ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {showOverlay && !heatmapUrl && region && (
          <div
            className="absolute border-2 border-rose-500 rounded bg-rose-500/20 shadow-md"
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.w}%`,
              height: `${region.h}%`,
            }}
          />
        )}
      </div>

      {label && <p className="text-center text-xs font-mono text-slate-500">{label}</p>}
    </div>
  );
}

export function ImageComparison({ goldenUrl, uploadedUrl, imageHash }) {
  const [zoom, setZoom] = useState(null);

  return (
    <div className="lab-card p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-sky-500" /> Side-by-Side Ingestion View
        </h3>
        {imageHash && <span className="font-mono text-[10px] text-slate-500">{imageHash}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Golden Reference</span>
          <div
            onClick={() => setZoom("golden")}
            className="relative aspect-square rounded-lg bg-slate-950 border border-slate-800 p-2 cursor-pointer group"
          >
            <img src={goldenUrl} alt="Golden" className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
              <ZoomIn size={20} />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Unit Under Test</span>
            <span className="text-[9px] text-rose-500 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-mono">ANOMALY MARKED</span>
          </div>
          <div
            onClick={() => setZoom("uploaded")}
            className="relative aspect-square rounded-lg bg-slate-950 border border-slate-800 p-2 cursor-pointer group"
          >
            <img src={uploadedUrl} alt="Uploaded" className="w-full h-full object-contain" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
              <ZoomIn size={20} />
            </div>
          </div>
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-pointer"
          onClick={() => setZoom(null)}
        >
          <img src={zoom === "golden" ? goldenUrl : uploadedUrl} alt="Zoom" className="max-w-full max-h-full object-contain rounded" />
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setZoom(null)}>
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
}

export function MetadataCard({ caseData = {}, extra = [] }) {
  const angleLabel = caseData.captureAngle
    ? caseData.captureAngle === "angled" || caseData.captureAngle === "side"
      ? `${caseData.captureAngle.toUpperCase()} (Multi-Angle Fusion)`
      : caseData.captureAngle.toUpperCase()
    : null;

  const rows = [
    { label: "Case ID", value: caseData.id },
    { label: "Part Code", value: caseData.partCode },
    { label: "Commodity", value: caseData.commodity },
    { label: "Capture Angle", value: angleLabel },
    { label: "Status", value: caseData.status?.replace(/_/g, " ") },
    { label: "Image Hash", value: caseData.imageHash },
    { label: "Neural Model", value: caseData.neuralModel },
    { label: "Updated", value: formatDateTime(caseData.updatedAt) },
    ...extra,
  ].filter((r) => r.value !== undefined && r.value !== null);

  return (
    <div className="lab-card p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
        <FileText size={16} className="text-sky-500" /> Case Inspection Metadata
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {rows.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-[10px] font-bold text-slate-500 uppercase">{label}</dt>
            <dd className="font-mono text-slate-800 dark:text-slate-200 truncate">{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function OCRResults({ results = [] }) {
  if (!results.length) {
    return (
      <div className="lab-card p-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2 mb-2">
          <FileText size={16} className="text-sky-500" /> OCR Label Verification
        </h3>
        <p className="text-slate-500 text-xs italic">No OCR fields detected.</p>
      </div>
    );
  }

  return (
    <div className="lab-card p-4 space-y-3">
      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
        <FileText size={16} className="text-sky-500" /> OCR Serial Verification
      </h3>

      <div className="divide-y divide-slate-200 dark:divide-slate-800/60 text-xs">
        {results.map((row, i) => (
          <div key={i} className="py-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{row.field}</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{row.extracted ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Expected</p>
                <p className="font-mono text-slate-500">{row.expected ?? "—"}</p>
              </div>
              {row.match === true ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              ) : row.match === false ? (
                <XCircle size={16} className="text-rose-500 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              )}
            </div>
            {row.mismatches && row.mismatches.length > 0 && (
              <div className="text-[10px] font-mono text-rose-500 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                Mismatch: {row.mismatches.map((m) => `Pos ${m.position}: expected '${m.expected}' got '${m.detected}'`).join("; ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecommendationCard({ recommendation, confidence, reasoning, flags = [] }) {
  return (
    <div className="lab-card p-4 space-y-2 border-l-4 border-l-sky-500">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-bold font-mono text-sky-600 dark:text-sky-400 uppercase">
            AI Decision Judge
          </span>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
            {recommendation || "Pending Evaluation"}
          </h3>
        </div>
        {confidence !== undefined && (
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
            {Math.round(confidence)}% confidence
          </span>
        )}
      </div>
      {reasoning && <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{reasoning}</p>}
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {flags.map((flag) => (
            <span key={flag} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
