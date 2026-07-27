import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Receipt, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import * as authApi from "../api/auth";
import { useTranslation } from "../context/LanguageContext";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      toast.success("Password updated! You can now sign in.");
    } catch (err: any) {
      const message = err?.response?.data?.error || "This reset link is invalid or has expired.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* ── Left brand panel (desktop only) ─────────────────────────────── */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-ink-900 px-12 py-12 text-white lg:flex xl:w-[42%]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 translate-x-1/3 translate-y-1/3 rounded-full bg-brand-dark/40 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
            <Receipt size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">BillBook</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
            Choose a{" "}
            <span className="bg-gradient-to-r from-brand-light to-emerald-300 bg-clip-text text-transparent">
              new password.
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Pick something you haven't used before. Once it's set, you'll be signed in and ready
            to go.
          </p>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} BillBook. Business made simple.
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Receipt size={22} />
            </div>
            <span className="text-lg font-bold tracking-tight text-ink-900">BillBook</span>
          </div>

          {!token ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12)] sm:p-7">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <ShieldAlert size={28} className="text-red-600" />
              </div>
              <h1 className="text-lg font-bold text-ink-900">{t("Invalid reset link")}</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                This link is missing its reset token. Request a new one from the sign-in page.
              </p>
              <Link
                to="/login"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
              >
                {t("Back to Sign in")}
              </Link>
            </div>
          ) : done ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12)] sm:p-7">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <h1 className="text-lg font-bold text-ink-900">{t("Password updated!")}</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {t("Your password has been changed successfully.")}
              </p>
              <button
                onClick={() => navigate("/login")}
                className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
              >
                {t("Back to Sign in")}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t("Reset your password")}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {t("Enter a new password for your account")}
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12)] sm:p-7"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("New password")}</label>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      disabled={isSubmitting}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-10 text-sm transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("Confirm password")}</label>
                  <div className="relative">
                    <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      disabled={isSubmitting}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-center text-xs font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    t("Updating…")
                  ) : (
                    <>
                      {t("Update password")}
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                <Link to="/login" className="font-semibold text-brand hover:text-brand-dark hover:underline">
                  {t("Back to Sign in")}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
