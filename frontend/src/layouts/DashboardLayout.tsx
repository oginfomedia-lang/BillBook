import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Package, FileText, Menu, X, LogOut, Receipt, ShieldCheck, ChevronRight, ChevronDown, Bell, Globe, Monitor, CreditCard, User as UserIcon, Lock, Camera, Check, Trash2, Gift,} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LanguageContext";
import toast from "react-hot-toast";
import * as authApi from "../api/auth";
import { Modal } from "../components/ui/Modal";
import { useBranch } from "../context/BranchContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  {
    label: "Contacts",
    icon: Users,
    permission: ["customers.view", "suppliers.view"],
    sub: [
      { to: "/contacts/customers", label: "Customers", end: true },
      { to: "/contacts/suppliers", label: "Suppliers" },
      { to: "/contacts/import/customers", label: "Import Customers" },
      { to: "/contacts/import/suppliers", label: "Import Suppliers" },
    ],
  },
  {
    label: "Sales",
    icon: Receipt,
    permission: "invoices.view",
    sub: [
      { to: "/sales", label: "Sales List", end: true },
      { to: "/sales/add", label: "Add Sales" },
      { to: "/sales/pos", label: "POS" },
      { to: "/sales/returns", label: "Return Sales" },
    ],
  },
  { to: "/products",  label: "Products",  icon: Package,          permission: "products.view" },
  { to: "/advance",   label: "Advance",   icon: CreditCard,       permission: "advance_payments.view" },
  { to: "/coupons",   label: "Coupons",   icon: Gift,             permission: "coupons.view" },
  { to: "/users",     label: "Users",     icon: Users,            permission: "users.view" },
  { to: "/roles",     label: "Roles",     icon: ShieldCheck,      permission: "roles.view" },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, hasPermission, updateCurrentUser } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const navigate = useNavigate();

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    Sales: true, // Default open for Sales submenu
  });

  // Dropdown states
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Welcome to BillBook workspace!", time: "Just now" },
    { id: 2, title: "Low stock alert: Premium Widget is below 10 units", time: "2 hours ago" },
    { id: 3, title: "New customer Rohal Retail Pvt Ltd registered", time: "1 day ago" }
  ]);

  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);

  const { currentBranchId, setCurrentBranchId, branches, isLoading } = useBranch();

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    avatar: null as string | null
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync profile form when user object changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || null
      });
    }
  }, [user, profileModalOpen]);

  // Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Close dropdowns on outside click
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
        setNotificationsDropdownOpen(false);
        setAvatarDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      toast.error("Name and Email are required");
      return;
    }
    setIsSavingProfile(true);
    try {
      const updatedUser = await authApi.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        avatar: profileForm.avatar
      });
      updateCurrentUser(updatedUser);
      toast.success("Profile updated successfully!");
      setProfileModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password) {
      toast.error("All password fields are required");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    setIsSavingPassword(true);
    try {
      await authApi.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success("Password changed successfully!");
      setPasswordModalOpen(false);
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not change password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm((prev) => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    Array.isArray(item.permission) ? item.permission.some((p) => hasPermission(p)) : hasPermission(item.permission)
  );

  // User initials for avatar fallback
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-900 transition-transform duration-200 lg:static lg:translate-x-0 print:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand">
              <Receipt size={17} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">BillBook</span>
          </div>
          <button
            className="rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {t("Main Menu")}
          </p>
          <div className="flex flex-col gap-0.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const hasSub = !!item.sub;
              const isOpen = openMenus[item.label] || false;

              if (hasSub) {
                return (
                  <div key={item.label} className="flex flex-col">
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all focus:outline-none"
                    >
                      <Icon size={17} className="text-slate-500 group-hover:text-slate-300" />
                      <span className="flex-1 text-left">{t(item.label)}</span>
                      <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="mt-1 pl-4 flex flex-col gap-0.5 border-l border-white/10 ml-5">
                        {item.sub!.map((subItem) => (
                          <NavLink
                            key={subItem.to}
                            to={subItem.to}
                            end={subItem.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                              `block rounded-lg py-2 px-3 text-xs font-medium transition-all ${
                                isActive
                                  ? "bg-brand/20 text-brand-light font-semibold"
                                  : "text-slate-400 hover:text-white hover:bg-white/5"
                              }`
                            }
                          >
                            {t(subItem.label)}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to!}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-brand/20 text-brand-light border-l-2 border-brand"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={17} className={isActive ? "text-brand-light" : "text-slate-500 group-hover:text-slate-300"} />
                      <span className="flex-1">{t(item.label)}</span>
                      {isActive && <ChevronRight size={14} className="text-brand-light" />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            {user?.avatar ? (
              <img
                src={user.avatar}
                className="h-8 w-8 rounded-full object-cover flex-shrink-0 border border-white/10"
                alt="User profile"
              />
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-inner">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            {t("Sign out")}
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 print:hidden">
          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-ink-900 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Desktop: empty left side */}
          <div className="hidden lg:block" />

          {/* Right actions */}
          <div className="flex items-center gap-2" ref={dropdownRef}>
            {/* Language pill */}
            <div className="relative">
              <button
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  setAvatarDropdownOpen(false);
                  setNotificationsDropdownOpen(false);
                }}
                className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors sm:flex"
              >
                <Globe size={13} />
                {language}
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 rounded-xl border border-slate-100 bg-white py-1 shadow-lg ring-1 ring-black/5 z-50">
                  {["English", "Hindi", "Marathi"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang as any);
                        setLangDropdownOpen(false);
                        toast.success(lang === "English" ? "Language changed to English" : lang === "Hindi" ? "भाषा बदलकर हिंदी हो गई है" : "भाषा बदलून मराठी झाली आहे");
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-xs font-medium hover:bg-slate-50 ${
                        language === lang ? "text-brand" : "text-slate-700"
                      }`}
                    >
                      <span>{lang === "English" ? "English" : lang === "Hindi" ? "हिंदी" : "मराठी"}</span>
                      {language === lang && <Check size={12} className="text-brand" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* POS pill */}
            <button
              onClick={() => navigate("/sales/pos")}
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors sm:flex"
            >
              <Monitor size={13} />
              {t("POS")}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsDropdownOpen(!notificationsDropdownOpen);
                  setAvatarDropdownOpen(false);
                  setLangDropdownOpen(false);
                }}
                className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-ink-900 transition-colors"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand" />
                )}
              </button>
              {notificationsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-100 bg-white p-4 shadow-lg ring-1 ring-black/5 z-50">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{t("Notifications")}</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => {
                          setNotifications([]);
                          toast.success(t("Notifications cleared"));
                        }}
                        className="text-[10px] font-semibold text-brand hover:underline"
                      >
                        {t("Clear all")}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div key={n.id} className="rounded-lg bg-slate-50 p-2.5">
                          <p className="text-xs font-semibold text-slate-800">{t(n.title)}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{n.time}</p>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-xs text-slate-400">{t("No unread notifications")}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <select value={currentBranchId || ""} onChange={(e) => setCurrentBranchId(e.target.value ? Number(e.target.value) : null)} 
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              disabled = {isLoading || branches.length === 0}>
              <option value="">{t("Select Branch")}</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>

            {/* Role badge */}
            <span className="hidden rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark sm:inline">
              {user?.is_super_admin ? t("Super Admin") : t(user?.role_name || "User")}
            </span>

            {/* Avatar & User Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setAvatarDropdownOpen(!avatarDropdownOpen);
                  setLangDropdownOpen(false);
                  setNotificationsDropdownOpen(false);
                }}
                className="flex items-center gap-2 focus:outline-none"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    className="h-8 w-8 rounded-full object-cover border border-slate-200 shadow-sm"
                    alt="User profile"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white shadow-sm">
                    {initials}
                  </div>
                )}
              </button>

              {avatarDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg ring-1 ring-black/5 z-50">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setAvatarDropdownOpen(false);
                        setProfileModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon size={14} className="text-slate-400" />
                      {t("Update Profile")}
                    </button>
                    <button
                      onClick={() => {
                        setAvatarDropdownOpen(false);
                        setPasswordModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Lock size={14} className="text-slate-400" />
                      {t("Change Password")}
                    </button>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        setAvatarDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={14} className="text-red-400" />
                      {t("Sign out")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      
      {/* Update Profile Modal */}
      <Modal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} title={t("Update Profile")}>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="flex flex-col items-center justify-center space-y-2 border-b border-slate-100 pb-4">
            <div className="relative">
              {profileForm.avatar ? (
                <img
                  src={profileForm.avatar}
                  className="h-20 w-20 rounded-full object-cover border-2 border-slate-200 shadow"
                  alt="Avatar preview"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-400 border border-slate-200 shadow-inner">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow-md hover:bg-brand-dark transition-colors"
                aria-label={t("Update Profile")}
              >
                <Camera size={14} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Upload new photo
              </button>
              {profileForm.avatar && (
                <span className="text-slate-300">|</span>
              )}
              {profileForm.avatar && (
                <button
                  type="button"
                  onClick={() => setProfileForm((prev) => ({ ...prev, avatar: null }))}
                  className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">{t("Name")}</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">{t("Email")}</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setProfileModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {isSavingProfile ? "Saving..." : t("Save Changes")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} title={t("Change Password")}>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Current Password</label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">New Password (min 8 chars)</label>
            <input
              type="password"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={isSavingPassword}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {isSavingPassword ? "Saving..." : t("Change Password")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
