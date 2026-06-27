import React from "react";
import { AgentSettings } from "@/hooks/useAnchorAgent";

interface ModelSelectorProps {
  settings: AgentSettings;
  updateSetting: <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => void;
}

const MODEL_GROUPS = [
  {
    label: "OPENAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini"],
  },
  {
    label: "GEMINI",
    models: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  },
  {
    label: "GROQ",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  },
  {
    label: "ANCHOR",
    models: ["anchor-web-task"],
  },
];

export function ModelSelector({ settings, updateSetting }: ModelSelectorProps) {
  return (
    <select
      value={settings.model}
      onChange={(e) => updateSetting("model", e.target.value)}
      data-testid="select-model"
      className="bg-transparent text-text-primary text-[11px] font-mono outline-none border-none cursor-pointer appearance-none text-center hover:text-accent transition-colors"
    >
      {MODEL_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label} className="bg-surface text-text-secondary">
          {group.models.map((m) => (
            <option key={m} value={m} className="bg-surface text-text-primary">
              {m}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
