
import { useState } from "react";
import { useValidateCoupon } from "../../hooks/useCoupons";
import { useTranslation } from "../../context/LanguageContext";
import { CheckCircle2, XCircle, Loader2, Gift } from "lucide-react";

interface CouponInputProps {
  customerId: number | null;
  subtotal: number;
  onCouponApplied: (coupon: any, discount: number) => void;
  onCouponRemoved: () => void;
  initialCode?: string;
}

export function CouponInput({
  customerId,
  subtotal,
  onCouponApplied,
  onCouponRemoved,
  initialCode = "",
}: CouponInputProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState(initialCode);
  const [appliedCode, setAppliedCode] = useState<string | null>(initialCode || null);
  const [error, setError] = useState("");
  const [validationResult, setValidationResult] = useState<{
    coupon: any;
    discount: number;
    message: string;
  } | null>(null);

  const validateCoupon = useValidateCoupon();

  const handleApply = () => {
    if (!code.trim()) {
      setError(t("Please enter a coupon code"));
      return;
    }
    if (!customerId) {
      setError(t("Please select a customer first"));
      return;
    }
    if (subtotal <= 0) {
      setError(t("Subtotal must be greater than 0"));
      return;
    }

    setError("");
    validateCoupon.mutate(
      { code: code.trim().toUpperCase(), customer_id: customerId, subtotal },
      {
        onSuccess: (data) => {
          if (data.valid) {
            setAppliedCode(data.coupon.code);
            setValidationResult(data);
            onCouponApplied(data.coupon, data.discount);
            setError("");
          } else {
            setError(t("Invalid coupon code"));
          }
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || t("Invalid coupon code");
          setError(msg);
          setAppliedCode(null);
          setValidationResult(null);
          onCouponRemoved();
        },
      }
    );
  };

  const handleRemove = () => {
    setCode("");
    setAppliedCode(null);
    setValidationResult(null);
    setError("");
    onCouponRemoved();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("Enter coupon code")}
            disabled={!!appliedCode || validateCoupon.isPending}
            className="w-full rounded-md border border-slate-200 px-9 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50 font-mono uppercase"
          />
        </div>
        {!appliedCode ? (
          <button
            type="button"
            onClick={handleApply}
            disabled={validateCoupon.isPending || !code.trim() || !customerId}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
          >
            {validateCoupon.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            {t("Apply")}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 whitespace-nowrap"
          >
            {t("Remove")}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-danger">
          <XCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {validationResult && (
        <div className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 size={14} />
          <span>
            {validationResult.message}
            {validationResult.coupon.type === "percentage" && ` (${validationResult.coupon.value}% off)`}
          </span>
        </div>
      )}
    </div>
  );
}