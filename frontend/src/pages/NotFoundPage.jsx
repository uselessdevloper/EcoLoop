import { useNavigate } from "react-router-dom";
import { ROUTES } from "../utils/constants.js";
import { Button } from "../components/Common.jsx";
import { ArrowLeft, Home, SearchX } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="space-y-3 max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto">
          <SearchX size={32} />
        </div>
        <h1 className="text-4xl font-bold font-mono text-slate-900 dark:text-slate-100">404</h1>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Page Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The route you are looking for does not exist in the VeriVision audit application.
        </p>
        <div className="flex justify-center gap-2 pt-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} icon={<ArrowLeft size={14} />}>
            Go Back
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.TRIAGE)} icon={<Home size={14} />}>
            Inspection Triage
          </Button>
        </div>
      </div>
    </div>
  );
}