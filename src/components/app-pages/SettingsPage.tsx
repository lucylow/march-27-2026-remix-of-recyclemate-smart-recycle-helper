import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Moon, MapPin, Smartphone, RotateCcw, Cpu, Zap, Eye, Wrench, Activity, DollarSign } from "lucide-react";
import { fetchModels, tokenize, type FeatherlessModel } from "@/services/featherless";
import { Progress } from "@/components/ui/progress";

interface ToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
}

const Toggle = ({ enabled, onChange }: ToggleProps) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-secondary"}`}
  >
    <motion.div
      animate={{ x: enabled ? 20 : 2 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute top-1 w-4 h-4 rounded-full bg-background shadow-sm"
    />
  </button>
);

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  fast: { bg: "bg-success/10", text: "text-success", label: "FAST" },
  heavy: { bg: "bg-warning/10", text: "text-warning", label: "HEAVY" },
};

const SettingsPage = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);
  const [haptics, setHaptics] = useState(true);

  // AI model state
  const [models, setModels] = useState<FeatherlessModel[]>([]);
  const [modelsSource, setModelsSource] = useState("");
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string>(
    () => localStorage.getItem("recyclemate_model") || ""
  );

  // Token estimator
  const [tokenText, setTokenText] = useState("");
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [tokenEstimated, setTokenEstimated] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  // Session stats (simulated from localStorage)
  const [sessionStats, setSessionStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("recyclemate_session_stats") || '{"calls": 0, "tokens": 0}');
    } catch { return { calls: 0, tokens: 0 }; }
  });

  useEffect(() => {
    fetchModels()
      .then(({ models, source }) => {
        setModels(models);
        setModelsSource(source);
        if (!selectedModel && models.length > 0) {
          setSelectedModel(models[0].id);
        }
      })
      .finally(() => setModelsLoading(false));
  }, []);

  const handleModelSelect = (id: string) => {
    setSelectedModel(id);
    localStorage.setItem("recyclemate_model", id);
  };

  const handleTokenize = async () => {
    if (!tokenText.trim()) return;
    setTokenLoading(true);
    try {
      const result = await tokenize(tokenText, selectedModel || undefined);
      setTokenCount(result.tokens);
      setTokenEstimated(result.estimated);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm("Reset all app data? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const estimatedCost = sessionStats.tokens * 0.0001;
  const budgetUsedPercent = Math.min((estimatedCost / 1000) * 100, 100);

  const settings = [
    { icon: <Bell className="w-5 h-5" />, label: "Notifications", desc: "Daily reminders to scan and sort", value: notifications, onChange: setNotifications },
    { icon: <Moon className="w-5 h-5" />, label: "Dark Mode", desc: "Switch to dark theme", value: darkMode, onChange: setDarkMode },
    { icon: <MapPin className="w-5 h-5" />, label: "Location Tracking", desc: "Get localised disposal rules", value: locationTracking, onChange: setLocationTracking },
    { icon: <Smartphone className="w-5 h-5" />, label: "Haptic Feedback", desc: "Vibration on interactions", value: haptics, onChange: setHaptics },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-display mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your experience</p>
      </div>

      {/* General settings */}
      <div className="space-y-2">
        {settings.map((setting, i) => (
          <motion.div
            key={setting.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
              {setting.icon}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{setting.label}</p>
              <p className="text-xs text-muted-foreground">{setting.desc}</p>
            </div>
            <Toggle enabled={setting.value} onChange={setting.onChange} />
          </motion.div>
        ))}
      </div>

      {/* Token Budget Dashboard */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-primary" />
          <h3 className="text-label text-muted-foreground">AI Budget</h3>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Session Usage</span>
            <span className="text-xs font-mono text-muted-foreground">
              ${estimatedCost.toFixed(4)} / $1,000
            </span>
          </div>
          <Progress value={budgetUsedPercent} className="h-2" />
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">API Calls</p>
              <p className="text-lg font-semibold font-mono">{sessionStats.calls}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Tokens</p>
              <p className="text-lg font-semibold font-mono">{sessionStats.tokens.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Budget tracking is estimated. Actual costs depend on model and usage.
          </p>
        </div>
      </div>

      {/* AI Model Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-primary" />
          <h3 className="text-label text-muted-foreground">AI Model</h3>
          {modelsSource && (
            <span className="text-[10px] font-mono text-muted-foreground/60 px-1.5 py-0.5 rounded bg-secondary">
              {modelsSource}
            </span>
          )}
        </div>

        {modelsLoading ? (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Loading models…</p>
          </div>
        ) : (
          <div className="space-y-2">
            {models.map((model) => {
              const tier = TIER_STYLES[model.tier] || TIER_STYLES.fast;
              const isSelected = selectedModel === model.id;
              return (
                <motion.button
                  key={model.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleModelSelect(model.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-primary/10" : "bg-secondary"
                  }`}>
                    <Cpu className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{model.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">{model.id}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {model.vision && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-accent text-accent-foreground">
                        <Eye className="w-2.5 h-2.5" />
                        VIS
                      </span>
                    )}
                    {model.tools && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-secondary text-primary">
                        <Wrench className="w-2.5 h-2.5" />
                        FN
                      </span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${tier.bg} ${tier.text}`}>
                      {tier.label}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* Token Budget Estimator */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-label text-muted-foreground">Token Estimator</h3>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
          <textarea
            value={tokenText}
            onChange={(e) => setTokenText(e.target.value)}
            placeholder="Paste a prompt or instruction to estimate tokens…"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleTokenize}
              disabled={!tokenText.trim() || tokenLoading}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40 active-press"
            >
              {tokenLoading ? "…" : "Estimate"}
            </button>
            {tokenCount !== null && (
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-warning" />
                <span className="font-mono font-semibold">{tokenCount.toLocaleString()}</span>
                <span className="text-muted-foreground text-xs">tokens</span>
                {tokenEstimated && (
                  <span className="text-[9px] text-muted-foreground/60 font-mono">(est.)</span>
                )}
                <span className="text-[9px] text-muted-foreground/60 font-mono">
                  ~${(tokenCount * 0.0001).toFixed(4)}
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Tip: Keep prompts under 2,000 tokens for fast responses. The municipal PDF parser may use up to 4,000.
          </p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="pt-4 border-t border-border">
        <p className="text-label text-destructive mb-3">Danger Zone</p>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-destructive/20 text-destructive text-sm font-medium active-press w-full"
        >
          <RotateCcw className="w-4 h-4" />
          Reset All Data
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
