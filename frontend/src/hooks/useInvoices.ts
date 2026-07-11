import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useBranch } from "../context/BranchContext";
import * as invoicesApi from "../api/invoices";
import type { InvoiceStatus } from "../types";

export function useInvoices(
  params: { page?: number; search?: string; status?: InvoiceStatus; branch_id?: number } = {}
) {
  const { currentBranchId } = useBranch();
  return useQuery({
    queryKey: ["invoices", { ...params, branchId: currentBranchId }],
    queryFn: () => invoicesApi.listInvoices(params),
    placeholderData: (prev) => prev,
  });
}

export function useInvoice(id: number | undefined) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => invoicesApi.getInvoice(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: invoicesApi.createInvoice,
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Invoice ${invoice.invoice_number} created`);
      navigate(`/invoices/${invoice.id}`);
    },
    onError: () => toast.error("Couldn't create the invoice. Check the line items and try again."),
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<invoicesApi.InvoicePayload> }) =>
      invoicesApi.updateInvoice(id, payload),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Invoice ${invoice.invoice_number} updated`);
    },
    onError: () => toast.error("Couldn't save changes."),
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoicesApi.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Invoice deleted");
    },
    onError: () => toast.error("Couldn't delete invoice."),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      invoicesApi.recordPayment(id, amount),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Payment recorded for ${invoice.invoice_number}`);
    },
    onError: () => toast.error("Couldn't record payment."),
  });
}