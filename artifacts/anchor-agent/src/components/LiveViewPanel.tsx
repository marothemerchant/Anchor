import React, { useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";

interface LiveViewPanelProps {
  liveViewUrl: string | null;
  sessionId: string | null;
  onClose: () => void;
}

export function LiveViewPanel({ liveViewUrl, sessionId, onClose }: LiveViewPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = !!liveViewUrl;

  const width = expanded ? "680px" : "440px";

  return (
    <div
      className="h-full border-l border-border bg-surface shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out flex flex-col"
      style={{ width: isOpen ? width : "0px" }}
    >
      {/* Header */}
      <div className="h-[36px] flex items-center justify-between px-3 border-b border-border shrink-0 bg-background">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-success animate-pulse" style={{ borderRadius: 0 }} />
          <span className="text-[10px] uppercase tracking-wider text-text-secondary select-none">LIVE VIEW</span>
          {sessionId && (
            <span className="text-[10px] text-text-tertiary font-mono">
              · {sessionId.slice(0, 8)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-text-tertiary hover:text-text-primary transition-colors p-1"
            title={expanded ? "Shrink panel" : "Expand panel"}
            data-testid="button-live-view-expand"
          >
            {expanded ? <Minimize2 size={12} strokeWidth={1.5} /> : <Maximize2 size={12} strokeWidth={1.5} />}
          </button>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary transition-colors p-1"
            title="Close live view"
            data-testid="button-live-view-close"
          >
            <X size={12} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex-1 relative overflow-hidden bg-background">
        {liveViewUrl && (
          <>
            <div
              className="absolute inset-0 flex items-center justify-center text-text-tertiary text-[11px] font-mono select-none pointer-events-none z-0"
            >
              connecting to browser...
            </div>
            <iframe
              key={liveViewUrl}
              src={liveViewUrl}
              className="absolute inset-0 w-full h-full border-none z-10"
              allow="clipboard-read; clipboard-write"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              title="Anchor Browser Live View"
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="h-[28px] flex items-center px-3 border-t border-border shrink-0 bg-background gap-3">
        <span className="text-[9px] text-text-tertiary font-mono truncate">
          {liveViewUrl || ""}
        </span>
      </div>
    </div>
  );
}
