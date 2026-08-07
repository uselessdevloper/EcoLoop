import React, { useState } from 'react';
import axios from 'axios';
import ConsumerForm from './components/ConsumerForm';
import StatusTracker from './components/StatusTracker';
import { ShieldCheck, Sparkles } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export default function App() {
  const [pickupId, setPickupId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Handle Form Submission via Axios
  const handleFormSubmit = async (formData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      // Send POST request to EcoLoop backend to create pickup & trigger dispatch
      const response = await axios.post(`${API_BASE_URL}/pickup/create-and-dispatch`, formData);
      const data = response.data;

      if (data.pickup && data.pickup.id) {
        setPickupId(data.pickup.id);
      } else {
        setApiError("Pickup created, but could not get valid Pickup ID.");
      }
    } catch (err) {
      console.error("Axios Submission Error:", err);
      // Fallback: If create-and-dispatch endpoint fails, try basic /pickup endpoint
      try {
        const fallbackRes = await axios.post(`${API_BASE_URL}/pickup`, formData);
        setPickupId(fallbackRes.data.id);
        // Trigger dispatch asynchronously
        axios.post(`${API_BASE_URL}/pickup/${fallbackRes.data.id}/dispatch`).catch(() => {});
      } catch (fallbackErr) {
        setApiError(err.response?.data?.detail || "Failed to submit pickup request. Ensure FastAPI backend is running.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPickupId(null);
    setApiError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              🌱
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">EcoLoop</h1>
              <p className="text-xs text-slate-400">Smart E-Waste Dispatch Platform</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>FastAPI + Twilio Active</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        {/* Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 rounded-full text-xs font-semibold text-emerald-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EcoLoop Consumer Portal</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Recycle E-Waste, Instantly Matched.
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-2">
            Submit your device details and our Haversine dispatch engine will connect you with the nearest partner via Twilio Voice.
          </p>
        </div>

        {/* API Error Notification */}
        {apiError && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm max-w-xl mx-auto w-full text-center">
            {apiError}
          </div>
        )}

        {/* Dynamic View: Form or Status Tracker */}
        {!pickupId ? (
          <ConsumerForm onSubmit={handleFormSubmit} isSubmitting={isSubmitting} />
        ) : (
          <StatusTracker pickupId={pickupId} onReset={handleReset} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>© 2026 EcoLoop Platform. Built with FastAPI, SQLite, SQLAlchemy, Twilio & React + TailwindCSS.</p>
      </footer>
    </div>
  );
}
