// frontend/src/pages/UsersPage.tsx

import { useState } from "react";
import { Plus, Trash2, Search, Building } from "lucide-react";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "../hooks/useUsers";
import { useRoles } from "../hooks/useRoles";
import { useBranches } from "../hooks/useBranches";
import { Modal } from "../components/ui/Modal";
import { TableSkeleton } from "../components/ui/Skeletons";
import { useAuth } from "../context/AuthContext";
import { formatDate } from "../utils/format";
import { useTranslation } from "../context/LanguageContext";
import { validateEmail } from "../hooks/useContactValidation";

export function UsersPage() {
  const { t } = useTranslation();
  const { user: currentUser, hasPermission } = useAuth();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role_id: "",
    branch_id: "",
  });

  const { data, isLoading } = useUsers({ search });
  const { data: roles } = useRoles();
  const { data: branchesData } = useBranches({ per_page: 100 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const openCreate = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role_id: roles?.[0]?.id.toString() ?? "",
      branch_id: "",
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.role_id) return;

    const emailV = validateEmail(form.email);
    if (!form.email.trim()) { setEmailError("Email address is required"); return; }
    if (emailV.error) { setEmailError(emailV.error); return; }
    setEmailError("");

    createUser.mutate(
      {
        ...form,
        role_id: Number(form.role_id),
        branch_id: form.branch_id ? Number(form.branch_id) : null,
      },
      { onSuccess: () => { setModalOpen(false); setEmailError(""); } }
    );
  };

  // ✅ FIXED - Role Change Handler (empty string to null)
  const handleRoleChange = (userId: number, roleId: string) => {
    const roleIdToSend = (roleId && roleId.trim() !== '') ? Number(roleId) : null;
    updateUser.mutate({
      id: userId,
      payload: { role_id: roleIdToSend }
    });
  };

  // ✅ FIXED - Branch Change Handler (empty string to null)
  const handleBranchChange = (userId: number, branchId: string) => {
    const branchIdToSend = (branchId && branchId.trim() !== '') ? Number(branchId) : null;
    updateUser.mutate({
      id: userId,
      payload: { branch_id: branchIdToSend }
    });
  };

  const handleToggleActive = (userId: number, isActive: boolean) => {
    updateUser.mutate({ id: userId, payload: { is_active: !isActive } });
  };

  const branches = branchesData?.items || [];
  const userList = data?.items || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t("Users")}</h1>
          <p className="text-sm text-slate-500">{data?.total ?? 0} {t("total")}</p>
        </div>
        {hasPermission("users.create") && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
          >
            <Plus size={16} />
            {t("Add User")}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Search users…")}
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
        <table className="w-full min-w-[780px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">{t("Name")}</th>
              <th className="px-4 py-3">{t("Email")}</th>
              <th className="px-4 py-3">{t("Role")}</th>
              <th className="px-4 py-3">{t("Branch")}</th>
              <th className="px-4 py-3">{t("Joined")}</th>
              <th className="px-4 py-3">{t("Status")}</th>
              <th className="w-10 px-4 py-3 text-center">{t("Actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={5} cols={7} />
            ) : userList.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  {t("No users yet.")}
                </td>
              </tr>
            ) : (
              userList.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {u.name}
                    {u.id === currentUser?.id && (
                      <span className="ml-1.5 text-xs text-slate-400">(you)</span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-3 text-slate-500">{u.email}</td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    {hasPermission("users.edit") ? (
                      <select
                        value={u.role_id ?? ""}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                        disabled={u.id === currentUser?.id}
                      >
                        {roles?.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-600">{u.role_name}</span>
                    )}
                  </td>

                  {/* Branch */}
                  <td className="px-4 py-3">
                    {hasPermission("users.edit") ? (
                      <select
                        value={u.branch_id?.toString() ?? ""}
                        onChange={(e) => handleBranchChange(u.id, e.target.value)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand"
                        disabled={u.id === currentUser?.id}
                      >
                        <option value="">— All Branches —</option>
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.code})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-600">
                        {u.branch_id ? (
                          <>
                            <Building size={14} className="text-slate-400" />
                            {u.branch?.name || `Branch ${u.branch_id}`}
                          </>
                        ) : (
                          <span className="text-slate-400">All Branches</span>
                        )}
                      </span>
                    )}
                  </td>

                  {/* Joined Date */}
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.created_at)}</td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <button
                      disabled={u.id === currentUser?.id || !hasPermission("users.edit")}
                      onClick={() => handleToggleActive(u.id, u.is_active)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 transition-colors ${u.is_active
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                    >
                      {u.is_active ? t("Active") : t("Inactive")}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    {hasPermission("users.delete") && u.id !== currentUser?.id && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${u.name}?`)) {
                            deleteUser.mutate(u.id);
                          }
                        }}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        aria-label={t("Delete user")}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t("Add User")}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Name")} *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Enter full name"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Email")} *</label>
            <input
              id="email"
              type="text"
              value={form.email}
              onChange={(e) => {
                const lc = e.target.value.toLowerCase();
                setForm({ ...form, email: lc });
                setEmailError(validateEmail(lc).error || (lc ? "" : ""));
              }}
              placeholder="Enter email address"
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                emailError ? "border-red-400 focus:ring-red-400" : form.email && !emailError ? "border-green-400 focus:ring-green-400" : "border-slate-200 focus:ring-brand"
              }`}
              required
            />
            <p className="mt-0.5 text-xs text-slate-400">e.g. username@domain.com</p>
            {emailError && <p id="email-error" className="mt-1 text-xs text-red-500">{emailError}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Password")} *</label>
            <input
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Role")} *</label>
            <select
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              required
            >
              <option value="">— Select Role —</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Assign Branch")}</label>
            <select
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">— No Branch Assigned —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Leave empty for Super Admin or users who need access to all branches
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.name || !form.email || form.password.length < 8 || createUser.isPending}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createUser.isPending ? t("Adding…") : t("Add User")}
          </button>
        </div>
      </Modal>
    </div>
  );
}