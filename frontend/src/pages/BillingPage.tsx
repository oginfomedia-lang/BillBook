import { useState } from "react";
import { Check, ShieldAlert } from "lucide-react";
import { usePlans, useLicense, useCreateCheckoutOrder, useVerifyPayment } from "../hooks/useBilling";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export function BillingPage() {
  const { user } = useAuth();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: licenseData, isLoading: licenseLoading } = useLicense();
  const createOrder = useCreateCheckoutOrder();
  const verifyPayment = useVerifyPayment();
  const [payingPlanId, setPayingPlanId] = useState<number | null>(null);

  const currentPlanId = licenseData?.license?.plan?.id ?? null;
  const usage = licenseData?.usage;
  const amcExpired = licenseData?.license?.amc_expired;

  const handleUpgrade = async (planId: number) => {
    setPayingPlanId(planId);
    try {
      const order = await createOrder.mutateAsync(planId);

      const razorpay = new (window as any).Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "BillBook",
        description: `${order.plan.name} plan license`,
        order_id: order.order_id,
        prefill: { name: user?.name, email: user?.email },
        handler: async (response: any) => {
          await verifyPayment.mutateAsync({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          setPayingPlanId(null);
        },
        modal: { ondismiss: () => setPayingPlanId(null) },
        theme: { color: "#0D9488" },
      });
      razorpay.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setPayingPlanId(null);
      });
      razorpay.open();
    } catch {
      setPayingPlanId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">Plan &amp; Billing</h1>
        <p className="text-sm text-slate-500">Manage your BillBook license, branches and user limits.</p>
      </div>

      {amcExpired && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert size={16} />
          Your Annual Maintenance (AMC) has lapsed. Renew to keep receiving support and updates
          — your app keeps working either way.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-ink-900">Current usage</h2>
        {licenseLoading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UsageBar
              label="Branches"
              used={usage?.branch_count ?? 0}
              limit={licenseData?.license?.plan?.max_branches ?? null}
            />
            <UsageBar
              label="Users"
              used={usage?.user_count ?? 0}
              limit={licenseData?.license?.plan?.max_users ?? null}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {plansLoading ? (
          <p className="text-sm text-slate-400">Loading plans…</p>
        ) : (
          plans?.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  isCurrent ? "border-brand ring-2 ring-brand/20" : "border-slate-200/80"
                }`}
              >
                <h3 className="text-lg font-bold text-ink-900">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-ink-900">
                  ₹{plan.price.toLocaleString("en-IN")}
                  <span className="text-sm font-normal text-slate-400"> one-time</span>
                </p>
                <p className="text-xs text-slate-500">
                  + ₹{plan.amc_price.toLocaleString("en-IN")}/year AMC
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" />
                    {plan.max_branches === null ? "Unlimited branches" : `Up to ${plan.max_branches} branches`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500" />
                    {plan.max_users === null ? "Unlimited users" : `Up to ${plan.max_users} users`}
                  </li>
                </ul>
                <button
                  disabled={isCurrent || payingPlanId === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                  className="mt-4 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {isCurrent ? "Current plan" : payingPlanId === plan.id ? "Processing…" : "Upgrade"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        <span>{limit === null ? `${used} / Unlimited` : `${used} / ${limit}`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-brand"}`}
          style={{ width: limit === null ? "8%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}