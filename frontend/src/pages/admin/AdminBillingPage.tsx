import { useState } from "react";
import { useAdminTenantLicenses, useAdminAssignPlan, usePlans } from "../../hooks/useBilling";
import { Modal } from "../../components/ui/Modal";

export function AdminBillingPage() {
    const { data: rows, isLoading } = useAdminTenantLicenses();
    const { data: plans } = usePlans();
    const assignPlan = useAdminAssignPlan();

    const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
    const [form, setForm] = useState({
        plan_id: "",
        amc_valid_until: "",
        status: "active" as "active" | "suspended",
    });

    const openAssignModal = (
        tenantId: number,
        currentPlanId?: number,
        amc?: string | null,
        status?: string
    ) => {
        setEditingTenantId(tenantId);
        setForm({
            plan_id: currentPlanId ? String(currentPlanId) : "",
            amc_valid_until: amc ?? "",
            status: (status as "active" | "suspended") ?? "active",
        });
    };

    const handleSubmit = async () => {
        if (editingTenantId === null || !form.plan_id) return;
        await assignPlan.mutateAsync({
            tenant_id: editingTenantId,
            plan_id: Number(form.plan_id),
            amc_valid_until: form.amc_valid_until || null,
            status: form.status,
        });
        setEditingTenantId(null);
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-ink-900">Tenant Billing (Platform Admin)</h1>
                <p className="text-sm text-slate-500">
                    Manually assign or override any tenant's plan — for offline / phone / bank-transfer sales.
                </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <table className="w-full min-w-[720px] text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            <th className="px-4 py-3">Tenant</th>
                            <th className="px-4 py-3">Plan</th>
                            <th className="px-4 py-3">AMC valid until</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
                        ) : (
                            rows?.map((row) => (
                                <tr key={row.tenant.id} className="border-b border-slate-100 last:border-0">
                                    <td className="px-4 py-3 font-medium text-ink-900">{row.tenant.company_name}</td>
                                    <td className="px-4 py-3">{row.license?.plan?.name ?? "— no plan —"}</td>
                                    <td className="px-4 py-3">{row.license?.amc_valid_until ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${row.license?.status === "suspended"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-green-100 text-green-700"
                                                }`}
                                        >
                                            {row.license?.status ?? "none"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() =>
                                                openAssignModal(
                                                    row.tenant.id,
                                                    row.license?.plan?.id,
                                                    row.license?.amc_valid_until,
                                                    row.license?.status
                                                )
                                            }
                                            className="rounded-md px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand-light"
                                        >
                                            Assign / Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={editingTenantId !== null} onClose={() => setEditingTenantId(null)} title="Assign plan">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Plan</label>
                        <select
                            value={form.plan_id}
                            onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="">Select a plan…</option>
                            {plans?.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} — ₹{p.price.toLocaleString("en-IN")}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">AMC valid until</label>
                        <input
                            type="date"
                            value={form.amc_valid_until}
                            onChange={(e) => setForm({ ...form, amc_valid_until: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">Status</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "suspended" })}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setEditingTenantId(null)}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!form.plan_id}
                            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}