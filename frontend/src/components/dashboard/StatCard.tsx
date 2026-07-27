import type { LucideIcon } from "lucide-react";

type Tone = "purple" | "red" | "green" | "navy" | "brand" | "warn" | "success" | "ink";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  tone?: Tone;
}

const TONE_STYLES: Record<Tone, { card: string; icon: string; shadow: string }> = {
  purple:  { card: "bg-gradient-to-br from-violet-600 to-purple-500 text-white",  icon: "bg-white/20 text-white", shadow: "shadow-lg shadow-violet-500/20" },
  red:     { card: "bg-gradient-to-br from-red-600 to-rose-400 text-white",        icon: "bg-white/20 text-white", shadow: "shadow-lg shadow-rose-500/20" },
  green:   { card: "bg-gradient-to-br from-emerald-600 to-teal-400 text-white",    icon: "bg-white/20 text-white", shadow: "shadow-lg shadow-emerald-500/20" },
  navy:    { card: "bg-gradient-to-br from-slate-800 to-blue-700 text-white",      icon: "bg-white/20 text-white", shadow: "shadow-lg shadow-blue-900/20" },
  brand:   { card: "bg-white border border-slate-200/80",                          icon: "bg-brand-light text-brand-dark", shadow: "shadow-sm" },
  warn:    { card: "bg-white border border-slate-200/80",                          icon: "bg-warn-light text-warn", shadow: "shadow-sm" },
  success: { card: "bg-white border border-slate-200/80",                         icon: "bg-success-light text-success", shadow: "shadow-sm" },
  ink:     { card: "bg-white border border-slate-200/80",                         icon: "bg-slate-100 text-ink-700", shadow: "shadow-sm" },
};

export function StatCard({ label, value, sublabel, icon: Icon, tone = "ink" }: StatCardProps) {
  const styles = TONE_STYLES[tone];
  const isColored = ["purple", "red", "green", "navy"].includes(tone);

  return (
    <div
      className={`rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl ${styles.card} ${styles.shadow}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold tracking-widest uppercase ${isColored ? "text-white/80" : "text-slate-500"}`}>
            {label}
          </p>
          <p className={`figures mt-2 text-3xl font-bold leading-none ${isColored ? "text-white" : "text-ink-900"}`}>
            {value}
          </p>
          {sublabel && (
            <p className={`mt-1 text-xs ${isColored ? "text-white/70" : "text-slate-400"}`}>{sublabel}</p>
          )}
        </div>
        <div className={`ml-3 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
