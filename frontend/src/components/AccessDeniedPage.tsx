// src/components/AccessDeniedPage.tsx

import { ShieldOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6 py-16">
      {/* Icon */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 shadow-inner">
        <ShieldOff className="text-red-400" size={42} strokeWidth={1.5} />
      </div>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-slate-800 mb-2">Access Denied</h1>
      <p className="text-sm text-slate-500 max-w-sm mb-1">
        You don't have permission to view this page.
      </p>
      <p className="text-xs text-slate-400 max-w-xs mb-8">
        Contact your administrator to request access, or go back to a page you can view.
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={15} />
          Go Back
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors"
        >
          Go to Dashboard
        </button>
      </div>

      {/* Decorative badge */}
      <div className="mt-10 inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs text-red-500">
        <ShieldOff size={11} />
        403 — Forbidden
      </div>
    </div>
  );
}
