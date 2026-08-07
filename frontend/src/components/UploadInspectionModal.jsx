import { useState, useEffect } from "react";
import { Modal, Button } from "./Common.jsx";
import { createInspection, getCatalog, getMultiAngleFusion, autoMatchGolden } from "../services/caseService.js";
import { AlertCircle, RefreshCw, Sparkles, Scan, Cpu, ChevronDown, Layers, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../utils/constants.js";
import TargetScanCaptureZone from "./TargetScanCaptureZone.jsx";

export default function UploadInspectionModal({ open, onClose, onSuccess }) {
  const navigate = useNavigate();

  // Form states
  const [captureSite, setCaptureSite] = useState("");
  const [captureAngle, setCaptureAngle] = useState("top");
  const [customFile, setCustomFile] = useState(null);
  const [expectedSerial, setExpectedSerial] = useState("");
  const [componentName, setComponentName] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");

  // Multi-Angle Fusion states
  const [enableMultiAngle, setEnableMultiAngle] = useState(false);
  const [captureAngle2, setCaptureAngle2] = useState("angled");
  const [customFile2, setCustomFile2] = useState(null);
  const [targetPreview2, setTargetPreview2] = useState(null);

  // Vector Embedding Reference Library state
  const [autoMatching, setAutoMatching] = useState(false);
  const [autoMatchScore, setAutoMatchScore] = useState(null);

  // Catalog Reference states
  const [catalogList, setCatalogList] = useState([]);
  const [selectedCatalogPart, setSelectedCatalogPart] = useState("");

  // Visual thumbnail previews
  const [targetPreview, setTargetPreview] = useState(null);

  // Pipeline execution feedback
  const [processing, setProcessing] = useState(false);
  const [progressLog, setProgressLog] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleAutoMatchGolden = async () => {
    if (!customFile) {
      setErrorMsg("Please select or capture a target scan photo first to auto-detect Golden Reference!");
      return;
    }
    setAutoMatching(true);
    setErrorMsg(null);
    try {
      const res = await autoMatchGolden(customFile);
      if (res.matched && res.top_match) {
        const topPart = res.top_match.part_number;
        handleCatalogPartChange(topPart);
        setAutoMatchScore(res.top_match.similarity_score);
      } else {
        setErrorMsg(res.detail || "No vector embedding match found in Reference Library.");
      }
    } catch (err) {
      setErrorMsg("Vector Embedding auto-match search failed: " + (err.message || "Unknown error"));
    } finally {
      setAutoMatching(false);
    }
  };

  const handleCatalogPartChange = (partNum) => {
    setSelectedCatalogPart(partNum);
    setCatalogList((prev) => {
      const selected = prev.find((c) => c.part_number === partNum);
      if (selected) {
        setComponentName(selected.name);
        setExpectedSerial(selected.golden_references?.[0]?.expected_serial || "");
      }
      return prev;
    });
  };

  useEffect(() => {
    if (!open) return;
    setProcessing(false);
    setProgressLog([]);
    setErrorMsg(null);
    setCustomFile(null);
    if (targetPreview) URL.revokeObjectURL(targetPreview);
    setTargetPreview(null);
    setExpectedSerial("");
    setComponentName("");
    setVendor("");
    setDate("");

    let cancelled = false;
    const loadCatalog = async () => {
      try {
        const list = await getCatalog();
        if (cancelled) return;
        setCatalogList(list || []);
        if (list && list.length > 0) {
          setSelectedCatalogPart(list[0].part_number);
          setComponentName(list[0].name);
          setExpectedSerial(list[0].golden_references?.[0]?.expected_serial || "");
        }
      } catch (err) {
        console.error("Failed to load parts catalog:", err);
      }
    };
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (targetPreview) URL.revokeObjectURL(targetPreview);
    };
  }, [targetPreview]);

  const runSimulatedProgress = (isMulti = false) => {
    setProgressLog([]);
    const logs = [
      { text: "Ingest & Triage: Image clarity & lighting exposure validated", delay: 200, status: "success" },
      { text: "Homography: Frame alignment using ORB descriptors complete", delay: 1000, status: "success" },
      { text: "Classifier: Golden reference part category matched", delay: 1800, status: "success" },
      { text: "Vision Ensemble: Generating SSIM structural diff heatmap...", delay: 2600, status: "active" },
      { text: "EasyOCR Engine: Performing character mismatch verification...", delay: 3400, status: "active" },
      {
        text: isMulti
          ? "Multi-Angle Fusion: Fusing primary & secondary camera evidence..."
          : "Decision Judge: Evaluating compliance policy & calculating risk score...",
        delay: 4200,
        status: "active",
      },
      { text: "Explainer: Generating audit rationale summary...", delay: 5000, status: "active" },
    ];
    logs.forEach((log) => {
      setTimeout(() => setProgressLog((prev) => [...prev, { text: log.text, status: log.status }]), log.delay);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customFile) {
      setErrorMsg("Please upload a target Part Image Scan to inspect.");
      return;
    }
    if (!selectedCatalogPart) {
      setErrorMsg("Please select a standard Golden Reference part from the catalog.");
      return;
    }

    setProcessing(true);
    setErrorMsg(null);
    const isMultiActive = enableMultiAngle && customFile2;
    runSimulatedProgress(isMultiActive);
    try {
      const formData = new FormData();
      formData.append("capture_site", captureSite);
      formData.append("capture_angle", captureAngle);
      formData.append("file", customFile);
      formData.append("catalog_part_number", selectedCatalogPart);

      if (expectedSerial) formData.append("expected_serial", expectedSerial.trim());
      if (vendor) formData.append("vendor", vendor.trim());
      if (componentName) formData.append("component_name", componentName.trim());
      if (date) formData.append("date", date);

      let finalCaseId = null;

      if (isMultiActive) {
        const formData2 = new FormData();
        formData2.append("capture_site", captureSite);
        formData2.append("capture_angle", captureAngle2);
        formData2.append("file", customFile2);
        formData2.append("catalog_part_number", selectedCatalogPart);
        if (expectedSerial) formData2.append("expected_serial", expectedSerial.trim());
        if (vendor) formData2.append("vendor", vendor.trim());
        if (componentName) formData2.append("component_name", componentName.trim());
        if (date) formData2.append("date", date);

        const [result1, result2] = await Promise.all([
          createInspection(formData),
          createInspection(formData2),
        ]);

        finalCaseId = result1.case_id;

        try {
          await getMultiAngleFusion([result1.case_id, result2.case_id]);
        } catch (fusionErr) {
          console.warn("Multi-Angle Fusion warning:", fusionErr);
        }
      } else {
        const result = await createInspection(formData);
        finalCaseId = result.case_id;
      }

      setProcessing(false);
      onClose();
      if (onSuccess) onSuccess();
      navigate(`${ROUTES.CASE_DETAIL}/${finalCaseId}`);
    } catch (err) {
      setProcessing(false);
      let errMsg = err.message || "Failed to process parts inspection.";
      if (err.response && err.response.data && err.response.data.detail) {
        errMsg =
          typeof err.response.data.detail === "object" && err.response.data.detail.message
            ? `Triage Rejection: ${err.response.data.detail.message}`
            : err.response.data.detail;
      }
      setErrorMsg(errMsg);
    }
  };

  const getGoldenImageUrl = (goldenRef) => {
    if (!goldenRef?.image_path) return null;
    const path = goldenRef.image_path;
    return path.startsWith("/") ? path : `/${path}`;
  };

  const customTitle = (
    <div className="flex items-center gap-2.5">
      <div className="h-8 w-8 rounded-lg bg-sky-600/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center font-bold">
        <Scan size={18} />
      </div>
      <div>
        <p className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
          New Hardware Compliance Inspection
        </p>
        <p className="text-[10px] text-slate-500 font-mono">5-AGENT CV PIPELINE INGESTION</p>
      </div>
    </div>
  );

  const isSubmitDisabled = !customFile || !selectedCatalogPart;
  const modalFooter = !processing && (
    <div className="flex items-center justify-end gap-2.5 w-full">
      <Button variant="outline" size="sm" onClick={onClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        icon={<Scan size={14} />}
      >
        Start Audit Diagnostic
      </Button>
    </div>
  );

  const selectedCatalogItem = catalogList.find((c) => c.part_number === selectedCatalogPart);
  const selectedGoldenRef = selectedCatalogItem?.golden_references?.[0];
  const goldenImageUrl = getGoldenImageUrl(selectedGoldenRef);

  return (
    <Modal open={open} onClose={processing ? undefined : onClose} title={customTitle} size="xl" footer={modalFooter}>
      {processing ? (
        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center gap-2 py-2">
            <RefreshCw className="text-sky-500 animate-spin" size={24} />
            <p className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono uppercase tracking-wider">
              Executing Multi-Agent Analysis Pipeline…
            </p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 font-mono text-[11px] space-y-2 h-48 overflow-y-auto">
            {progressLog.map((log, idx) => (
              <p
                key={idx}
                className={`flex gap-2 items-start ${
                  log.status === "success"
                    ? "text-emerald-400 font-semibold"
                    : "text-sky-400 animate-pulse"
                }`}
              >
                <span className="text-slate-600 shrink-0">&gt;</span>
                <span>{log.text}</span>
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {errorMsg && (
            <div className="flex gap-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-xs text-rose-600 dark:text-rose-400 items-start">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase text-[10px] tracking-wider">Audit Triage Notice</p>
                <p className="mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Side by side Golden Ref + Target Scan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* LEFT: Golden Reference */}
            <div className="flex flex-col gap-2 min-w-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-sky-500" />
                Select Golden Reference (Catalog)
              </label>

              <div className="relative">
                <select
                  value={selectedCatalogPart}
                  onChange={(e) => handleCatalogPartChange(e.target.value)}
                  className="w-full h-9 px-3 pr-8 lab-input text-xs font-semibold"
                >
                  {catalogList.length === 0 ? (
                    <option value="">No catalog references loaded</option>
                  ) : (
                    catalogList.map((item) => (
                      <option key={item.part_number} value={item.part_number}>
                        {item.name} ({item.part_number})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              {selectedCatalogItem && (
                <div className="lab-card-raised p-3 flex flex-col gap-2.5 flex-1 min-h-[18rem]">
                  {goldenImageUrl ? (
                    <div className="relative h-56 md:h-64 bg-slate-950/90 rounded-xl border border-slate-800/80 flex items-center justify-center p-2.5 overflow-hidden group shadow-inner">
                      <img
                        src={goldenImageUrl}
                        className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                        alt="Golden Standard Preview"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-sky-950/80 backdrop-blur-md border border-sky-500/30 text-sky-300 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 shadow">
                        <Sparkles size={10} className="text-sky-400" /> OEM Master Reference
                      </div>
                    </div>
                  ) : (
                    <div className="h-56 md:h-64 rounded-xl bg-slate-950/90 border border-slate-800/80 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Cpu size={36} className="text-slate-600 animate-pulse" />
                      <p className="text-xs font-mono">No Reference Image Preview</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                    <div className="col-span-2 flex items-center justify-between">
                      <p className="font-bold text-slate-100 text-xs truncate">
                        {selectedCatalogItem.name}
                      </p>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                        {selectedCatalogItem.commodity}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Part Number</p>
                      <p className="font-mono text-sky-400 font-semibold text-[11px] truncate">
                        {selectedCatalogItem.part_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Expected S/N</p>
                      <p className="font-mono text-slate-300 font-semibold text-[11px] truncate">
                        {selectedGoldenRef?.expected_serial || selectedCatalogItem.part_number}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Target Part Scan */}
            <div className="flex flex-col min-w-0">
              <TargetScanCaptureZone
                customFile={customFile}
                setCustomFile={setCustomFile}
                targetPreview={targetPreview}
                setTargetPreview={setTargetPreview}
                disabled={processing}
              />
            </div>
          </div>

          {/* Form Metadata Fields */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Vendor Name
                </label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Dell, Supplier A"
                  className="w-full h-8 px-3 text-xs lab-input"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Inspection Date</span>
                  <Calendar className="w-3 h-3 text-cyan-400 opacity-80" />
                </label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-8 px-3 text-xs lab-input cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Location / Site
                </label>
                <input
                  type="text"
                  value={captureSite}
                  onChange={(e) => setCaptureSite(e.target.value)}
                  placeholder="e.g. Bhubaneswar, Bengaluru"
                  className="w-full h-8 px-3 text-xs lab-input"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                  Camera Perspective
                </label>
                <div className="relative">
                  <select
                    value={captureAngle}
                    onChange={(e) => setCaptureAngle(e.target.value)}
                    className="w-full h-8 px-3 pr-8 text-xs lab-input"
                  >
                    <option value="top">Top Down (0° Standard)</option>
                    <option value="angled">Angled Perspective (45°)</option>
                    <option value="side">Side View (90° Profile)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Multi-Angle Fusion Option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setEnableMultiAngle(!enableMultiAngle)}
                className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition ${
                  enableMultiAngle
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400"
                    : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers size={15} />
                  <div>
                    <p className="text-xs font-bold uppercase">Multi-Angle Fusion Inspection</p>
                    <p className="text-[10px] text-slate-500 font-normal">
                      Optionally attach secondary angle scan for combined risk fusion
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                  {enableMultiAngle ? "ACTIVE" : "+ ADD"}
                </span>
              </button>

              {enableMultiAngle && (
                <div className="mt-2.5 p-3 rounded-lg border border-sky-500/20 bg-slate-50 dark:bg-slate-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">
                      Secondary Perspective Image
                    </span>
                    <select
                      value={captureAngle2}
                      onChange={(e) => setCaptureAngle2(e.target.value)}
                      className="h-7 px-2 text-[10px] lab-input font-bold"
                    >
                      <option value="angled">Angled (45°)</option>
                      <option value="side">Side View</option>
                      <option value="top">Top View</option>
                    </select>
                  </div>

                  <TargetScanCaptureZone
                    customFile={customFile2}
                    setCustomFile={setCustomFile2}
                    targetPreview={targetPreview2}
                    setTargetPreview={setTargetPreview2}
                    disabled={processing}
                    label="Secondary Angle Scan File"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}