// frontend/src/context/BranchContext.tsx

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { Branch } from "../types";

interface BranchContextValue {
  currentBranchId: number | null;
  setCurrentBranchId: (id: number | null) => void;
  branches: Branch[];
  userBranches: Branch[];
  isLoading: boolean;
  hasBranchAccess: (branchId: number) => boolean;
  getCurrentBranch: () => Branch | null;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user, branches: allBranches, isLoading: isAuthLoading } = useAuth();
  const [currentBranchId, setCurrentBranchId] = useState<number | null>(null);

  // ✅ Filter branches based on user access
  const userBranches = useMemo(() => {
    if (!user) return [];

    // ✅ SUPER ADMIN - Gets ALL branches
    if (user.is_super_admin) {
      return allBranches || [];
    }

    // ✅ Regular user - Only their assigned branch
    if (user.branch_id) {
      return (allBranches || []).filter(b => b.id === user.branch_id);
    }

    return [];
  }, [allBranches, user]);

  // ✅ Auto-select branch for regular users only
  useEffect(() => {
    // ✅ Skip for Super Admin - they can select later
    if (user?.is_super_admin) {
      // For Super Admin, check if they have a saved branch preference
      const savedBranchId = localStorage.getItem("billbook_branch_id");
      if (savedBranchId && allBranches?.some(b => b.id === Number(savedBranchId))) {
        setCurrentBranchId(Number(savedBranchId));
      } else if (allBranches && allBranches.length > 0) {
        // Set first branch as default for Super Admin
        setCurrentBranchId(allBranches[0].id);
        localStorage.setItem("billbook_branch_id", String(allBranches[0].id));
      }
      return;
    }

    // ✅ Regular user - Auto-select their only branch
    if (!isAuthLoading && userBranches.length > 0) {
      const savedBranchId = localStorage.getItem("billbook_branch_id");

      if (savedBranchId) {
        const exists = userBranches.some(b => b.id.toString() === savedBranchId);
        if (exists) {
          setCurrentBranchId(Number(savedBranchId));
          return;
        }
      }

      // Auto-select first branch
      setCurrentBranchId(userBranches[0].id);
      localStorage.setItem("billbook_branch_id", String(userBranches[0].id));
    }
  }, [userBranches, isAuthLoading, user, allBranches]);

  // ✅ Sync to localStorage
  useEffect(() => {
    if (currentBranchId !== null) {
      localStorage.setItem("billbook_branch_id", currentBranchId.toString());
    }
  }, [currentBranchId]);

  const hasBranchAccess = (branchId: number): boolean => {
    if (user?.is_super_admin) return true;
    return userBranches.some(b => b.id === branchId);
  };

  const getCurrentBranch = (): Branch | null => {
    if (!currentBranchId) return null;
    return (allBranches || []).find(b => b.id === currentBranchId) || null;
  };

  return (
    <BranchContext.Provider value={{
      currentBranchId,
      setCurrentBranchId,
      branches: allBranches || [],
      userBranches,
      isLoading: isAuthLoading,
      hasBranchAccess,
      getCurrentBranch
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used within BranchProvider");
  return context;
}