// frontend/src/pages/AutoLoginPage.tsx
//
// Landing point for a demo signup's redirect_url
// (POST /api/v1/demo/signup -> "{FRONTEND_ORIGIN}/auto-login?token=...").
// Exchanges the short-lived bootstrap token for a real session via
// AuthContext.loginWithDemoToken(), then redirects into the app.

import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";

export function AutoLoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithDemoToken } = useAuth();
  const [error, setError] = useState("");
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return; // StrictMode double-invoke / re-render guard -- the token is single-purpose
    attempted.current = true;

    const token = searchParams.get("token") || "";
    if (!token) {
      setError(t("This demo link is missing its token."));
      return;
    }

    loginWithDemoToken(token)
      .then(() => navigate("/dashboard", { replace: true }))
      .catch((err) => {
        const message = err?.response?.data?.error || t("This demo link is invalid or has expired.");
        setError(message);
      });
  }, [searchParams, loginWithDemoToken, navigate, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12)]">
        {error ? (
          <>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <ShieldAlert size={28} className="text-red-600" />
            </div>
            <h1 className="text-lg font-bold text-ink-900">{t("Couldn't start your demo")}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
            >
              {t("Back to Sign in")}
            </button>
          </>
        ) : (
          <>
            <Loader2 size={32} className="mx-auto mb-3 animate-spin text-brand" />
            <h1 className="text-lg font-bold text-ink-900">{t("Setting up your demo…")}</h1>
            <p className="mt-1.5 text-sm text-slate-500">{t("Just a moment while we sign you in.")}</p>
          </>
        )}
      </div>
    </div>
  );
}
