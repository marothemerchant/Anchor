import React, { useState, useEffect } from "react";
import { useAnchorAgent, getProvider, getActiveKey } from "@/hooks/useAnchorAgent";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ConversationThread } from "@/components/ConversationThread";
import { CommandInput } from "@/components/CommandInput";
import { ModelSelector } from "@/components/ModelSelector";
import { LiveViewPanel } from "@/components/LiveViewPanel";
import { PanelLeft } from "lucide-react";

export default function Terminal() {
  const {
    messages, settings, updateSetting, sendTask, clearThread,
    keyStatus, checkKey, checkAllKeys,
    liveViewUrl, liveSessionId, closeLiveView,
  } = useAnchorAgent();

  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    checkAllKeys();
  }, []);

  const provider = getProvider(settings.model);
  const activeKey = getActiveKey(settings);
  const hasKey = activeKey.trim().length > 0;

  const activeStatus = keyStatus[provider];
  const headerStatusColor =
    activeStatus === "ok" ? "var(--color-success)"
    : activeStatus === "error" ? "var(--color-error)"
    : activeStatus === "checking" ? "var(--color-text-secondary)"
    : hasKey ? "var(--color-text-tertiary)"
    : "var(--color-error)";

  const headerStatusText =
    activeStatus === "checking" ? "..."
    : activeStatus === "ok" ? provider
    : activeStatus === "error" ? "key error"
    : hasKey ? provider
    : "no key";

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden font-mono text-text-primary selection:bg-surface selection:text-accent">

      {/* HEADER */}
      <header className="h-[36px] flex items-center justify-between px-4 border-b border-border shrink-0 bg-background z-10 relative">
        <div className="w-[100px] text-accent text-[11px] tracking-[0.2em] font-medium select-none">
          ANCHOR
        </div>

        <div className="flex-1 flex justify-center">
          <ModelSelector settings={settings} updateSetting={updateSetting} />
        </div>

        <div className="w-[100px] flex justify-end items-center gap-3">
          <div
            className="text-[9px] uppercase tracking-wider select-none font-mono"
            style={{ color: headerStatusColor }}
            title={`${provider} key: ${activeStatus}`}
          >
            {headerStatusText}
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

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: settings panel */}
        <SettingsPanel
          isOpen={panelOpen}
          settings={settings}
          keyStatus={keyStatus}
          updateSetting={updateSetting}
          onCheckKey={checkKey}
          onCheckAll={checkAllKeys}
        />

        {/* Center: conversation + input */}
        <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
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

        {/* Right: live view panel (Anchor only) */}
        <LiveViewPanel
          liveViewUrl={liveViewUrl}
          sessionId={liveSessionId}
          onClose={closeLiveView}
        />
      </div>
    </div>
  );
}
