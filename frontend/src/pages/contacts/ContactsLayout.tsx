import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "../../context/LanguageContext";

const NAV_ITEMS = [
  { to: "customers", label: "Customers", permission: "customers.view" },
  { to: "suppliers", label: "Suppliers", permission: "suppliers.view" },
  { to: "import/customers", label: "Import Customers", permission: "customers.import" },
  { to: "import/suppliers", label: "Import Suppliers", permission: "suppliers.import" },
];

export function ContactsLayout() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const visibleNavItems = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t("Contacts")}</h1>
        <p className="text-sm text-slate-500">{t("Manage your customers, suppliers, and import contact lists from one place.")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "customers" || item.to === "suppliers"}
            className={({ isActive }) =>
              `rounded-full border px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-brand bg-brand text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`
            }
          >
            {t(item.label)}
          </NavLink>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Outlet />
      </div>
    </div>
  );
}

export function ContactsIndexRedirect() {
  const { hasPermission } = useAuth();
  const firstAvailable = NAV_ITEMS.find((item) => hasPermission(item.permission));
  return <Navigate to={firstAvailable?.to ?? "customers"} replace />;
}