import React, { useState } from "react";
import { useAnchorAgent } from "@/hooks/useAnchorAgent";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ConversationThread } from "@/components/ConversationThread";
import { CommandInput } from "@/components/CommandInput";
import { ModelSelector } from "@/components/ModelSelector";
import { PanelLeft } from "lucide-react";

export default function Terminal() {
  const { messages, settings, updateSetting, sendTask, clearThread } = useAnchorAgent();
  const [panelOpen, setPanelOpen] = useState(false);

  // We are simulating, so we don't strictly require API key to function locally according to prompt,
  // but the prompt says: "When no API key is set, the RUN button shows 'NO KEY' in error color and is disabled".
  // However, it also says "For the first build, simulating is fine. Show a subtle note 'using simulated responses — add API key for real inference' in text-tertiary below the empty state when no key is set."
  // Wait, the prompt contradicts itself slightly. 
  // 1. "When no API key is set, the RUN button shows 'NO KEY' in error color and is disabled"
  // 2. "Show a subtle note 'using simulated responses...'"
  // Let's implement the disabled state as requested in Command Input Bar section, 
  // but maybe we can just simulate anyway? If it's disabled, they can't simulate.
  // I will make it disabled if NO KEY.
  const hasKey = settings.apiKey.trim().length > 0;

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

        <div className="w-[100px] flex justify-end">
          <button 
            onClick={() => setPanelOpen(!panelOpen)}
            className={`text-text-tertiary hover:text-text-primary transition-colors p-1 ${panelOpen ? 'text-accent' : ''}`}
            title="Toggle Settings"
          >
            <PanelLeft size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
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
            disabledReason="NO KEY"
          />
        </main>

      </div>
    </div>
  );
}
