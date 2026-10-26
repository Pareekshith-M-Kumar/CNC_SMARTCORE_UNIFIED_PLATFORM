import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { truncateHash } from "@/lib/format";
import { Copy, Check } from "lucide-react";

interface HashDisplayProps {
  hash: string;
  label?: string;
  className?: string;
}

export const HashDisplay: React.FC<HashDisplayProps> = ({ hash, label, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 bg-viewport px-2 py-0.5 rounded-[2px] border border-border text-xs font-mono text-text-2 group select-none",
        className
      )}
      title={`Full SHA-256: ${hash}`}
    >
      {label && <span className="text-[10px] text-text-muted uppercase font-condensed">{label}:</span>}
      <span className="tabular-nums">{truncateHash(hash)}</span>
      <button
        onClick={handleCopy}
        className="p-0.5 hover:text-accent text-text-muted transition-colors rounded-[2px]"
        aria-label="Copy full hash to clipboard"
        type="button"
      >
        {copied ? (
          <Check className="w-3 h-3 text-success stroke-[2.5]" />
        ) : (
          <Copy className="w-3 h-3 group-hover:scale-105 transition-transform" />
        )}
      </button>
    </div>
  );
};
