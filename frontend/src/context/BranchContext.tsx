import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useBranches } from "../hooks/useBranches";
import { useAuth } from "./AuthContext";
import { Branch } from "../types";

interface BranchContextValue {
  currentBranchId: number | null;
  setCurrentBranchId: (id: number | null) => void;
  branches: Branch[];
  isLoading: boolean;
}

const BranchContext = createContext<BranchContextValue | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentBranchId, setCurrentBranchId] = useState<number | null>(null);
  const { data, isLoading } = useBranches({ page: 1, per_page: 1000 }, { enabled: !!user });

  const branches = data?.items || [];

  // Auto-select first branch if none selected.
  // Use branches[0]?.id and branches.length as deps (not the array reference itself)
  // to avoid an infinite re-render loop: the `data?.items || []` expression
  // produces a NEW array on every render even when the data hasn't changed.
  const firstBranchId = branches[0]?.id;
  useEffect(() => {
    if (!isLoading && firstBranchId !== undefined && currentBranchId === null) {
      setCurrentBranchId(firstBranchId);
    }
  }, [firstBranchId, isLoading, currentBranchId]);

  return (
    <BranchContext.Provider value={{ currentBranchId, setCurrentBranchId, branches, isLoading }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used within BranchProvider");
  return context;
}