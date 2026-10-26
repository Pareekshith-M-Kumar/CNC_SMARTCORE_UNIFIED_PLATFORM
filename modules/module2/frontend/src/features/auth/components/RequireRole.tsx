import React from 'react';
import { useAuth } from '../useAuth';
import { useDevRole } from '../../../app/context/useDevRole';
import { UserRole } from '../types';
import { ErrorState } from '../../../components/domain/ErrorState';

interface RequireRoleProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles, children }) => {
  const { role: authRole, session } = useAuth();
  const { role: devRole } = useDevRole();

  // If signed in with active session, authRole is authoritative; otherwise dev role applies
  const effectiveRole: UserRole = (session ? authRole : devRole) || 'designer';

  if (!allowedRoles.includes(effectiveRole)) {
    return (
      <div className="p-8">
        <ErrorState
          title="Access Restricted (403)"
          message={`Your role (${effectiveRole.toUpperCase()}) does not have permission to view this resource. Required: ${allowedRoles.map((r) => r.toUpperCase()).join(', ')}.`}
          whatNext="Contact an administrator to request elevated permissions, or switch roles in dev mode."
        />
      </div>
    );
  }

  return <>{children}</>;
};
