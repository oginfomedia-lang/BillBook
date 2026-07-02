import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
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
import { CustomersPage } from "./pages/CustomersPage";
import { ContactsLayout, ContactsIndexRedirect } from "./pages/contacts/ContactsLayout";
import { SuppliersPage } from "./pages/contacts/SuppliersPage";
import { ImportCustomersPage } from "./pages/contacts/ImportCustomersPage";
import { ImportSuppliersPage } from "./pages/contacts/ImportSuppliersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { UsersPage } from "./pages/UsersPage";
import { RolesPage } from "./pages/RolesPage";
import { AdvancePaymentsList } from "./pages/Advance/AdvancePaymentsList";
import { CouponsListPage } from "./pages/Coupons/CouponsList";
import { CouponFormPage } from "./pages/Coupons/CouponForm";

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
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected routes with sidebar */}
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Sales module */}
                <Route path="/sales" element={<SalesLayout />}>
                  <Route index element={<SalesListPage />} />
                  <Route path="add" element={<AddSalePage />} />
                  <Route path="pos" element={<POSPage />} />
                  <Route path="returns" element={<SalesReturnsPage />} />
                  <Route path=":id" element={<InvoiceDetailPage />} />
                </Route>
                <Route path="/pos" element={<Navigate to="/sales/pos" replace />} />

                {/* Invoices (standalone) */}
                <Route path="/invoices" element={<InvoicesPage />} />

                {/* Contacts module */}
                <Route path="/contacts" element={<ContactsLayout />}>
                  <Route index element={<ContactsIndexRedirect />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="suppliers" element={<SuppliersPage />} />
                  <Route path="import/customers" element={<ImportCustomersPage />} />
                  <Route path="import/suppliers" element={<ImportSuppliersPage />} />
                </Route>

                {/* Coupons – top-level, not under /contacts */}
                <Route path="/coupons" element={<CouponsListPage />} />
                <Route path="/coupons/new" element={<CouponFormPage />} />
                <Route path="/coupons/:id/edit" element={<CouponFormPage />} />

                {/* Other top-level modules */}
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/advance" element={<AdvancePaymentsList />} />
              </Route>

              {/* Fallback redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}