import React, { useState } from "react";
import { AgentSettings, getProvider } from "@/hooks/useAnchorAgent";

interface SettingsPanelProps {
  isOpen: boolean;
  settings: AgentSettings;
  updateSetting: <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => void;
}

function KeyField({
  label,
  value,
  onChange,
  placeholder,
  active,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  active: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-wider select-none" style={{ color: active ? "var(--color-accent)" : "var(--color-text-secondary)" }}>
          {label}
          {active && <span className="ml-2 text-[9px] text-text-tertiary normal-case tracking-normal">active</span>}
        </label>
        {value && (
          <button
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            className="text-[9px] text-text-tertiary hover:text-text-secondary transition-colors uppercase"
          >
            {show ? "HIDE" : "SHOW"}
          </button>
        )}
      </div>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={`input-${label.toLowerCase().replace(/\s/g, "-")}`}
        className="w-full bg-background border border-border text-text-primary p-2 text-[12px] outline-none focus:border-accent font-mono placeholder:text-text-tertiary transition-colors"
      />
    </div>
  );
}

export function SettingsPanel({ isOpen, settings, updateSetting }: SettingsPanelProps) {
  const provider = getProvider(settings.model);

  return (
    <div
      className="h-full border-r border-border bg-surface shrink-0 overflow-x-hidden transition-[width] duration-200 ease-in-out"
      style={{ width: isOpen ? "280px" : "0px" }}
    >
      <div className="w-[280px] p-4 flex flex-col gap-5 overflow-y-auto h-full">

        <div className="flex flex-col gap-1 pb-1">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider select-none">API KEYS</span>
          <span className="text-[10px] text-text-tertiary">one key per provider</span>
        </div>

        <KeyField
          label="OPENAI KEY"
          value={settings.openaiKey}
          onChange={(v) => updateSetting("openaiKey", v)}
          placeholder="sk-..."
          active={provider === "openai"}
        />

        <KeyField
          label="GEMINI KEY"
          value={settings.geminiKey}
          onChange={(v) => updateSetting("geminiKey", v)}
          placeholder="AIza..."
          active={provider === "gemini"}
        />

        <KeyField
          label="GROQ KEY"
          value={settings.groqKey}
          onChange={(v) => updateSetting("groqKey", v)}
          placeholder="gsk_..."
          active={provider === "groq"}
        />

        <div className="h-px bg-border w-full" />

        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-text-secondary uppercase tracking-wider select-none">SYSTEM PROMPT</label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => updateSetting("systemPrompt", e.target.value)}
            rows={4}
            data-testid="textarea-system-prompt"
            className="w-full bg-background border border-border text-text-primary p-2 text-[12px] outline-none focus:border-accent font-mono resize-y min-h-[80px] transition-colors"
          />
        </div>

        <div className="h-px bg-border w-full" />

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <label className="text-[10px] text-text-secondary uppercase tracking-wider select-none">TEMPERATURE</label>
            <span className="text-[11px] text-text-primary">{settings.temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => updateSetting("temperature", parseFloat(e.target.value))}
            data-testid="input-temperature"
            className="w-full accent-accent appearance-none bg-background h-[2px] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:rounded-none"
          />
        </div>

      </div>
    </div>
  );
}
