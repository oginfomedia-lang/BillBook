import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useBranch } from "../context/BranchContext";
import * as quotationsApi from "../api/quotations";

export function useQuotations(
  params: { page?: number; search?: string; status?: quotationsApi.QuotationStatus; warehouse_id?: number } = {}
) {
  const { currentBranchId } = useBranch();
  return useQuery({
    queryKey: ["quotations", { ...params, branchId: currentBranchId }],
    queryFn: () => quotationsApi.listQuotations(params),
    placeholderData: (prev) => prev,
  });
}

export function useQuotation(id: number | undefined) {
  return useQuery({
    queryKey: ["quotations", id],
    queryFn: () => quotationsApi.getQuotation(id as number),
    enabled: id !== undefined,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: quotationsApi.createQuotation,
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success(`Quotation ${quotation.quotation_number} created`);
      navigate(`/quotations/${quotation.id}`);
    },
    onError: () => toast.error("Couldn't create the quotation. Please check the data and try again."),
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<quotationsApi.QuotationPayload> }) =>
      quotationsApi.updateQuotation(id, payload),
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success(`Quotation ${quotation.quotation_number} updated`);
    },
    onError: () => toast.error("Couldn't save changes."),
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: quotationsApi.deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Quotation deleted");
    },
    onError: () => toast.error("Couldn't delete quotation."),
  });
}
