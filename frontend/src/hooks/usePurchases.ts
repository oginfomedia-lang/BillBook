// frontend/src/hooks/usePurchases.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBranch } from "../context/BranchContext";
import * as purchasesApi from "../api/purchases";
import type { Purchase, PurchaseStats, PurchasePayload, PurchasePaymentType } from "../api/purchases";

// ============================================================
// Purchase Hooks
// ============================================================

export const usePurchases = (params: {
    page?: number;
    per_page?: number;
    search?: string;
    warehouse_id?: number;
    status?: string;
    payment_status?: string;
} = {}) => {
    const { currentBranchId } = useBranch();
    return useQuery({
        queryKey: ["purchases", { ...params, branchId: currentBranchId }],
        queryFn: () => purchasesApi.listPurchases(params),
        placeholderData: (prev) => prev,
    });
};

export const usePurchase = (id: number | undefined) => {
    return useQuery({
        queryKey: ["purchases", id],
        queryFn: () => purchasesApi.getPurchase(id as number),
        enabled: !!id,
    });
};

export const usePurchaseStats = (params?: { warehouse_id?: number }) => {
    const { currentBranchId } = useBranch();
    return useQuery({
        queryKey: ["purchases", "stats", { ...params, branchId: currentBranchId }],
        queryFn: () => purchasesApi.getPurchaseStats(params),
        placeholderData: (prev) => prev,
    });
};

export const useCreatePurchase = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: PurchasePayload) => purchasesApi.createPurchase(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            queryClient.invalidateQueries({ queryKey: ["purchases", "stats"] });
        },
    });
};

export const useUpdatePurchase = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<PurchasePayload> }) =>
            purchasesApi.updatePurchase(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            queryClient.invalidateQueries({ queryKey: ["purchases", variables.id] });
            queryClient.invalidateQueries({ queryKey: ["purchases", "stats"] });
        },
    });
};

export const useDeletePurchase = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => purchasesApi.deletePurchase(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            queryClient.invalidateQueries({ queryKey: ["purchases", "stats"] });
        },
    });
};

// ============================================================
// Purchase Payment Hooks
// ============================================================

export const useAddPurchasePayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            purchaseId,
            data
        }: {
            purchaseId: number;
            data: {
                amount: number;
                payment_type: PurchasePaymentType;
                account?: string | null;
                payment_note?: string | null;
                payment_date?: string | null;
            }
        }) => purchasesApi.addPurchasePayment(purchaseId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["purchases", variables.purchaseId] });
            queryClient.invalidateQueries({ queryKey: ["purchases", "stats"] });
        },
    });
};

export const useDeletePurchasePayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ purchaseId, paymentId }: { purchaseId: number; paymentId: number }) =>
            purchasesApi.deletePurchasePayment(purchaseId, paymentId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["purchases", variables.purchaseId] });
            queryClient.invalidateQueries({ queryKey: ["purchases", "stats"] });
        },
    });
};

// ============================================================
// Purchase Return Hooks
// ============================================================

export const usePurchaseReturns = (params: {
    page?: number;
    per_page?: number;
    search?: string;
    warehouse_id?: number;
    status?: string;
} = {}) => {
    return useQuery({
        queryKey: ["purchase-returns", params],
        queryFn: () => purchasesApi.listPurchaseReturns(params),
        placeholderData: (prev) => prev,
    });
};

export const usePurchaseReturnStats = (params?: { warehouse_id?: number }) => {
    return useQuery({
        queryKey: ["purchase-returns", "stats", params],
        queryFn: () => purchasesApi.getPurchaseReturnStats(params),
        placeholderData: (prev) => prev,
    });
};

export const useCreatePurchaseReturn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => purchasesApi.createPurchaseReturn(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-returns", "stats"] });
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
        },
    });
};

export const useDeletePurchaseReturn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => purchasesApi.deletePurchaseReturn(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchase-returns"] });
            queryClient.invalidateQueries({ queryKey: ["purchase-returns", "stats"] });
        },
    });
};