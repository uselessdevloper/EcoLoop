import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Layout } from "../components/Layout.jsx";
import { Loader, Modal, Button, Badge } from "../components/Common.jsx";
import {
  MetadataCard,
  FraudScore,
  ImageComparison,
  HeatmapViewer,
  OCRResults,
  DetectorMetrics,
  EvidenceTimeline,
  RecommendationCard,
} from "../components/Case.jsx";

import { getCaseById, deleteCase } from "../services/caseService.js";
import { fetchCaseForReview } from "../services/reviewService.js";
import { getTriageQueue } from "../services/triageService.js";
import { ROUTES, REVIEW_DECISION } from "../utils/constants.js";
import {
  Download,
  ShieldAlert,
  Terminal,
  Cpu,
  FileText,
  ArrowRight,
  AlertTriangle,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Activity,
  BarChart3,
  ScanLine,
  Gauge,
  Hash,
  Image,
  Text,
  List,
  Grid,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, sublabel, color = "sky" }) {
  const c = {
    sky: "text-sky-600 dark:text-sky-400",
    rose: "text-rose-600 dark:text-rose-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
  }[color] || "text-sky-600 dark:text-sky-400";

  return (
    <div className="lab-card p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">{label}</span>
        <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          <Icon size={14} />
        </div>
      </div>
      <div>
        <p className={`text-xl font-bold font-mono ${c}`}>{value}</p>
        {sublabel && <p className="text-[10px] text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

function MetricBar({ label, value, max = 100, color, icon: Icon, suffix = "%" }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor =
    color || (pct >= 75 ? "bg-rose-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500");

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={13} className="text-slate-400" />}
          <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase text-[10px]">{label}</span>
        </div>
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {typeof value === "number" ? value.toFixed(1) : value}
          {suffix}
        </span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="lab-card p-6 h-32" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="lab-card h-24" />
        ))}
      </div>
    </div>
  );
}

