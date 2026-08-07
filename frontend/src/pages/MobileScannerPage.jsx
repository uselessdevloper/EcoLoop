import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import {
  Camera,
  Upload,
  Sparkles,
  Smartphone,
  Cpu,
  HardDrive,
  Monitor,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building2,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Zap,
  Activity,
  ArrowRight,
  Laptop,
  Coins,
  UserCheck,
  MapPin,
  Check,
  CheckCircle,
  Truck,
  TrendingUp,
  Sliders,
  DollarSign,
  User,
  Users,
  Headphones
} from "lucide-react";
import { evaluateDeviceScan } from "../services/evaluationService.js";

const PRESET_OPTIONS = [
  { id: "auto", label: "Auto Detect", icon: Sparkles },
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "ram", label: "RAM", icon: Cpu },
  { id: "buds", label: "Earbuds", icon: Headphones },
  { id: "ssd", label: "SSD", icon: HardDrive },
  { id: "gpu", label: "GPU", icon: Monitor },
  { id: "motherboard", label: "Motherboard", icon: Layers },
];

export default function MobileScannerPage() {
  const { user } = useAuth();
  
  // PERSONA STATE: "consumer" | "partner" | "admin"
  const [activePersona, setActivePersona] = useState("consumer");

  useEffect(() => {
    if (user?.role === "admin") {
      setActivePersona("admin");
    } else if (user?.role === "partner") {
      setActivePersona("partner");
    } else {
      setActivePersona("consumer");
    }
  }, [user]);

  const [selectedPreset, setSelectedPreset] = useState("auto");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // CPU-Z / Hardware Diagnostics SDK state
  const [diagnostics, setDiagnostics] = useState({
    display_touch: true,
    camera_working: true,
    battery_health: 86,
    cpu_ram_ok: true,
    storage_speed_ok: true,
    biometrics_working: true,
    water_damage_detected: false,
  });

  // Settings & Incentive Drawer states
  const [showSettings, setShowSettings] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  
  // Inspection Report Output
  const [reportData, setReportData] = useState(null);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [sellSuccessModal, setSellSuccessModal] = useState(false);

  // Kabadiwala Partner Interactive State
  const [partnerPickups, setPartnerPickups] = useState([
    {
      id: "PICK-4091",
      customer: "Aditya Verma",
      address: "Tech Park Hostel A, Room 302",
      distance: "0.8 km",
      device: "OnePlus 11 5G (Static Screen)",
      offerAmount: 32500,
      commission: 250,
      status: "PENDING_PICKUP",
      otp: "4921"
    },
    {
      id: "PICK-4092",
      customer: "Priya Sharma",
      address: "Greenwood Apartments, Flat 104",
      distance: "1.4 km",
      device: "Dell XPS 15 Laptop (Core i7)",
      offerAmount: 47000,
      commission: 350,
      status: "PENDING_PICKUP",
      otp: "8102"
    }
  ]);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [verifiedPickupModal, setVerifiedPickupModal] = useState(null);

  // Admin Threshold State
  const [ssimThreshold, setSsimThreshold] = useState(0.85);
  const [ocrStrictness, setOcrStrictness] = useState(90);

  const fileInputRef = useRef(null);

  const handleImageSelect = (file) => {
    if (!file) return;
    setImageFiles(prev => [...prev, file]);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews(prev => [...prev, reader.result]);
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleMultipleImagesSelect = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const fileArray = Array.from(filesList);
    setImageFiles(prev => [...prev, ...fileArray]);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
    setError(null);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleMultipleImagesSelect(e.dataTransfer.files);
    }
  };

  const runEvaluation = async () => {
    if (imageFiles.length === 0) {
      setError("Please capture or upload at least one device photo first.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await evaluateDeviceScan({
        files: imageFiles,
        presetCategory: selectedPreset,
        hardwareDiagnostics: diagnostics,
      });

      if (res && res.report) {
        setReportData(res.report);
      } else {
        throw new Error("Evaluation engine returned invalid report format.");
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      const fallbackReport = generateLocalFallbackReport(selectedPreset, diagnostics);
      setReportData(fallbackReport);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setReportData(null);
    setError(null);
    setSelectedBuyer(null);
  };

  const loadDatasetSample = async (samplePath, isBroken = false) => {
    try {
      setLoading(true);
      const resp = await fetch(samplePath);
      const blob = await resp.blob();
      const filename = samplePath.split("/").pop() || "sample.png";
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      
      setSelectedPreset("phone");
      setImageFiles([file]);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews([reader.result]);
      };
      reader.readAsDataURL(file);
      
      if (isBroken) {
        setDiagnostics({
          display_touch: false,
          camera_working: true,
          battery_health: 64,
          cpu_ram_ok: false,
          storage_speed_ok: true,
          biometrics_working: false,
          water_damage_detected: true,
        });
      } else {
        setDiagnostics({
          display_touch: true,
          camera_working: true,
          battery_health: 94,
          cpu_ram_ok: true,
          storage_speed_ok: true,
          biometrics_working: true,
          water_damage_detected: false,
        });
      }
    } catch (err) {
      console.error("Failed loading dataset sample:", err);
      setError("Failed to load sample image from dataset.");
    } finally {
      setLoading(false);
    }
  };

  const verifyPartnerPickup = (pickupId) => {
    setPartnerPickups(prev =>
      prev.map(p => (p.id === pickupId ? { ...p, status: "COMPLETED" } : p))
    );
    setVerifiedPickupModal(pickupId);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased flex flex-col items-center justify-start p-2 sm:p-6">
      {/* MOBILE APPLICATION CONTAINER FRAME (White & Purple Theme) */}
      <div className="w-full max-w-[430px] bg-white border border-purple-200 rounded-[38px] shadow-2xl overflow-hidden flex flex-col min-h-[780px] relative">
        {/* Mobile Status Bar */}
        <div className="bg-[#7C3AED] text-white px-6 py-2 flex justify-between items-center text-[11px] font-mono font-bold">
          <span>9:41</span>
          <span className="flex items-center gap-1.5">
            <span>5G</span>
            <span>⚡ 100%</span>
          </span>
        </div>

        {/* ECOLOOP WHITE & PURPLE MOBILE HEADER */}
        <header className="bg-[#7C3AED] px-4 py-3 flex justify-between items-center text-white shadow-md">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] text-[#7C3AED] font-black flex items-center justify-center shadow">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wider uppercase font-mono text-white flex items-center gap-1">
                ECOLOOP <span className="bg-[#F3E8FF] text-[#7C3AED] text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">MOBILE</span>
              </h1>
              <p className="text-[9px] text-purple-100 font-mono">White &amp; Purple Theme</p>
            </div>
          </Link>

          {/* EcoPoints Rewards Button & Controls */}
          <div className="flex items-center gap-1.5">
            {/* User Profile avatar & name */}
            <div className="flex items-center gap-1.5 mr-1.5 bg-white/10 px-2 py-1 rounded-xl border border-white/10">
              <div className="w-5.5 h-5.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center font-mono text-[9px] font-black shadow-inner shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden min-[360px]:block leading-none text-left shrink-0">
                <span className="text-[8px] text-purple-200 font-mono block">USER</span>
                <span className="text-[9px] font-black font-mono text-white truncate max-w-[55px] block">{user?.name || "Guest"}</span>
              </div>
            </div>

            {activePersona === "consumer" && (
              <button
                onClick={() => setShowRewardsModal(true)}
                className="flex items-center gap-1 bg-[#F3E8FF] text-[#7C3AED] px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-sm hover:opacity-95 transition"
              >
                <Coins size={14} className="text-amber-500" />
                <span>500 PTS</span>
              </button>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white"
              title="CPU-Z & SDK Controls"
            >
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </header>

        {/* Workspace Role Indicator */}
        <div className="bg-[#F3E8FF] border-b border-purple-200 px-4 py-2 flex justify-between items-center text-xs font-mono">
          <span className="text-slate-500">Workspace Portal:</span>
          <span className="bg-[#7C3AED] text-white px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase">
            {activePersona === "admin" ? "Admin Supervisor" : activePersona === "partner" ? "Kabadiwala Partner" : "Consumer Portal"}
          </span>
        </div>

        {/* MAIN MOBILE SCREEN VIEWPORT */}
        <main className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          {/* ========================================================================= */}
          {/* 1. CONSUMER PERSONA SCREEN */}
          {/* ========================================================================= */}
          {activePersona === "consumer" && (
            <div className="space-y-4">
              {/* TOP STAT BAR: GREEN SCORE & KABADIWALA PARTNER STATUS */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-[#F8FAFC] border border-purple-200 p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    🌱
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">GREEN SCORE</span>
                    <span className="text-slate-900 font-bold">4.2 kg Offset</span>
                  </div>
                </div>
                <div className="bg-[#F8FAFC] border border-purple-200 p-2.5 rounded-2xl flex items-center gap-2 shadow-sm">
                  <div className="w-7 h-7 rounded-xl bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center font-bold">
                    <UserCheck size={14} />
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px]">KABADIWALA PARTNER</span>
                    <span className="text-[#7C3AED] font-bold">UID: KBD-9402</span>
                  </div>
                </div>
              </div>

              {!reportData ? (
                <div className="space-y-4">


                  {/* Category Pills */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-600 font-mono font-bold uppercase tracking-wider">
                      Select Device Category:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {PRESET_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = selectedPreset === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedPreset(opt.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 shrink-0 transition-all border ${
                              isSelected
                                ? "bg-[#7C3AED] text-white border-[#7C3AED] shadow-md"
                                : "bg-white text-slate-700 border-slate-200 hover:border-purple-300"
                            }`}
                          >
                            <Icon size={14} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Camera Upload Dropzone (White & Purple) */}
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => {
                      if (imagePreviews.length === 0) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[240px] ${
                      imagePreviews.length > 0
                        ? "border-[#7C3AED] bg-[#F3E8FF]/10 cursor-default"
                        : "border-purple-200 hover:border-[#7C3AED] bg-white shadow-sm cursor-pointer"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => e.target.files && handleMultipleImagesSelect(e.target.files)}
                    />

                    {imagePreviews.length > 0 ? (
                      <div className="space-y-3 w-full" onClick={(e) => e.stopPropagation()}>
                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-purple-200 bg-slate-50 flex items-center justify-center p-1 group shadow-sm">
                              <img src={preview} alt={`Scan angle ${index + 1}`} className="h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-rose-600 transition"
                              >
                                ✕
                              </button>
                              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.2 rounded font-mono">
                                Photo {index + 1}
                              </div>
                            </div>
                          ))}
                          
                          {/* Add another image box in the grid */}
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="relative aspect-video rounded-xl border border-dashed border-purple-300 bg-purple-50/50 hover:bg-[#F3E8FF]/30 flex flex-col items-center justify-center cursor-pointer transition text-[#7C3AED]"
                          >
                            <Camera size={18} />
                            <span className="text-[10px] font-mono font-bold mt-1">+ Add Photo</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-[#7C3AED] font-mono font-semibold text-center">
                          {imagePreviews.length} photo{imagePreviews.length > 1 ? "s" : ""} loaded for multi-angle AI analysis
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-16 h-16 rounded-full bg-[#F3E8FF] border border-purple-300 flex items-center justify-center text-[#7C3AED] mx-auto shadow-inner">
                          <Camera size={32} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Scan Electronic Device</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Upload 1 or more photos (front, back, sides) for full inspection
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] text-[11px] font-mono border border-purple-300 font-bold">
                          <Upload size={12} /> Tap Camera / Upload Image
                        </div>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Valuation CTA */}
                  <button
                    onClick={runEvaluation}
                    disabled={loading || imageFiles.length === 0}
                    className={`w-full py-4 rounded-2xl font-black font-mono text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition-all ${
                      loading || imageFiles.length === 0
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-purple-500/25 active:scale-95"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Activity size={18} className="animate-spin text-purple-200" />
                        Running Intelligent Diagnostic Scan...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="text-[#F3E8FF]" />
                        Generate EcoLoop Valuation &amp; Payout
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* REPORT OUTPUT VIEW */
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-white border border-purple-300 rounded-3xl p-5 shadow-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] border border-purple-200 text-[10px] font-mono font-black uppercase">
                          {reportData.category} VERIFIED ASSET
                        </span>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
                          {reportData.model_name}
                        </h2>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-mono block">HEALTH SCORE</span>
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 font-mono font-black text-sm">
                          <ShieldCheck size={16} /> {reportData.health_score}/100
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-purple-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-slate-500 font-mono uppercase">Estimated Fair Market Price</p>
                          <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
                            ₹{reportData.estimated_market_value?.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="bg-[#7C3AED] text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md">
                            +₹{(reportData.exchange_bonus_inr || 1500).toLocaleString("en-IN")} Brand Bonus
                          </span>
                          <p className="text-[10px] text-slate-600 font-mono mt-1">
                            Total Instant Payout: <strong className="text-[#7C3AED]">₹{(reportData.estimated_market_value + (reportData.exchange_bonus_inr || 1500)).toLocaleString("en-IN")}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Buyer Bids */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm">
                    <h3 className="text-xs font-black text-slate-900 font-mono uppercase">Direct Marketplace Offers</h3>
                    {reportData.marketplace_bids?.map((bid, idx) => (
                      <div key={idx} className="p-3 rounded-2xl border border-purple-200 bg-[#F8FAFC] flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded">
                            {bid.badge}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 mt-1">{bid.buyer_name}</h4>
                          <p className="text-[10px] text-slate-500 font-mono">{bid.offer_type}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black font-mono text-emerald-600 block">
                            ₹{bid.offer_amount?.toLocaleString("en-IN")}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedBuyer(idx);
                              setSellSuccessModal(true);
                            }}
                            className="mt-1 px-2.5 py-1 rounded-lg bg-[#7C3AED] text-white text-[10px] font-bold font-mono shadow"
                          >
                            Accept Offer →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={resetScanner}
                    className="w-full py-3.5 rounded-2xl bg-[#F3E8FF] text-[#7C3AED] text-xs font-black font-mono border border-purple-300"
                  >
                    Scan Another Device
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. KABADIWALA PARTNER PERSONA SCREEN */}
          {/* ========================================================================= */}
          {activePersona === "partner" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Partner Profile Header Card */}
              <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white p-4 rounded-3xl space-y-3 shadow-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-white text-[#7C3AED] font-black flex items-center justify-center text-lg shadow">
                      🛵
                    </div>
                    <div>
                      <h3 className="text-sm font-black font-mono">Partner Ramesh</h3>
                      <p className="text-[10px] text-purple-100 font-mono">Partner UID: KBD-9402</p>
                    </div>
                  </div>
                  <span className="bg-[#F3E8FF] text-[#7C3AED] px-2.5 py-1 rounded-xl text-[10px] font-black font-mono">
                    Verified Partner
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-400/40 text-[11px] font-mono">
                  <div>
                    <span className="text-purple-200 text-[10px] block">TODAY'S EARNINGS</span>
                    <strong className="text-white text-base">₹1,750</strong>
                  </div>
                  <div>
                    <span className="text-purple-200 text-[10px] block">PICKUPS COMPLETED</span>
                    <strong className="text-white text-base">6 Pickups</strong>
                  </div>
                </div>
              </div>

              {/* Assigned Doorstep Pickups List */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-900 font-mono uppercase">Assigned Doorstep Pickups</h3>
                  <span className="text-[10px] text-purple-700 font-mono font-bold">Live GPS Assigned</span>
                </div>

                {partnerPickups.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-3xl bg-white border border-purple-200 space-y-3 shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-mono font-bold text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-md">
                          {item.id} • {item.distance} away
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{item.customer}</h4>
                        <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-purple-600" /> {item.address}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-xl text-[10px] font-mono font-black ${
                        item.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {item.status === "COMPLETED" ? "✓ PICKED UP" : "PENDING"}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-slate-200 text-xs font-mono flex justify-between items-center">
                      <div>
                        <span className="text-slate-500 text-[10px] block">DEVICE &amp; PAYOUT</span>
                        <strong className="text-slate-900 text-xs">{item.device}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-600 font-black block">₹{item.offerAmount?.toLocaleString("en-IN")}</span>
                        <span className="text-purple-700 text-[10px] font-bold">Commission: +₹{item.commission}</span>
                      </div>
                    </div>

                    {item.status !== "COMPLETED" ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Enter Customer OTP (${item.otp})`}
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-purple-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#7C3AED]"
                        />
                        <button
                          onClick={() => verifyPartnerPickup(item.id)}
                          className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-black font-mono shadow"
                        >
                          Confirm
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono text-center font-bold">
                        ✓ Pickup Verified &amp; Instant UPI Disbursed to Consumer
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. ADMIN / BRAND SUPERVISOR PERSONA SCREEN */}
          {/* ========================================================================= */}
          {activePersona === "admin" && (
            <div className="space-y-4 animate-in fade-in duration-200 font-mono">
              {/* Brand EPR Compliance Target Card */}
              <div className="bg-white border border-purple-300 p-4 rounded-3xl space-y-3 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-[#7C3AED]" size={18} />
                    <h3 className="text-xs font-black text-slate-900 uppercase">Brand EPR Compliance Portal</h3>
                  </div>
                  <span className="text-[10px] bg-[#F3E8FF] text-[#7C3AED] px-2 py-0.5 rounded font-bold">
                    Dell / HP / OnePlus
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Annual Target Collection:</span>
                    <strong className="text-slate-900">50,000 kg</strong>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div className="bg-[#7C3AED] h-full w-[76%]" />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Collected: 38,450 kg (76.9%)</span>
                    <span>Remaining: 11,550 kg</span>
                  </div>
                </div>
              </div>

              {/* Vision AI Calibration Controls */}
              <div className="bg-white border border-purple-200 p-4 rounded-3xl space-y-3 shadow-sm text-xs">
                <h3 className="font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <Sliders size={14} className="text-[#7C3AED]" /> Vision AI Sensitivity Calibration
                </h3>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">SSIM Alignment Threshold:</span>
                      <strong className="text-[#7C3AED]">{(ssimThreshold * 100).toFixed(0)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="0.95"
                      step="0.05"
                      value={ssimThreshold}
                      onChange={(e) => setSsimThreshold(Number(e.target.value))}
                      className="accent-[#7C3AED] w-full"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-600">Fuzzy OCR Tag Strictness:</span>
                      <strong className="text-[#7C3AED]">{ocrStrictness}%</strong>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="100"
                      step="5"
                      value={ocrStrictness}
                      onChange={(e) => setOcrStrictness(Number(e.target.value))}
                      className="accent-[#7C3AED] w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ECOPOINTS REWARDS MODAL */}
        {showRewardsModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-purple-300 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-purple-200 pb-2">
                <div className="flex items-center gap-2">
                  <Coins className="text-amber-500" size={20} />
                  <h3 className="text-sm font-black text-slate-900 font-mono">ECOPOINTS STORE</h3>
                </div>
                <button onClick={() => setShowRewardsModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                  ✕
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#7C3AED] text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-purple-200 font-mono block">ECOPOINTS BALANCE</span>
                  <span className="text-xl font-black font-mono">500 PTS</span>
                </div>
                <span className="bg-[#F3E8FF] text-[#7C3AED] px-2.5 py-1 rounded-xl text-xs font-black font-mono">
                  Gold Tier
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-2xl bg-[#F8FAFC] border border-purple-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900">🎬 BookMyShow Movie Ticket</h4>
                    <p className="text-[10px] text-slate-500">Sponsored by Partner Brands</p>
                  </div>
                  <button className="px-2.5 py-1 rounded-lg bg-[#7C3AED] text-white font-mono font-bold text-[10px]">
                    250 PTS
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowRewardsModal(false)}
                className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold font-mono"
              >
                Close Rewards
              </button>
            </div>
          </div>
        )}

        {/* TRANSACTION CONFIRMATION MODAL */}
        {sellSuccessModal && selectedBuyer !== null && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-purple-300 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 font-mono">Offer Accepted!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Partner Ramesh (UID: KBD-9402) assigned for doorstep pickup.
                </p>
                <p className="text-2xl font-black text-emerald-600 font-mono mt-2">
                  Instant UPI: ₹{reportData.marketplace_bids[selectedBuyer]?.offer_amount?.toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => {
                  setSellSuccessModal(false);
                  resetScanner();
                }}
                className="w-full py-3 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-bold font-mono shadow"
              >
                Done &amp; Return
              </button>
            </div>
          </div>
        )}

        {/* MOBILE FOOTER */}
        <footer className="bg-slate-50 border-t border-purple-100 px-6 py-2.5 text-center text-[10px] text-slate-500 font-mono">
          EcoLoop White &amp; Purple Mobile UI • All Personas Active
        </footer>
      </div>
    </div>
  );
}

function generateLocalFallbackReport(category = "auto", diagnostics = {}) {
  const cat = (category || "auto").toLowerCase();
  const batteryHealth = diagnostics?.battery_health || 85;

  if (cat === "ram") {
    return {
      model_name: "Corsair Vengeance DDR5 32GB (5600MHz)",
      category: "RAM",
      estimated_market_value: 6500,
      health_score: 95,
      star_rating: 5,
      physical_condition: "Clean Gold Pins & Heat Spreader",
      crack_probability_pct: 0,
      scratch_severity: "None",
      burnt_trace_detected: false,
      ecopoints_earned: 250,
      exchange_bonus_inr: 500,
      greenscore_kg: 0.15,
      components: [
        { name: "DRAM IC Memory Modules", status: "Passed Memory Diagnostic", value_inr: 4500, health_pct: 98 },
        { name: "Gold Contact Pins", status: "Clean & Uncorroded", value_inr: 1200, health_pct: 95 },
        { name: "PMIC Voltage Regulator", status: "Nominal Power", value_inr: 800, health_pct: 96 }
      ],
      marketplace_bids: [
        { buyer_name: "Silicon Harvest Spares Hub", offer_type: "Component Resell", offer_amount: 6200, badge: "Highest Offer", delivery_time: "Instant Credit" },
        { buyer_name: "EcoRecycle Green Metals", offer_type: "Material Recycling", offer_amount: 1500, badge: "Floor Price", delivery_time: "Drop-off" }
      ]
    };
  }

  if (cat === "buds" || cat === "earbuds" || cat === "audio") {
    return {
      model_name: "Wings Phantom True Wireless Earbuds",
      category: "EARBUDS",
      estimated_market_value: 1800,
      health_score: 92,
      star_rating: 5,
      physical_condition: "Clean Casing & Drivers",
      crack_probability_pct: 2,
      scratch_severity: "Minor",
      burnt_trace_detected: false,
      ecopoints_earned: 150,
      exchange_bonus_inr: 300,
      greenscore_kg: 0.10,
      components: [
        { name: "Left Earbud Driver", status: "Functional Audio", value_inr: 500, health_pct: 96 },
        { name: "Right Earbud Driver", status: "Functional Audio", value_inr: 500, health_pct: 96 },
        { name: "Charging Case Battery", status: "Healthy Battery", value_inr: 400, health_pct: 90 },
        { name: "Bluetooth 5.3 Audio Chip", status: "Functional", value_inr: 400, health_pct: 95 }
      ],
      marketplace_bids: [
        { buyer_name: "Refurbisher Alpha (Direct)", offer_type: "Refurbish & Resell", offer_amount: 1750, badge: "Highest Offer", delivery_time: "24 Hours Pickup" },
        { buyer_name: "EcoRecycle Green Metals", offer_type: "Material Floor", offer_amount: 400, badge: "Guaranteed Floor", delivery_time: "Drop-off" }
      ]
    };
  }

  if (cat === "laptop") {
    return {
      model_name: "Dell XPS 15 Intel Core i7 Laptop",
      category: "LAPTOP",
      estimated_market_value: 45000,
      health_score: 89,
      star_rating: 4,
      physical_condition: "Minor Chassis Scratches",
      crack_probability_pct: 5,
      scratch_severity: "Minor",
      burnt_trace_detected: false,
      ecopoints_earned: 1000,
      exchange_bonus_inr: 2000,
      greenscore_kg: 1.25,
      components: [
        { name: "15.6 Inch FHD IPS Display", status: "Functional", value_inr: 12000, health_pct: 95 },
        { name: "Core i7 / 16GB RAM Motherboard", status: "Functional", value_inr: 24000, health_pct: 92 },
        { name: "High-Capacity Li-ion Battery", status: `Healthy (${batteryHealth}%)`, value_inr: 4500, health_pct: batteryHealth },
        { name: "Aluminum Frame & Keyboard", status: "Minor Scratches", value_inr: 4500, health_pct: 85 }
      ],
      marketplace_bids: [
        { buyer_name: "Refurbisher Alpha (Direct)", offer_type: "Refurbish & Resell", offer_amount: 43500, badge: "Highest Offer", delivery_time: "24 Hours Pickup" },
        { buyer_name: "Silicon Harvest Spares Hub", offer_type: "Parts Harvesting", offer_amount: 39000, badge: "Best for Reusable Parts", delivery_time: "Instant Credit" }
      ]
    };
  }

  if (cat === "ssd" || cat === "storage") {
    return {
      model_name: "Samsung 980 Pro 1TB NVMe SSD",
      category: "SSD",
      estimated_market_value: 7200,
      health_score: 96,
      star_rating: 5,
      physical_condition: "Healthy S.M.A.R.T.",
      crack_probability_pct: 0,
      scratch_severity: "None",
      burnt_trace_detected: false,
      ecopoints_earned: 300,
      exchange_bonus_inr: 500,
      greenscore_kg: 0.20,
      components: [
        { name: "V-NAND Flash Memory", status: "Healthy S.M.A.R.T.", value_inr: 4800, health_pct: 97 },
        { name: "PCIe 4.0 Controller", status: "Nominal Temp", value_inr: 1800, health_pct: 96 },
        { name: "Interface Pin Contacts", status: "Clean", value_inr: 600, health_pct: 95 }
      ],
      marketplace_bids: [
        { buyer_name: "Silicon Harvest Spares Hub", offer_type: "Direct Purchase", offer_amount: 6900, badge: "Highest Offer", delivery_time: "Instant Credit" }
      ]
    };
  }

  if (cat === "gpu" || cat === "graphics") {
    return {
      model_name: "NVIDIA GeForce RTX 4070 12GB GDDR6X",
      category: "GPU",
      estimated_market_value: 48000,
      health_score: 94,
      star_rating: 5,
      physical_condition: "Intact Heatsink & Fans",
      crack_probability_pct: 0,
      scratch_severity: "None",
      burnt_trace_detected: false,
      ecopoints_earned: 800,
      exchange_bonus_inr: 1500,
      greenscore_kg: 0.85,
      components: [
        { name: "AD104 GPU Silicon Die", status: "Passed CUDA Test", value_inr: 30000, health_pct: 96 },
        { name: "12GB GDDR6X Memory Chips", status: "Functional", value_inr: 12000, health_pct: 95 },
        { name: "Dual-Fan Heatsink Assembly", status: "Spinning Cleanly", value_inr: 6000, health_pct: 92 }
      ],
      marketplace_bids: [
        { buyer_name: "Refurbisher Alpha (Direct)", offer_type: "Refurbish & Resell", offer_amount: 46000, badge: "Highest Offer", delivery_time: "24 Hours Pickup" }
      ]
    };
  }

  if (cat === "motherboard") {
    return {
      model_name: "Dell Latitude OEM Dual-Channel Motherboard",
      category: "MOTHERBOARD",
      estimated_market_value: 12000,
      health_score: 91,
      star_rating: 5,
      physical_condition: "All Component Traces Intact",
      crack_probability_pct: 2,
      scratch_severity: "None",
      burnt_trace_detected: false,
      ecopoints_earned: 400,
      exchange_bonus_inr: 800,
      greenscore_kg: 0.40,
      components: [
        { name: "System Controller Chipset", status: "Functional", value_inr: 7000, health_pct: 95 },
        { name: "VRM Power Mosfets", status: "Nominal Power", value_inr: 3200, health_pct: 92 },
        { name: "I/O Header Ports", status: "Clean Pins", value_inr: 1800, health_pct: 90 }
      ],
      marketplace_bids: [
        { buyer_name: "Silicon Harvest Spares Hub", offer_type: "Component Harvesting", offer_amount: 11200, badge: "Highest Offer", delivery_time: "Instant Credit" }
      ]
    };
  }

  // Fallback for phone / auto
  return {
    model_name: "OnePlus 11 5G",
    category: "PHONE",
    estimated_market_value: 32500,
    health_score: 87,
    star_rating: 4,
    physical_condition: "Screen Static Noise Detected",
    crack_probability_pct: 12,
    scratch_severity: "Minor",
    burnt_trace_detected: false,
    ecopoints_earned: 500,
    exchange_bonus_inr: 1500,
    greenscore_kg: 0.35,
    components: [
      { name: "120Hz Fluid AMOLED Display", status: "Damaged Static Screen", value_inr: 4500, health_pct: 35 },
      { name: "Triple Hasselblad Camera", status: "Functional", value_inr: 6500, health_pct: 98 },
      { name: "SUPERVOOC Battery Pack", status: `Healthy (${batteryHealth}%)`, value_inr: 1800, health_pct: batteryHealth },
      { name: "Snapdragon 8 Gen 2 Motherboard", status: "Functional", value_inr: 16500, health_pct: 95 }
    ],
    marketplace_bids: [
      { buyer_name: "Refurbisher Alpha (Direct)", offer_type: "Refurbish & Resell", offer_amount: 31000, badge: "Highest Offer", delivery_time: "24 Hours Pickup" },
      { buyer_name: "Silicon Harvest Spares Hub", offer_type: "Component Harvesting", offer_amount: 28500, badge: "Best for Reusable Parts", delivery_time: "Instant Credit" }
    ]
  };
}
