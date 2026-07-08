// src/hooks/useAccounts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as accountsApi from "../api/accounts";

// -------------------------------------------------------------------
// Accounts Hooks
// -------------------------------------------------------------------

export function useAccounts(params: { page?: number; per_page?: number; search?: string } = {}) {
  return useQuery({
    queryKey: ["accounts", params],
    queryFn: () => accountsApi.listAccounts(params),
    placeholderData: (prev) => prev,
  });
}

export function useAllAccounts() {
  return useQuery({
    queryKey: ["accounts", "all"],
    queryFn: accountsApi.getAllAccounts,
  });
}

export function useNextAccountCode() {
  return useQuery({
    queryKey: ["accounts", "next-code"],
    queryFn: accountsApi.getNextAccountCode,
  });
}

export function useAccount(id: number | undefined) {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => accountsApi.getAccount(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to create account");
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<accountsApi.AccountPayload> }) =>
      accountsApi.updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to update account");
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account deleted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete account");
    },
  });
}

// -------------------------------------------------------------------
// Money Transfers Hooks
// -------------------------------------------------------------------

export function useMoneyTransfers(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    transfer_date?: string;
    debit_account_id?: number;
    credit_account_id?: number;
    created_by?: number;
  } = {}
) {
  return useQuery({
    queryKey: ["money-transfers", params],
    queryFn: () => accountsApi.listMoneyTransfers(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateMoneyTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.createMoneyTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["money-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transfer created!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to create transfer");
    },
  });
}

export function useDeleteMoneyTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.deleteMoneyTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["money-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Transfer deleted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete transfer");
    },
  });
}

// -------------------------------------------------------------------
// Deposits Hooks
// -------------------------------------------------------------------

export function useDeposits(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    deposit_date?: string;
    debit_account_id?: number;
    credit_account_id?: number;
    created_by?: number;
  } = {}
) {
  return useQuery({
    queryKey: ["deposits", params],
    queryFn: () => accountsApi.listDeposits(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.createDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Deposit recorded!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to record deposit");
    },
  });
}

export function useDeleteDeposit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.deleteDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Deposit deleted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete deposit");
    },
  });
}

// -------------------------------------------------------------------
// Cash Transactions Hooks
// -------------------------------------------------------------------

export function useCashTransactions(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    from_date?: string;
    to_date?: string;
    created_by?: number;
  } = {}
) {
  return useQuery({
    queryKey: ["cash-transactions", params],
    queryFn: () => accountsApi.listCashTransactions(params),
    placeholderData: (prev) => prev,
  });
}

export function useLinkCashTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, accountId }: { invoiceId: number; accountId: number }) =>
      accountsApi.linkCashTransactionToAccount(invoiceId, accountId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(res.message);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to link account");
    },
  });
}
