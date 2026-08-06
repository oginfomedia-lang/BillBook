// frontend/src/hooks/useDemoMode.ts

import { useAuth } from "../context/AuthContext";

export function useDemoMode() {
  const { user } = useAuth();

  const isDemo = !!user?.is_demo;
  const expiresAt = user?.demo_expires_at ? new Date(user.demo_expires_at) : null;
  const timeRemainingMs = expiresAt ? expiresAt.getTime() - Date.now() : null;

  return { isDemo, expiresAt, timeRemainingMs };
}
