import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth, DEFAULT_MASTER_CREDENTIALS, type UserRole } from "@/context/AuthContext";
import { TopBar } from "@/components/common/TopBar";
import { Eye, EyeOff, Lock, Mail, User, AlertCircle, CheckCircle2, Loader2, Sparkles, ShieldCheck, KeyRound } from "lucide-react";

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, activateLocalSession } = useAuth();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg("Please provide both an email and password.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    try {
      setSubmitting(true);

      // 1. Supabase Cloud Sign Up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split("@")[0],
            role: selectedRole,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          setErrorMsg("This email is already registered in Supabase. Please sign in instead.");
          setSubmitting(false);
          return;
        }
        if (error.message.toLowerCase().includes("rate limit")) {
          setErrorMsg("Supabase Email Rate Limit Exceeded: Supabase restricts confirmation emails to 3/hr on free tier. To enable instant registration, go to Supabase Dashboard > Authentication > Providers > Email and uncheck 'Confirm email'.");
          setSubmitting(false);
          return;
        }
        setErrorMsg(`Supabase Registration Error: ${error.message}`);
        setSubmitting(false);
        return;
      }

      if (!data?.user) {
        setErrorMsg("Failed to create user in Supabase. Please verify your internet connection or email.");
        setSubmitting(false);
        return;
      }

      // 2. Direct Profile insertion into public.profiles
      try {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName || email.split("@")[0],
          role: selectedRole,
          is_active: true,
        });
      } catch (profileErr) {
        console.warn("Profile table upsert note:", profileErr);
      }

      // 3. Activate session for local state
      await activateLocalSession(email, fullName || email.split("@")[0], selectedRole, password);

      if (data.session) {
        setSuccessMsg("Account successfully registered and active in Supabase! Redirecting to Dashboard...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 900);
      } else {
        setSuccessMsg("Account registered in Supabase auth.users! (If email confirmation is required, check your inbox or sign in below).");
        setTimeout(() => navigate("/login"), 1800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please check your network connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const fillMasterCredentials = () => {
    setEmail(DEFAULT_MASTER_CREDENTIALS.email);
    setPassword(DEFAULT_MASTER_CREDENTIALS.password);
    setFullName(DEFAULT_MASTER_CREDENTIALS.fullName);
    setSelectedRole("admin");
    setErrorMsg(null);
    setSuccessMsg("Master Admin credentials filled into form. Click 'Register & Create Account' below.");
  };

  const handleFillPreset = (presetRole: UserRole) => {
    setSelectedRole(presetRole);
    if (presetRole === "admin") {
      setEmail("cnc@gmail.com");
      setPassword("Pareekshith");
      setFullName("Pareekshith M Kumar (Admin)");
    } else if (presetRole === "cam_engineer") {
      setEmail("cam@cncsmartcore.local");
      setPassword("Pareekshith");
      setFullName("CAM Toolpath Engineer");
    } else if (presetRole === "operator") {
      setEmail("operator@cncsmartcore.local");
      setPassword("Pareekshith");
      setFullName("CNC Machinist Operator");
    } else if (presetRole === "designer") {
      setEmail("designer@cncsmartcore.local");
      setPassword("Pareekshith");
      setFullName("Lead CAD Designer");
    }
    setErrorMsg(null);
    setSuccessMsg(`Preset credentials filled for ${presetRole.toUpperCase()}. Click 'Register & Create Account' below.`);
  };

  return (
    <div className="min-h-screen bg-canvas text-text flex flex-col pt-14">
      <TopBar />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] bg-surface border border-border rounded-md p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <span className="text-[11px] font-mono uppercase text-accent font-semibold tracking-wider">
              Account Onboarding
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-text mt-1">Create an Account</h2>
            <p className="text-xs text-text-muted mt-1.5">
              Access both CAD/CAM Pre-Mfg and CNC Monitoring
            </p>
          </div>

          {user && (
            <div className="mb-5 p-3 rounded bg-accent/10 border border-accent/40 flex items-center justify-between text-xs">
              <div className="truncate mr-2">
                <span className="text-text-muted">Signed in as: </span>
                <span className="font-semibold text-text">{user.email}</span>
                <span className="ml-1.5 text-[10px] font-mono uppercase bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                  {profile?.role || "user"}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link to="/dashboard" className="text-accent underline font-medium hover:text-accent-hover text-xs">
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-danger hover:underline font-medium text-xs cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Master Admin Quick Access Card */}
          <div className="mb-5 rounded border border-accent/40 bg-accent/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-accent font-mono uppercase">
                <ShieldCheck className="w-4 h-4 text-accent" />
                <span>Default Master Account</span>
              </div>
              <span className="text-[10px] font-mono bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                Admin
              </span>
            </div>
            <p className="text-xs text-text-2 mb-2.5">
              Pre-configured administrator account for university evaluation:
            </p>
            <div className="bg-canvas/80 border border-border/80 rounded p-2 text-xs font-mono space-y-0.5 text-text-muted mb-3">
              <div>Email: <span className="text-text font-medium">{DEFAULT_MASTER_CREDENTIALS.email}</span></div>
              <div>Password: <span className="text-text font-medium">{DEFAULT_MASTER_CREDENTIALS.password}</span></div>
            </div>
            <button
              type="button"
              onClick={fillMasterCredentials}
              className="w-full py-2 px-3 rounded bg-accent/20 hover:bg-accent/30 text-accent font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-accent/40 shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Auto-fill Pareekshith Master Credentials</span>
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-start space-x-2.5 p-3 rounded bg-danger/10 border border-danger/30 text-danger text-xs mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start space-x-2.5 p-3 rounded bg-success/10 border border-success/30 text-success text-xs mb-5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5" htmlFor="fullName">
                Full name (optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Pareekshith M Kumar"
                  className="w-full pl-9 pr-3 py-2 bg-canvas border border-border rounded text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5" htmlFor="regEmail">
                Email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  id="regEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cnc@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-canvas border border-border rounded text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5" htmlFor="regPassword">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                <input
                  id="regPassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-10 py-2 bg-canvas border border-border rounded text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-accent font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-text-muted hover:text-text"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-2 mb-1.5" htmlFor="regRole">
                Platform Role
              </label>
              <select
                id="regRole"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-canvas border border-border rounded text-xs text-text focus:outline-none focus:border-accent"
              >
                <option value="admin">Administrator (Full Access)</option>
                <option value="cam_engineer">CAM Engineer (Toolpaths & Feeds)</option>
                <option value="operator">CNC Machinist Operator (Shop Floor)</option>
                <option value="designer">CAD Designer (3D Geometry Upload)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded bg-accent hover:bg-accent-hover text-accent-fg font-medium text-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 mt-2 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Account in Supabase...</span>
                </>
              ) : (
                <span>Register & Create Account</span>
              )}
            </button>
          </form>

          {/* Quick Role Presets */}
          <div className="mt-6 pt-5 border-t border-border/80">
            <div className="rounded border border-border bg-raised/30 p-3 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-text-muted font-mono uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Auto-fill Preset Roles</span>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                <button
                  type="button"
                  onClick={() => handleFillPreset("admin")}
                  className="px-2.5 py-1 rounded bg-raised hover:bg-border text-[11px] font-mono text-text border border-border transition-colors cursor-pointer"
                >
                  Fill Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleFillPreset("cam_engineer")}
                  className="px-2.5 py-1 rounded bg-raised hover:bg-border text-[11px] font-mono text-text border border-border transition-colors cursor-pointer"
                >
                  Fill CAM
                </button>
                <button
                  type="button"
                  onClick={() => handleFillPreset("operator")}
                  className="px-2.5 py-1 rounded bg-raised hover:bg-border text-[11px] font-mono text-text border border-border transition-colors cursor-pointer"
                >
                  Fill Operator
                </button>
                <button
                  type="button"
                  onClick={() => handleFillPreset("designer")}
                  className="px-2.5 py-1 rounded bg-raised hover:bg-border text-[11px] font-mono text-text border border-border transition-colors cursor-pointer"
                >
                  Fill Designer
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <span className="text-xs text-text-muted">
              Already have an account?{" "}
              <Link to="/login" className="text-accent hover:underline font-medium">
                Sign in
              </Link>
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
