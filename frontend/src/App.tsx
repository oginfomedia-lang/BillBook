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
import { BranchesListPage } from "./pages/Branches/BranchesList";      // 👈 Added
import { BranchFormPage } from "./pages/Branches/BranchForm";          // 👈 Added
import { CouponsListPage } from "./pages/Coupons/CouponsList";

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

                  {/* Coupons */}
                  <Route path="/coupons" element={<CouponsListPage />} />
                  <Route path="/coupons/new" element={<CouponFormPage />} />
                  <Route path="/coupons/:id/edit" element={<CouponFormPage />} />

                  {/* Branches */}
                  <Route path="/branches" element={<BranchesListPage />} />
                  <Route path="/branches/new" element={<BranchFormPage />} />
                  <Route path="/branches/:id/edit" element={<BranchFormPage />} />

                  {/* Products */}
                  <Route path="/products" element={<ProductsPage />} />

                  {/* Warehouses */}
                  <Route path="/warehouses" element={<WarehousesPage />} />

                  {/* Purchase module */}
                  <Route path="/purchase" element={<PurchaseLayout />}>
                    <Route index element={<Navigate to="list" replace />} />
                    <Route path="list" element={<PurchaseListPage />} />
                    <Route path="new" element={<NewPurchasePage />} />
                    <Route path="returns" element={<PurchaseReturnsListPage />} />
                    <Route path="returns/new" element={<NewPurchaseReturnPage />} />
                    <Route path=":id/edit" element={<NewPurchasePage editMode={true} />} />
                  </Route>

                  {/* Users */}
                  <Route path="/users" element={<UsersPage />} />

                  {/* Roles */}
                  <Route path="/roles" element={<RolesPage />} />

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