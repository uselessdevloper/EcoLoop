import { confidenceTone, toneClasses } from "../utils/statusColor.js";
import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, XCircle, Info, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "./Common.jsx";

const STEPS = [
  { key: "needs_evidence", label: "Needs Evidence" },
  { key: "retake_requested", label: "Retake Requested" },
  { key: "resubmitted", label: "Re-submitted" },
  { key: "final_decision", label: "Final Decision" },
];

export function ConfidenceBadge({ confidencePct }) {
  const tone = confidenceTone(confidencePct);
  return (
    <div className={`px-3 py-1.5 rounded-md border flex items-center gap-2 text-xs font-semibold ${toneClasses(tone)}`}>
      <AlertTriangle size={15} />
      <span className="font-mono uppercase">
        AI Confidence: {confidencePct}% — {confidencePct < 50 ? "Below Threshold (Review Required)" : "Human Verification Recommended"}
      </span>
    </div>
  );
}

export function CaseVelocity({ targetMinutes, elapsedMinutes }) {
  const remaining = Math.max(targetMinutes - elapsedMinutes, 0);
  const pct = Math.min((elapsedMinutes / targetMinutes) * 100, 100);
  return (
    <div className="lab-card p-4">
      <div className="flex justify-between items-center mb-1.5 text-xs font-mono">
        <span className="font-bold text-slate-500 uppercase">Audit SLA Velocity</span>
        <span className="text-sky-600 dark:text-sky-400 font-bold">{remaining.toFixed(1)}m remaining</span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${pct >= 100 ? "bg-rose-500" : "bg-sky-500"} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500 mt-2 font-mono">
        Target SLA resolution: &lt; {targetMinutes} minutes per inspection case.
      </p>
    </div>
  );
}

