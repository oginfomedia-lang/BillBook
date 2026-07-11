// frontend/src/components/ProtectedRoute.tsx

import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";

interface ProtectedRouteProps {
  children: ReactNode;
  requireBranch?: boolean;
}

export function ProtectedRoute({
  children,
  requireBranch = true
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { userBranches, currentBranchId } = useBranch();
  const location = useLocation();

  // ✅ Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // ✅ Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ✅ SUPER ADMIN - Bypass ALL branch checks
  if (user.is_super_admin) {
    return <>{children}</>;
  }

  // ─── Regular User Branch Checks ──────────────────────────────────────────

  // ✅ If branch is required, check if user has any branch
  if (requireBranch) {
    // No branches assigned
    if (!userBranches || userBranches.length === 0) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
          <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">
              No Branch Assigned
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              You don't have any branch assigned. Please contact your administrator.
            </p>
            <button
              onClick={() => {
                window.location.href = "/login";
              }}
              className="text-sm text-brand hover:underline"
            >
              Go to Login
            </button>
          </div>
        </div>
      );
    }

    // ✅ Branch exists but not selected
    if (!currentBranchId) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
          <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="text-6xl mb-4">🏢</div>
            <h2 className="text-xl font-semibold text-ink-900 mb-2">
              Select a Branch
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Please select a branch to continue.
            </p>
            <select
              onChange={(e) => {
                const branchId = Number(e.target.value);
                localStorage.setItem("billbook_branch_id", String(branchId));
                window.location.reload();
              }}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Select a branch...</option>
              {userBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }
  }

  // ✅ All checks passed
  return <>{children}</>;
}