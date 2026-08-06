// frontend/src/components/DemoGuard.tsx
//
// Wraps something that should be unavailable in demo mode. Mirrors the
// existing PlatformAdminRoute.tsx idiom (read auth/demo state, conditionally
// render) rather than introducing a new pattern.

import { cloneElement, isValidElement, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDemoMode } from "../hooks/useDemoMode";
import { useTranslation } from "../context/LanguageContext";

const DEMO_DISABLED_MESSAGE = "Disabled in demo — sign up to unlock";

interface DemoGuardProps {
  children: ReactNode;
  /**
   * "disable" (default) -- for a single interactive element (a delete
   * button, etc.): keeps it visible but overrides its click handler to
   * show a toast instead, dims it, and adds a tooltip. `children` must be
   * a single React element.
   * "hide" -- for nav entries/menu items: renders nothing at all.
   * "page" -- for routed pages: renders a demo-specific "not available"
   * screen instead of the page.
   */
  mode?: "disable" | "hide" | "page";
}

export function DemoGuard({ children, mode = "disable" }: DemoGuardProps) {
  const { isDemo } = useDemoMode();
  const { t } = useTranslation();

  if (!isDemo) return <>{children}</>;

  if (mode === "hide") return null;

  if (mode === "page") return <DemoLockedPage />;

  if (!isValidElement(children)) return <>{children}</>;

  const element = children as ReactElement<any>;
  return cloneElement(element, {
    onClick: (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toast(t(DEMO_DISABLED_MESSAGE), { icon: "🔒" });
    },
    disabled: true,
    title: t(DEMO_DISABLED_MESSAGE),
    className: `${element.props.className || ""} opacity-40 cursor-not-allowed`.trim(),
  });
}

function DemoLockedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6 py-16">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-50 shadow-inner">
        <Lock className="text-amber-500" size={38} strokeWidth={1.5} />
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">{t("Not available in demo")}</h1>
      <p className="text-sm text-slate-500 max-w-sm mb-8">
        {t("This section is disabled for demo accounts. Sign up for a full account to unlock it.")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
        >
          {t("Go Back")}
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark transition-colors"
        >
          {t("Sign up for a free account")}
        </button>
      </div>
    </div>
  );
}
