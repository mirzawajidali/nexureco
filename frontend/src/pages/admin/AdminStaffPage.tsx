import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminStaffApi, adminRolesApi } from '@/api/admin.api';
import type { StaffUser, Role } from '@/types/role';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null);

  const { data, isLoading } = useQuery<{ items: StaffUser[]; total: number; page: number }>({
    queryKey: ['admin', 'staff'],
    queryFn: () => adminStaffApi.list().then((r) => r.data),
  });

  const staff = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminStaffApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      toast.success('Staff member deleted');
      setDeletingStaff(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to delete staff');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      adminStaffApi.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      toast.success('Status updated');
    },
  });

  function openCreate() {
    setEditingStaff(null);
    setModalOpen(true);
  }

  function openEdit(s: StaffUser) {
    setEditingStaff(s);
    setModalOpen(true);
  }

  function handleDelete(s: StaffUser) {
    setDeletingStaff(s);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-gray-500" />
            Staff
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff members and their role assignments</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add staff
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-900 rounded-full mx-auto" />
        </div>
      ) : staff.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <UserGroupIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No staff members yet</p>
          <button
            onClick={openCreate}
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Add your first staff member
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Last Login</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{s.email}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                      {s.role_name || 'No role'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleMutation.mutate({ id: s.id, is_active: !s.is_active })}
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        s.is_active
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      } transition-colors`}
                    >
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {s.last_login_at
                      ? new Date(s.last_login_at).toLocaleDateString('en-PK', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <StaffModal
          staff={editingStaff}
          onClose={() => setModalOpen(false)}
        />
      )}

      {deletingStaff && (
        <DeleteConfirmModal
          title="Delete Staff Member"
          message={`Are you sure you want to delete "${deletingStaff.first_name} ${deletingStaff.last_name}"? This action cannot be undone.`}
          isDeleting={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deletingStaff.id)}
          onCancel={() => setDeletingStaff(null)}
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

// --- Staff Create/Edit Modal ---

function StaffModal({ staff, onClose }: { staff: StaffUser | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEdit = !!staff;

  const [firstName, setFirstName] = useState(staff?.first_name ?? '');
  const [lastName, setLastName] = useState(staff?.last_name ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [phone, setPhone] = useState(staff?.phone ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number | ''>(staff?.role_id ?? '');

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['admin', 'roles'],
    queryFn: () => adminRolesApi.list().then((r) => r.data),
  });

  const activeRoles = roles.filter((r) => r.is_active);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? adminStaffApi.update(staff!.id, data) : adminStaffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
      toast.success(isEdit ? 'Staff updated' : 'Staff created');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to save staff');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roleId) {
      toast.error('Please select a role');
      return;
    }

    if (isEdit) {
      mutation.mutate({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
        role_id: Number(roleId),
      });
    } else {
      if (!password || password.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      mutation.mutate({
        email: email.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || undefined,
        role_id: Number(roleId),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Staff Member' : 'Add Staff Member'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none"
                required
                minLength={8}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            {activeRoles.length === 0 ? (
              <p className="text-sm text-amber-600">
                No roles available. Please create a role first.
              </p>
            ) : (
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none bg-white"
                required
              >
                <option value="">Select a role...</option>
                {activeRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.permissions.length} modules)
                  </option>
                ))}
              </select>
            )}
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
              disabled={mutation.isPending || activeRoles.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
