import { useMemo, useState, useEffect } from "react";
import { Layout } from "../components/Layout.jsx";
import {
  EvidencePanel,
  ConfidenceBadge,
  CaseVelocity,
  ReviewerComment,
  ReviewDecision,
} from "../components/Review.jsx";
import { Loader, Button, Badge } from "../components/Common.jsx";
import { useReview } from "../hooks/useReview.js";
import { getTriageQueue } from "../services/triageService.js";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ROUTES } from "../utils/constants.js";
import {
  ArrowRight,
  FileText,
  ShieldAlert,
  Gauge,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Hash,
  Cpu,
  Activity,
  RefreshCw,
  Zap,
  Search,
  AlertCircle,
  XCircle,
} from "lucide-react";

function MetricBar({ label, value, max = 100, color, icon: Icon, suffix = "%" }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor =
    color || (pct >= 75 ? "bg-rose-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500");

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={12} className="text-slate-400" />}
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

function ReviewQueueList() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    getTriageQueue({ page: 1, pageSize: 100 })
      .then((res) => setCases(res?.items || []))
      .catch(() => setCases([]))
      .finally(() => setLoading(false));
  }, []);

  const filteredCases = useMemo(() => {
    let list = [...cases];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.caseId?.toLowerCase().includes(q) ||
          c.partNumber?.toLowerCase().includes(q) ||
          c.commodity?.toLowerCase().includes(q)
      );
    }
    if (riskFilter !== "all") {
      list = list.filter((c) => {
        const s = c.riskScore ?? 0;
        return riskFilter === "high" ? s >= 70 : riskFilter === "medium" ? s >= 40 && s < 70 : s < 40;
      });
    }
    list.sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
    return list;
  }, [cases, searchQuery, riskFilter]);

  if (loading) {
    return (
      <Layout title="Human Review Queue" subtitle="Perform manual verification & verdict overrides">
        <Loader label="Loading QA review queue…" />
      </Layout>
    );
  }

  if (cases.length === 0) {
    return (
      <Layout title="Human Review Queue" subtitle="Perform manual verification & verdict overrides">
        <div className="p-12 text-center space-y-3">
          <ShieldAlert size={32} className="mx-auto text-sky-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Pending Reviews</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All triage cases cleared. Run a new inspection to populate queue.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.TRIAGE)} icon={<Zap size={14} />}>
            New Inspection
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Human Review Queue" subtitle="Perform manual verification & verdict overrides">
      {/* Search & Filter Toolbar */}
      <div className="lab-card p-3 mb-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search case ID, part code, commodity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-9 pr-8 text-xs lab-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <XCircle size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {[
              { id: "all", label: "All" },
              { id: "high", label: "Critical" },
              { id: "medium", label: "Warning" },
              { id: "low", label: "Clean" },
            ].map(({ id: fId, label }) => (
              <button
                key={fId}
                onClick={() => setRiskFilter(fId)}
                className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold border transition ${
                  riskFilter === fId
                    ? "bg-sky-600 text-white border-sky-500"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Case List */}
      <div className="space-y-3">
        {filteredCases.map((c) => {
          const score = c.riskScore ?? 0;

          return (
            <div
              key={c.id}
              onClick={() => navigate(`${ROUTES.HUMAN_REVIEW}?caseId=${c.caseId}`)}
              className="lab-card p-4 space-y-2 cursor-pointer hover:border-sky-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-sky-500">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">{c.caseId}</span>
                    <Badge status={c.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-0.5">
                    <span>Part: {c.partNumber}</span>
                    <span>Type: {c.commodity}</span>
                  </div>
                </div>
              </div>

              <div className="w-48">
                <MetricBar label="Risk" value={score} max={100} suffix="%" />
              </div>

              <Button variant="outline" size="sm" icon={<ArrowRight size={12} />}>
                Review Case
              </Button>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

function ReviewDetailWorkspace({ caseId }) {
  const navigate = useNavigate();
  const {
    caseData,
    detailData,
    loading,
    error,
    notes,
    setNotes,
    region,
    handleRegionChange,
    handleRegionCommit,
    decisionState,
    submitDecision,
    learningStatus,
  } = useReview(caseId);

  const fraudScore = detailData?.fraudScore ?? 0;
  const aiConfidence = detailData?.confidencePct ?? caseData?.confidencePct ?? 0;
  const recommendation = detailData?.recommendation || {};
  const verdict = detailData?.status || "UNKNOWN";
  const recDecision = recommendation.decision || "N/A";

  if (loading) {
    return (
      <Layout>
        <Loader label="Loading case inspection evidence…" />
      </Layout>
    );
  }

  if (error || (!caseData && !detailData)) {
    return (
      <Layout>
        <div className="p-8 text-center space-y-3">
          <AlertTriangle size={32} className="mx-auto text-rose-500" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Unable to load case record</h2>
          <p className="text-xs text-slate-500">{error || "Case record missing or deleted."}</p>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.HUMAN_REVIEW)}>
            Back to Review Queue
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="lab-card p-4 mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.HUMAN_REVIEW)}
            className="text-xs font-mono font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ← Queue
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                QA Verification: <span className="font-mono">#{caseData?.id || caseId}</span>
              </h1>
              <Badge status={caseData?.status || detailData?.status} size="sm" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              Part Code: {caseData?.partCode || detailData?.partCode || "N/A"} · {detailData?.commodity || "Standard"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ConfidenceBadge confidencePct={aiConfidence} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`${ROUTES.CASE_DETAIL}/${caseId}`)}
            icon={<FileText size={13} />}
          >
            Full Report
          </Button>
        </div>
      </div>

      {/* AI Summary Banner */}
      <div className="lab-card p-4 mb-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-sky-500" />
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">AI Pipeline Verdict:</span>
            <span className="font-mono font-bold text-rose-500 uppercase">{verdict}</span>
          </div>
          <span className="font-mono text-slate-500 font-bold">Risk Score: {fraudScore}%</span>
        </div>
        {recommendation.reasoning && (
          <p className="text-xs text-slate-500 leading-relaxed font-sans">{recommendation.reasoning}</p>
        )}
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <div className="lg:col-span-8">
          <EvidencePanel
            caseData={caseData}
            region={region}
            onRegionChange={handleRegionChange}
            onRegionCommit={handleRegionCommit}
            learningStatus={learningStatus}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="lab-card p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldAlert size={16} className="text-sky-500" /> Inspector Sign-off
            </h2>

            <ReviewerComment value={notes} onChange={setNotes} />

            <ReviewDecision
              onDecide={submitDecision}
              pending={decisionState.pending}
              lastResult={decisionState.lastResult}
            />

            {decisionState.error && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                {decisionState.error}
              </div>
            )}

            {decisionState.lastResult && !decisionState.pending && (
              <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex gap-2 items-center">
                <CheckCircle2 size={16} /> Decision saved. Feed injected to training loop.
              </div>
            )}
          </div>

          {caseData && (
            <CaseVelocity
              targetMinutes={caseData.targetResolutionMinutes}
              elapsedMinutes={caseData.elapsedMinutes}
            />
          )}
        </div>
      </div>

      {/* Training Feedback Loop Indicator */}
      <div className="lab-card p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
          <Activity size={16} className="text-sky-500" /> Active Learning Feedback Loop
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your sign-off decision and ROI adjustments update neural weights for future RMA triage classifications.
        </p>
      </div>
    </Layout>
  );
}

export default function HumanReviewPage() {
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get("caseId");

  if (!caseId) {
    return <ReviewQueueList />;
  }

  return <ReviewDetailWorkspace caseId={caseId} />;
}
