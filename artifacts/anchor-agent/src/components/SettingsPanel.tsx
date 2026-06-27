import React, { useState } from "react";
import { AgentSettings, KeyStatus, Provider, getProvider } from "@/hooks/useAnchorAgent";

interface SettingsPanelProps {
  isOpen: boolean;
  settings: AgentSettings;
  keyStatus: KeyStatus;
  updateSetting: <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => void;
  onCheckKey: (provider: Provider) => void;
  onCheckAll: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "——",
  checking: "...",
  ok: "OK",
  error: "FAIL",
};

const STATUS_COLOR: Record<string, string> = {
  idle: "var(--color-text-tertiary)",
  checking: "var(--color-text-secondary)",
  ok: "var(--color-success)",
  error: "var(--color-error)",
};

function KeyField({
  label,
  value,
  onChange,
  placeholder,
  active,
  status,
  onCheck,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  active: boolean;
  status: string;
  onCheck: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label
          className="text-[10px] uppercase tracking-wider select-none"
          style={{ color: active ? "var(--color-accent)" : "var(--color-text-secondary)" }}
        >
          {label}
          {active && (
            <span className="ml-2 text-[9px] normal-case tracking-normal" style={{ color: "var(--color-text-tertiary)" }}>
              active
            </span>
          )}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono" style={{ color: STATUS_COLOR[status] }}>
            {STATUS_LABEL[status]}
          </span>
          {value && (
            <button
              onClick={() => setShow((s) => !s)}
              tabIndex={-1}
              className="text-[9px] uppercase transition-colors"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {show ? "HIDE" : "SHOW"}
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-background border border-border text-text-primary p-2 text-[12px] outline-none focus:border-accent font-mono placeholder:text-text-tertiary transition-colors"
        />
        <button
          onClick={onCheck}
          disabled={!value.trim() || status === "checking"}
          className="px-2 text-[9px] uppercase border border-border text-text-tertiary hover:text-text-primary hover:border-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
        >
          {status === "checking" ? "..." : "TEST"}
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel({
  isOpen,
  settings,
  keyStatus,
  updateSetting,
  onCheckKey,
  onCheckAll,
}: SettingsPanelProps) {
  const provider = getProvider(settings.model);

  return (
    <div
      className="h-full border-r border-border bg-surface shrink-0 overflow-x-hidden transition-[width] duration-200 ease-in-out"
      style={{ width: isOpen ? "280px" : "0px" }}
    >
      <div className="w-[280px] p-4 flex flex-col gap-5 overflow-y-auto h-full">

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider select-none">API KEYS</span>
          <button
            onClick={onCheckAll}
            className="text-[9px] uppercase text-text-tertiary hover:text-text-primary border border-border px-2 py-1 transition-colors"
          >
            TEST ALL
          </button>
        </div>

        <KeyField
          label="OPENAI KEY"
          value={settings.openaiKey}
          onChange={(v) => updateSetting("openaiKey", v)}
          placeholder="sk-..."
          active={provider === "openai"}
          status={keyStatus.openai}
          onCheck={() => onCheckKey("openai")}
        />

        <KeyField
          label="GEMINI KEY"
          value={settings.geminiKey}
          onChange={(v) => updateSetting("geminiKey", v)}
          placeholder="AIza..."
          active={provider === "gemini"}
          status={keyStatus.gemini}
          onCheck={() => onCheckKey("gemini")}
        />

        <KeyField
          label="GROQ KEY"
          value={settings.groqKey}
          onChange={(v) => updateSetting("groqKey", v)}
          placeholder="gsk_..."
          active={provider === "groq"}
          status={keyStatus.groq}
          onCheck={() => onCheckKey("groq")}
        />

        <KeyField
          label="ANCHOR KEY"
          value={settings.anchorKey}
          onChange={(v) => updateSetting("anchorKey", v)}
          placeholder="anchor_..."
          active={provider === "anchor"}
          status={keyStatus.anchor}
          onCheck={() => onCheckKey("anchor")}
        />

        <div className="h-px bg-border w-full" />

        <div className="flex flex-col gap-1 text-[10px] text-text-tertiary leading-relaxed">
          <span className="text-text-secondary uppercase tracking-wider">ANCHOR BROWSER</span>
          <span>Select "anchor-web-task" from the model dropdown to route tasks through Anchor Browser for live web interaction — scraping, form submission, authenticated sessions.</span>
        </div>

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
