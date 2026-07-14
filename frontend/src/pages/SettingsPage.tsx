import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Monitor,
  MessageSquare,
  Mail,
  Percent,
  Layers,
  CreditCard,
  Coins,
  Lock,
  Download,
  Plus,
  Trash2,
  Edit2,
  Save,
  Check,
  RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "../api/client";
import { useTranslation } from "../context/LanguageContext";
import { formatMoney } from "../utils/format";

type SettingPageType =
  | "store"
  | "site"
  | "sms"
  | "smtp"
  | "taxes"
  | "units"
  | "payment_types"
  | "currencies"
  | "change_password"
  | "backup";

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const activePage = (searchParams.get("page") || "store") as SettingPageType;

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------
  const storeSettingsQuery = useQuery({
    queryKey: ["settings", "store"],
    queryFn: async () => {
      const { data } = await apiClient.get("/settings/store");
      return data;
    },
    enabled: activePage === "store",
  });

  const generalSettingsQuery = useQuery({
    queryKey: ["settings", "general"],
    queryFn: async () => {
      const { data } = await apiClient.get("/settings");
      return data;
    },
    enabled: ["site", "sms", "smtp", "payment_types", "currencies"].includes(activePage),
  });

  const taxesQuery = useQuery({
    queryKey: ["settings", "taxes"],
    queryFn: async () => {
      const { data } = await apiClient.get("/items/taxes");
      return data;
    },
    enabled: activePage === "taxes",
  });

  const unitsQuery = useQuery({
    queryKey: ["settings", "units"],
    queryFn: async () => {
      const { data } = await apiClient.get("/items/units");
      return data;
    },
    enabled: activePage === "units",
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const updateStoreMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.put("/settings/store", payload);
      return data;
    },
    onSuccess: () => {
      toast.success(t("Store profile updated successfully"));
      queryClient.invalidateQueries({ queryKey: ["settings", "store"] });
    },
    onError: () => {
      toast.error(t("Failed to update store profile"));
    },
  });

  const updateGeneralSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await apiClient.post("/settings", payload);
      return data;
    },
    onSuccess: () => {
      toast.success(t("Settings saved successfully"));
      queryClient.invalidateQueries({ queryKey: ["settings", "general"] });
    },
    onError: () => {
      toast.error(t("Failed to save settings"));
    },
  });

  // ---------------------------------------------------------------------------
  // Form states
  // ---------------------------------------------------------------------------
  // Store profile form
  const [storeForm, setStoreForm] = useState({
    store_code: "",
    company_name: "",
    mobile: "",
    billing_email: "",
    phone: "",
    gstin: "",
    tax_number: "",
    pan_number: "",
    store_website: "",
    show_signature: false,
    signature: "",
    bank_details: "",
    country: "India",
    state: "Maharashtra",
    city: "",
    postcode: "",
    address: "",
    store_logo: "",
  });

  useEffect(() => {
    if (storeSettingsQuery.data) {
      const d = storeSettingsQuery.data;
      setStoreForm({
        store_code: d.store_code || "",
        company_name: d.company_name || "",
        mobile: d.mobile || "",
        billing_email: d.billing_email || "",
        phone: d.phone || "",
        gstin: d.gstin || "",
        tax_number: d.tax_number || "",
        pan_number: d.pan_number || "",
        store_website: d.store_website || "",
        show_signature: !!d.show_signature,
        signature: d.signature || "",
        bank_details: d.bank_details || "",
        country: d.country || "India",
        state: d.state || "Maharashtra",
        city: d.city || "",
        postcode: d.postcode || "",
        address: d.address || "",
        store_logo: d.store_logo || "",
      });
    }
  }, [storeSettingsQuery.data]);


  // Site settings form
  const [siteForm, setSiteForm] = useState({
    site_name: "",
    footer_text: "",
    logo_url: "",
    favicon_url: "",
  });

  // SMS settings form
  const [smsForm, setSmsForm] = useState({
    sms_provider: "none",
    sms_api_key: "",
    whatsapp_provider: "none",
    whatsapp_api_key: "",
  });

  // SMTP form
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: "",
    smtp_port: "587",
    smtp_username: "",
    smtp_password: "",
    smtp_encryption: "tls",
    smtp_from_address: "",
  });

  // Load general settings forms when data comes in
  useEffect(() => {
    if (generalSettingsQuery.data) {
      const d = generalSettingsQuery.data;
      setSiteForm({
        site_name: d.site_name || "",
        footer_text: d.footer_text || "",
        logo_url: d.logo_url || "",
        favicon_url: d.favicon_url || "",
      });
      setSmsForm({
        sms_provider: d.sms_provider || "none",
        sms_api_key: d.sms_api_key || "",
        whatsapp_provider: d.whatsapp_provider || "none",
        whatsapp_api_key: d.whatsapp_api_key || "",
      });
      setSmtpForm({
        smtp_host: d.smtp_host || "",
        smtp_port: d.smtp_port || "587",
        smtp_username: d.smtp_username || "",
        smtp_password: d.smtp_password || "",
        smtp_encryption: d.smtp_encryption || "tls",
        smtp_from_address: d.smtp_from_address || "",
      });
    }
  }, [generalSettingsQuery.data]);

  // Tax Modal / Action State
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [currentTax, setCurrentTax] = useState<any>(null);
  const [taxForm, setTaxForm] = useState({ name: "", tax_value: 0, status: "active" });

  // Unit Modal / Action State
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<any>(null);
  const [unitForm, setUnitForm] = useState({ name: "", short_name: "", status: "active" });

  // Change Password state
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  // Custom List CRUD States (Payment Types & Currencies)
  const [paymentTypes, setPaymentTypes] = useState<string[]>([]);
  const [newPaymentType, setNewPaymentType] = useState("");

  const [currencies, setCurrencies] = useState<any[]>([]);
  const [newCurrency, setNewCurrency] = useState({
    code: "",
    symbol: "",
    name: "",
    rate: 1.0,
    is_default: false
  });

  useEffect(() => {
    if (generalSettingsQuery.data) {
      setPaymentTypes(generalSettingsQuery.data.payment_types || []);
      setCurrencies(generalSettingsQuery.data.currency_list || []);
    }
  }, [generalSettingsQuery.data]);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreMutation.mutate(storeForm);
  };

  const handleSaveSite = (e: React.FormEvent) => {
    e.preventDefault();
    updateGeneralSettingsMutation.mutate(siteForm);
  };

  const handleSaveSms = (e: React.FormEvent) => {
    e.preventDefault();
    updateGeneralSettingsMutation.mutate(smsForm);
  };

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    updateGeneralSettingsMutation.mutate(smtpForm);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error(t("All fields are required"));
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error(t("New password must be at least 8 characters long"));
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error(t("Passwords do not match"));
      return;
    }

    setSavingPassword(true);
    try {
      await apiClient.post("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success(t("Password changed successfully"));
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("Failed to change password"));
    } finally {
      setSavingPassword(false);
    }
  };

  // Tax Actions
  const handleOpenTaxModal = (tax: any = null) => {
    setCurrentTax(tax);
    if (tax) {
      setTaxForm({ name: tax.name, tax_value: tax.tax_value, status: tax.status });
    } else {
      setTaxForm({ name: "", tax_value: 0, status: "active" });
    }
    setTaxModalOpen(true);
  };

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentTax) {
        await apiClient.put(`/items/taxes/${currentTax.id}`, taxForm);
        toast.success(t("Tax updated successfully"));
      } else {
        await apiClient.post("/items/taxes", taxForm);
        toast.success(t("Tax created successfully"));
      }
      setTaxModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["settings", "taxes"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("Error saving tax"));
    }
  };

  const handleDeleteTax = async (id: number) => {
    if (!confirm(t("Are you sure you want to delete this tax?"))) return;
    try {
      await apiClient.delete(`/items/taxes/${id}`);
      toast.success(t("Tax deleted successfully"));
      queryClient.invalidateQueries({ queryKey: ["settings", "taxes"] });
    } catch (err: any) {
      toast.error(t("Could not delete tax"));
    }
  };

  // Unit Actions
  const handleOpenUnitModal = (unit: any = null) => {
    setCurrentUnit(unit);
    if (unit) {
      setUnitForm({ name: unit.name, short_name: unit.short_name || "", status: unit.status });
    } else {
      setUnitForm({ name: "", short_name: "", status: "active" });
    }
    setUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentUnit) {
        await apiClient.put(`/items/units/${currentUnit.id}`, unitForm);
        toast.success(t("Unit updated successfully"));
      } else {
        await apiClient.post("/items/units", unitForm);
        toast.success(t("Unit created successfully"));
      }
      setUnitModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["settings", "units"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t("Error saving unit"));
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (!confirm(t("Are you sure you want to delete this unit?"))) return;
    try {
      await apiClient.delete(`/items/units/${id}`);
      toast.success(t("Unit deleted successfully"));
      queryClient.invalidateQueries({ queryKey: ["settings", "units"] });
    } catch (err: any) {
      toast.error(t("Could not delete unit"));
    }
  };

  // Payment Types actions
  const handleAddPaymentType = () => {
    if (!newPaymentType.trim()) return;
    if (paymentTypes.includes(newPaymentType.trim())) {
      toast.error(t("Payment type already exists"));
      return;
    }
    const updated = [...paymentTypes, newPaymentType.trim()];
    setPaymentTypes(updated);
    setNewPaymentType("");
    updateGeneralSettingsMutation.mutate({ payment_types: updated });
  };

  const handleDeletePaymentType = (type: string) => {
    const updated = paymentTypes.filter((t) => t !== type);
    setPaymentTypes(updated);
    updateGeneralSettingsMutation.mutate({ payment_types: updated });
  };

  // Currency actions
  const handleAddCurrency = () => {
    if (!newCurrency.code.trim() || !newCurrency.symbol.trim() || !newCurrency.name.trim()) {
      toast.error(t("All currency fields are required"));
      return;
    }
    if (currencies.some((c) => c.code.toUpperCase() === newCurrency.code.toUpperCase())) {
      toast.error(t("Currency code already exists"));
      return;
    }
    const currencyObj = {
      ...newCurrency,
      code: newCurrency.code.toUpperCase(),
      rate: parseFloat(String(newCurrency.rate)) || 1.0,
      is_default: currencies.length === 0 ? true : false,
    };
    const updated = [...currencies, currencyObj];
    setCurrencies(updated);
    setNewCurrency({ code: "", symbol: "", name: "", rate: 1.0, is_default: false });
    updateGeneralSettingsMutation.mutate({ currency_list: updated });
  };

  const handleDeleteCurrency = (code: string) => {
    const target = currencies.find((c) => c.code === code);
    if (target?.is_default) {
      toast.error(t("Cannot delete the default currency"));
      return;
    }
    const updated = currencies.filter((c) => c.code !== code);
    setCurrencies(updated);
    updateGeneralSettingsMutation.mutate({ currency_list: updated });
  };

  const handleSetDefaultCurrency = (code: string) => {
    const updated = currencies.map((c) => ({
      ...c,
      is_default: c.code === code,
    }));
    setCurrencies(updated);
    updateGeneralSettingsMutation.mutate({ currency_list: updated });
    // Proactively sync defaults
    const activeDefault = updated.find(c => c.is_default);
    if (activeDefault) {
      updateStoreMutation.mutate({ default_currency: activeDefault.code });
    }
  };

  // Download database backup
  const handleDownloadBackup = async () => {
    try {
      const response = await apiClient.get("/settings/backup", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      let filename = "billbook_backup.json";
      if (contentDisposition) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t("Backup downloaded successfully"));
    } catch (error) {
      toast.error(t("Failed to export database backup"));
    }
  };

  // Page title mapping
  const PAGES: Record<SettingPageType, { label: string; desc: string; icon: any }> = {
    store: { label: "Store Info", desc: "Manage your store profile, address, and GSTIN number.", icon: Store },
    site: { label: "Site Settings", desc: "Manage application name, footer text, favicon, and branding.", icon: Monitor },
    sms: { label: "SMS/WhatsApp API", desc: "Configure SMS and WhatsApp messaging gateway details.", icon: MessageSquare },
    smtp: { label: "SMTP", desc: "Configure email credentials for outgoing messages & reports.", icon: Mail },
    taxes: { label: "Tax List", desc: "View and configure standard tax classes (e.g. GST, VAT).", icon: Percent },
    units: { label: "Units List", desc: "Manage operational stock measuring units (e.g. Kg, Pcs).", icon: Layers },
    payment_types: { label: "Payment Types", desc: "View and configure acceptable payment modes.", icon: CreditCard },
    currencies: { label: "Currency List", desc: "Configure multiple currencies and set exchange rates.", icon: Coins },
    change_password: { label: "Change Password", desc: "Update your login security credentials.", icon: Lock },
    backup: { label: "Database Backup", desc: "Securely export your company's full dataset.", icon: Download },
  };

  const PageIcon = PAGES[activePage].icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand/10 p-3 text-brand">
          <PageIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{t(PAGES[activePage].label)}</h1>
          <p className="text-sm text-slate-500">{t(PAGES[activePage].desc)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start">
        {/* Settings Navigation Menu */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-1">
          {Object.entries(PAGES).map(([key, page]) => {
            const Icon = page.icon;
            const isActive = activePage === key;
            return (
              <button
                key={key}
                onClick={() => navigate(`/settings?page=${key}`)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive
                    ? "bg-brand/10 text-brand font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
              >
                <Icon size={16} />
                {t(page.label)}
              </button>
            );
          })}
        </div>

        {/* Dynamic Page Views */}
        <div className="lg:col-span-3">
          {/* ── STORE PROFILE PAGE ─────────────────────────────────── */}
          {activePage === "store" && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {storeSettingsQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent mb-2" />
                  <p>{t("Loading store details...")}</p>
                </div>
              ) : (
                <form onSubmit={handleSaveStore}>
                  {/* Two-column form body */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

                    {/* ─── LEFT COLUMN ─────────────────────────── */}
                    <div className="p-6 space-y-4">
                      {/* Store Code — read only */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Store Code")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={storeForm.store_code}
                          className="flex-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed focus:outline-none"
                        />
                      </div>

                      {/* Store Name */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Store Name")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={storeForm.company_name}
                          onChange={(e) => setStoreForm({ ...storeForm, company_name: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Mobile */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Mobile")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={storeForm.mobile}
                          onChange={(e) => setStoreForm({ ...storeForm, mobile: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Email")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={storeForm.billing_email}
                          onChange={(e) => setStoreForm({ ...storeForm, billing_email: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Phone")}
                        </label>
                        <input
                          type="text"
                          value={storeForm.phone}
                          onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* GST Number */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("GST Number")}
                        </label>
                        <input
                          type="text"
                          value={storeForm.gstin}
                          onChange={(e) => setStoreForm({ ...storeForm, gstin: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Tax Number */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Tax Number")}
                        </label>
                        <input
                          type="text"
                          value={storeForm.tax_number}
                          onChange={(e) => setStoreForm({ ...storeForm, tax_number: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* PAN Number */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("PAN Number")}
                        </label>
                        <input
                          type="text"
                          value={storeForm.pan_number}
                          onChange={(e) => setStoreForm({ ...storeForm, pan_number: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Store Website */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Store Website")}
                        </label>
                        <input
                          type="text"
                          value={storeForm.store_website}
                          onChange={(e) => setStoreForm({ ...storeForm, store_website: e.target.value })}
                          placeholder="https://example.com"
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Show Signature on Invoice */}
                      <div className="flex items-center gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Show Signature on Invoice")}
                        </label>
                        <input
                          type="checkbox"
                          checked={storeForm.show_signature}
                          onChange={(e) => setStoreForm({ ...storeForm, show_signature: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                        />
                      </div>

                      {/* Signature upload */}
                      <div className="flex items-start gap-4">
                        <label className="w-44 text-right text-sm text-slate-600 flex-shrink-0 mt-1">
                          {t("Signature")}
                        </label>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                              {t("Choose File")}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setStoreForm({ ...storeForm, signature: ev.target?.result as string });
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <span className="text-xs text-slate-400">{storeForm.signature ? t("File selected") : t("No file chosen")}</span>
                          </div>
                          <p className="text-[11px] text-red-500">{t("Max Width/Height: 1000px × 1000px & Size: 1024kb")}</p>
                          {/* Signature Preview */}
                          <div className="flex h-36 w-full items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                            {storeForm.signature ? (
                              <img src={storeForm.signature} alt="signature" className="max-h-32 max-w-full object-contain" />
                            ) : (
                              <div className="text-center text-slate-400">
                                <svg className="mx-auto mb-2 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xs font-medium">{t("No Image Available")}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ─── RIGHT COLUMN ─────────────────────────── */}
                    <div className="p-6 space-y-4">
                      {/* Bank Details */}
                      <div className="flex items-start gap-4">
                        <label className="w-32 text-right text-sm text-slate-600 flex-shrink-0 mt-1">
                          {t("Bank Details")}
                        </label>
                        <textarea
                          value={storeForm.bank_details}
                          onChange={(e) => setStoreForm({ ...storeForm, bank_details: e.target.value })}
                          rows={4}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                        />
                      </div>

                      {/* Country */}
                      <div className="flex items-center gap-4">
                        <label className="w-32 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Country")}
                        </label>
                        <select
                          value={storeForm.country}
                          onChange={(e) => setStoreForm({ ...storeForm, country: e.target.value })}
                          className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          <option value="India">India</option>
                          <option value="United States">United States</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="UAE">UAE</option>
                          <option value="Australia">Australia</option>
                          <option value="Canada">Canada</option>
                          <option value="Singapore">Singapore</option>
                        </select>
                      </div>

                      {/* State */}
                      <div className="flex items-center gap-4">
                        <label className="w-32 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("State")}
                        </label>
                        <select
                          value={storeForm.state}
                          onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                          className="flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Gujarat">Gujarat</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Delhi">Delhi</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Uttar Pradesh">Uttar Pradesh</option>
                          <option value="West Bengal">West Bengal</option>
                          <option value="Telangana">Telangana</option>
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                          <option value="Kerala">Kerala</option>
                          <option value="Madhya Pradesh">Madhya Pradesh</option>
                          <option value="Haryana">Haryana</option>
                          <option value="Punjab">Punjab</option>
                          <option value="Bihar">Bihar</option>
                          <option value="Odisha">Odisha</option>
                          <option value="Goa">Goa</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* City */}
                      <div className="flex items-center gap-4">
                        <label className="w-32 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("City")} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={storeForm.city}
                          onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Postcode */}
                      <div className="flex items-center gap-4">
                        <label className="w-32 text-right text-sm text-slate-600 flex-shrink-0">
                          {t("Postcode")}
                        </label>
                        <input
                          type="text"
                          value={storeForm.postcode}
                          onChange={(e) => setStoreForm({ ...storeForm, postcode: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-4">
                        <label className="w-32 text-right text-sm text-slate-600 flex-shrink-0 mt-1">
                          {t("Address")} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={storeForm.address}
                          onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                          rows={3}
                          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                        />
                      </div>

                      {/* Store Logo upload */}
                      <div className="flex items-start gap-4">
                        <label className="w-32 text-right text-sm text-slate-600 flex-shrink-0 mt-1">
                          {t("Store Logo")}
                        </label>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer rounded border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors">
                              {t("Choose File")}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => setStoreForm({ ...storeForm, store_logo: ev.target?.result as string });
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <span className="text-xs text-slate-400">{storeForm.store_logo ? t("File selected") : t("No file chosen")}</span>
                          </div>
                          <p className="text-[11px] text-red-500">{t("Max Width/Height: 1000px × 1000px & Size: 1024kb")}</p>
                          {/* Logo Preview */}
                          <div className="flex h-24 w-full items-center justify-center rounded-lg border border-slate-200 bg-white">
                            {storeForm.store_logo ? (
                              <img src={storeForm.store_logo} alt="store logo" className="max-h-20 max-w-full object-contain" />
                            ) : (
                              <div className="text-center">
                                <svg className="mx-auto h-8 w-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── BOTTOM ACTION BUTTONS ─────────────────── */}
                  <div className="flex items-center justify-center gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                      type="submit"
                      disabled={updateStoreMutation.isPending}
                      className="min-w-36 rounded-lg bg-emerald-500 px-8 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      {updateStoreMutation.isPending ? t("Updating...") : t("Update")}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard")}
                      className="min-w-36 rounded-lg bg-amber-500 px-8 py-2.5 text-sm font-bold text-white hover:bg-amber-600 transition-colors"
                    >
                      {t("Close")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── SITE SETTINGS PAGE ─────────────────────────────────── */}
          {activePage === "site" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {generalSettingsQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                </div>
              ) : (
                <form onSubmit={handleSaveSite} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Application Name")}</label>
                      <input
                        type="text"
                        value={siteForm.site_name}
                        onChange={(e) => setSiteForm({ ...siteForm, site_name: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Footer Text")}</label>
                      <input
                        type="text"
                        value={siteForm.footer_text}
                        onChange={(e) => setSiteForm({ ...siteForm, footer_text: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Logo Image URL")}</label>
                      <input
                        type="text"
                        value={siteForm.logo_url}
                        onChange={(e) => setSiteForm({ ...siteForm, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Favicon URL")}</label>
                      <input
                        type="text"
                        value={siteForm.favicon_url}
                        onChange={(e) => setSiteForm({ ...siteForm, favicon_url: e.target.value })}
                        placeholder="https://example.com/favicon.ico"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={updateGeneralSettingsMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      {updateGeneralSettingsMutation.isPending ? t("Saving...") : t("Save Settings")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── SMS/WHATSAPP GATEWAY PAGE ──────────────────────────── */}
          {activePage === "sms" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {generalSettingsQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-slate-400" />
              ) : (
                <form onSubmit={handleSaveSms} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("SMS Gateway Provider")}</label>
                      <select
                        value={smsForm.sms_provider}
                        onChange={(e) => setSmsForm({ ...smsForm, sms_provider: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                      >
                        <option value="none">{t("None / Disabled")}</option>
                        <option value="twilio">Twilio SMS</option>
                        <option value="msg91">MSG91 API</option>
                        <option value="nexmo">Nexmo / Vonage</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("SMS API Key / Token")}</label>
                      <input
                        type="password"
                        value={smsForm.sms_api_key}
                        onChange={(e) => setSmsForm({ ...smsForm, sms_api_key: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("WhatsApp Provider")}</label>
                      <select
                        value={smsForm.whatsapp_provider}
                        onChange={(e) => setSmsForm({ ...smsForm, whatsapp_provider: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                      >
                        <option value="none">{t("None / Disabled")}</option>
                        <option value="twilio_whatsapp">Twilio WhatsApp Business</option>
                        <option value="meta_cloud">Meta Cloud API</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("WhatsApp Token")}</label>
                      <input
                        type="password"
                        value={smsForm.whatsapp_api_key}
                        onChange={(e) => setSmsForm({ ...smsForm, whatsapp_api_key: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={updateGeneralSettingsMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      {t("Save Gateway Settings")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── SMTP EMAIL SETTINGS PAGE ────────────────────────────── */}
          {activePage === "smtp" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              {generalSettingsQuery.isLoading ? (
                <div className="py-12 text-center text-sm text-slate-400" />
              ) : (
                <form onSubmit={handleSaveSmtp} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("SMTP Host")}</label>
                      <input
                        type="text"
                        value={smtpForm.smtp_host}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                        placeholder="smtp.mailgun.org"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("SMTP Port")}</label>
                      <input
                        type="text"
                        value={smtpForm.smtp_port}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })}
                        placeholder="587"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("SMTP Username")}</label>
                      <input
                        type="text"
                        value={smtpForm.smtp_username}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_username: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("SMTP Password")}</label>
                      <input
                        type="password"
                        value={smtpForm.smtp_password}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("SMTP Encryption")}</label>
                      <select
                        value={smtpForm.smtp_encryption}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_encryption: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                      >
                        <option value="tls">STARTTLS</option>
                        <option value="ssl">SSL / TLS</option>
                        <option value="none">{t("None")}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Sender Email Address")}</label>
                      <input
                        type="email"
                        value={smtpForm.smtp_from_address}
                        onChange={(e) => setSmtpForm({ ...smtpForm, smtp_from_address: e.target.value })}
                        placeholder="noreply@mycompany.com"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={updateGeneralSettingsMutation.isPending}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      {t("Save SMTP configuration")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── TAX SETTINGS PAGE ─────────────────────────────────── */}
          {activePage === "taxes" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => handleOpenTaxModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand/90"
                >
                  <Plus size={14} />
                  {t("Add Tax Class")}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Name")}</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Tax Value (%)")}</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Status")}</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {taxesQuery.isLoading ? (
                      <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-400">{t("Loading...")}</td></tr>
                    ) : taxesQuery.data?.length === 0 ? (
                      <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-400">{t("No taxes set up yet.")}</td></tr>
                    ) : (
                      taxesQuery.data?.map((tax: any) => (
                        <tr key={tax.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-semibold text-ink-900">{tax.name}</td>
                          <td className="px-5 py-3 text-center font-bold text-slate-800">{tax.tax_value}%</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tax.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                              }`}>{t(tax.status)}</span>
                          </td>
                          <td className="px-5 py-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenTaxModal(tax)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTax(tax.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tax Add/Edit Modal */}
              {taxModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                  <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
                    <h3 className="text-base font-bold text-slate-800">{currentTax ? t("Edit Tax") : t("Add Tax")}</h3>
                    <form onSubmit={handleSaveTax} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Tax Name")}</label>
                        <input
                          type="text"
                          required
                          value={taxForm.name}
                          onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                          placeholder="e.g. GST 18%"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Tax Value (%)")}</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={taxForm.tax_value}
                          onChange={(e) => setTaxForm({ ...taxForm, tax_value: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Status")}</label>
                        <select
                          value={taxForm.status}
                          onChange={(e) => setTaxForm({ ...taxForm, status: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                        >
                          <option value="active">{t("Active")}</option>
                          <option value="inactive">{t("Inactive")}</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setTaxModalOpen(false)}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          {t("Cancel")}
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand/90"
                        >
                          {t("Save")}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── UNITS SETTINGS PAGE ─────────────────────────────────── */}
          {activePage === "units" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => handleOpenUnitModal()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand/90"
                >
                  <Plus size={14} />
                  {t("Add Unit")}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Unit Name")}</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Short Name")}</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Status")}</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {unitsQuery.isLoading ? (
                      <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-400">{t("Loading...")}</td></tr>
                    ) : unitsQuery.data?.length === 0 ? (
                      <tr><td colSpan={4} className="py-12 text-center text-sm text-slate-400">{t("No units set up yet.")}</td></tr>
                    ) : (
                      unitsQuery.data?.map((unit: any) => (
                        <tr key={unit.id} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3 font-semibold text-ink-900">{unit.name}</td>
                          <td className="px-5 py-3 text-slate-600">{unit.short_name || "—"}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${unit.status === "active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                              }`}>{t(unit.status)}</span>
                          </td>
                          <td className="px-5 py-3 text-right space-x-2">
                            <button
                              onClick={() => handleOpenUnitModal(unit)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteUnit(unit.id)}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Unit Modal */}
              {unitModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                  <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
                    <h3 className="text-base font-bold text-slate-800">{currentUnit ? t("Edit Unit") : t("Add Unit")}</h3>
                    <form onSubmit={handleSaveUnit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Unit Name")}</label>
                        <input
                          type="text"
                          required
                          value={unitForm.name}
                          onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                          placeholder="e.g. Kilograms"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Short Name")}</label>
                        <input
                          type="text"
                          required
                          value={unitForm.short_name}
                          onChange={(e) => setUnitForm({ ...unitForm, short_name: e.target.value })}
                          placeholder="e.g. Kg"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Status")}</label>
                        <select
                          value={unitForm.status}
                          onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                        >
                          <option value="active">{t("Active")}</option>
                          <option value="inactive">{t("Inactive")}</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setUnitModalOpen(false)}
                          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          {t("Cancel")}
                        </button>
                        <button
                          type="submit"
                          className="rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand/90"
                        >
                          {t("Save")}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PAYMENT TYPES PAGE ────────────────────────────────── */}
          {activePage === "payment_types" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPaymentType}
                  onChange={(e) => setNewPaymentType(e.target.value)}
                  placeholder={t("Add payment type (e.g. GPay)...")}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  onClick={handleAddPaymentType}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand/90"
                >
                  <Plus size={16} />
                  {t("Add")}
                </button>
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden divide-y divide-slate-100">
                {paymentTypes.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">{t("No custom payment types added.")}</div>
                ) : (
                  paymentTypes.map((type) => (
                    <div key={type} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50">
                      <span className="text-sm font-medium text-slate-800">{type}</span>
                      <button
                        onClick={() => handleDeletePaymentType(type)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── CURRENCIES PAGE ────────────────────────────────────── */}
          {activePage === "currencies" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 mb-2">{t("Add New Currency")}</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{t("Currency Code")}</label>
                    <input
                      type="text"
                      placeholder="USD"
                      value={newCurrency.code}
                      onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{t("Symbol")}</label>
                    <input
                      type="text"
                      placeholder="$"
                      value={newCurrency.symbol}
                      onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{t("Currency Name")}</label>
                    <input
                      type="text"
                      placeholder="US Dollar"
                      value={newCurrency.name}
                      onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">{t("Exchange Rate")}</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={newCurrency.rate}
                      onChange={(e) => setNewCurrency({ ...newCurrency, rate: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleAddCurrency}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-xs font-bold text-white hover:bg-brand/90"
                  >
                    <Plus size={14} />
                    {t("Add Currency")}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Code")}</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Symbol")}</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{t("Name")}</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Exchange Rate")}</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase">{t("Is Default")}</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {currencies.map((curr) => (
                      <tr key={curr.code} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-semibold text-brand">{curr.code}</td>
                        <td className="px-5 py-3 font-bold text-slate-700">{curr.symbol}</td>
                        <td className="px-5 py-3 text-slate-600">{curr.name}</td>
                        <td className="px-5 py-3 text-right font-medium">{curr.rate}</td>
                        <td className="px-5 py-3 text-center">
                          {curr.is_default ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                              <Check size={12} />
                              {t("Default")}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefaultCurrency(curr.code)}
                              className="text-xs text-brand hover:underline font-medium"
                            >
                              {t("Make Default")}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleDeleteCurrency(curr.code)}
                            disabled={curr.is_default}
                            className="text-red-400 hover:text-red-600 disabled:opacity-30"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CHANGE PASSWORD PAGE ───────────────────────────────── */}
          {activePage === "change_password" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleSavePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Current Password")} *</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t("New Password")} *</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">{t("Confirm New Password")} *</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={savingPassword ? "animate-spin" : ""} />
                    {savingPassword ? t("Updating...") : t("Update Password")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── DATABASE BACKUP PAGE ────────────────────────────────── */}
          {activePage === "backup" && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-6">
              <div className="inline-block rounded-full bg-brand/10 p-5 text-brand">
                <Download size={40} />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-slate-800">{t("Export Full Workspace Data")}</h3>
                <p className="text-sm text-slate-500">
                  {t("Download a secure, portable, JSON-formatted data export file containing all registers, customers, invoices, items, and workspace configs. Store this backup file safely on local disks or cold storage.")}
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={handleDownloadBackup}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1e6fa8] px-8 py-3 text-sm font-bold text-white hover:bg-[#1a5f90] transition-colors shadow-sm"
                >
                  <Download size={18} />
                  {t("Generate and Download Backup")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
