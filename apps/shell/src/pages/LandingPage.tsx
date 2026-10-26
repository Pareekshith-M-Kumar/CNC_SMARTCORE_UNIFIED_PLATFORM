import React from "react";
import { Link } from "react-router-dom";
import { TopBar } from "@/components/common/TopBar";
import { LifecycleStepper } from "@/components/common/LifecycleStepper";
import { Activity, Box, ShieldCheck, Hash, ArrowRight, Lock, Database } from "lucide-react";

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-canvas text-text flex flex-col pt-14">
      <TopBar />

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-6xl mx-auto w-full text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-raised border border-border text-[11px] font-mono text-accent mb-6">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>FINAL-YEAR ENGINEERING PROJECT · UNIFIED MVP</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-text leading-[1.1] max-w-4xl mx-auto">
          From approved design to <span className="text-accent">monitored machine</span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-text-muted max-w-2xl mx-auto leading-relaxed">
          One unified platform connecting intelligent pre-manufacturing CAD/CAM simulation
          with real-time shop-floor CNC machine telemetry and predictive maintenance.
        </p>

        <div className="mt-8 flex items-center justify-center space-x-4">
          <Link
            to="/register"
            className="flex items-center space-x-2 px-6 py-3 rounded bg-accent text-accent-fg hover:bg-accent-hover font-medium text-sm transition-all shadow-md shadow-accent/10"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 rounded bg-surface hover:bg-raised text-text border border-border font-medium text-sm transition-all"
          >
            Sign In to Platform
          </Link>
        </div>
      </section>

      {/* Lifecycle Strip */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-16">
        <LifecycleStepper />
      </section>

      {/* Two Modules Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-16 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 2 Card */}
        <div className="bg-surface border border-border rounded-md p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded bg-canvas border border-border flex items-center justify-center">
                <Box className="w-5 h-5 text-info" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-info font-semibold">Module 2</span>
                <h3 className="text-lg font-semibold text-text">Pre-Manufacturing Platform</h3>
              </div>
            </div>

            <p className="text-sm text-text-2 mb-4 leading-relaxed">
              Automated CAD geometry slicing, rule-based material selection, toolpath emission,
              kinematic simulation, and immutable engineering approvals.
            </p>

            <ul className="space-y-2 text-xs text-text-2 mb-6 border-t border-border pt-3">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-info mr-2" />
                3D CAD viewing & automated 2.5D toolpath generation
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-info mr-2" />
                Rule-based material advisory (ISO P/M/K/N/S/H)
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-info mr-2" />
                G-code verification & cryptographic plan approval
              </li>
            </ul>
          </div>

          <Link
            to="/login"
            className="w-full py-2.5 rounded bg-raised hover:bg-border text-text text-center text-xs font-medium border border-border transition-colors"
          >
            Explore Pre-Manufacturing
          </Link>
        </div>

        {/* Module 1 Card */}
        <div className="bg-surface border border-border rounded-md p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded bg-canvas border border-border flex items-center justify-center">
                <Activity className="w-5 h-5 text-success" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-success font-semibold">Module 1</span>
                <h3 className="text-lg font-semibold text-text">Smart CNC Monitoring</h3>
              </div>
            </div>

            <p className="text-sm text-text-2 mb-4 leading-relaxed">
              Continuous machine sensor telemetry, tool wear tracking, OEE analytics,
              and machine failure prediction with rule-based fallbacks.
            </p>

            <ul className="space-y-2 text-xs text-text-2 mb-6 border-t border-border pt-3">
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-success mr-2" />
                Real-time spindle, feed, vibration & temperature tracking
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-success mr-2" />
                Predictive maintenance using Random Forest models
              </li>
              <li className="flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-success mr-2" />
                Production job scheduling & queue optimization
              </li>
            </ul>
          </div>

          <Link
            to="/login"
            className="w-full py-2.5 rounded bg-raised hover:bg-border text-text text-center text-xs font-medium border border-border transition-colors"
          >
            Explore Monitoring Fleet
          </Link>
        </div>
      </section>

      {/* Security & Integrity Strip */}
      <section className="bg-surface border-y border-border py-8 mb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <Lock className="w-5 h-5 text-accent mb-2" />
            <span className="text-xs font-medium text-text">Supabase Auth</span>
            <span className="text-[11px] text-text-muted mt-0.5">JWT & bcrypt hashing</span>
          </div>
          <div className="flex flex-col items-center">
            <ShieldCheck className="w-5 h-5 text-accent mb-2" />
            <span className="text-xs font-medium text-text">Row-Level Security</span>
            <span className="text-[11px] text-text-muted mt-0.5">100% database table isolation</span>
          </div>
          <div className="flex flex-col items-center">
            <Hash className="w-5 h-5 text-accent mb-2" />
            <span className="text-xs font-medium text-text">SHA-256 Integrity</span>
            <span className="text-[11px] text-text-muted mt-0.5">File fingerprint pinning</span>
          </div>
          <div className="flex flex-col items-center">
            <Database className="w-5 h-5 text-accent mb-2" />
            <span className="text-xs font-medium text-text">Audit Trail</span>
            <span className="text-[11px] text-text-muted mt-0.5">Append-only event logging</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center">
        <p className="text-xs text-text-muted">
          Academic Project Prototype · Not for production machining or life-critical environments.
        </p>
        <p className="text-[11px] text-text-muted/70 mt-1 font-mono">
          CNC SmartCore Unified Platform — Module 1 (nimmalasat) & Module 2 (Pareekshith M Kumar)
        </p>
      </footer>
    </div>
  );
};
