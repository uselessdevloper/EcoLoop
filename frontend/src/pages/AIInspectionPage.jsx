import { useState, useEffect } from "react";
import { Layout } from "../components/Layout.jsx";
import { StatsCards, QueueFilters, QueueTable, PipelineStatus } from "../components/Triage.jsx";
import { getTriageQueue, getTriageStats, getPipelineStatus } from "../services/triageService.js";
import { Loader } from "../components/Common.jsx";

export default function AIInspectionPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({ totalToday: 0, pendingReview: 0, autoApproved: 0 });
  const [alerts, setAlerts] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const exportToCSV = () => {
    const filteredCases = cases.filter((item) => {
      const matchesSearch =
        item.caseId.toLowerCase().includes(search.toLowerCase()) ||
        item.partNumber.toLowerCase().includes(search.toLowerCase()) ||
        item.commodity.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (filteredCases.length === 0) {
      alert("No inspection records match the current query to export.");
      return;
    }

    const headers = ["Case ID", "Part Number", "Commodity", "Risk Score", "Confidence", "Reason", "Status", "Timestamp"];
    const rows = filteredCases.map((item) => [
      item.caseId || "",
      item.partNumber || "",
      item.commodity || "",
      item.riskScore || 0,
      item.confidence || 0,
      item.reason || "",
      item.status || "",
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
    link.download = `verivision_inspection_triage_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueResult, statsData] = await Promise.all([
        getTriageQueue({ page: 1, pageSize: 50, filters: { status: statusFilter, search } }),
        getTriageStats(),
        getPipelineStatus(),
      ]);

      setCases(queueResult.items || []);

      const highRiskCases = (queueResult.items || []).filter((c) => c.riskScore >= 75);
      setAlerts(
        highRiskCases.slice(0, 5).map((c, i) => ({
          id: i + 1,
          title: "High Fraud Risk Anomaly",
          message: `Case ${c.caseId} (${c.partNumber}) requires manual inspector review`,
          time: "Live",
        }))
      );

      const recentCases = (queueResult.items || []).slice(0, 5);
      setActivities(
        recentCases.map((c, i) => ({
          id: i + 1,
          title: c.status === "AUTO-APPROVED" ? "Auto-Approval Execution" : "Triage Flagged Case",
          description: `Case ${c.caseId} classified as ${c.status}`,
          status: c.status === "AUTO-APPROVED" ? "SUCCESS" : "PENDING",
          time: c.createdAt || "Live",
        }))
      );

      setStats(statsData || { totalToday: 0, pendingReview: 0, autoApproved: 0, avgResolutionMinutes: 0 });
    } catch (err) {
      console.error("Failed to fetch triage data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleRefresh = () => {
    setSearch("");
    setStatusFilter("ALL");
    fetchData();
  };

  if (loading && cases.length === 0) {
    return (
      <Layout title="Inspection Triage Dashboard" subtitle="Live monitoring of hardware RMA scans and AI agent triage pipeline">
        <Loader label="Ingesting inspection queue records…" />
      </Layout>
    );
  }

  return (
    <Layout title="Inspection Triage Dashboard" subtitle="Live monitoring of hardware RMA scans and AI agent triage pipeline">
      <StatsCards cases={cases} stats={stats} />

      <QueueFilters
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onRefresh={handleRefresh}
        onExport={exportToCSV}
      />

      <QueueTable cases={cases} search={search} statusFilter={statusFilter} />

      <PipelineStatus alerts={alerts} activities={activities} />
    </Layout>
  );
}
