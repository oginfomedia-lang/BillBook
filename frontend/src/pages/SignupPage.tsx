import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Receipt, Building2, User, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Boxes, BarChart3 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";

const FEATURE_HIGHLIGHTS = [
  { icon: ShieldCheck, text: "Secure, multi-branch workspace from day one" },
  { icon: Boxes, text: "Inventory, invoicing & purchases in one place" },
  { icon: BarChart3, text: "Insights that update as your business moves" },
];

export function SignupPage() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ company_name: "", admin_name: "", email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signup(form);
      toast.success(t("Workspace created!"));
      navigate("/dashboard");
    } catch (err: any) {
      const message = err?.response?.data?.error || t("Couldn't create your workspace. Try again.");
      toast.error(message);
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
            Start billing in{" "}
            <span className="bg-gradient-to-r from-brand-light to-emerald-300 bg-clip-text text-transparent">
              under a minute.
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Set up your workspace, invite your team, and start invoicing — no credit card, no
            setup calls.
          </p>

          <ul className="mt-8 space-y-4">
            {FEATURE_HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon size={16} className="text-brand-light" />
                </span>
                <span className="text-sm text-slate-200">{text}</span>
              </li>
            ))}
          </ul>
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

          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t("Set up your workspace")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("Start billing in under a minute")}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12)] sm:p-7"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("Business name")}</label>
              <div className="relative">
                <Building2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="Acme Retail Pvt Ltd"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("Your name")}</label>
              <div className="relative">
                <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  value={form.admin_name}
                  onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("Email")}</label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("Password")}</label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              <p className="mt-1.5 text-xs text-slate-400">{t("At least 8 characters")}</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                t("Setting up…")
              ) : (
                <>
                  {t("Create workspace")}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            {t("Already have a workspace?")}{" "}
            <Link to="/login" className="font-semibold text-brand hover:text-brand-dark hover:underline">
              {t("Sign in")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
