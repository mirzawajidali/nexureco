import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminRolesApi } from '@/api/admin.api';
import { MODULE_LABELS, ADMIN_MODULES } from '@/types/role';
import type { Role, AdminModule } from '@/types/role';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminRolesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminRolesApi.list().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminRolesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      toast.success('Role deleted');
      setDeletingRole(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete role');
    },
  });

  function openCreate() {
    setEditingRole(null);
    setModalOpen(true);
  }

  function openEdit(role: Role) {
    setEditingRole(role);
    setModalOpen(true);
  }

  function handleDelete(role: Role) {
    if (role.staff_count > 0) {
      toast.error('Cannot delete a role assigned to staff members');
      return;
    }
    setDeletingRole(role);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-gray-500" />
            Roles
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff roles and their module permissions</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Create role
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto" />
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShieldCheckIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No roles created yet</p>
          <button
            onClick={openCreate}
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Create your first role
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  {role.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(role)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {role.permissions.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">No permissions</span>
                ) : (
                  role.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium"
                    >
                      {MODULE_LABELS[perm as AdminModule] || perm}
                    </span>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <span>{role.staff_count} staff member{role.staff_count !== 1 ? 's' : ''}</span>
                <span className={role.is_active ? 'text-green-600' : 'text-red-500'}>
                  {role.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <RoleModal
          role={editingRole}
          onClose={() => setModalOpen(false)}
        />
      )}

      {deletingRole && (
        <DeleteConfirmModal
          title="Delete Role"
          message={`Are you sure you want to delete the role "${deletingRole.name}"? This action cannot be undone.`}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deletingRole.id)}
          onCancel={() => setDeletingRole(null)}
        />
      )}
    </div>
  );
}

// --- Delete Confirmation Modal ---

function DeleteConfirmModal({
  title,
  message,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-50">
            <TrashIcon className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 text-center">{title}</h3>
          <p className="text-sm text-gray-500 text-center mt-2">{message}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Role Create/Edit Modal ---

function RoleModal({ role, onClose }: { role: Role | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = !!role;
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);

  const mutation = useMutation({
    mutationFn: (data: { name: string; description?: string; permissions: string[] }) =>
      isEdit ? adminRolesApi.update(role!.id, data) : adminRolesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
      toast.success(isEdit ? 'Role updated' : 'Role created');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save role');
    },
  });

  function togglePermission(mod: string) {
    setPermissions((prev) =>
      prev.includes(mod) ? prev.filter((p) => p !== mod) : [...prev, mod]
    );
  }

  function toggleAll() {
    if (permissions.length === ADMIN_MODULES.length) {
      setPermissions([]);
    } else {
      setPermissions([...ADMIN_MODULES]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate({ name: name.trim(), description: description.trim() || undefined, permissions });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Role' : 'Create Role'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Manager"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Module Permissions</label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {permissions.length === ADMIN_MODULES.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_MODULES.map((mod) => (
                <label
                  key={mod}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(mod)}
                    onChange={() => togglePermission(mod)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-sm text-gray-700">
                    {MODULE_LABELS[mod as AdminModule] || mod}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
