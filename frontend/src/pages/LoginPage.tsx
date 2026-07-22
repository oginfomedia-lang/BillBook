// frontend/src/pages/LoginPage.tsx

import { useState, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Receipt, X, CheckCircle2, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";

// Mock Database definition
const MOCK_DB: Record<string, { password: string; status: "active" | "locked" | "error" }> = {
  "test@test.com": { password: "password123", status: "active" },
  "locked@test.com": { password: "password123", status: "locked" },
  "error@test.com": { password: "password123", status: "error" },
};

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
      alert("Already logged in! Redirecting to dashboard...");
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
    alert("Redirecting to forgot password page...");
    setForgotOpen(true);
  };

  const handleSignupClick = (e: FormEvent) => {
    e.preventDefault();
    alert("Redirecting to workspace setup...");
    navigate("/signup");
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
    await new Promise((r) => setTimeout(r, 1200)); // simulate API call
    setForgotSending(false);
    setForgotSent(true);
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotEmail("");
    setForgotSent(false);
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

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Email input field */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Email")}</label>
            <input
              type="text"
              disabled={isSubmitting || isLocked}
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="Enter your email"
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-all ${
                emailTouched
                  ? emailError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50/20"
                    : "border-green-500 focus:border-green-500 focus:ring-green-200 bg-green-50/10"
                  : "border-slate-200 focus:ring-brand"
              }`}
            />
            {emailTouched && emailError && (
              <p className="mt-1 text-xs text-red-500 font-medium">{emailError}</p>
            )}
          </div>

          {/* Password input field */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Password")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                disabled={isSubmitting || isLocked}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyDown}
                placeholder="Enter your password"
                className={`w-full rounded-md border pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 transition-all ${
                  passwordTouched
                    ? passwordError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50/20"
                      : "border-green-500 focus:border-green-500 focus:ring-green-200 bg-green-50/10"
                    : "border-slate-200 focus:ring-brand"
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
              <p className="mt-1 text-xs text-amber-600 font-semibold">⚠️ Caps Lock is on</p>
            )}
            {passwordTouched && passwordError && (
              <p className="mt-1 text-xs text-red-500 font-medium">{passwordError}</p>
            )}
          </div>

          {/* Rate limiting countdown banner */}
          {isLocked && (
            <div className="rounded-lg bg-red-50 p-2.5 text-center text-xs font-semibold text-red-700 border border-red-100">
              Too many failed attempts. Locked for {formatTime(timeLeft)}
            </div>
          )}

          {/* Sign in button */}
          <button
            type="submit"
            disabled={isSubmitting || isLocked}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? t("Signing in…") : t("Sign in")}
          </button>

          {/* Forgot password link */}
          <p className="text-center">
            <button
              type="button"
              onClick={handleForgotClick}
              className="text-xs font-medium text-brand hover:underline"
            >
              {t("Forgot password?")}
            </button>
          </p>
        </form>

        {/* New business? Set up your workspace link */}
        <p className="mt-4 text-center text-sm text-slate-500">
          {t("New business?")}{" "}
          <a
            href="/signup"
            onClick={handleSignupClick}
            className="font-medium text-brand hover:underline"
          >
            {t("Set up your workspace")}
          </a>
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