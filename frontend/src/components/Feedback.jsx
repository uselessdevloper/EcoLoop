import { useState, useEffect } from "react";
import {
  Shield,
  EyeOff,
  FileClock,
  Sliders,
  Plus,
  ArrowRight,
  Settings,
  AlertCircle,
  History,
  LockKeyhole,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import { createProduct, uploadGoldenReference } from "../services/productService.js";
import { Button } from "./Common.jsx";

const PRIVACY_ITEMS = [
  { key: "storeImageHashOnly", icon: Shield, label: "Store image hash only", desc: "Prevents writing raw images to permanent database logs" },
  { key: "redactPersonalMarkings", icon: EyeOff, label: "Redact personal markings", desc: "Filters visual operator IDs and metadata fields" },
  { key: "verdictChangeAuditLog", icon: FileClock, label: "Verdict change audit log", desc: "Enforces signature constraints on decisions overrides" },
];

function Toggle({ checked, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer select-none">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={onChange} />
      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 border border-slate-400 dark:border-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600" />
    </label>
  );
}

export function PrivacySecurity({ privacy, onToggle }) {
  return (
    <div className="col-span-12 md:col-span-6 space-y-4">
      <div className="lab-card p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <LockKeyhole size={16} className="text-sky-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Privacy &amp; Security Controls
          </h2>
        </div>
        <div className="space-y-3">
          {PRIVACY_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-3 pr-2 min-w-0">
                  <Icon size={16} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.label}</span>
                    <span className="block text-[10px] text-slate-500 truncate">{item.desc}</span>
                  </div>
                </div>
                <Toggle checked={privacy[item.key]} onChange={() => onToggle(item.key)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function KnownLimitations() {
  return (
    <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-slate-600 dark:text-slate-400 space-y-1">
      <p className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[10px] tracking-wider flex items-center gap-1">
        <AlertCircle size={13} /> Optical Triage Scope Limitation
      </p>
      <p className="text-[11px] leading-relaxed">
        Inspection validation relies strictly on optical visual matching. Firmware integrity or internal silicon micro-defects are outside visual audit scope.
      </p>
    </div>
  );
}

function formatWhen(iso) {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdjustmentHistory({ history }) {
  return (
    <div className="col-span-12 md:col-span-6 space-y-4">
      <div className="lab-card p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <History size={16} className="text-sky-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Calibration Audit Logs
          </h2>
        </div>

        <KnownLimitations />

        <div className="space-y-2">
          <p className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
            Recent Calibration Entries
          </p>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-start gap-2 p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">{h.summary}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    By {h.user} on {formatWhen(h.changedAt)}
                  </p>
                </div>
              </li>
            ))}
            {history.length === 0 && (
              <li className="text-slate-400 italic text-xs py-2 text-center">No calibration adjustments recorded.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function ThresholdSlider({ label, value, min, max, step, formatValue, description, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <label className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-wider">
          {label}
        </label>
        <span className="font-mono text-sky-600 dark:text-sky-400 font-bold px-2 py-0.5 rounded bg-sky-500/10 text-[11px]">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      <p className="text-[10px] text-slate-500 leading-normal">{description}</p>
    </div>
  );
}

export function PerceptionThresholds({ thresholds, onChange }) {
  return (
    <div className="col-span-12 lg:col-span-7">
      <div className="lab-card p-5 space-y-5 h-full">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Sliders size={16} className="text-sky-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Perception Engine Threshold Calibration
          </h2>
        </div>
        <div className="space-y-6">
          <ThresholdSlider
            label="Aligned Structural SSIM Minimum Coefficient"
            value={thresholds.ssim}
            min={0}
            max={1}
            step={0.01}
            formatValue={(v) => `Min SSIM: ${v}`}
            description="Structural difference below this coefficient generates a visual anomaly hotspot."
            onChange={(v) => onChange("ssim", v)}
          />
          <ThresholdSlider
            label="ORB Descriptor Keypoint Strictness"
            value={thresholds.keypointDeltaPct}
            min={0}
            max={50}
            step={1}
            formatValue={(v) => `Max Delta: ${v}%`}
            description="Spatial keypoint deviation above this threshold triggers homography alignment warning."
            onChange={(v) => onChange("keypointDeltaPct", v)}
          />
          <ThresholdSlider
            label="OCR Serial Character Matching Strictness"
            value={thresholds.ocrFuzzyPct}
            min={80}
            max={100}
            step={5}
            formatValue={(v) => `${v}% Match`}
            description="Defines OCR character string matching strictness for component serial labels."
            onChange={(v) => onChange("ocrFuzzyPct", v)}
          />
        </div>
      </div>
    </div>
  );
}

export function BusinessPolicyRouting({ rules, onAddRule }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !description.trim()) return;
    onAddRule({ id: `RULE-${Math.floor(Math.random() * 900 + 100)}`, name, description });
    setName("");
    setDescription("");
    setAdding(false);
  };

  return (
    <div className="col-span-12 lg:col-span-5">
      <div className="lab-card p-5 space-y-4 h-full">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Settings size={16} className="text-sky-500" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            Business Policy Routing Rules
          </h2>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {rules.map((rule) => (
            <div key={rule.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded">
                  {rule.id}
                </span>
                <ArrowRight size={13} className="text-slate-400" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">{rule.name}</h3>
              <p className="text-[10px] text-slate-500 leading-normal">{rule.description}</p>
            </div>
          ))}

          {adding ? (
            <div className="p-3 rounded-lg border border-sky-500/30 bg-sky-500/5 space-y-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rule Title"
                className="w-full h-8 px-2.5 text-xs lab-input"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Routing condition..."
                className="w-full h-16 p-2 text-xs lab-input resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleAdd}>
                  Add Rule
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdding(true)}
              icon={<Plus size={14} />}
              className="w-full justify-center"
            >
              Add Routing Rule
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function SavePipelineButton({ state, onSave }) {
  const isSaving = state === "saving";
  const isSaved = state === "saved";

  return (
    <Button
      variant={isSaved ? "success" : "primary"}
      size="sm"
      loading={isSaving}
      onClick={onSave}
      icon={<CheckCircle2 size={14} />}
    >
      {isSaved ? "Calibration Saved!" : "Save Pipeline Calibration"}
    </Button>
  );
}

export function RegisterProductCard({ onProductAdded }) {
  const [partSuffix, setPartSuffix] = useState("");
  const [name, setName] = useState("");
  const [commodity, setCommodity] = useState("");
  const [expectedSerial, setExpectedSerial] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!partSuffix.trim()) {
      setErrorMsg("Part code suffix is required.");
      return;
    }
    if (!name.trim()) {
      setErrorMsg("Product name is required.");
      return;
    }
    if (!commodity.trim()) {
      setErrorMsg("Commodity category is required.");
      return;
    }
    if (!file) {
      setErrorMsg("OEM Golden reference image is required.");
      return;
    }

    const fullPartNumber = `GOLD-${partSuffix.trim().toUpperCase()}`;

    setRegistering(true);
    try {
      const product = await createProduct({
        part_number: fullPartNumber,
        name: name.trim(),
        commodity,
      });

      let roi_json = { label_roi: { x: 100, y: 100, width: 300, height: 200 } };
      const formData = new FormData();
      formData.append("file", file);
      formData.append("roi_config", JSON.stringify(roi_json));
      formData.append("angle", "top");
      if (expectedSerial.trim()) {
        formData.append("expected_serial", expectedSerial.trim());
      }

      await uploadGoldenReference(product.id, formData);

      setSuccessMsg(`Reference standard '${name}' registered under Code '${fullPartNumber}'.`);
      setPartSuffix("");
      setName("");
      setCommodity("");
      setExpectedSerial("");
      setFile(null);
      setPreview(null);

      if (onProductAdded) onProductAdded();
    } catch (err) {
      setErrorMsg(err.message || "Failed to register standard reference product.");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="col-span-12">
      <div className="lab-card p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <Sparkles size={16} className="text-sky-500" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Register New OEM Golden Reference Catalog Standard
            </h2>
            <p className="text-[10px] text-slate-500">
              Seed comparison database with high-resolution reference photos and expected part specs.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex gap-2 items-center">
            <AlertCircle size={15} /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex gap-2 items-center">
            <CheckCircle2 size={15} /> {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                <span>Part Code Suffix <span className="text-rose-500 font-bold">*</span></span>
                <span className="text-[9px] text-slate-400 font-mono">GOLD-XXXX</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono font-bold text-sky-500">GOLD-</span>
                <input
                  type="text"
                  value={partSuffix}
                  onChange={(e) => setPartSuffix(e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase())}
                  placeholder="RAM-DELL-8G"
                  className="w-full h-9 pl-16 pr-3 text-xs lab-input font-mono font-bold"
                  disabled={registering}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Part Title / Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dell DDR4 8GB RAM Module"
                className="w-full h-9 px-3 text-xs lab-input"
                disabled={registering}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                <span>Commodity Category</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              <input
                type="text"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value.toLowerCase())}
                placeholder="e.g. ram, motherboard, chip"
                className="w-full h-9 px-3 text-xs lab-input"
                disabled={registering}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center justify-between">
                <span>Expected Serial ID</span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal lowercase">(optional — auto-reads image)</span>
              </label>
              <input
                type="text"
                value={expectedSerial}
                onChange={(e) => setExpectedSerial(e.target.value)}
                placeholder="e.g. DELL-RAM-DDR4-001"
                className="w-full h-9 px-3 text-xs lab-input font-mono"
                disabled={registering}
              />
            </div>
          </div>

          <div className="flex flex-col justify-between space-y-3 md:space-y-0">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Golden Reference Image <span className="text-rose-500 font-bold">*</span>
              </label>
              {preview ? (
                <div className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 h-9">
                  <img src={preview} className="h-6 w-6 object-contain rounded border border-slate-700" alt="Preview" />
                  <span className="text-[11px] text-slate-300 font-mono truncate px-2">{file?.name}</span>
                  <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="text-slate-400 hover:text-rose-400">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center h-9 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  <UploadCloud size={15} className="text-sky-500 mr-2" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Image File</span>
                </label>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={registering}
              disabled={registering || !partSuffix || !name || !file}
              icon={<Plus size={14} />}
              className="h-9 w-full justify-center text-xs font-bold"
            >
              Register Golden Standard
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
