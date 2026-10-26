import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Copy, Check } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message: string;
  whatNext?: string;
  requestId?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "An error occurred",
  message,
  whatNext,
  requestId,
  onRetry,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyRequestId = () => {
    if (requestId) {
      navigator.clipboard.writeText(requestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "p-4 bg-danger/10 border border-danger/30 rounded-md text-left flex items-start gap-3.5",
        className
      )}
      role="alert"
    >
      <div className="p-1.5 bg-danger/20 rounded-[2px] text-danger shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4" />
      </div>

      <div className="flex-1 space-y-1.5">
        <h4 className="text-sm font-semibold text-danger tracking-wide">{title}</h4>
        <p className="text-xs text-text-2 leading-relaxed">{message}</p>
        {whatNext && (
          <p className="text-xs text-text-muted mt-1">
            <span className="font-medium text-text-2">Next step: </span>
            {whatNext}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs px-2.5 py-1 bg-surface border border-border-strong hover:bg-raised text-text font-medium rounded-[2px] transition-colors"
            >
              Try again
            </button>
          )}

          {requestId && (
            <button
              onClick={handleCopyRequestId}
              className="text-xs text-text-muted hover:text-text flex items-center gap-1 transition-colors"
              title="Copy Request ID for diagnostic support"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              <span className="font-mono text-[11px]">ID: {requestId}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
