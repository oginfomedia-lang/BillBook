import { apiClient } from "./client";
import type { Plan, BillingLicenseResponse, CheckoutOrderResponse, TenantLicense, Tenant } from "../types";

export async function listPlans() {
    const { data } = await apiClient.get<Plan[]>("/billing/plans");
    return data;
}

export async function getLicense() {
    const { data } = await apiClient.get<BillingLicenseResponse>("/billing/license");
    return data;
}

export async function createCheckoutOrder(planId: number) {
    const { data } = await apiClient.post<CheckoutOrderResponse>("/billing/checkout/order", { plan_id: planId });
    return data;
}

export interface VerifyPaymentPayload {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

export async function verifyPayment(payload: VerifyPaymentPayload) {
    const { data } = await apiClient.post<{ status: string; license: TenantLicense | null }>(
        "/billing/checkout/verify",
        payload
    );
    return data;
}

// ── Platform-admin only ─────────────────────────────────────────────────
export interface AdminTenantLicenseRow {
    tenant: Tenant;
    license: TenantLicense | null;
}

export async function adminListTenantLicenses() {
    const { data } = await apiClient.get<AdminTenantLicenseRow[]>("/billing/admin/tenants");
    return data;
}

export interface AdminAssignPlanPayload {
    tenant_id: number;
    plan_id: number;
    amc_valid_until?: string | null;
    status?: "active" | "suspended";
}

export async function adminAssignPlan(payload: AdminAssignPlanPayload) {
    const { data } = await apiClient.post<TenantLicense>("/billing/admin/assign", payload);
    return data;
}