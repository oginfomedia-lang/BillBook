import { useState } from "react";
import { Plus, Trash2, Pencil, ShieldCheck } from "lucide-react";
import { useRoles, usePermissionCatalog, useCreateRole, useUpdateRole, useDeleteRole } from "../hooks/useRoles";
import { Modal } from "../components/ui/Modal";
import { PermissionEditor } from "../components/ui/PermissionEditor";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";
import { useTranslation } from "../context/LanguageContext";

export function RolesPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { data: roles, isLoading } = useRoles();
  const { data: catalog } = usePermissionCatalog();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", description: "", permissions: [] as string[] });

  const openCreate = () => {
    setEditingRole(null);
    setForm({ name: "", description: "", permissions: [] });
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description ?? "", permissions: role.permissions });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingRole) {
      updateRole.mutate(
        { id: editingRole.id, payload: form },
        { onSuccess: () => setModalOpen(false) }
      );
    } else {
      createRole.mutate(form, { onSuccess: () => setModalOpen(false) });
    }
  };

  const isSystemRole = editingRole?.is_system ?? false;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t("Roles")}</h1>
          <p className="text-sm text-slate-500">{t("Define what each role can see and do.")}</p>
        </div>
        {hasPermission("roles.create") && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            <Plus size={16} />
            {t("New Role")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ))
        ) : (
          roles?.map((role) => (
            <div key={role.id} className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light text-brand-dark">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-ink-900">{role.name}</p>
                    <p className="text-xs text-slate-400">{role.user_count} {role.user_count === 1 ? "user" : "users"}</p>
                  </div>
                </div>
                {role.is_system && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{t("Built-in")}</span>
                )}
              </div>
              {role.description && <p className="mt-3 text-sm text-slate-500">{role.description}</p>}
              <p className="mt-2 text-xs text-slate-400">{role.permissions.length} {t("permissions granted")}</p>

              <div className="mt-4 flex gap-2">
                {hasPermission("roles.edit") && (
                  <button
                    onClick={() => openEdit(role)}
                    className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-slate-50"
                  >
                    <Pencil size={12} />
                    {t("Edit")}
                  </button>
                )}
                {hasPermission("roles.delete") && !role.is_system && (
                  <button
                    onClick={() => deleteRole.mutate(role.id)}
                    className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-danger hover:bg-danger-light"
                  >
                    <Trash2 size={12} />
                    {t("Delete")}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRole ? t("Edit role") : t("New role")}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {isSystemRole && (
            <p className="rounded-md bg-warn-light px-3 py-2 text-xs text-warn">
              {t("This is a built-in role and can't be edited.")}
            </p>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Role name")}</label>
            <input
              value={form.name}
              disabled={isSystemRole}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Description")}</label>
            <input
              value={form.description}
              disabled={isSystemRole}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-slate-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">{t("Permissions")}</label>
            {catalog ? (
              <PermissionEditor
                catalog={catalog.catalog}
                selected={form.permissions}
                onChange={(permissions) => setForm({ ...form, permissions })}
                disabled={isSystemRole}
              />
            ) : (
              <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>

          {!isSystemRole && (
            <button
              onClick={handleSubmit}
              disabled={!form.name || createRole.isPending || updateRole.isPending}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {createRole.isPending || updateRole.isPending ? t("Saving…") : t("Save role")}
            </button>
          )}
        </div>
      </Modal>
    </div>
  );
}