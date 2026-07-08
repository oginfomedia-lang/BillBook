import { apiClient } from "./client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdjustmentItem {
  id?: number;
  item_id: number;
  item_name?: string;
  item_code?: string;
  quantity: number;
  unit_cost?: number | null;
}

export interface StockAdjustment {
  id: number;
  reference_no: string | null;
  adjustment_date: string;
  warehouse_id: number | null;
  warehouse: { id: number; name: string } | null;
  adjustment_type: "addition" | "subtraction";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  item_count: number;
  items?: AdjustmentItem[];
}

export interface TransferItem {
  id?: number;
  item_id: number;
  item_name?: string;
  item_code?: string;
  quantity: number;
}

export interface StockTransfer {
  id: number;
  transfer_date: string;
  from_warehouse_id: number;
  from_warehouse: string | null;
  to_warehouse_id: number;
  to_warehouse: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  item_count: number;
  total_quantity: number;
  items?: TransferItem[];
}

export interface PaginatedAdjustments {
  adjustments: StockAdjustment[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export interface PaginatedTransfers {
  transfers: StockTransfer[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

// ─── Stock Adjustment API ─────────────────────────────────────────────────────

export const listAdjustments = async (
  params: { page?: number; per_page?: number; search?: string; warehouse_id?: number } = {}
): Promise<PaginatedAdjustments> => {
  const { data } = await apiClient.get("/stock/adjustments", { params });
  return data;
};

export const getAdjustment = async (id: number): Promise<StockAdjustment> => {
  const { data } = await apiClient.get(`/stock/adjustments/${id}`);
  return data;
};

export const createAdjustment = async (payload: {
  reference_no?: string;
  adjustment_date?: string;
  warehouse_id?: number | null;
  adjustment_type?: string;
  notes?: string;
  items: { item_id: number; quantity: number; unit_cost?: number }[];
}): Promise<StockAdjustment> => {
  const { data } = await apiClient.post("/stock/adjustments", payload);
  return data;
};

export const updateAdjustment = async (
  id: number,
  payload: Partial<Parameters<typeof createAdjustment>[0]>
): Promise<StockAdjustment> => {
  const { data } = await apiClient.put(`/stock/adjustments/${id}`, payload);
  return data;
};

export const deleteAdjustment = async (id: number): Promise<void> => {
  await apiClient.delete(`/stock/adjustments/${id}`);
};

// ─── Stock Transfer API ───────────────────────────────────────────────────────

export const listTransfers = async (
  params: { page?: number; per_page?: number; search?: string } = {}
): Promise<PaginatedTransfers> => {
  const { data } = await apiClient.get("/stock/transfers", { params });
  return data;
};

export const getTransfer = async (id: number): Promise<StockTransfer> => {
  const { data } = await apiClient.get(`/stock/transfers/${id}`);
  return data;
};

export const createTransfer = async (payload: {
  transfer_date?: string;
  from_warehouse_id: number;
  to_warehouse_id: number;
  notes?: string;
  items: { item_id: number; quantity: number }[];
}): Promise<StockTransfer> => {
  const { data } = await apiClient.post("/stock/transfers", payload);
  return data;
};

export const updateTransfer = async (
  id: number,
  payload: Partial<Parameters<typeof createTransfer>[0]>
): Promise<StockTransfer> => {
  const { data } = await apiClient.put(`/stock/transfers/${id}`, payload);
  return data;
};

export const deleteTransfer = async (id: number): Promise<void> => {
  await apiClient.delete(`/stock/transfers/${id}`);
};
