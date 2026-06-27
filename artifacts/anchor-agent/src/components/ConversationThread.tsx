import React, { useState, useEffect } from "react";
import { Message } from "@/hooks/useAnchorAgent";

interface ConversationThreadProps {
  messages: Message[];
  onClear: () => void;
  apiKeySet: boolean;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const StatusLine = ({ status, elapsed }: { status: Message["status"]; elapsed?: number }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (status !== "streaming") return;
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "streaming") {
    return <div className="text-text-tertiary mb-1 text-[11px] font-mono">{SPINNER_FRAMES[frame]} running</div>;
  }
  if (status === "done") {
    return <div className="text-success mb-1 text-[11px] font-mono">✓ done {elapsed ? `[${elapsed.toFixed(1)}s]` : ""}</div>;
  }
  if (status === "error") {
    return <div className="text-error mb-1 text-[11px] font-mono">✗ error</div>;
  }
  return null;
};

const FormattedContent = ({ content }: { content: string }) => {
  // Very basic code block formatting
  if (!content) return null;
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).replace(/^[\w-]+\n/, ""); // remove lang if present
          return (
            <pre key={i} className="bg-surface border border-border p-2 my-2 overflow-x-auto text-[12px] font-mono">
              <code>{code}</code>
            </pre>
          );
        }
        return <span key={i} className="whitespace-pre-wrap">{part}</span>;
      })}
    </>
  );
};

export function ConversationThread({ messages, onClear, apiKeySet }: ConversationThreadProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex-1 overflow-y-auto w-full group" ref={scrollContainerRef}>
      {!isEmpty && (
        <button
          onClick={onClear}
          className="absolute top-4 right-4 text-[10px] text-text-tertiary uppercase opacity-0 group-hover:opacity-100 transition-opacity hover:text-text-primary z-10 bg-background px-2 py-1 border border-border"
        >
          CLEAR
        </button>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full w-full pointer-events-none select-none">
          <div className="text-text-secondary text-[12px] whitespace-pre text-center">
            ANCHOR AGENT v0.1.0{"\n"}
            ready. type a task below and press enter.
          </div>
          {!apiKeySet && (
            <div className="text-text-tertiary text-[11px] mt-4">
              using simulated responses — add API key for real inference
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 pb-20 max-w-4xl mx-auto w-full">
          {messages.map((msg, idx) => {
            if (msg.role === "user") {
              const timeStr = msg.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second: '2-digit' });
              return (
                <div key={msg.id} className="mb-4">
                  <div className="flex items-start justify-between group/msg">
                    <div className="flex-1 flex gap-2">
                      <span className="text-accent shrink-0">{">"}</span>
                      <span className="text-text-primary break-words whitespace-pre-wrap flex-1">{msg.content}</span>
                    </div>
                    <div className="text-text-tertiary text-[10px] shrink-0 ml-4 opacity-50 group-hover/msg:opacity-100 transition-opacity">
                      {timeStr}
                    </div>
                  </div>
                </div>
              );
            } else {
              // Assistant message
              return (
                <div key={msg.id} className="mb-8 ml-4">
                  <StatusLine status={msg.status} elapsed={msg.elapsed} />
                  <div className="text-text-primary text-[12px] leading-relaxed">
                    <FormattedContent content={msg.content} />
                    {msg.status === "streaming" && (
                      <span className="animate-blink ml-1">▋</span>
                    )}
                  </div>
                </div>
              );
            }
          })}
          <div ref={bottomRef} className="h-1" />
        </div>
      )}
    </div>
  );
}