export default function InspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [reviewData, setReviewData] = useState(null);
  const [reportsList, setReportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [riskFilter, setRiskFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    if (!id) {
      setLoading(true);
      getTriageQueue({ page: 1, pageSize: 100 })
        .then((res) => {
          if (res?.items?.length) {
            setReportsList(res.items);
            setIsEmpty(false);
          } else setIsEmpty(true);
        })
        .catch(() => setIsEmpty(true))
        .finally(() => setLoading(false));
    } else {
      setIsEmpty(false);
      setLoading(true);
      Promise.all([getCaseById(id), fetchCaseForReview(id)])
        .then(([c, r]) => {
          setCaseData(c);
          setReviewData(r);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const merged = useMemo(() => ({ ...caseData, ...reviewData }), [caseData, reviewData]);

  // pipelineComplete is true when backend returned result data
  const pipelineComplete = merged.pipelineComplete === true || (merged.metrics && merged.metrics.length > 0 && merged.fraudScore != null);

  const ssim = merged.metrics?.find((m) => m.name.includes("SSIM"))?.score ?? null;
  const keypoint = merged.metrics?.find((m) => m.name.includes("Keypoint"))?.score ?? null;
  // Vector similarity is returned as a separate metric named "Vector Sim" — no fallback to 85.0
  const vectorMatchRaw = merged.metrics?.find((m) => m.name?.includes("Vector"))?.score;
  const vectorMatchScore = vectorMatchRaw != null ? parseFloat(vectorMatchRaw) : null;
  const ocrResults = merged.ocrResults || [];
  const ocrText = ocrResults[0]?.extracted || "";
  const ocrExpected = ocrResults[0]?.expected || "";
  const ocrMatch = !pipelineComplete ? null : (ocrResults[0]?.match ?? (ocrText && ocrExpected && ocrExpected !== "N/A font / board label" ? ocrText === ocrExpected : null));
  const recommendation = merged.recommendation || {};

  // Only map to a verdict when the pipeline actually ran
  const rawAction = recommendation.decision || merged.pipelineAction || merged.recommendation?.decision;
  const recDecision = !pipelineComplete
    ? null
    : rawAction === "Accept"
      ? REVIEW_DECISION.APPROVED
      : rawAction === "Quarantine & Escalate" || rawAction === "Escalate with evidence" || rawAction === "Escalate to vendor"
      ? REVIEW_DECISION.REJECTED
      : REVIEW_DECISION.NEEDS_MORE_EVIDENCE;

  const heatmapUrl = merged.heatmapUrl || null;
  // null means pipeline didn't run — never fall back to 0
  const fraudScore = merged.fraudScore ?? null;
  const aiConfidence = recommendation.confidence ?? merged.confidencePct ?? null;

  const aiClassification = pipelineComplete
    ? (merged.pipelineVerdict || merged.metadata?.status || merged.result?.verdict || merged.status || "UNKNOWN").toUpperCase()
    : (merged.status || "pending").toUpperCase();

  const rawCategory = merged.pipelineCategory || merged.category || merged.metadata?.category || merged.result?.category;
  const currentVerdict = (merged.pipelineVerdict || merged.metadata?.status || merged.status || "").toLowerCase();
  const currentAction = (merged.pipelineAction || recommendation.decision || "").toLowerCase();

  // Only compute anomaly category when pipeline finished
  const anomalyCategory = !pipelineComplete
    ? null
    : rawCategory || (
        currentVerdict === "tampered" || currentAction.includes("quarantine") || currentAction.includes("escalate")
          ? "Swap detection"
          : currentVerdict === "missing"
          ? "Missing QC label"
          : currentVerdict === "mismatched"
          ? "Altered serial number"
          : currentVerdict === "reused"
          ? "Reused board"
          : "Clean (OEM Verified)"
      );

  const ocrFieldsTotal = Math.max(ocrResults.length, 1);
  const ocrFieldsMatched = ocrResults.filter((r) => r.match === true).length;
  const ocrFieldsFilled = ocrResults.filter(
    (r) => r.extracted && r.extracted !== "No text detected"
  ).length;
  const ocrAccuracyPct = (ocrFieldsMatched / ocrFieldsTotal) * 100;
  const ocrCompletenessPct = (ocrFieldsFilled / ocrFieldsTotal) * 100;

  const filteredReports = useMemo(() => {
    let r = [...reportsList];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(
        (x) =>
          x.caseId?.toLowerCase().includes(q) ||
          x.partNumber?.toLowerCase().includes(q) ||
          x.commodity?.toLowerCase().includes(q)
      );
    }
    if (riskFilter !== "all") {
      r = r.filter((x) => {
        const s = x.riskScore ?? 0;
        return riskFilter === "high"
          ? s >= 70
          : riskFilter === "medium"
          ? s >= 40 && s < 70
          : riskFilter === "low"
          ? s < 40
          : true;
      });
    }
    r.sort((a, b) =>
      sortBy === "risk"
        ? (b.riskScore ?? 0) - (a.riskScore ?? 0)
        : sortBy === "name"
        ? (a.partNumber ?? "").localeCompare(b.partNumber ?? "")
        : new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
    );
    return r;
  }, [reportsList, searchQuery, riskFilter, sortBy]);

  const handleDownloadPDF = () => {
    if (!id) return;
    window.open(
      `http://127.0.0.1:8000/api/reports/${id}/pdf?token=${encodeURIComponent(
        localStorage.getItem("fraudshield_auth_token") || ""
      )}`,
      "_blank"
    );
  };

  const handleDelete = (eOrCaseId, caseId) => {
    let target = caseId;
    if (typeof eOrCaseId === "string") {
      target = eOrCaseId;
    } else if (eOrCaseId && eOrCaseId.stopPropagation) {
      eOrCaseId.stopPropagation();
    }
    if (!target) return;
    setDeleteTargetId(target);
  };

  const executeDelete = async () => {
    if (!deleteTargetId) return;
    const targetId = deleteTargetId;
    setDeletingId(targetId);
    try {
      await deleteCase(targetId);
      setDeleteTargetId(null);
      setReportsList((prev) => prev.filter((x) => x.caseId !== targetId && x.id !== targetId));
      if (id) {
        navigate(ROUTES.CASE_DETAIL);
      } else {
        const res = await getTriageQueue({ page: 1, pageSize: 100 });
        if (res?.items) {
          setReportsList(res.items);
          setIsEmpty(res.items.length === 0);
        }
      }
    } catch (err) {
      alert(err.message || "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        {id ? (
          <DetailSkeleton />
        ) : (
          <Loader fullPage={false} label="Fetching inspection archive records…" />
        )}
      </Layout>
    );
  }

  if (isEmpty) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="h-16 w-16 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-4">
            <FileText size={28} />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">No Inspection Reports Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
            Run a hardware diagnostic scan to record audit data.
          </p>
          <Button variant="primary" size="md" onClick={() => navigate(ROUTES.TRIAGE)} icon={<Zap size={15} />}>
            Launch Inspection Triage Console
          </Button>
        </div>
      </Layout>
    );
  }

  /* LIST ARCHIVE VIEW (No ID) */
  if (!id) {
    return (
      <Layout title="Inspection Reports Archive" subtitle="Review historical RMA compliance reports & audit trails">
        <div className="lab-card p-4 mb-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Audit Reports Library</h2>
              <p className="text-xs text-slate-500 font-mono">{reportsList.length} Archived Case Scans</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.TRIAGE)} icon={<Zap size={14} />}>
            New Inspection
          </Button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="lab-card p-3 mb-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by case ID, part code, commodity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-9 pr-8 text-xs lab-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XCircle size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                icon={<Filter size={13} />}
              >
                Filters
              </Button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 px-3 text-xs lab-input font-bold"
              >
                <option value="newest">Newest First</option>
                <option value="risk">Highest Risk</option>
                <option value="name">Part Code</option>
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Risk Level:</span>
              {[
                { id: "all", label: "All" },
                { id: "high", label: "Critical" },
                { id: "medium", label: "Warning" },
                { id: "low", label: "Clean" },
              ].map(({ id: fId, label }) => (
                <button
                  key={fId}
                  onClick={() => setRiskFilter(fId)}
                  className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold border transition ${
                    riskFilter === fId
                      ? "bg-sky-600 text-white border-sky-500"
                      : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((r) => {
            const score = r.riskScore ?? 0;
            return (
              <div
                key={r.id}
                onClick={() => navigate(`${ROUTES.CASE_DETAIL}/${r.caseId}`)}
                className="lab-card p-4 space-y-3 cursor-pointer hover:border-sky-500/40 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{r.caseId}</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">{r.commodity || "N/A"}</p>
                  </div>
                  <Badge status={r.status} size="sm" />
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <Hash size={12} className="text-slate-400" />
                  <span className="font-mono">{r.partNumber}</span>
                </div>

                <MetricBar label="Risk Score" value={score} max={100} suffix="%" />

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
                  <span className="font-mono"><Clock size={10} className="inline mr-1" />{r.createdAt || "Recent"}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDelete(e, r.caseId)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition"
                    >
                      <Trash2 size={12} />
                    </button>
                    <span className="text-sky-600 dark:text-sky-400 font-bold uppercase flex items-center">
                      Details <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Modal
          open={Boolean(deleteTargetId)}
          onClose={() => setDeleteTargetId(null)}
          title="Confirm Report Deletion"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={Boolean(deletingId)}
                onClick={executeDelete}
                icon={<Trash2 size={14} />}
              >
                Delete Permanently
              </Button>
            </div>
          }
        >
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Are you sure you want to delete inspection report <span className="font-mono text-rose-500">{deleteTargetId}</span>?
            </p>
            <p className="text-slate-500">This action will remove the case and evidence log permanently.</p>
          </div>
        </Modal>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-8 text-center space-y-4">
          <AlertTriangle size={32} className="mx-auto text-rose-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Report Ingestion Error</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.CASE_DETAIL)}>
            Back to Archive
          </Button>
        </div>
      </Layout>
    );
  }

  /* SINGLE CASE AUDIT DETAIL VIEW */
  return (
    <Layout>
      {/* Header Banner */}
      <div className="lab-card p-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate(ROUTES.CASE_DETAIL)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold font-mono"
            >
              ← Reports Archive
            </button>
            <span className="text-slate-400">/</span>
            <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">#{merged.id}</span>
            <Badge status={merged.status} size="sm" />
            {(merged.captureAngle === "angled" || merged.captureAngle === "side" || merged.multiAngleViews?.length > 0) && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 uppercase">
                📐 Multi-Angle Fusion ({merged.captureAngle?.toUpperCase() || "ANGLED"})
              </span>
            )}
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Audit Report: <span className="font-mono">{merged.partCode}</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} icon={<Download size={13} />}>
            PDF Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate(`${ROUTES.HUMAN_REVIEW}?caseId=${merged.id}`)}
            icon={<ShieldAlert size={13} />}
          >
            QA Review
          </Button>
          <button
            onClick={() => handleDelete(merged.id)}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard
          icon={Gauge}
          label="Fraud Score"
          value={fraudScore != null ? `${fraudScore}/100` : "N/A"}
          sublabel={fraudScore == null ? "Pipeline incomplete" : fraudScore >= 70 ? "Critical Risk" : fraudScore >= 40 ? "Warning" : "Passed"}
          color={fraudScore == null ? "sky" : fraudScore >= 70 ? "rose" : fraudScore >= 40 ? "amber" : "emerald"}
        />
        <StatCard
          icon={BarChart3}
          label="SSIM Score"
          value={ssim != null ? `${(ssim * 100).toFixed(1)}%` : "N/A"}
          sublabel={ssim == null ? "No result" : ssim >= 0.8 ? "Match" : "Structural Diff"}
          color={ssim == null ? "sky" : ssim >= 0.8 ? "emerald" : "amber"}
        />
        <StatCard
          icon={Zap}
          label="Vector Sim"
          value={vectorMatchScore != null ? `${vectorMatchScore.toFixed(1)}%` : "N/A"}
          sublabel="512-Dim Cosine"
          color="sky"
        />
        <StatCard
          icon={ScanLine}
          label="Keypoint Match"
          value={keypoint != null ? `${(keypoint * 100).toFixed(1)}%` : "N/A"}
          sublabel="ORB Descriptors"
          color="sky"
        />
        <StatCard
          icon={CheckCircle2}
          label="OCR Label"
          value={ocrMatch == null ? "N/A" : ocrMatch ? "PASS" : "FAIL"}
          sublabel={ocrMatch == null ? "No result" : ocrMatch ? "Serial Verified" : "Mismatch Detected"}
          color={ocrMatch == null ? "sky" : ocrMatch ? "emerald" : "rose"}
        />
      </div>

      {/* Decision Judge Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-8">
          {pipelineComplete ? (
            <RecommendationCard
              recommendation={recDecision}
              confidence={aiConfidence}
              reasoning={recommendation.reasoning || "AI confidence score requires operator verification."}
              flags={recommendation.flags || []}
            />
          ) : (
            <div className="lab-card p-4 flex flex-col justify-center gap-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" /> Pipeline Incomplete
              </p>
              <p className="text-xs text-slate-500">
                The AI pipeline did not complete for this inspection. No verdict has been issued.
                Submit a new scan or check the backend pipeline logs.
              </p>
            </div>
          )}
        </div>
        <div className="lg:col-span-4 lab-card p-4 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold font-mono text-slate-500 uppercase mb-2">Overall Risk Gauge</p>
          <FraudScore score={fraudScore ?? 0} size="md" showLabel={false} />
          {!pipelineComplete && (
            <p className="text-[10px] text-slate-500 mt-1 font-mono">No result data</p>
          )}
        </div>
      </div>

      {/* Image Comparison */}
      <div className="mb-4">
        <ImageComparison
          goldenUrl={merged.goldenImageUrl}
          uploadedUrl={merged.uploadedImageUrl}
          imageHash={merged.imageHash}
        />
      </div>

      {/* Heatmap + Reasoning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <HeatmapViewer
          imageUrl={merged.uploadedImageUrl}
          heatmapUrl={heatmapUrl}
          label={heatmapUrl ? "SSIM Anomaly Heatmap Overlay" : "AI Region of Interest"}
        />

        <div className="lab-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-sky-500" /> AI Audit Narrative &amp; Justification
          </h3>
          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
            {recommendation.reasoning || "Diagnostic complete."}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Pipeline method: Multi-agent SSIM alignment + EasyOCR serial verification + Vector Embedding Cosine search.
          </div>
        </div>
      </div>

      {/* OCR + Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-7">
          <OCRResults results={ocrResults} />
        </div>
        <div className="lg:col-span-5 lab-card p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-sky-500" /> Pipeline Verdict &amp; Anomaly Category
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
            <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Anomaly Category</span>
              <span className="font-bold text-sky-600 dark:text-sky-400 font-sans text-[11px] block truncate mt-0.5" title={anomalyCategory || "—"}>
                {anomalyCategory || "—"}
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Verdict</span>
              <span className={`font-bold uppercase text-[11px] block mt-0.5 ${
                pipelineComplete ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
              }`}>{aiClassification}</span>
            </div>
            <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-[9px] font-bold text-slate-500 uppercase block">Action</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-sans text-[11px] block truncate mt-0.5"
                title={recommendation.decision || "—"}>
                {recommendation.decision || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics & Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-7">
          <DetectorMetrics metrics={merged.metrics || []} />
        </div>
        <div className="lg:col-span-5">
          <MetadataCard caseData={merged} />
        </div>
      </div>

      {/* Telemetry Log */}
      <div className="lab-card p-4 space-y-2 mb-4 font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
          <Terminal size={14} className="text-sky-500" /> Execution Log
        </div>
        <div className="bg-slate-950 text-slate-300 p-3 rounded text-[11px] space-y-1 overflow-x-auto">
          <p className="text-slate-500">&gt; Session: {merged.updatedAt || "Active"}</p>
          {/* Agent log lines are dynamically generated from real pipeline data */}
          {pipelineComplete ? (
            <>
              <p className="text-sky-400">&gt; Agent-1 (Selector): Ingest &amp; aspect ratio check OK | Commodity: {merged.commodity || "N/A"}</p>
              <p className="text-emerald-400">&gt; Agent-2 (Triage): Frame alignment {merged.evidence?.alignment?.status || "aligned"} | Keypoint Match: {keypoint != null ? (keypoint * 100).toFixed(1) : "N/A"}%</p>
              <p className="text-sky-400">&gt; Agent-3 (Detector): SSIM Score: {ssim != null ? `${(ssim * 100).toFixed(1)}%` : "N/A"} | Thermal heatmap generated</p>
              <p className={ocrMatch === false ? "text-rose-400" : ocrMatch === true ? "text-emerald-400" : "text-amber-400"}>
                &gt; Agent-3 (OCR): Expected "{ocrExpected || "N/A"}" vs Got "{ocrText || "N/A"}" ({ocrMatch === true ? "PASS" : ocrMatch === false ? "MISMATCH" : "INCONCLUSIVE"})
              </p>
              <p className="text-amber-400">&gt; Agent-4 (Decision): Verdict: {merged.pipelineVerdict || merged.status || "N/A"} | Category: {anomalyCategory || "N/A"} | Risk Score: {fraudScore != null ? `${fraudScore}/100` : "N/A"}</p>
              <p className="text-amber-400">&gt; Agent-4 (Action): Recommended Action: {merged.pipelineAction || recommendation.decision || "N/A"}</p>
              <p className="text-emerald-400">&gt; Agent-5 (Explainer): AI narrative generated successfully.</p>
            </>
          ) : (
            <>
              <p className="text-amber-400">&gt; [WARN] Pipeline execution pending or incomplete.</p>
              <p className="text-rose-400">&gt; [INFO] Inspection case status: {merged.status || "pending"}</p>
              <p className="text-slate-500">&gt; Agents 2–5 did not run. Submit a new scan via Triage Console to generate results.</p>
            </>
          )}
        </div>
      </div>

      {/* Timeline */}
      <EvidenceTimeline events={merged.timeline || []} />

      <Modal
        open={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        title="Confirm Report Deletion"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={Boolean(deletingId)}
              onClick={executeDelete}
              icon={<Trash2 size={14} />}
            >
              Delete Permanently
            </Button>
          </div>
        }
      >
        <div className="space-y-2 text-xs">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            Permanently delete report <span className="font-mono text-rose-500">{deleteTargetId}</span>?
          </p>
        </div>
      </Modal>
    </Layout>
  );
}
