import { Layout } from "../components/Layout.jsx";
import {
  PerceptionThresholds,
  BusinessPolicyRouting,
  PrivacySecurity,
  AdjustmentHistory,
  SavePipelineButton,
  RegisterProductCard,
} from "../components/Feedback.jsx";
import { useFeedbackConfig } from "../hooks/useFeedbackConfig.js";
import { Loader } from "../components/Common.jsx";

export default function AdminConsolePage() {
  const { config, history, loading, saveState, updateThreshold, togglePrivacy, addRoutingRule, save } =
    useFeedbackConfig();

  if (loading || !config) {
    return (
      <Layout title="Admin Calibration Console" subtitle="System parameters & pipeline tuning">
        <Loader label="Loading pipeline configuration…" />
      </Layout>
    );
  }

  return (
    <Layout
      title="Admin Calibration Console"
      subtitle="Calibrate perception engine thresholds, business routing rules, and OEM reference catalog"
      actions={<SavePipelineButton state={saveState} onSave={save} />}
    >
      <div className="grid grid-cols-12 gap-4">
        <RegisterProductCard />
        <PerceptionThresholds thresholds={config.thresholds} onChange={updateThreshold} />
        <BusinessPolicyRouting rules={config.routingRules} onAddRule={addRoutingRule} />
        <PrivacySecurity privacy={config.privacy} onToggle={togglePrivacy} />
        <AdjustmentHistory history={history} />
      </div>
    </Layout>
  );
}
