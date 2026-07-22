// src/components/NotFoundPage.tsx

import { FileSearch, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6 py-16">
      {/* Icon */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 shadow-inner">
        <FileSearch className="text-slate-400" size={42} strokeWidth={1.5} />
      </div>

      {/* Large 404 */}
      <p className="text-8xl font-black text-slate-100 select-none leading-none mb-2">404</p>

      {/* Heading */}
      <h1 className="text-3xl font-bold text-slate-800 mb-2 -mt-2">Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-sm mb-8">
        The page you're looking for doesn't exist or has been moved.
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
    </div>
  );
}
