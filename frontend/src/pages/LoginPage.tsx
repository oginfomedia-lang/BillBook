// frontend/src/pages/LoginPage.tsx

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Receipt, X, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";

export function LoginPage() {
  const { t } = useTranslation();
  const { login, branches } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSending(true);
    await new Promise((r) => setTimeout(r, 1200)); // simulate API call
    setForgotSending(false);
    setForgotSent(true);
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotEmail("");
    setForgotSent(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);

      // ✅ Check if user has branches
      if (branches && branches.length > 0) {
        // ✅ Auto-select first branch (handled in AuthContext)
        toast.success("Login successful!");
        navigate("/dashboard");
      } else {
        toast.error("No branch assigned. Contact admin.");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || t("Incorrect email or password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
            <Receipt size={22} />
          </div>
          <h1 className="text-xl font-semibold text-ink-900">{t("Welcome back")}</h1>
          <p className="text-sm text-slate-500">{t("Sign in to your BillBook workspace")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? t("Signing in…") : t("Sign in")}
          </button>
          <p className="text-center">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-xs font-medium text-brand hover:underline"
            >
              {t("Forgot password?")}
            </button>
          </p>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {t("New business?")}{" "}
          <Link to="/signup" className="font-medium text-brand hover:underline">
            {t("Set up your workspace")}
          </Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">
                {forgotSent ? t("Email sent!") : t("Forgot password?")}
              </h2>
              <button onClick={closeForgot} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors">
                <X size={18} />
              </button>
            </div>

            {forgotSent ? (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 size={44} className="mb-3 text-green-500" />
                <p className="text-sm text-slate-600">
                  We sent a reset link to{" "}
                  <span className="font-semibold text-ink-900">{forgotEmail}</span>.
                  Please check your inbox.
                </p>
                <button onClick={closeForgot}
                  className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">
                  {t("Back to Sign in")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-sm text-slate-500">{t("Enter your email and we'll send you a reset link.")}</p>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Email address")}</label>
                  <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={closeForgot}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    {t("Cancel")}
                  </button>
                  <button type="submit" disabled={forgotSending}
                    className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-colors">
                    {forgotSending ? t("Sending…") : t("Send link")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}