import React from "react";
import { AgentSettings } from "@/hooks/useAnchorAgent";

interface ModelSelectorProps {
  settings: AgentSettings;
  updateSetting: <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => void;
}

const MODELS = [
  "claude-opus-4-5",
  "claude-3-5-sonnet",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
];

export function ModelSelector({ settings, updateSetting }: ModelSelectorProps) {
  return (
    <select
      value={settings.model}
      onChange={(e) => updateSetting("model", e.target.value)}
      className="bg-transparent text-text-primary text-[11px] font-mono outline-none border-none cursor-pointer appearance-none text-center hover:text-accent transition-colors"
    >
      {MODELS.map(m => (
        <option key={m} value={m} className="bg-surface text-text-primary">
          {m}
        </option>
      ))}
    </select>
  );
}
