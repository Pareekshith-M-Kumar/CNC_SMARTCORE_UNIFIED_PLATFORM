import React from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/common/TopBar";
import { HelpCircle, ArrowLeft } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas text-text flex flex-col pt-14">
      <TopBar />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-md p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-raised border border-border flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs font-mono text-accent font-semibold uppercase tracking-wider">
            HTTP 404 · Resource Not Found
          </span>
          <h2 className="text-xl font-bold text-text mt-1">Page Not Found</h2>
          <p className="text-xs text-text-muted mt-2 leading-relaxed">
            The requested application route or asset does not exist in CNC SmartCore.
          </p>
          <div className="mt-6">
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded bg-raised hover:bg-border text-xs font-medium text-text border border-border transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
