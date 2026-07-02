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
  const { data, isLoading } = useBranches({ page: 1, per_page: 1000 });

  const branches = data?.items || [];

  // Auto-select first branch if none selected
  useEffect(() => {
    if (!isLoading && branches.length > 0 && currentBranchId === null) {
      setCurrentBranchId(branches[0].id);
    }
  }, [branches, isLoading, currentBranchId]);

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