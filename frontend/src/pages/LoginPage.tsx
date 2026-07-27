// frontend/src/pages/LoginPage.tsx

import { useState, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Receipt,
  X,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  Zap,
  Boxes,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import * as authApi from "../api/auth";

// Mock Database definition
const MOCK_DB: Record<string, { password: string; status: "active" | "locked" | "error" }> = {
  "test@test.com": { password: "password123", status: "active" },
  "locked@test.com": { password: "password123", status: "locked" },
  "error@test.com": { password: "password123", status: "error" },
};

const FEATURE_HIGHLIGHTS = [
  { icon: Zap, text: "Create GST-ready invoices in seconds" },
  { icon: Boxes, text: "Track stock across every branch & warehouse" },
  { icon: BarChart3, text: "Real-time sales, purchase & profit reports" },
];

export function LoginPage() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Basic Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show/Hide Password state
  const [showPassword, setShowPassword] = useState(false);

  // Validation & Error States
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Caps Lock Warning state
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Rate Limiting States
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return Number(localStorage.getItem("login_failed_attempts") || "0");
  });
  const [lockUntil, setLockUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem("login_lock_until");
    return saved ? Number(saved) : null;
  });
  const [timeLeft, setTimeLeft] = useState(0);

  // Forgot password states
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Session check on load
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Rate limit countdown effect
  useEffect(() => {
    if (!lockUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        // Unlock
        setLockUntil(null);
        setFailedAttempts(0);
        localStorage.removeItem("login_lock_until");
        localStorage.removeItem("login_failed_attempts");
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockUntil]);

  // Check if form is currently locked
  const isLocked = lockUntil ? lockUntil > Date.now() : false;

  // Format countdown time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Keyboard caps lock detection
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState("CapsLock")) {
      setCapsLockOn(true);
    } else {
      setCapsLockOn(false);
    }
  };

  const handleForgotClick = () => {
    setForgotOpen(true);
  };

  // Real-time error clearing when user types
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailError("");
    setEmailTouched(true);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setPasswordError("");
    setPasswordTouched(true);
  };

  const validateEmailFormat = (emailStr: string) => {
    // Basic @ and . check
    return emailStr.includes("@") && emailStr.includes(".");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      toast.error(`Too many failed attempts. Please try again in ${formatTime(timeLeft)}.`);
      return;
    }

    setEmailTouched(true);
    setPasswordTouched(true);

    const emailVal = email.trim();
    const passwordVal = password;

    // Submission check 3: both empty
    if (!emailVal && !passwordVal) {
      toast.error("Please enter your email and password");
      setEmailError("Email is required");
      setPasswordError("Password is required");
      return;
    }

    // Validation 1: Email checks
    let hasError = false;
    if (!emailVal) {
      setEmailError("Email is required");
      hasError = true;
    } else if (emailVal.includes(" ")) {
      setEmailError("Email should not contain spaces");
      hasError = true;
    } else if (!validateEmailFormat(emailVal)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    } else if (emailVal.length > 255) {
      setEmailError("Email is too long");
      hasError = true;
    }

    // Validation 2: Password checks
    if (!passwordVal) {
      setPasswordError("Password is required");
      hasError = true;
    } else if (passwordVal.includes(" ")) {
      setPasswordError("Password should not contain spaces");
      hasError = true;
    } else if (passwordVal.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      hasError = true;
    } else if (passwordVal.length > 50) {
      setPasswordError("Password is too long");
      hasError = true;
    }

    if (hasError) return;

    // Proceed to Mock API Submission
    setIsSubmitting(true);

    try {
      // If it is one of the mock emails, simulate mock API response
      if (["test@test.com", "locked@test.com", "error@test.com"].includes(emailVal)) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const mockAccount = MOCK_DB[emailVal];

        if (mockAccount.password !== passwordVal) {
          setPasswordError("Incorrect password. Please try again.");
          throw { status: 401, message: "Invalid email or password" };
        }

        if (mockAccount.status === "locked") {
          throw { status: 403, message: "Your account is locked. Contact support." };
        }

        if (mockAccount.status === "error") {
          throw { status: 500, message: "Something went wrong. Please try again later." };
        }

        // Success
        toast.success("Login successful!");
        localStorage.removeItem("login_failed_attempts");
        localStorage.removeItem("login_lock_until");
        navigate("/dashboard");
        return;
      }

      // Otherwise, call the real login function
      await login(emailVal, passwordVal);

      toast.success("Login successful!");
      localStorage.removeItem("login_failed_attempts");
      localStorage.removeItem("login_lock_until");
      navigate("/dashboard");

    } catch (err: any) {
      const errStatus = err?.response?.status || err?.status || 500;
      const responseMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "";

      let displayMsg = "Something went wrong. Please try again later.";

      if (errStatus === 404 || responseMsg.toLowerCase().includes("not found") || responseMsg.toLowerCase().includes("no account")) {
        setEmailError("No account found with this email");
        displayMsg = "No account found with this email";
      } else if (errStatus === 401 || responseMsg.toLowerCase().includes("password") || responseMsg.toLowerCase().includes("invalid email or password")) {
        setPasswordError("Incorrect password. Please try again.");
        displayMsg = "Incorrect password. Please try again.";
      } else if (errStatus === 403) {
        displayMsg = responseMsg || "Your account is locked. Contact support.";
      } else {
        displayMsg = responseMsg || "Something went wrong. Please try again later.";
      }

      toast.error(displayMsg);

      // Handle Rate Limiting count
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      localStorage.setItem("login_failed_attempts", String(nextAttempts));

      if (nextAttempts >= 10) {
        const unlockTime = Date.now() + 15 * 1000; // 15 seconds lock
        setLockUntil(unlockTime);
        localStorage.setItem("login_lock_until", String(unlockTime));
        toast.error("Too many failed attempts. Please try again after 15 seconds.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSending(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch {
      // Backend always returns a generic success response for this endpoint
      // (so it can't be used to enumerate accounts) -- a thrown error here
      // means the request itself failed (network/server issue), not "email
      // not found".
      toast.error("Something went wrong. Please try again.");
    } finally {
      setForgotSending(false);
    }
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotEmail("");
    setForgotSent(false);
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* ── Left brand panel (desktop only) ─────────────────────────────── */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-ink-900 px-12 py-12 text-white lg:flex xl:w-[42%]">
        {/* Decorative gradient blobs */}
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
            Run your business,{" "}
            <span className="bg-gradient-to-r from-brand-light to-emerald-300 bg-clip-text text-transparent">
              beautifully.
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            One workspace for billing, inventory, and reporting — built for teams who want speed
            without spreadsheets.
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
          {/* Mobile-only logo (hidden on desktop since the brand panel covers it) */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <Receipt size={22} />
            </div>
            <span className="text-lg font-bold tracking-tight text-ink-900">BillBook</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t("Welcome back")}</h1>
            <p className="mt-1 text-sm text-slate-500">{t("Sign in to your BillBook workspace")}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-12px_rgba(15,23,42,0.12)] sm:p-7"
          >
            {/* Email input field */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("Email")}</label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  disabled={isSubmitting || isLocked}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="Enter your email"
                  className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm transition-all focus:outline-none focus:ring-2 ${
                    emailTouched
                      ? emailError
                        ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100"
                        : "border-emerald-300 bg-emerald-50/20 focus:border-emerald-400 focus:ring-emerald-100"
                      : "border-slate-200 focus:border-brand focus:ring-brand/15"
                  }`}
                />
              </div>
              {emailTouched && emailError && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{emailError}</p>
              )}
            </div>

            {/* Password input field */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600">{t("Password")}</label>
                <button
                  type="button"
                  onClick={handleForgotClick}
                  className="text-xs font-semibold text-brand hover:text-brand-dark hover:underline"
                >
                  {t("Forgot password?")}
                </button>
              </div>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  disabled={isSubmitting || isLocked}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  placeholder="Enter your password"
                  className={`w-full rounded-lg border py-2.5 pl-9 pr-10 text-sm transition-all focus:outline-none focus:ring-2 ${
                    passwordTouched
                      ? passwordError
                        ? "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100"
                        : "border-emerald-300 bg-emerald-50/20 focus:border-emerald-400 focus:ring-emerald-100"
                      : "border-slate-200 focus:border-brand focus:ring-brand/15"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {capsLockOn && (
                <p className="mt-1.5 text-xs font-semibold text-amber-600">⚠ Caps Lock is on</p>
              )}
              {passwordTouched && passwordError && (
                <p className="mt-1.5 text-xs font-medium text-red-500">{passwordError}</p>
              )}
            </div>

            {/* Rate limiting countdown banner */}
            {isLocked && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-center text-xs font-semibold text-red-700">
                Too many failed attempts. Locked for {formatTime(timeLeft)}
              </div>
            )}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={isSubmitting || isLocked}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                t("Signing in…")
              ) : (
                <>
                  {t("Sign in")}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* New business? Set up your workspace link */}
          <p className="mt-5 text-center text-sm text-slate-500">
            {t("New business?")}{" "}
            <Link to="/signup" className="font-semibold text-brand hover:text-brand-dark hover:underline">
              {t("Set up your workspace")}
            </Link>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink-900">
                {forgotSent ? t("Email sent!") : t("Forgot password?")}
              </h2>
              <button onClick={closeForgot} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900 transition-colors">
                <X size={18} />
              </button>
            </div>

            {forgotSent ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 size={28} className="text-emerald-600" />
                </div>
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
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">{t("Email address")}</label>
                  <div className="relative">
                    <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:border-brand focus:ring-brand/15" />
                  </div>
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
