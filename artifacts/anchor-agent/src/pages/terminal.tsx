import React, { useState } from "react";
import { useAnchorAgent, getProvider, getActiveKey } from "@/hooks/useAnchorAgent";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ConversationThread } from "@/components/ConversationThread";
import { CommandInput } from "@/components/CommandInput";
import { ModelSelector } from "@/components/ModelSelector";
import { PanelLeft } from "lucide-react";

export default function Terminal() {
  const { messages, settings, updateSetting, sendTask, clearThread } = useAnchorAgent();
  const [panelOpen, setPanelOpen] = useState(false);

  const provider = getProvider(settings.model);
  const activeKey = getActiveKey(settings);
  const hasKey = activeKey.trim().length > 0;

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-mono text-text-primary selection:bg-surface selection:text-accent">

      <header className="h-[36px] flex items-center justify-between px-4 border-b border-border shrink-0 bg-background z-10 relative">
        <div className="w-[100px] text-accent text-[11px] tracking-[0.2em] font-medium select-none">
          ANCHOR
        </div>

        <div className="flex-1 flex justify-center">
          <ModelSelector settings={settings} updateSetting={updateSetting} />
        </div>

        <div className="w-[100px] flex justify-end items-center gap-3">
          <div
            className="text-[9px] uppercase tracking-wider select-none"
            style={{ color: hasKey ? "var(--color-success)" : "var(--color-error)" }}
          >
            {provider}
          </div>
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            data-testid="button-toggle-panel"
            className={`text-text-tertiary hover:text-text-primary transition-colors p-1 ${panelOpen ? "text-accent" : ""}`}
            title="Toggle Settings"
          >
            <PanelLeft size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SettingsPanel
          isOpen={panelOpen}
          settings={settings}
          updateSetting={updateSetting}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-background relative">
          <ConversationThread
            messages={messages}
            onClear={clearThread}
            apiKeySet={hasKey}
          />
          <CommandInput
            onSend={sendTask}
            disabled={!hasKey}
            disabledReason={hasKey ? undefined : `NO ${provider.toUpperCase()} KEY`}
          />
        </main>
      </div>
    </div>
  );
}
