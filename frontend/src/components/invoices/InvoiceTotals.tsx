import { useEffect, useState } from "react";
import type { InvoiceItem } from "../../types";
import { formatMoney } from "../../utils/format";
import { useTranslation } from "../../context/LanguageContext";

interface InvoiceTotalsProps {
  items: InvoiceItem[];
  discountType: "flat" | "percent";
  discountValue: number;
  onDiscountTypeChange: (type: "flat" | "percent") => void;
  onDiscountValueChange: (value: number) => void;
  couponDiscount?: number;
}

/**
 * Mirrors the backend's Invoice.recalculate_totals() so the user sees
 * accurate numbers instantly while typing. The backend remains the
 * authoritative source — this is purely for UX responsiveness.
 */
export function InvoiceTotals({
  items,
  discountType,
  discountValue,
  onDiscountTypeChange,
  onDiscountValueChange,
  couponDiscount = 0,
}: InvoiceTotalsProps) {
  const { t } = useTranslation();
  const [discountInput, setDiscountInput] = useState(String(discountValue));

  useEffect(() => {
    setDiscountInput(String(discountValue));
  }, [discountValue]);

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const taxTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price * (item.tax_rate / 100),
    0
  );
  const manualDiscount = discountType === "percent" ? subtotal * (discountValue / 100) : discountValue;
  const couponDisc = couponDiscount || 0;
  const totalDiscount = Math.min(manualDiscount + couponDisc, subtotal);
  const grandTotal = subtotal + taxTotal - totalDiscount;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{t("Subtotal")}</span>
          <span className="figures font-medium text-ink-900">{formatMoney(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">{t("Tax")}</span>
          <span className="figures font-medium text-ink-900">{formatMoney(taxTotal)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-500">{t("Discount")}</span>
          <div className="flex items-center gap-1.5">
            <select
              value={discountType}
              onChange={(e) => onDiscountTypeChange(e.target.value as "flat" | "percent")}
              className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs"
            >
              <option value="flat">₹</option>
              <option value="percent">%</option>
            </select>
            <input
              type="number"
              min={0}
              step="0.01"
              value={discountInput}
              onChange={(e) => {
                const nextValue = e.target.value;
                setDiscountInput(nextValue);
                const parsed = Number(nextValue);
                if (nextValue === "") {
                  onDiscountValueChange(0);
                } else if (!Number.isNaN(parsed)) {
                  onDiscountValueChange(parsed);
                }
              }}
              className="figures w-20 rounded-md border border-slate-200 px-2 py-1 text-right text-sm"
              placeholder={t("Discount value")}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-base">
          <span className="font-semibold text-ink-900">{t("Total")}</span>
          <span className="figures font-semibold text-ink-900">{formatMoney(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}