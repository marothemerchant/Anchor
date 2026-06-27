import React, { useState } from "react";
import { AgentSettings } from "@/hooks/useAnchorAgent";

interface SettingsPanelProps {
  isOpen: boolean;
  settings: AgentSettings;
  updateSetting: <K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) => void;
}

export function SettingsPanel({ isOpen, settings, updateSetting }: SettingsPanelProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div 
      className={`h-full border-r border-border bg-surface shrink-0 overflow-x-hidden transition-[width] duration-200 ease-in-out`}
      style={{ width: isOpen ? '280px' : '0px' }}
    >
      <div className="w-[280px] p-4 flex flex-col gap-6 overflow-y-auto h-full">
        
        {/* API KEY */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-text-secondary uppercase tracking-wider select-none">API KEY</label>
          <div className="relative">
            <input 
              type={showKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(e) => updateSetting("apiKey", e.target.value)}
              placeholder="sk-..."
              className="w-full bg-background border border-border text-text-primary p-2 text-[12px] outline-none focus:border-accent font-mono placeholder:text-text-tertiary pr-8 transition-colors"
            />
            <button 
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors text-[10px]"
              tabIndex={-1}
            >
              {showKey ? "HIDE" : "SHOW"}
            </button>
          </div>
        </div>

        {/* BASE URL */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-text-secondary uppercase tracking-wider select-none">BASE URL (OPTIONAL)</label>
          <input 
            type="text"
            value={settings.baseUrl}
            onChange={(e) => updateSetting("baseUrl", e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full bg-background border border-border text-text-primary p-2 text-[12px] outline-none focus:border-accent font-mono placeholder:text-text-tertiary transition-colors"
          />
        </div>

        <div className="h-px bg-border w-full"></div>

        {/* SYSTEM PROMPT */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] text-text-secondary uppercase tracking-wider select-none">SYSTEM PROMPT</label>
          <textarea 
            value={settings.systemPrompt}
            onChange={(e) => updateSetting("systemPrompt", e.target.value)}
            rows={4}
            className="w-full bg-background border border-border text-text-primary p-2 text-[12px] outline-none focus:border-accent font-mono resize-y min-h-[80px] transition-colors"
          />
        </div>

        <div className="h-px bg-border w-full"></div>

        {/* TEMPERATURE */}
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
            className="w-full accent-accent appearance-none bg-background h-[2px] cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-none [&::-webkit-slider-thumb]:rounded-none"
          />
        </div>

      </div>
    </div>
  );
}
