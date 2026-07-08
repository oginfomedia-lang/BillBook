// src/api/accounts.ts
import { apiClient } from "./client";
import type { PaginatedResponse } from "../types";

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface Account {
  id: number;
  account_code: string;
  account_name: string;
  parent_id: number | null;
  parent_account_name: string | null;
  opening_balance: number;
  current_balance: number;
  note: string | null;
  created_by: number | null;
  creator_name: string | null;
  created_at: string;
  children?: Account[];
}

export interface AccountPayload {
  account_name: string;
  parent_id?: number | null;
  opening_balance?: number;
  note?: string | null;
}

export interface MoneyTransfer {
  id: number;
  transfer_code: string;
  debit_account_id: number;
  debit_account_name: string | null;
  credit_account_id: number;
  credit_account_name: string | null;
  transfer_date: string | null;
  reference_no: string | null;
  amount: number;
  note: string | null;
  created_by: number | null;
  creator_name: string | null;
  created_at: string;
}

export interface MoneyTransferPayload {
  debit_account_id: number;
  credit_account_id: number;
  amount: number;
  transfer_date?: string | null;
  reference_no?: string | null;
  note?: string | null;
}

export interface Deposit {
  id: number;
  debit_account_id: number | null;
  debit_account_name: string | null;
  credit_account_id: number | null;
  credit_account_name: string | null;
  deposit_date: string | null;
  reference_no: string | null;
  amount: number;
  note: string | null;
  created_by: number | null;
  creator_name: string | null;
  created_at: string;
}

export interface DepositPayload {
  debit_account_id?: number | null;
  credit_account_id?: number | null;
  amount: number;
  deposit_date?: string | null;
  reference_no?: string | null;
  note?: string | null;
}

export interface CashTransaction {
  id: number;
  date: string | null;
  payment_code: string;
  payment_type: string;
  payment: number;
  note: string | null;
  created_by: number | null;
  creator_name: string | null;
  linked_account_id: number | null;
  linked_account_name: string | null;
}

// -------------------------------------------------------------------
// Accounts API
// -------------------------------------------------------------------

export async function listAccounts(
  params: { page?: number; per_page?: number; search?: string } = {}
): Promise<PaginatedResponse<Account>> {
  const { data } = await apiClient.get<PaginatedResponse<Account>>("/accounts", { params });
  return data;
}

export async function getAllAccounts(): Promise<Account[]> {
  const { data } = await apiClient.get<Account[]>("/accounts/all");
  return data;
}

export async function getNextAccountCode(): Promise<string> {
  const { data } = await apiClient.get<{ account_code: string }>("/accounts/next-code");
  return data.account_code;
}

export async function getAccount(id: number): Promise<Account> {
  const { data } = await apiClient.get<Account>(`/accounts/${id}`);
  return data;
}

export async function createAccount(payload: AccountPayload): Promise<Account> {
  const { data } = await apiClient.post<Account>("/accounts", payload);
  return data;
}

export async function updateAccount(id: number, payload: Partial<AccountPayload>): Promise<Account> {
  const { data } = await apiClient.put<Account>(`/accounts/${id}`, payload);
  return data;
}

export async function deleteAccount(id: number): Promise<void> {
  await apiClient.delete(`/accounts/${id}`);
}

// -------------------------------------------------------------------
// Money Transfers API
// -------------------------------------------------------------------

export async function listMoneyTransfers(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    transfer_date?: string;
    debit_account_id?: number;
    credit_account_id?: number;
    created_by?: number;
  } = {}
): Promise<PaginatedResponse<MoneyTransfer>> {
  const { data } = await apiClient.get<PaginatedResponse<MoneyTransfer>>("/money-transfers", { params });
  return data;
}

export async function createMoneyTransfer(payload: MoneyTransferPayload): Promise<MoneyTransfer> {
  const { data } = await apiClient.post<MoneyTransfer>("/money-transfers", payload);
  return data;
}

export async function deleteMoneyTransfer(id: number): Promise<void> {
  await apiClient.delete(`/money-transfers/${id}`);
}

// -------------------------------------------------------------------
// Deposits API
// -------------------------------------------------------------------

export async function listDeposits(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    deposit_date?: string;
    debit_account_id?: number;
    credit_account_id?: number;
    created_by?: number;
  } = {}
): Promise<PaginatedResponse<Deposit>> {
  const { data } = await apiClient.get<PaginatedResponse<Deposit>>("/deposits", { params });
  return data;
}

export async function createDeposit(payload: DepositPayload): Promise<Deposit> {
  const { data } = await apiClient.post<Deposit>("/deposits", payload);
  return data;
}

export async function deleteDeposit(id: number): Promise<void> {
  await apiClient.delete(`/deposits/${id}`);
}

// -------------------------------------------------------------------
// Cash Transactions API
// -------------------------------------------------------------------

export async function listCashTransactions(
  params: {
    page?: number;
    per_page?: number;
    search?: string;
    from_date?: string;
    to_date?: string;
    created_by?: number;
  } = {}
): Promise<PaginatedResponse<CashTransaction>> {
  const { data } = await apiClient.get<PaginatedResponse<CashTransaction>>("/cash-transactions", { params });
  return data;
}

export async function linkCashTransactionToAccount(
  invoiceId: number,
  accountId: number
): Promise<{ message: string; account: Account }> {
  const { data } = await apiClient.post(`/cash-transactions/${invoiceId}/link`, { account_id: accountId });
  return data;
}
