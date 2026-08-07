import { useState, useEffect } from "react";
import { Layout } from "../components/Layout.jsx";
import { getTriageStats, getTriageQueue } from "../services/triageService.js";
import { getCases } from "../services/caseService.js";
import {
  getVendorAnalytics,
  getVendorDetail,
  getSiteAnalytics,
  getRepeatOffenders,
  getMonthlyTrend,
} from "../services/analyticsService.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  Database,
  Layers,
  Eye,
  Download,
  RefreshCw,
  ChevronRight,
  ShieldAlert,
  X,
} from "lucide-react";
import { Button, Loader, Badge } from "../components/Common.jsx";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="lab-card p-3 font-mono text-xs space-y-1">
        <p className="font-bold text-slate-700 dark:text-slate-300 uppercase">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-500">{p.name}:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function StatCard({ label, value, icon: Icon, color = "sky", sublabel }) {
  const c = {
    sky: "text-sky-600 dark:text-sky-400",
    rose: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  }[color] || "text-sky-600 dark:text-sky-400";

  return (
    <div className="lab-card p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">{label}</p>
          <h3 className={`text-2xl font-bold font-mono mt-1 ${c}`}>{value}</h3>
        </div>
        <div className="p-2 rounded bg-slate-100 dark:bg-slate-800">
          <Icon size={18} className={c} />
        </div>
      </div>
      {sublabel && <p className="text-[10px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">{sublabel}</p>}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children, badge }) {
  return (
    <div className="lab-card p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-sky-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">{title}</h2>
        </div>
        {badge && (
          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const [queueItems, setQueueItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [vendors, setVendors] = useState([]);
  const [sites, setSites] = useState([]);
  const [repeatOffenders, setRepeatOffenders] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);

  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorDetailLoading, setVendorDetailLoading] = useState(false);
  const [vendorDetails, setVendorDetails] = useState(null);

  const [selectedSite, setSelectedSite] = useState(null);
  const [siteDetails, setSiteDetails] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        queueResult,
        statsData,
        casesData,
        vendorData,
        siteData,
        offendersData,
        trendData,
      ] = await Promise.all([
        getTriageQueue({ page: 1, pageSize: 1000, filters: {} }),
        getTriageStats(),
        getCases(),
        getVendorAnalytics(),
        getSiteAnalytics(),
        getRepeatOffenders(),
        getMonthlyTrend(),
      ]);
      setQueueItems(Array.isArray(queueResult?.items) ? queueResult.items : []);
      setStats(statsData);
      setVendors(vendorData || []);
      setSites(siteData || []);
      setRepeatOffenders(offendersData || []);
      setMonthlyTrend(trendData || []);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVendorClick = async (vendorName) => {
    if (selectedVendor === vendorName) {
      setSelectedVendor(null);
      setVendorDetails(null);
      return;
    }
    setSelectedVendor(vendorName);
    setVendorDetailLoading(true);
    try {
      const detail = await getVendorDetail(vendorName);
      setVendorDetails(detail);
    } catch (err) {
      console.error("Failed to load vendor detail:", err);
    } finally {
      setVendorDetailLoading(false);
    }
  };

  const handleSiteClick = (siteName, fraudCases) => {
    if (selectedSite === siteName) {
      setSelectedSite(null);
      setSiteDetails(null);
      return;
    }
    setSelectedSite(siteName);
    setSiteDetails({ site: siteName, fraud_cases: fraudCases });
  };

  const exportToCSV = () => {
    if (!queueItems.length) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "Case ID",
      "Part Number",
      "Commodity",
      "Capture Site",
      "Risk Score",
      "Status",
      "Reason",
      "Confidence",
      "Recommended Action",
      "Timestamp",
    ];

    const rows = queueItems.map((item) => [
      item.caseId || "",
      item.partNumber || "",
      item.commodity || "",
      item.captureSite || "",
      item.riskScore || 0,
      item.status || "",
      item.reason || "",
      item.confidence || 0,
      item.recommendedAction || "",
      item.createdAt || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `verivision_analytics_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fraudDist = { clean: 0, tampered: 0, missing: 0, mismatched: 0, reused: 0, pending: 0 };
  queueItems.forEach((item) => {
    const reason = item.reason?.toLowerCase() || "";
    if (reason.includes("clean") || reason.includes("passed")) fraudDist.clean++;
    else if (reason.includes("tamper")) fraudDist.tampered++;
    else if (reason.includes("miss")) fraudDist.missing++;
    else if (reason.includes("mismatch")) fraudDist.mismatched++;
    else if (reason.includes("reuse")) fraudDist.reused++;
    else fraudDist.pending++;
  });

  const totalCases = queueItems.length;
  const fraudCases = fraudDist.tampered + fraudDist.missing + fraudDist.mismatched + fraudDist.reused;
  const fraudRate = totalCases > 0 ? ((fraudCases / totalCases) * 100).toFixed(1) : "0.0";

  if (loading) {
    return (
      <Layout title="Fraud Analytics Dashboard" subtitle="Real-time audit intelligence from inspection records">
        <Loader label="Computing vendor & site risk metrics…" />
      </Layout>
    );
  }

  return (
    <Layout
      title="Fraud Analytics Dashboard"
      subtitle="Real-time audit intelligence across all inspection cases & vendor supply chains"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} icon={<RefreshCw size={13} />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={exportToCSV} icon={<Download size={13} />}>
            Export CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Cases Inspected" value={totalCases} icon={Layers} color="sky" sublabel={`${stats?.autoApproved || 0} auto-approved`} />
          <StatCard label="Fraud Incidents" value={fraudCases} icon={AlertTriangle} color="rose" sublabel="Requires investigation" />
          <StatCard label="Fraud Detection Rate" value={`${fraudRate}%`} icon={TrendingUp} color="amber" sublabel="Of total inspections" />
          <StatCard label="Pending QA Review" value={stats?.pendingReview || 0} icon={Activity} color="emerald" sublabel="Awaiting human sign-off" />
        </div>

        {/* 2 Column Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Vendor Table */}
            <div className="lab-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-sky-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Vendor Performance & Risk Overview
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3 text-center">Supplied Units</th>
                      <th className="px-4 py-3 text-center">Fraud Cases</th>
                      <th className="px-4 py-3 text-right">Fraud Rate</th>
                      <th className="px-4 py-3 text-center">Trust Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                    {vendors.map((vendor, i) => (
                      <tr
                        key={i}
                        onClick={() => handleVendorClick(vendor.vendor)}
                        className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                          {vendor.vendor}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">{vendor.components_supplied}</td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">{vendor.fraud_cases}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span className={parseFloat(vendor.fraud_rate) > 10 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {vendor.fraud_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">{vendor.trust_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Site Table */}
            <div className="lab-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-sky-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Capture Site Anomaly Breakdown
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Site Location</th>
                      <th className="px-4 py-3 text-center">Inspections</th>
                      <th className="px-4 py-3 text-center">Fraud Cases</th>
                      <th className="px-4 py-3 text-right">Fraud Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
                    {sites.map((site, i) => (
                      <tr
                        key={i}
                        onClick={() => handleSiteClick(site.site, site.fraud_cases)}
                        className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      >
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                          {site.site}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-800 dark:text-slate-200">{site.inspections}</td>
                        <td className="px-4 py-3 text-center font-bold text-rose-600 dark:text-rose-400">{site.fraud_cases}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          <span className={parseFloat(site.fraud_rate) > 5 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {site.fraud_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recharts Chart */}
            <ChartCard title="Month-on-Month Compliance & Fraud Trend" icon={TrendingUp} badge="Audit Timeline">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={monthlyTrend} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="total_inspections" fill="#0284c7" name="Total Ingested" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="fraud_cases" fill="#ef4444" name="Fraud Cases" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">No monthly timeline data recorded.</div>
              )}
            </ChartCard>
          </div>

          {/* Right Column (col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Risk Alerts */}
            {repeatOffenders.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                  High Risk Watchlist Flags
                </p>
                {repeatOffenders.map((offender) => (
                  <div key={offender.vendor} className="lab-card p-3 border-l-4 border-l-rose-500 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <ShieldAlert size={14} />
                      <span className="uppercase">{offender.status}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Vendor <strong className="text-slate-900 dark:text-slate-100">{offender.vendor}</strong> logged{" "}
                      <strong className="text-rose-500">{offender.fraud_cases} fraud cases</strong> in {offender.days_window} days.
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Outcomes List */}
            <div className="lab-card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Eye size={14} className="text-sky-500" /> Recent Case Verdicts
                </h2>
                <span className="font-mono text-[10px] text-slate-500">{queueItems.length} CASES</span>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800/60 max-h-[500px] overflow-y-auto">
                {queueItems.slice(0, 10).map((item, i) => (
                  <div key={item.id || i} className="p-3 text-xs space-y-1">
                    <div className="flex justify-between items-center font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{item.caseId?.slice(0, 12)}</span>
                      <Badge status={item.status} size="sm" />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>{item.partNumber}</span>
                      <span className="font-bold text-rose-500">Risk: {item.riskScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="lab-card p-5 max-w-md w-full bg-white dark:bg-[#0e1626] space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 uppercase">
                Vendor Audit: {selectedVendor}
              </h3>
              <button onClick={() => setSelectedVendor(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            {vendorDetailLoading ? (
              <Loader label="Fetching vendor logs…" />
            ) : vendorDetails ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded bg-slate-100 dark:bg-slate-900 space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300 uppercase">Supplied Parts Summary</p>
                  <ul className="list-disc pl-4 text-slate-500 space-y-0.5">
                    {vendorDetails.fraud_components.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                    {vendorDetails.fraud_components.length === 0 && <li>No fraud components recorded.</li>}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Failed to load vendor details.</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}