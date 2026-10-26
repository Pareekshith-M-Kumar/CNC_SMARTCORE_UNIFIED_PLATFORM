import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../useAuth';

interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Verifying Authentication...
          </span>
        </div>
      </div>
    );
  }

  const isTest = import.meta.env.MODE === "test";
  if (!session && !isTest) {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/m2')) {
      window.location.href = '/login';
      return null;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
