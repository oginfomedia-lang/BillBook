// src/components/PermissionRoute.tsx
// Wraps a route element with a permission check.
// If the user lacks the required permission key, shows AccessDeniedPage instead.

import { useAuth } from "../context/AuthContext";
import { AccessDeniedPage } from "./AccessDeniedPage";
import type { ReactNode } from "react";

interface PermissionRouteProps {
  /** The permission key to check, e.g. "users.view" */
  permission: string;
  children: ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
