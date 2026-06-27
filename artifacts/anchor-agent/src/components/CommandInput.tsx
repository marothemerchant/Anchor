import React, { useRef, useEffect } from "react";

interface CommandInputProps {
  onSend: (task: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export function CommandInput({ onSend, disabled, disabledReason }: CommandInputProps) {
  const [value, setValue] = React.useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSend(value);
        setValue("");
      }
    }
  };

  const handleSend = () => {
    if (!disabled && value.trim()) {
      onSend(value);
      setValue("");
    }
  };

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 100); // roughly 4 rows
      textareaRef.current.style.height = `${nextHeight}px`;
    }
  }, [value]);

  return (
    <div className="flex items-end border-t border-border bg-background p-4 w-full shrink-0">
      <div className="flex-1 flex items-start gap-2 max-w-4xl mx-auto w-full relative">
        <span className="text-accent text-[13px] leading-[24px] pt-[2px] shrink-0 font-mono select-none">$</span>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "API Key required..." : "Enter command..."}
          disabled={disabled}
          className="w-full bg-transparent text-text-primary text-[13px] leading-[24px] p-0 pt-[2px] outline-none resize-none font-mono placeholder:text-text-tertiary min-h-[24px]"
          rows={1}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={`shrink-0 border px-3 py-1 text-[11px] uppercase tracking-wider transition-colors ml-2 ${
            disabled && disabledReason === "NO KEY"
              ? "border-error text-error opacity-50 cursor-not-allowed"
              : disabled || !value.trim()
              ? "border-border text-text-tertiary cursor-not-allowed"
              : "border-border text-text-primary hover:border-text-primary hover:text-accent bg-surface"
          }`}
        >
          {disabledReason && disabled ? disabledReason : "RUN"}
        </button>
      </div>
    </div>
  );
}
