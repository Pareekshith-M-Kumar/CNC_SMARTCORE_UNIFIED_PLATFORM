import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  maxHeight?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "gcode",
  maxHeight = "400px",
  showLineNumbers = true,
  className,
}) => {
  const [copied, setCopied] = useState(false);
  const lines = code.trim().split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative rounded-md border border-border bg-viewport font-mono text-xs overflow-hidden", className)}>
      <div className="flex items-center justify-between px-3 py-1.5 bg-raised/60 border-b border-border text-[11px] font-condensed uppercase tracking-wider text-text-muted">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 hover:text-text transition-colors"
          aria-label="Copy code to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <div
        className="overflow-auto p-3 text-text-2 space-y-0.5 leading-5 select-text"
        style={{ maxHeight }}
      >
        {lines.map((line, idx) => (
          <div key={idx} className="flex gap-3 hover:bg-surface/50 px-1 rounded-[2px]">
            {showLineNumbers && (
              <span className="text-text-muted/60 select-none text-right w-8 shrink-0 font-mono text-[11px]">
                {idx + 1}
              </span>
            )}
            <span className="font-mono text-text whitespace-pre">{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
