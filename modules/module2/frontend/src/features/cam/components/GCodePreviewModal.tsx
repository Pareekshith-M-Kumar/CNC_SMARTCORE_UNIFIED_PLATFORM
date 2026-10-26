import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Terminal,
  FileCode,
  Lock,
} from 'lucide-react';
import { CamJob } from '../types';
import { CodeBlock } from '@/components/domain/CodeBlock';

interface GCodePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  camJob: CamJob | null;
  gcodeText: string | null;
  isLoading?: boolean;
  error?: string | null;
  onDownload: () => void;
}

export const GCodePreviewModal: React.FC<GCodePreviewModalProps> = ({
  isOpen,
  onClose,
  camJob,
  gcodeText,
  isLoading = false,
  error,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !camJob) return null;

  const isReady = camJob.status === 'TOOLPATH_READY';
  const dialect = 'HAAS / FANUC ISO Whitelist';

  const handleCopy = () => {
    if (!gcodeText) return;
    navigator.clipboard.writeText(gcodeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = gcodeText ? gcodeText.split('\n').length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">G-Code Program Preview</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {dialect}
                </span>
                {isReady ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3" />
                    Validated
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Lock className="w-3 h-3" />
                    Unvalidated
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Job: <span className="text-slate-200 font-medium">{camJob.name}</span> &bull; {lineCount} lines generated
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mandatory Safety Watermark Warning Alert */}
        <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>SAFETY NOTICE:</strong> PROTOTYPE OUTPUT - NOT CERTIFIED PRODUCTION CODE. Review all blocks before machine upload.
            </span>
          </div>
          <span className="font-mono text-[11px] text-amber-400/80">ISO 6983</span>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Loading post-processed G-Code program...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to fetch G-Code</p>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && gcodeText && (
            <CodeBlock
              code={gcodeText}
              language="G-Code / EIA-274-D"
              maxHeight="480px"
              showLineNumbers={true}
              className="border-slate-800 bg-slate-950"
            />
          )}

          {!isLoading && !error && !gcodeText && (
            <div className="text-center py-16 text-slate-500 text-sm">
              <FileCode className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="font-medium text-slate-400">No G-Code Available</p>
              <p className="text-xs text-slate-500 mt-1">
                Please generate toolpaths for this CAM job to post-process dialect-specific G-Code.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950">
          <div className="text-xs text-slate-500">
            {isReady ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Passed whitelist safety checks (G10/M98 forbidden, envelope verified)
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Download is disabled until toolpath passes validation (AC-23)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!gcodeText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>

            <button
              type="button"
              onClick={onDownload}
              disabled={!isReady || !gcodeText}
              title={
                !isReady
                  ? 'Download is disabled until validation passes (AC-23)'
                  : 'Download complete .NC program file'
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-md transition-colors disabled:opacity-40 disabled:hover:bg-cyan-500 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Download .NC File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
