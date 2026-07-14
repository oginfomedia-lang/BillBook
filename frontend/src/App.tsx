// frontend/src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { BranchProvider } from "./context/BranchContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { POSPage } from "./pages/POSPage";
import { SalesLayout } from "./pages/sales/SalesLayout";
import { SalesListPage } from "./pages/sales/SalesListPage";
import { AddSalePage } from "./pages/sales/AddSalePage";
import { SalesReturnsPage } from "./pages/sales/SalesReturnsPage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { CreateQuotationPage } from "./pages/CreateQuotationPage";
import { QuotationsPage } from "./pages/QuotationsPage";
import { QuotationDetailPage } from "./pages/QuotationDetailPage";
import { CustomersPage } from "./pages/CustomersPage";
import { ContactsLayout, ContactsIndexRedirect } from "./pages/contacts/ContactsLayout";
import { SuppliersPage } from "./pages/contacts/SuppliersPage";
import { ImportCustomersPage } from "./pages/contacts/ImportCustomersPage";
import { ImportSuppliersPage } from "./pages/contacts/ImportSuppliersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ItemsPage } from "./pages/ItemsPage";
import { ItemFormPage } from "./pages/ItemFormPage";
import { CategoriesListPage } from "./pages/CategoriesListPage";
import { BrandsListPage } from "./pages/BrandsListPage";
import { VariantsListPage } from "./pages/VariantsListPage";
import { PrintLabelsPage } from "./pages/PrintLabelsPage";
import { ImportItemsPage } from "./pages/ImportItemsPage";
import { ImportServicesPage } from "./pages/ImportServicesPage";
import { UsersPage } from "./pages/UsersPage";
import { RolesPage } from "./pages/RolesPage";
import { AdvancePaymentsList } from "./pages/Advance/AdvancePaymentsList";
import { WarehousesPage } from "./pages/WarehousesPage";
import { PurchaseLayout } from "./pages/purchase/PurchaseLayout";
import { PurchaseListPage } from "./pages/purchase/PurchaseListPage";
import { NewPurchasePage } from "./pages/purchase/NewPurchasePage";
import { PurchaseReturnsListPage } from "./pages/purchase/PurchaseReturnsListPage";
import { NewPurchaseReturnPage } from "./pages/purchase/NewPurchaseReturnPage";
import { CouponFormPage } from "./pages/Coupons/CouponForm";
import { BranchesListPage } from "./pages/Branches/BranchesList";
import { BranchFormPage } from "./pages/Branches/BranchForm";
import { CouponsListPage } from "./pages/Coupons/CouponsList";
import { AccountsLayout } from "./pages/accounts/AccountsLayout";
import { AddAccountPage } from "./pages/accounts/AddAccountPage";
import { AccountsListPage } from "./pages/accounts/AccountsListPage";
import { MoneyTransferListPage } from "./pages/accounts/MoneyTransferListPage";
import { DepositListPage } from "./pages/accounts/DepositListPage";
import { CashTransactionsPage } from "./pages/accounts/CashTransactionsPage";
import { StockLayout } from "./pages/stock/StockLayout";
import { StockAdjustmentListPage } from "./pages/stock/StockAdjustmentListPage";
import { StockTransferListPage } from "./pages/stock/StockTransferListPage";
import { ExpensesLayout } from "./pages/expenses/ExpensesLayout";
import { ExpensesListPage } from "./pages/expenses/ExpensesListPage";
import { ExpenseCategoryListPage } from "./pages/expenses/ExpenseCategoryListPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <BranchProvider>
              <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
              <Routes>
                {/* Public routes - no sidebar */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                {/* Protected routes WITH sidebar */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Sales module */}
                  <Route path="/sales" element={<SalesLayout />}>
                    <Route index element={<SalesListPage />} />
                    <Route path="add" element={<AddSalePage />} />
                    <Route path="pos" element={<POSPage />} />
                    <Route path="returns" element={<SalesReturnsPage />} />
                    <Route path=":id" element={<InvoiceDetailPage />} />
                  </Route>

                  {/* POS shortcut */}
                  <Route path="/pos" element={<Navigate to="/sales/pos" replace />} />

                  {/* Invoices */}
                  <Route path="/invoices" element={<InvoicesPage />} />

                  {/* Quotations */}
                  <Route path="/quotations" element={<QuotationsPage />} />
                  <Route path="/quotations/new" element={<CreateQuotationPage />} />
                  <Route path="/quotations/:id" element={<QuotationDetailPage />} />

                  {/* Contacts module */}
                  <Route path="/contacts" element={<ContactsLayout />}>
                    <Route index element={<ContactsIndexRedirect />} />
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="suppliers" element={<SuppliersPage />} />
                    <Route path="import/customers" element={<ImportCustomersPage />} />
                    <Route path="import/suppliers" element={<ImportSuppliersPage />} />
                  </Route>

                  {/* Branches module */}
                  <Route path="/branches" element={<BranchesListPage />} />
                  <Route path="/branches/new" element={<BranchFormPage />} />
                  <Route path="/branches/:id/edit" element={<BranchFormPage />} />

                  {/* Coupons – top-level */}
                  <Route path="/coupons" element={<CouponsListPage />} />
                  <Route path="/coupons/new" element={<CouponFormPage />} />
                  <Route path="/coupons/:id/edit" element={<CouponFormPage />} />

                  {/* Advance Payments */}
                  <Route path="/advance" element={<AdvancePaymentsList />} />

                  {/* Products */}
                  <Route path="/products" element={<ProductsPage />} />

                  {/* Items Module */}
                  <Route path="/items" element={<ItemsPage />} />
                  <Route path="/items/new" element={<ItemFormPage />} />
                  <Route path="/items/new-service" element={<ItemFormPage isService={true} />} />
                  <Route path="/items/:itemId/edit" element={<ItemFormPage />} />
                  <Route path="/items/categories" element={<CategoriesListPage />} />
                  <Route path="/items/brands" element={<BrandsListPage />} />
                  <Route path="/items/variants" element={<VariantsListPage />} />
                  <Route path="/items/print-labels" element={<PrintLabelsPage />} />
                  <Route path="/items/import" element={<ImportItemsPage />} />
                  <Route path="/items/import-services" element={<ImportServicesPage />} />

                  {/* Warehouses */}
                  <Route path="/warehouses" element={<WarehousesPage />} />

                  {/* Accounts module */}
                  <Route path="/accounts" element={<AccountsLayout />}>
                    <Route index element={<Navigate to="list" replace />} />
                    <Route path="add" element={<AddAccountPage />} />
                    <Route path="list" element={<AccountsListPage />} />
                    <Route path=":id/edit" element={<AddAccountPage editMode={true} />} />
                    <Route path="money-transfers" element={<MoneyTransferListPage />} />
                    <Route path="deposits" element={<DepositListPage />} />
                    <Route path="cash-transactions" element={<CashTransactionsPage />} />
                  </Route>

                  {/* Purchase module */}
                  <Route path="/purchase" element={<PurchaseLayout />}>
                    <Route index element={<Navigate to="list" replace />} />
                    <Route path="list" element={<PurchaseListPage />} />
                    <Route path="new" element={<NewPurchasePage />} />
                    <Route path="returns" element={<PurchaseReturnsListPage />} />
                    <Route path="returns/new" element={<NewPurchaseReturnPage />} />
                    <Route path=":id/edit" element={<NewPurchasePage editMode={true} />} />
                  </Route>

                  {/* Stock module */}
                  <Route path="/stock" element={<StockLayout />}>
                    <Route index element={<Navigate to="adjustments" replace />} />
                    <Route path="adjustments" element={<StockAdjustmentListPage />} />
                    <Route path="transfers" element={<StockTransferListPage />} />
                  </Route>

                  {/* Expenses module */}
                  <Route path="/expenses" element={<ExpensesLayout />}>
                    <Route index element={<Navigate to="list" replace />} />
                    <Route path="list" element={<ExpensesListPage />} />
                    <Route path="categories" element={<ExpenseCategoryListPage />} />
                  </Route>

                  {/* Users */}
                  <Route path="/users" element={<UsersPage />} />

                  {/* Roles */}
                  <Route path="/roles" element={<RolesPage />} />

                  {/* Reports */}
                  <Route path="/reports" element={<ReportsPage />} />

                  {/* Settings */}
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Advance Payments */}
                  <Route path="/advance" element={<AdvancePaymentsList />} />
                </Route>

                {/* Fallback routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BranchProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}