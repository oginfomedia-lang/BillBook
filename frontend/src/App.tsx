// frontend/src/App.tsx

import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { BranchProvider } from "./context/BranchContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PermissionRoute } from "./components/PermissionRoute";
import { NotFoundPage } from "./components/NotFoundPage";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
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
import { BillingPage } from "./pages/BillingPage";
import { AdminBillingPage } from "./pages/admin/AdminBillingPage";
import { PlatformAdminRoute } from "./components/PlatformAdminRoute";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Safety net: the real invoice detail route is /sales/:id (nested under
// SalesLayout) — /invoices/:id was never a registered route and 404'd.
function InvoiceDetailRedirect() {
  const { id } = useParams();
  return <Navigate to={`/sales/${id}`} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <BranchProvider>
              <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected routes WITH sidebar */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Sales */}
                  <Route path="/sales" element={<SalesLayout />}>
                    <Route index element={<PermissionRoute permission="sales.view"><SalesListPage /></PermissionRoute>} />
                    <Route path="add" element={<PermissionRoute permission="sales.create"><AddSalePage /></PermissionRoute>} />
                    <Route path="pos" element={<PermissionRoute permission="sales.create"><POSPage /></PermissionRoute>} />
                    <Route path="returns" element={<PermissionRoute permission="sales.view"><SalesReturnsPage /></PermissionRoute>} />
                    <Route path=":id" element={<PermissionRoute permission="sales.view"><InvoiceDetailPage /></PermissionRoute>} />
                  </Route>

                  {/* POS shortcut */}
                  <Route path="/pos" element={<Navigate to="/sales/pos" replace />} />

                  {/* Invoices */}
                  <Route path="/invoices" element={<PermissionRoute permission="sales.view"><InvoicesPage /></PermissionRoute>} />
                  <Route path="/invoices/:id" element={<InvoiceDetailRedirect />} />

                  {/* Quotations */}
                  <Route path="/quotations" element={<PermissionRoute permission="sales.view"><QuotationsPage /></PermissionRoute>} />
                  <Route path="/quotations/new" element={<PermissionRoute permission="sales.create"><CreateQuotationPage /></PermissionRoute>} />
                  <Route path="/quotations/:id" element={<PermissionRoute permission="sales.view"><QuotationDetailPage /></PermissionRoute>} />

                  {/* Contacts */}
                  <Route path="/contacts" element={<ContactsLayout />}>
                    <Route index element={<ContactsIndexRedirect />} />
                    <Route path="customers" element={<PermissionRoute permission="customers.view"><CustomersPage /></PermissionRoute>} />
                    <Route path="suppliers" element={<PermissionRoute permission="suppliers.view"><SuppliersPage /></PermissionRoute>} />
                    <Route path="import/customers" element={<PermissionRoute permission="customers.create"><ImportCustomersPage /></PermissionRoute>} />
                    <Route path="import/suppliers" element={<PermissionRoute permission="suppliers.create"><ImportSuppliersPage /></PermissionRoute>} />
                  </Route>

                  {/* Branches */}
                  <Route path="/branches" element={<PermissionRoute permission="branches.view"><BranchesListPage /></PermissionRoute>} />
                  <Route path="/branches/new" element={<PermissionRoute permission="branches.create"><BranchFormPage /></PermissionRoute>} />
                  <Route path="/branches/:id/edit" element={<PermissionRoute permission="branches.edit"><BranchFormPage /></PermissionRoute>} />

                  {/* Coupons */}
                  <Route path="/coupons" element={<PermissionRoute permission="coupons.view"><CouponsListPage /></PermissionRoute>} />
                  <Route path="/coupons/new" element={<PermissionRoute permission="coupons.create"><CouponFormPage /></PermissionRoute>} />
                  <Route path="/coupons/:id/edit" element={<PermissionRoute permission="coupons.edit"><CouponFormPage /></PermissionRoute>} />

                  {/* Advance Payments */}
                  <Route path="/advance" element={<PermissionRoute permission="advance.view"><AdvancePaymentsList /></PermissionRoute>} />

                  {/* Items */}
                  <Route path="/items" element={<PermissionRoute permission="products.view"><ItemsPage /></PermissionRoute>} />
                  <Route path="/items/new" element={<PermissionRoute permission="products.create"><ItemFormPage key="new-item" /></PermissionRoute>} />
                  <Route path="/items/new-service" element={<PermissionRoute permission="products.create"><ItemFormPage key="new-service" isService={true} /></PermissionRoute>} />
                  <Route path="/items/:itemId/edit" element={<PermissionRoute permission="products.edit"><ItemFormPage /></PermissionRoute>} />
                  <Route path="/items/categories" element={<PermissionRoute permission="products.view"><CategoriesListPage /></PermissionRoute>} />
                  <Route path="/items/brands" element={<PermissionRoute permission="products.view"><BrandsListPage /></PermissionRoute>} />
                  <Route path="/items/variants" element={<PermissionRoute permission="products.view"><VariantsListPage /></PermissionRoute>} />
                  <Route path="/items/print-labels" element={<PermissionRoute permission="products.view"><PrintLabelsPage /></PermissionRoute>} />
                  <Route path="/items/import" element={<PermissionRoute permission="products.create"><ImportItemsPage /></PermissionRoute>} />
                  <Route path="/items/import-services" element={<PermissionRoute permission="products.create"><ImportServicesPage /></PermissionRoute>} />

                  {/* Warehouses */}
                  <Route path="/warehouses" element={<PermissionRoute permission="warehouses.view"><WarehousesPage /></PermissionRoute>} />

                  {/* Accounts */}
                  <Route path="/accounts" element={<AccountsLayout />}>
                    <Route index element={<Navigate to="list" replace />} />
                    <Route path="add" element={<PermissionRoute permission="accounts.create"><AddAccountPage /></PermissionRoute>} />
                    <Route path="list" element={<PermissionRoute permission="accounts.view"><AccountsListPage /></PermissionRoute>} />
                    <Route path=":id/edit" element={<PermissionRoute permission="accounts.edit"><AddAccountPage editMode={true} /></PermissionRoute>} />
                    <Route path="money-transfers" element={<PermissionRoute permission="accounts.view"><MoneyTransferListPage /></PermissionRoute>} />
                    <Route path="deposits" element={<PermissionRoute permission="accounts.view"><DepositListPage /></PermissionRoute>} />
                    <Route path="cash-transactions" element={<PermissionRoute permission="accounts.view"><CashTransactionsPage /></PermissionRoute>} />
                  </Route>

                  {/* Purchases */}
                  <Route path="/purchase" element={<PurchaseLayout />}>
                    <Route index element={<Navigate to="list" replace />} />
                    <Route path="list" element={<PermissionRoute permission="purchases.view"><PurchaseListPage /></PermissionRoute>} />
                    <Route path="new" element={<PermissionRoute permission="purchases.create"><NewPurchasePage /></PermissionRoute>} />
                    <Route path="returns" element={<PermissionRoute permission="purchases.view"><PurchaseReturnsListPage /></PermissionRoute>} />
                    <Route path="returns/new" element={<PermissionRoute permission="purchases.create"><NewPurchaseReturnPage /></PermissionRoute>} />
                    <Route path=":id/edit" element={<PermissionRoute permission="purchases.edit"><NewPurchasePage editMode={true} /></PermissionRoute>} />
                  </Route>

                  {/* Stock */}
                  <Route path="/stock" element={<StockLayout />}>
                    <Route index element={<Navigate to="adjustments" replace />} />
                    <Route path="adjustments" element={<PermissionRoute permission="stock.view"><StockAdjustmentListPage /></PermissionRoute>} />
                    <Route path="transfers" element={<PermissionRoute permission="stock.view"><StockTransferListPage /></PermissionRoute>} />
                  </Route>

                  {/* Expenses */}
                  <Route path="/expenses" element={<ExpensesLayout />}>
                    <Route index element={<Navigate to="list" replace />} />
                    <Route path="list" element={<PermissionRoute permission="expenses.view"><ExpensesListPage /></PermissionRoute>} />
                    <Route path="categories" element={<PermissionRoute permission="expenses.view"><ExpenseCategoryListPage /></PermissionRoute>} />
                  </Route>

                  {/* Users */}
                  <Route path="/users" element={<PermissionRoute permission="users.view"><UsersPage /></PermissionRoute>} />

                  {/* Roles */}
                  <Route path="/roles" element={<PermissionRoute permission="roles.view"><RolesPage /></PermissionRoute>} />

                  {/* Reports */}
                  <Route path="/reports" element={<PermissionRoute permission="reports.view"><ReportsPage /></PermissionRoute>} />

                  {/* Settings */}
                  <Route path="/settings" element={<SettingsPage />} />


                  {/* Plan & Billing */}
                  <Route path="/billing" element={<PermissionRoute permission="billing.view"><BillingPage /></PermissionRoute>} />
                  <Route path="/admin/billing" element={<PlatformAdminRoute><AdminBillingPage /></PlatformAdminRoute>} />

                  {/* 404 inside dashboard layout */}
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Root redirect */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Public 404 for totally unknown paths */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BranchProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