export function CaseStatusTracker({ status }) {
  let activeIndex = STEPS.findIndex((s) => s.key === status);
  if (status === "completed" || status === "approved" || status === "rejected") {
    activeIndex = 3;
  }

  return (
    <div className="lab-card p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {STEPS.map((step, i) => {
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;
          return (
            <div
              key={step.key}
              className={`flex items-center gap-2 flex-1 ${!isActive && !isDone ? "opacity-40" : ""}`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
                  isActive || isDone
                    ? "bg-sky-600 text-white border-sky-500"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-xs font-semibold ${isActive ? "text-sky-600 dark:text-sky-400 font-bold" : "text-slate-600 dark:text-slate-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EvidencePanel({ caseData, region, onRegionChange, onRegionCommit, learningStatus }) {
  if (!caseData) return null;

  const isFull = (r) => !r || (r.w >= 90 && r.h >= 90) || (r.x <= 2 && r.y <= 2 && r.w >= 95);
  const currentRegion = isFull(region) ? { x: 20, y: 30, w: 60, h: 40 } : region;

  return (
    <div className="lab-card p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={14} className="text-sky-500" /> Interactive Anomaly ROI &amp; Active Learning Workbench
        </h2>
        <span className="font-mono text-[10px] text-slate-500">HASH: {caseData.imageHash || "N/A"}</span>
      </div>

      {/* Target Inspection Unit (Single Defective Image View with ROI Box) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Target Defective Unit Under Inspection
          </span>
          <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            [ Drag &amp; Resize Box to Calibrate AI Training Memory ]
          </span>
        </div>
        <div className="relative w-full h-[420px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-2">
          <img
            className="w-full h-full object-contain rounded pointer-events-none select-none"
            alt="Uploaded target scan"
            src={caseData.uploadedImageUrl}
          />
          <div className="absolute inset-0 p-2 pointer-events-auto">
            <ROIEditor
              region={currentRegion}
              onChange={onRegionChange}
              onCommit={onRegionCommit}
              learningStatus={learningStatus}
              label="HUMAN_VERIFIED_ANOMALY_ROI"
            />
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="flex gap-2 items-center text-slate-600 dark:text-slate-400">
          <Info size={15} className="text-sky-500 shrink-0" />
          <span>
            Drag &amp; resize the blue dashed ROI box to mark defect location. Saved ROIs update active learning training memory. Model:{" "}
            <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">{caseData.neuralModel || "FraudSense v4.2"}</span>
          </span>
        </div>
        {learningStatus === "learning" && (
          <span className="text-sky-500 text-xs font-bold font-mono animate-pulse flex items-center gap-1">
            <RefreshCw size={13} className="animate-spin" /> Ingesting ROI Vector…
          </span>
        )}
      </div>
    </div>
  );
}

const DECISIONS = [
  {
    key: "approved",
    label: "Approve Inspection",
    icon: CheckCircle2,
    variant: "success",
  },
  {
    key: "rejected",
    label: "Quarantine / Reject",
    icon: XCircle,
    variant: "danger",
  },
  {
    key: "needs_more_evidence",
    label: "Request Retake Scan",
    icon: Clock,
    variant: "outline",
  },
];

export function ReviewDecision({ onDecide, pending, lastResult }) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      {DECISIONS.map((d) => {
        const Icon = d.icon;
        const isPending = pending === d.key;
        const justConfirmed = !pending && lastResult?.decision === d.key;

        return (
          <Button
            key={d.key}
            variant={d.variant}
            size="md"
            disabled={Boolean(pending)}
            onClick={() => onDecide(d.key)}
            loading={isPending}
            icon={<Icon size={16} />}
            className="w-full justify-center"
          >
            {justConfirmed ? "Decision Confirmed" : d.label}
          </Button>
        );
      })}
    </div>
  );
}

export function ReviewerComment({ value, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        Inspector Audit Notes & Justification
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-32 p-3 text-xs lab-input resize-none font-sans"
        placeholder="Enter audit rationale for decision log..."
      />
    </div>
  );
}

export function ROIEditor({ region, onChange, onCommit, learningStatus, label = "AI_DETECTION_ROI" }) {
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStateRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

  const startDrag = (e, mode) => {
    e.stopPropagation();
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    dragStateRef.current = {
      mode, // "move" | "resize"
      startX: clientX,
      startY: clientY,
      startRegion: { ...region },
      containerWidth: rect.width || 1,
      containerHeight: rect.height || 1,
    };

    isDraggingRef.current = true;
    setIsDragging(true);

    const handleWindowMove = (moveEvent) => {
      if (!isDraggingRef.current || !dragStateRef.current) return;

      const currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;

      const dxPct = ((currentX - dragStateRef.current.startX) / dragStateRef.current.containerWidth) * 100;
      const dyPct = ((currentY - dragStateRef.current.startY) / dragStateRef.current.containerHeight) * 100;

      const start = dragStateRef.current.startRegion;

      if (dragStateRef.current.mode === "move") {
        const x = clamp(start.x + dxPct, 0, 100 - start.w);
        const y = clamp(start.y + dyPct, 0, 100 - start.h);
        onChange({ ...start, x, y });
      } else if (dragStateRef.current.mode === "resize") {
        const w = clamp(start.w + dxPct, 5, 100 - start.x);
        const h = clamp(start.h + dyPct, 5, 100 - start.y);
        onChange({ ...start, w, h });
      }
    };

    const handleWindowUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        if (dragStateRef.current) {
          onCommit?.(region);
        }
        dragStateRef.current = null;
      }
      window.removeEventListener("mousemove", handleWindowMove);
      window.removeEventListener("mouseup", handleWindowUp);
      window.removeEventListener("touchmove", handleWindowMove);
      window.removeEventListener("touchend", handleWindowUp);
    };

    window.addEventListener("mousemove", handleWindowMove);
    window.addEventListener("mouseup", handleWindowUp);
    window.addEventListener("touchmove", handleWindowMove, { passive: false });
    window.addEventListener("touchend", handleWindowUp);
  };

  if (!region) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none touch-none"
    >
      <div
        className={`absolute border-2 border-dashed shadow-2xl z-20 cursor-move rounded ${
          isDragging
            ? "border-amber-400 bg-amber-500/25 ring-2 ring-amber-400"
            : learningStatus === "learning"
            ? "border-sky-400 bg-sky-500/25 ring-2 ring-sky-400 animate-pulse"
            : "border-sky-400 bg-sky-500/20 ring-2 ring-sky-500/40 hover:border-sky-300"
        }`}
        style={{
          left: `${region.x}%`,
          top: `${region.y}%`,
          width: `${region.w}%`,
          height: `${region.h}%`,
        }}
        onMouseDown={(e) => startDrag(e, "move")}
        onTouchStart={(e) => startDrag(e, "move")}
      >
        {/* Label Tag Header */}
        <div className="absolute -top-6 left-0 bg-sky-600 text-white text-[10px] px-2 py-0.5 rounded font-mono font-bold whitespace-nowrap shadow-md pointer-events-none flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          {label} ({Math.round(region.w)}% × {Math.round(region.h)}%)
        </div>

        {/* Resizer handle bottom-right */}
        <div
          onMouseDown={(e) => startDrag(e, "resize")}
          onTouchStart={(e) => startDrag(e, "resize")}
          className="absolute -bottom-2 -right-2 w-5 h-5 bg-sky-500 rounded-full border-2 border-white cursor-se-resize shadow-lg flex items-center justify-center hover:scale-125 transition-transform"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}
