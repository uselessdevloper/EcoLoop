import { useState, useCallback, useEffect } from "react";
import { fetchPipelineConfig, savePipelineConfig, fetchAdjustmentHistory } from "../services/feedbackService.js";

export function useFeedbackConfig() {
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPipelineConfig(), fetchAdjustmentHistory()])
      .then(([cfg, hist]) => {
        setConfig(cfg);
        setHistory(hist);
      })
      .catch((err) => console.error("Failed to load pipeline config:", err))
      .finally(() => setLoading(false));
  }, []);

  const updateThreshold = useCallback((key, value) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        thresholds: { ...prev.thresholds, [key]: value },
      };
    });
  }, []);

  const togglePrivacy = useCallback((key) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        privacy: { ...prev.privacy, [key]: !prev.privacy[key] },
      };
    });
  }, []);

  const addRoutingRule = useCallback((rule) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        routingRules: [...(prev.routingRules || []), rule],
      };
    });
  }, []);

  const save = useCallback(async () => {
    if (!config) return;
    setSaveState("saving");
    try {
      await savePipelineConfig(config);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [config]);

  return {
    config,
    history,
    loading,
    saveState,
    updateThreshold,
    togglePrivacy,
    addRoutingRule,
    save,
  };
}