// frontend/src/context/AuthContext.tsx

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, Branch } from "../types";
import { tokenStorage } from "../api/client";
import * as authApi from "../api/auth";

interface AuthContextValue {
  user: User | null;
  branches: Branch[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: authApi.SignupPayload) => Promise<void>;
  logout: () => void;
  hasPermission: (key: string) => boolean;
  updateCurrentUser: (user: User) => void;
  setBranches: (branches: Branch[]) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = async () => {
    try {
      const data = await authApi.fetchCurrentUser();
      setUser(data);

      // ✅ Branches are now returned from /me endpoint
      if (data.branches) {
        setBranches(data.branches);

        // ✅ For Super Admin, set first branch if available
        if (data.is_super_admin && data.branches.length > 0) {
          const savedBranchId = localStorage.getItem("billbook_branch_id");
          if (!savedBranchId || !data.branches.some((b: Branch) => b.id === Number(savedBranchId))) {
            localStorage.setItem("billbook_branch_id", String(data.branches[0].id));
          }
        } else if (data.branches.length > 0) {
          // Regular user - auto-select their branch
          const savedBranchId = localStorage.getItem("billbook_branch_id");
          if (savedBranchId && data.branches.some((b: Branch) => b.id === Number(savedBranchId))) {
            // Keep saved branch if valid
          } else {
            localStorage.setItem("billbook_branch_id", String(data.branches[0].id));
          }
        }
      }
    } catch (error) {
      tokenStorage.clear();
      setUser(null);
      setBranches([]);
    }
  };

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    loadUser()
      .catch(() => tokenStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    setUser(data.user);
    setBranches(data.branches || []);

    // ✅ For Super Admin, set first branch if available
    if (data.user.is_super_admin && data.branches && data.branches.length > 0) {
      localStorage.setItem("billbook_branch_id", String(data.branches[0].id));
    } else if (data.branches && data.branches.length > 0) {
      // Regular user - auto-select their branch
      localStorage.setItem("billbook_branch_id", String(data.branches[0].id));
    }
  };

  const signup = async (payload: authApi.SignupPayload) => {
    const data = await authApi.signup(payload);
    setUser(data.user);
    setBranches(data.branches || []);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setBranches([]);
    localStorage.removeItem("billbook_branch_id");
  };

  const updateCurrentUser = (newUser: User) => {
    setUser(newUser);
  };

  const hasPermission = (key: string) => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    return (user.permissions ?? []).includes(key);
  };

  return (
    <AuthContext.Provider value={{
      user,
      branches,
      isLoading,
      login,
      signup,
      logout,
      hasPermission,
      updateCurrentUser,
      setBranches
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}