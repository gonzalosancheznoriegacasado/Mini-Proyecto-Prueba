import type { ReactNode } from 'react';

interface PermissionGateProps {
  allowed: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export const PermissionGate = ({ allowed, fallback = null, children }: PermissionGateProps) => {
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
};
