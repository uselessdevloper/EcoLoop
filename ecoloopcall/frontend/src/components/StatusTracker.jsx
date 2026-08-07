import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, PhoneCall, CheckCircle2, RefreshCw, UserCheck, ShieldAlert, ArrowLeft, Bike, Award, Check } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export default function StatusTracker({ pickupId, onReset }) {
  const [pickupData, setPickupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastPolled, setLastPolled] = useState(new Date());
  const [isSimulatingAccept, setIsSimulatingAccept] = useState(false);

  // Function to fetch pickup status via Axios
  const fetchPickupStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/pickup/${pickupId}`);
      setPickupData(response.data);
      setError(null);
      setLastPolled(new Date());
    } catch (err) {
      console.error("Axios polling error:", err);
      setError("Failed to fetch pickup status. Retrying...");
    } finally {
      setLoading(false);
    }
  };

  // Poll backend every 3 seconds (3000 ms)
  useEffect(() => {
    fetchPickupStatus();

    const interval = setInterval(() => {
      fetchPickupStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [pickupId]);

  // Simulate Press 1 (Partner Accept) via Axios call to Webhook
  const handleSimulateAccept = async () => {
    setIsSimulatingAccept(true);
    try {
      await axios.post(`${API_BASE_URL}/voice-response?pickup_id=${pickupId}`, 'Digits=1', {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      await fetchPickupStatus();
    } catch (err) {
      console.error("Simulate accept error:", err);
    } finally {
      setIsSimulatingAccept(false);
    }
  };

  const currentStatus = pickupData?.status || 'Pending';

  const isStep1Active = currentStatus === 'Pending' || currentStatus === 'Searching';
  const isStep2Active = currentStatus === 'Assigned' || currentStatus === 'Calling' || currentStatus === 'In Transit';
  const isStep3Active = currentStatus === 'Accepted' || currentStatus === 'Completed';
  const isRejected = currentStatus === 'Rejected' || currentStatus === 'Cancelled';

  const getStepStatus = (stepIndex) => {
    if (isRejected) return stepIndex === 3 ? 'rejected' : 'done';
    if (isStep3Active) return 'done';
    if (isStep2Active) return stepIndex === 1 ? 'done' : stepIndex === 2 ? 'active' : 'upcoming';
    if (isStep1Active) return stepIndex === 1 ? 'active' : 'upcoming';
    return 'upcoming';
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800 max-w-2xl w-full mx-auto space-y-8">
      {/* Header & Polling Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">Live Dispatch Tracking</span>
          <h2 className="text-2xl font-bold text-slate-100 mt-0.5">Pickup #{pickupId}</h2>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span className="text-xs font-medium text-emerald-300">Polling every 3s</span>
        </div>
      </div>

      {/* PICKUP CONFIRMED BANNER */}
      {isStep3Active && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-2xl p-6 glow-emerald text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 mx-auto font-extrabold shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Dispatch Complete</span>
            <h3 className="text-2xl font-extrabold text-slate-100">Pickup Confirmed!</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto mt-1">
              Your pickup request has been accepted by our partner. They are en route to your location.
            </p>
          </div>
        </div>
      )}

      {/* Main Status Display Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {/* Step 1: Searching Partner */}
        <div className={`glass-card p-5 rounded-xl border transition-all duration-300 ${
          getStepStatus(1) === 'active'
            ? 'border-emerald-500/80 bg-emerald-950/20 ring-1 ring-emerald-500/40 glow-emerald'
            : 'border-slate-700/60 bg-slate-900/60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              getStepStatus(1) === 'active' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-emerald-400'
            }`}>
              <Search className={`w-5 h-5 ${getStepStatus(1) === 'active' ? 'animate-bounce' : ''}`} />
            </div>
            <span className="text-xs font-bold text-slate-500">STEP 1</span>
          </div>
          <h3 className="font-bold text-slate-200">1. Searching Partner</h3>
          <p className="text-xs text-slate-400 mt-1">Haversine geo-matching nearest partner</p>
        </div>

        {/* Step 2: Calling Partner */}
        <div className={`glass-card p-5 rounded-xl border transition-all duration-300 ${
          getStepStatus(2) === 'active'
            ? 'border-emerald-500/80 bg-emerald-950/20 ring-1 ring-emerald-500/40 glow-emerald'
            : 'border-slate-700/60 bg-slate-900/60'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              getStepStatus(2) === 'active' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-emerald-400'
            }`}>
              <PhoneCall className={`w-5 h-5 ${getStepStatus(2) === 'active' ? 'animate-pulse' : ''}`} />
            </div>
            <span className="text-xs font-bold text-slate-500">STEP 2</span>
          </div>
          <h3 className="font-bold text-slate-200">2. Calling Partner</h3>
          <p className="text-xs text-slate-400 mt-1">Automated Twilio Voice Call dispatched</p>
        </div>

        {/* Step 3: Accepted */}
        <div className={`glass-card p-5 rounded-xl border transition-all duration-300 ${
          isStep3Active
            ? 'border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500 glow-emerald'
            : isRejected
            ? 'border-red-500/80 bg-red-950/20'
            : 'border-slate-800/40 opacity-50'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isStep3Active ? 'bg-emerald-500 text-slate-950 font-bold' : isRejected ? 'bg-red-500 text-slate-950' : 'bg-slate-800 text-slate-500'
            }`}>
              {isRejected ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <span className="text-xs font-bold text-slate-500">STEP 3</span>
          </div>
          <h3 className="font-bold text-slate-200">
            {isRejected ? '3. Call Rejected / SMS Sent' : '3. Accepted'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {isRejected ? 'Partner rejected. Fallback SMS sent.' : 'Partner confirmed pickup assignment'}
          </p>
        </div>
      </div>

      {/* Manual Accept Simulation Button for Step 2 */}
      {!isStep3Active && !isRejected && (
        <button
          type="button"
          onClick={handleSimulateAccept}
          disabled={isSimulatingAccept}
          className="w-full py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition"
        >
          <Check className="w-4 h-4" />
          <span>{isSimulatingAccept ? 'Confirming...' : 'Simulate Partner Accepting Call (Press 1)'}</span>
        </button>
      )}

      {/* Details Box */}
      {pickupData && (
        <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Consumer Details</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              isStep3Active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              isRejected ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
              'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
            }`}>
              {pickupData.status}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Customer</span>
              <span className="font-semibold text-slate-200">{pickupData.consumer_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Device</span>
              <span className="font-semibold text-slate-200">{pickupData.device}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Location</span>
              <span className="font-semibold text-slate-200">{pickupData.latitude}, {pickupData.longitude}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Est. Price</span>
              <span className="font-semibold text-emerald-400">${pickupData.estimated_price}</span>
            </div>
          </div>

          {/* Assigned Partner Details if matched */}
          {pickupData.partner_details && (
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{pickupData.partner_details.name}</h4>
                  <p className="text-xs text-slate-400">Mode: {pickupData.partner_details.preferred_mode} | Phone: {pickupData.partner_details.phone}</p>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 flex items-center space-x-1">
                <Award className="w-3.5 h-3.5" />
                <span>Rating: {pickupData.partner_details.rating} ★</span>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={onReset}
        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl flex items-center justify-center space-x-2 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Submit Another Pickup</span>
      </button>
    </div>
  );
}
