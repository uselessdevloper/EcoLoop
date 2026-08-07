import { SearchBar, Badge, Button } from "./Common.jsx";
import { ROUTES } from "../utils/constants.js";
import {
  Filter,
  RefreshCw,
  Download,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock3,
  Activity,
  ChevronRight,
  ClipboardCheck,
  BrainCircuit,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function PipelineStatus({ alerts = [], activities = [] }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
      {/* Recent Alerts */}
      <div className="lab-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-rose-500" size={16} />
            <h2 className="font-bold text-xs text-slate-800 dark:text-slate-200">System Alerts & Notices</h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{alerts.length} ALERTS</span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No active alerts reported</div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="p-3.5 hover:bg-rose-500/5 transition flex items-start justify-between gap-3">
                <div className="flex gap-2.5 items-start min-w-0">
                  <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={15} />
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{alert.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{alert.time}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="lab-card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="text-sky-500" size={16} />
            <h2 className="font-bold text-xs text-slate-800 dark:text-slate-200">Live Agent Pipeline Activity</h2>
          </div>
          <span className="text-[10px] font-mono text-slate-500">LIVE FEED</span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60">
          {activities.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No recent activity log</div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-3.5 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition flex items-start justify-between gap-3">
                <div className="flex gap-2.5 items-start min-w-0">
                  {activity.status === "SUCCESS" ? (
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={15} />
                  ) : (
                    <Clock3 className="text-amber-500 shrink-0 mt-0.5" size={15} />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">{activity.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{activity.description}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{activity.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function QueueFilters({ search, setSearch, statusFilter, setStatusFilter, onRefresh, onExport }) {
  return (
    <div className="lab-card p-3 mb-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
        {/* Search */}
        <div className="w-full sm:w-80">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by case ID or part code..." />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 py-1 pl-8 pr-7 text-xs lab-input font-semibold"
            >
              <option value="ALL">All Statuses</option>
              <option value="QUARANTINE">Quarantine</option>
              <option value="PENDING QA">Pending QA</option>
              <option value="AUTO-APPROVED">Auto Approved</option>
              <option value="RETAKE REQUESTED">Retake Requested</option>
            </select>
          </div>

          <Button variant="outline" size="sm" onClick={onRefresh} icon={<RefreshCw size={13} />}>
            Refresh
          </Button>

          <Button variant="primary" size="sm" onClick={onExport} icon={<Download size={13} />}>
            Export CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QueueRow({ item }) {
  const navigate = useNavigate();

  const getRiskColorBar = (risk) => {
    if (risk >= 75) return "bg-rose-500";
    if (risk >= 50) return "bg-orange-500";
    if (risk >= 25) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const handleClick = () => navigate(`${ROUTES.CASE_DETAIL}/${item.caseId}`);

  const displayCaseId =
    item.caseId && item.caseId.length > 14
      ? `${item.caseId.slice(0, 8)}…${item.caseId.slice(-4)}`
      : item.caseId;

  return (
    <tr
      onClick={handleClick}
      className="group cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200 dark:border-slate-800/60 last:border-0 text-xs"
    >
      {/* Case ID */}
      <td className="px-4 py-3">
        <p className="font-mono font-bold text-slate-900 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
          {displayCaseId}
        </p>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.createdAt || "Just now"}</p>
      </td>

      {/* Part */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{item.partNumber}</p>
          {(item.captureAngle === "angled" || item.captureAngle === "side" || item.isMultiAngle) && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[9px] font-mono font-bold uppercase tracking-tight">
              📐 MULTI-ANGLE
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-500">{item.batch || "STANDARD"}</p>
      </td>

      {/* Commodity */}
      <td className="px-4 py-3">
        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300 uppercase">
          {item.commodity}
        </span>
      </td>

      {/* Risk Score */}
      <td className="px-4 py-3">
        <div className="w-24 space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="font-bold text-slate-800 dark:text-slate-200">{item.riskScore}%</span>
            <span className="text-slate-500 uppercase text-[9px]">Score</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getRiskColorBar(item.riskScore)}`}
              style={{ width: `${Math.min(100, Math.max(0, item.riskScore))}%` }}
            />
          </div>
        </div>
      </td>

      {/* Confidence */}
      <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
        {item.confidence}%
      </td>

      {/* Reason */}
      <td className="px-4 py-3 max-w-xs">
        <p className="text-slate-600 dark:text-slate-400 truncate text-[11px]" title={item.reason}>
          {item.reason}
        </p>
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <Badge status={item.status} size="sm" />
      </td>

      {/* Action Arrow */}
      <td className="px-4 py-3 text-right">
        <ChevronRight size={16} className="text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition" />
      </td>
    </tr>
  );
}

const ROWS_PER_PAGE = 8;

export function QueueTable({ cases = [], search, statusFilter }) {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCases = useMemo(() => {
    return cases.filter((item) => {
      const matchesSearch =
        item.caseId.toLowerCase().includes(search.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(search.toLowerCase()) ||
        item.commodity.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [cases, search, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filteredCases.length / ROWS_PER_PAGE);

  const paginatedCases = filteredCases.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  return (
    <div className="lab-card overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Live Inspection Queue</h2>
          <p className="text-xs text-slate-500">Hardware compliance scans logged in database</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-mono font-bold">
          {filteredCases.length} RECORDS
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="px-4 py-3">Case ID</th>
              <th className="px-4 py-3">Part Number</th>
              <th className="px-4 py-3">Commodity</th>
              <th className="px-4 py-3">Risk Score</th>
              <th className="px-4 py-3">AI Confidence</th>
              <th className="px-4 py-3">Audit Rationale</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {paginatedCases.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-slate-400 text-xs">
                  No inspection cases match your filter query.
                </td>
              </tr>
            ) : (
              paginatedCases.map((item) => <QueueRow key={item.id} item={item} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex justify-between items-center px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-xs">
        <span className="text-slate-500 font-mono">
          Showing {paginatedCases.length} of {filteredCases.length} cases
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
            {currentPage} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StatsCards({ cases = [], stats = null }) {
  const derivedTotal = cases.length;
  const derivedPending = cases.filter((c) => c.status === "PENDING QA").length;
  const derivedQuarantined = cases.filter((c) => c.status === "QUARANTINE").length;
  const derivedAutoApproved = cases.filter((c) => c.status === "AUTO-APPROVED").length;

  const totalInspected = stats?.totalToday ?? derivedTotal;
  const pendingQA = stats?.pendingReview ?? derivedPending;
  const quarantined = derivedQuarantined;
  const autoApproved = stats?.autoApproved ?? derivedAutoApproved;
  const quarantineRate = totalInspected > 0 ? Math.round((quarantined / totalInspected) * 100) : 0;
  const autopilotIndex = totalInspected > 0 ? Math.round((autoApproved / totalInspected) * 100) : 0;

  const cards = [
    {
      title: "TOTAL INSPECTED",
      value: totalInspected,
      icon: ClipboardCheck,
      color: "text-sky-600 dark:text-sky-400",
      footer: "Scans today",
    },
    {
      title: "PENDING QA REVIEW",
      value: pendingQA,
      icon: Clock3,
      color: "text-amber-600 dark:text-amber-400",
      footer: pendingQA > 0 ? `${pendingQA} awaiting signoff` : "Queue clear",
    },
    {
      title: "QUARANTINE RATE",
      value: `${quarantineRate}%`,
      icon: ShieldAlert,
      color: "text-rose-600 dark:text-rose-400",
      footer: `${quarantined} quarantined parts`,
      trend: quarantineRate > 0,
    },
    {
      title: "AUTOPILOT RATE",
      value: `${autopilotIndex}%`,
      icon: BrainCircuit,
      color: "text-emerald-600 dark:text-emerald-400",
      footer: `${autoApproved} auto-approved`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div key={index} className="lab-card p-4 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase font-mono">
                  {card.title}
                </p>
                <h2 className={`text-2xl font-bold font-mono mt-1 ${card.color}`}>{card.value}</h2>
              </div>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 shrink-0">
                <Icon className={card.color} size={20} />
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              {card.trend && <TrendingUp size={12} className="text-rose-500" />}
              <span>{card.footer}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
