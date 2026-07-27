import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface CountCardProps {
  label: string;
  count: number;
  icon: LucideIcon;
  to?: string;
  iconBg: string; // tailwind classes e.g. "bg-blue-100 text-blue-600"
}

export function CountCard({ label, count, icon: Icon, to, iconBg }: CountCardProps) {
  const inner = (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 cursor-pointer">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="figures text-3xl font-bold text-ink-900 leading-none">{count}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      </div>
    </div>
  );

  if (to) return <Link to={to}>{inner}</Link>;
  return inner;
}
