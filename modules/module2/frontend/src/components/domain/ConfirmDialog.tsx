import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (comment?: string) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  requireComment?: boolean;
  commentPlaceholder?: string;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  requireComment = false,
  commentPlaceholder = "Provide a mandatory rationale (min 10 characters)...",
  loading = false,
}) => {
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  const isCommentValid = !requireComment || comment.trim().length >= 10;

  const handleConfirm = () => {
    if (isCommentValid) {
      onConfirm(comment);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md bg-raised border border-border-strong rounded-lg shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {isDestructive && (
              <div className="p-2 rounded-full bg-danger/15 text-danger shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-text tracking-wide">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text transition-colors p-1"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-text-2 leading-relaxed">{description}</p>

        {requireComment && (
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-condensed uppercase tracking-wider text-text-muted">
              Decision Comment <span className="text-danger">*</span> (min 10 chars)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={commentPlaceholder}
              rows={3}
              className="w-full p-2.5 bg-surface border border-border-strong rounded-[2px] text-xs text-text focus:outline-hidden focus:ring-2 focus:ring-focus resize-none"
            />
            {comment.length > 0 && comment.trim().length < 10 && (
              <p className="text-[10px] text-danger">Comment must be at least 10 characters.</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-surface border border-border-strong hover:bg-raised text-text font-medium rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !isCommentValid}
            className={cn(
              "px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors shadow-sm disabled:opacity-50",
              isDestructive
                ? "bg-danger hover:bg-danger/90 text-white"
                : "bg-accent hover:bg-accent-hover text-accent-fg"
            )}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
