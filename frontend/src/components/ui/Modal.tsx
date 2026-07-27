import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../../context/LanguageContext";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }: ModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-scaleIn`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
          <h2 className="text-lg font-bold tracking-tight text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink-900"
            aria-label={t("Close")}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}