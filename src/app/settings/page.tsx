"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Save,
  Bell,
  Shield,
  Zap,
  Moon,
  Sun,
  Monitor,
  Globe,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    theme: "dark",
    defaultPage: "dashboard",
    emailNotifications: true,
    slackWebhookUrl: "",
    discordWebhookUrl: "",
    triageAutoLabel: false,
    reviewAutoApprove: false,
    maxDailyApiCalls: 500,
    alertThresholds: {
      healthScoreMin: 40,
      staleIssueRatioMax: 0.3,
      responseTimeMaxHours: 48,
      securityRiskMin: 50,
    },
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setSettings((prev) => ({ ...prev, ...data.data }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-surface-400 mt-1">Manage your GritGauge preferences</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Monitor className="w-5 h-5 text-brand-400" />
              Appearance
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "light", icon: Sun, label: "Light" },
                { value: "dark", icon: Moon, label: "Dark" },
                { value: "system", icon: Monitor, label: "System" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setSettings((s) => ({ ...s, theme: value as typeof s.theme }))}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    settings.theme === value
                      ? "border-brand-500 bg-brand-500/10 text-white"
                      : "border-surface-700 text-surface-400 hover:border-surface-600"
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-brand-400" />
              Notifications
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <span className="text-surface-300">Email Notifications</span>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, emailNotifications: e.target.checked }))
                  }
                  className="toggle"
                />
              </label>
              <div>
                <label className="text-surface-300 text-sm block mb-1">Slack Webhook URL</label>
                <input
                  type="url"
                  value={settings.slackWebhookUrl}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, slackWebhookUrl: e.target.value }))
                  }
                  placeholder="https://hooks.slack.com/services/..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-surface-300 text-sm block mb-1">Discord Webhook URL</label>
                <input
                  type="url"
                  value={settings.discordWebhookUrl}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, discordWebhookUrl: e.target.value }))
                  }
                  placeholder="https://discord.com/api/webhooks/..."
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Automation */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-brand-400" />
              Automation
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-surface-300">Auto-label Issues</span>
                  <p className="text-surface-500 text-xs mt-0.5">
                    Automatically apply AI-suggested labels to issues
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.triageAutoLabel}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, triageAutoLabel: e.target.checked }))
                  }
                  className="toggle"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-surface-300">Auto-approve Low Risk PRs</span>
                  <p className="text-surface-500 text-xs mt-0.5">
                    Automatically approve PRs with low risk score
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.reviewAutoApprove}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, reviewAutoApprove: e.target.checked }))
                  }
                  className="toggle"
                />
              </label>
              <div>
                <label className="text-surface-300 text-sm block mb-1">
                  Max Daily API Calls: {settings.maxDailyApiCalls}
                </label>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={settings.maxDailyApiCalls}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, maxDailyApiCalls: parseInt(e.target.value) }))
                  }
                  className="w-full accent-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Alert Thresholds */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-brand-400" />
              Alert Thresholds
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-surface-300 text-sm block mb-1">
                  Min Health Score: {settings.alertThresholds.healthScoreMin}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.alertThresholds.healthScoreMin}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      alertThresholds: {
                        ...s.alertThresholds,
                        healthScoreMin: parseInt(e.target.value),
                      },
                    }))
                  }
                  className="w-full accent-brand-500"
                />
              </div>
              <div>
                <label className="text-surface-300 text-sm block mb-1">
                  Max Stale Issue Ratio: {(settings.alertThresholds.staleIssueRatioMax * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={settings.alertThresholds.staleIssueRatioMax}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      alertThresholds: {
                        ...s.alertThresholds,
                        staleIssueRatioMax: parseFloat(e.target.value),
                      },
                    }))
                  }
                  className="w-full accent-brand-500"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
