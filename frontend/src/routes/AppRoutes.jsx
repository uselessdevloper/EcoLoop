import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "../pages/LandingPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import AIInspectionPage from "../pages/AIInspectionPage.jsx";
import InspectionDetailPage from "../pages/InspectionDetailPage.jsx";
import HumanReviewPage from "../pages/HumanReviewPage.jsx";
import AdminConsolePage from "../pages/AdminConsolePage.jsx";
import AnalyticsDashboardPage from "../pages/AnalyticsDashboardPage.jsx";
import MobileScannerPage from "../pages/MobileScannerPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import { ProtectedRoute } from "../components/Layout.jsx";

function WorkspaceRoute({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/mobile" element={<MobileScannerPage />} />
      <Route path="/scan" element={<MobileScannerPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/triage" element={<WorkspaceRoute><AIInspectionPage /></WorkspaceRoute>} />
      <Route path="/case/:id" element={<WorkspaceRoute><InspectionDetailPage /></WorkspaceRoute>} />
      <Route path="/case" element={<WorkspaceRoute><InspectionDetailPage /></WorkspaceRoute>} />
      <Route path="/review" element={<WorkspaceRoute><HumanReviewPage /></WorkspaceRoute>} />
      <Route path="/catalog" element={<WorkspaceRoute><AdminConsolePage /></WorkspaceRoute>} />
      <Route path="/analytics" element={<WorkspaceRoute><AnalyticsDashboardPage /></WorkspaceRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
