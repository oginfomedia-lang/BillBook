// frontend/src/components/BranchSelector.tsx

import { useBranch } from "../context/BranchContext";
import { useAuth } from "../context/AuthContext";
import { Building, Check, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

export function BranchSelector() {
    const {
        userBranches,
        currentBranchId,
        setCurrentBranchId,
        isLoading
    } = useBranch();
    const { user } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Get current branch name - safely
    const branches = userBranches || [];
    const currentBranch = branches.find(b => b.id === currentBranchId);

    // If loading
    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                <span className="text-sm text-slate-400">Loading...</span>
            </div>
        );
    }

    // If user has only 1 branch, show as badge
    if (branches.length === 1) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-light/10 rounded-lg">
                <Building size={16} className="text-brand" />
                <span className="text-sm font-medium text-slate-700">
                    {branches[0].name}
                </span>
                {user?.is_super_admin && (
                    <span className="text-[10px] font-semibold text-brand-dark bg-brand-light/20 px-2 py-0.5 rounded-full">
                        Super Admin
                    </span>
                )}
            </div>
        );
    }

    // If no branches
    if (branches.length === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 text-amber-600">
                <Building size={16} />
                <span className="text-sm">No branches assigned</span>
            </div>
        );
    }

    // Show dropdown for multiple branches
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/20 min-w-[150px] justify-between"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <Building size={16} className="text-brand flex-shrink-0" />
                    <span className="truncate max-w-[120px]">
                        {currentBranch?.name || "Select Branch"}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-64 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg z-50 py-1">
                    {branches.map((branch) => (
                        <button
                            key={branch.id}
                            onClick={() => {
                                setCurrentBranchId(branch.id);
                                setIsOpen(false);
                                toast.success(`Switched to ${branch.name}`);
                            }}
                            className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors ${currentBranchId === branch.id ? "bg-brand-light/10" : ""
                                }`}
                        >
                            <div>
                                <p className="font-medium text-slate-800">{branch.name}</p>
                                <p className="text-xs text-slate-400">{branch.code}</p>
                            </div>
                            {currentBranchId === branch.id && (
                                <Check size={16} className="text-brand flex-shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}