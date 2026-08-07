import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, Camera, RefreshCw, X, Cpu, ZapOff, Circle } from "lucide-react";
import { Button } from "./Common.jsx";

export default function TargetScanCaptureZone({
  customFile,
  setCustomFile,
  targetPreview,
  setTargetPreview,
  disabled,
  label,
}) {
  const [targetMode, setTargetMode] = useState("upload");
  const [webcamStream, setWebcamStream] = useState(null);
  const [webcamError, setWebcamError] = useState(null);
  const [webcamReady, setWebcamReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [webcamScanResult, setWebcamScanResult] = useState(null);

  const stopWebcam = useCallback(() => {
    setWebcamStream((prev) => {
      if (prev) {
        prev.getTracks().forEach((t) => t.stop());
      }
      return null;
    });
    setWebcamReady(false);
  }, []);

  const startWebcam = useCallback(async () => {
    setWebcamError(null);
    setWebcamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const msg =
        err.name === "NotAllowedError"
          ? "Camera access denied. Please grant permission."
          : err.name === "NotFoundError"
          ? "No video capture device detected."
          : `Camera error: ${err.message}`;
      setWebcamError(msg);
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
      videoRef.current.play().catch(() => {});
    }
  }, [webcamStream]);

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  const runWebcamIntegrityScan = useCallback((file, width, height) => {
    const checks = [];
    let overallOk = true;

    checks.push({ label: "File Integrity", ok: true, detail: `JPEG — ${(file.size / 1024).toFixed(0)} KB` });

    const minRes = width >= 150 && height >= 150;
    if (!minRes) overallOk = false;
    checks.push({
      label: "Min Resolution",
      ok: minRes,
      detail: minRes ? `${width}×${height} px` : `${width}×${height} px (<150px)`,
    });

    const ar = width / height;
    const arLabel = ar > 1.2 ? "Landscape" : ar < 0.8 ? "Portrait" : "Square";
    checks.push({ label: "Aspect Ratio", ok: true, detail: `${ar.toFixed(2)} (${arLabel})` });

    setWebcamScanResult({ status: overallOk ? "pass" : "fail", checks });
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
        if (targetPreview) URL.revokeObjectURL(targetPreview);
        setCustomFile(file);
        setTargetPreview(URL.createObjectURL(file));
        stopWebcam();
        runWebcamIntegrityScan(file, w, h);
      },
      "image/jpeg",
      0.92
    );
  }, [targetPreview, stopWebcam, runWebcamIntegrityScan, setCustomFile, setTargetPreview]);

  const handleRetake = useCallback(() => {
    if (targetPreview) URL.revokeObjectURL(targetPreview);
    setCustomFile(null);
    setTargetPreview(null);
    setWebcamScanResult(null);
    startWebcam();
  }, [targetPreview, startWebcam, setCustomFile, setTargetPreview]);

  const handleTabSwitch = useCallback(
    (mode) => {
      if (mode === targetMode) return;
      if (mode === "webcam") {
        startWebcam();
      } else {
        stopWebcam();
      }
      if (targetPreview) URL.revokeObjectURL(targetPreview);
      setCustomFile(null);
      setTargetPreview(null);
      setTargetMode(mode);
    },
    [targetMode, targetPreview, startWebcam, stopWebcam, setCustomFile, setTargetPreview]
  );

  const handleTargetChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (targetPreview) URL.revokeObjectURL(targetPreview);
    setCustomFile(file);
    setTargetPreview(URL.createObjectURL(file));
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Camera size={12} className="text-sky-500" />
          {label || "Target Scan Image"}
        </label>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-md border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleTabSwitch("upload")}
            disabled={disabled}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
              targetMode === "upload"
                ? "bg-sky-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Upload size={10} /> File
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch("webcam")}
            disabled={disabled}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
              targetMode === "webcam"
                ? "bg-sky-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Camera size={10} /> Camera
          </button>
        </div>
      </div>

      {targetMode === "upload" && (
        <div className="relative flex-1 flex flex-col min-h-[18rem]">
          {targetPreview ? (
            <div className="lab-card overflow-hidden flex flex-col flex-1">
              <div className="relative h-56 md:h-64 bg-slate-950 flex items-center justify-center overflow-hidden p-2.5">
                <img src={targetPreview} className="w-full h-full object-contain filter drop-shadow-md" alt="Target Scan" />
              </div>
              <div className="px-3 py-2 flex items-center justify-between bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="min-w-0 text-[10px]">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{customFile?.name}</p>
                  <p className="text-slate-500 font-mono">{customFile ? (customFile.size / 1024).toFixed(0) + " KB" : ""}</p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setCustomFile(null);
                    setTargetPreview(null);
                  }}
                  className="h-6 w-6 rounded flex items-center justify-center text-slate-500 hover:text-rose-500 transition"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2.5 min-h-[18rem] flex-1 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer transition">
              <input type="file" accept="image/*" onChange={handleTargetChange} className="hidden" disabled={disabled} />
              <div className="h-12 w-12 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Camera size={22} />
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Upload Target Hardware Scan</p>
                <p className="text-[10px] text-slate-500 font-medium">Drag file here or click to browse image</p>
              </div>
            </label>
          )}
        </div>
      )}

      {targetMode === "webcam" && (
        <div className="flex flex-col gap-2">
          {targetPreview ? (
            <div className="flex flex-col gap-2">
              <div className="lab-card overflow-hidden">
                <div className="relative h-56 md:h-64 bg-slate-950 flex items-center justify-center overflow-hidden p-2.5">
                  <img src={targetPreview} className="w-full h-full object-contain filter drop-shadow-md" alt="Webcam capture" />
                </div>
                <div className="px-3 py-2 flex items-center justify-between bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-[10px]">
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{customFile?.name}</p>
                  <Button variant="outline" size="sm" onClick={handleRetake} disabled={disabled} icon={<RefreshCw size={12} />}>
                    Retake
                  </Button>
                </div>
              </div>

              {webcamScanResult && (
                <div className="lab-card p-2.5 text-[10px] space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Cpu size={12} className="text-sky-500" /> Image Integrity Validation
                  </p>
                  {webcamScanResult.checks.map((chk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={chk.ok ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                        {chk.ok ? "✓" : "✗"}
                      </span>
                      <span className="text-slate-500 font-medium">{chk.label}:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">{chk.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-950 min-h-[18rem]">
              {webcamError ? (
                <div className="h-56 md:h-64 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <ZapOff size={20} className="text-rose-400" />
                  <p className="text-xs text-slate-400">{webcamError}</p>
                  <Button variant="outline" size="sm" onClick={startWebcam}>
                    Retry Camera
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  {webcamStream && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded text-[9px] font-mono text-rose-400">
                      <Circle size={6} className="fill-rose-500 animate-pulse" /> LIVE STREAM
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onCanPlay={() => setWebcamReady(true)}
                    className="w-full h-56 md:h-64 object-cover bg-slate-950"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}
            </div>
          )}

          {!targetPreview && !webcamError && (
            <Button
              variant="primary"
              size="sm"
              onClick={captureFrame}
              disabled={!webcamReady || disabled}
              icon={<Camera size={14} />}
              className="w-full"
            >
              Capture Frame
            </Button>
          )}
        </div>
      )}
    </div>
  );
}