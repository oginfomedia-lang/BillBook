// frontend/src/pages/LoginPage.tsx

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
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
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          {t("New business?")}{" "}
          <Link to="/signup" className="font-medium text-brand hover:underline">
            {t("Set up your workspace")}
          </Link>
        </p>
      </div>
    </div>
  );
}