// frontend/src/components/DemoBanner.tsx
//
// Persistent banner shown across the authenticated app shell for demo
// tenants, with a live countdown to expiry. Renders nothing for non-demo
// users.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { useDemoMode } from "../hooks/useDemoMode";
import { useTranslation } from "../context/LanguageContext";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0h 0m";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

export function DemoBanner() {
  const { isDemo, expiresAt } = useDemoMode();
  const { t } = useTranslation();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isDemo) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [isDemo]);

  if (!isDemo || !expiresAt) return null;

  const remainingMs = expiresAt.getTime() - now;
  const expired = remainingMs <= 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <span className="inline-flex items-center gap-1.5">
        <Clock size={14} />
        {expired
          ? t("Your demo has expired")
          : `${t("Demo mode")} — ${t("expires in")} ${formatRemaining(remainingMs)}`}
      </span>
      <Link
        to="/signup"
        className="rounded-md bg-white/20 px-2.5 py-1 font-semibold underline decoration-white/50 underline-offset-2 hover:bg-white/30 hover:decoration-white"
      >
        {t("Sign up for a free account")}
      </Link>
    </div>
  );
}
