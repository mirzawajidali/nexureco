import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import { userApi } from '@/api/user.api';
import type { Address } from '@/types/user';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';

const addressSchema = z.object({
  label: z.string().optional(),
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  address_line1: z.string().min(1, 'Required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  postal_code: z.string().min(1, 'Required'),
  country: z.string().default('Pakistan'),
  is_default: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AccountAddresses() {
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => userApi.listAddresses(),
  });

  const addresses: Address[] = data?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'Pakistan', is_default: false },
  });

  const createMutation = useMutation({
    mutationFn: (data: AddressFormData) => userApi.createAddress(data as Omit<Address, 'id' | 'created_at'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address added');
      setShowForm(false);
      setEditingAddress(null);
      reset();
    },
    onError: () => toast.error('Failed to add address'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AddressFormData }) =>
      userApi.updateAddress(id, data as Omit<Address, 'id' | 'created_at'>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address updated');
      setShowForm(false);
      setEditingAddress(null);
      reset();
    },
    onError: () => toast.error('Failed to update address'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userApi.deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted');
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: number) => userApi.setDefaultAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Default address updated');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading font-heading uppercase">Addresses</h2>
        <Button size="sm" variant="secondary" onClick={() => {
          setEditingAddress(null);
          reset({ country: 'Pakistan', is_default: false });
          setShowForm(!showForm);
        }}>
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Address
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="border border-gray-200 p-6 mb-6">
          <h3 className="text-xs font-heading font-bold uppercase tracking-wider mb-4">
            {editingAddress ? 'Edit Address' : 'New Address'}
          </h3>
          <form
            onSubmit={handleSubmit((d) =>
              editingAddress
                ? updateMutation.mutate({ id: editingAddress.id, data: d })
                : createMutation.mutate(d)
            )}
            className="space-y-4"
          >
            <Input label="Label (e.g. Home, Office)" {...register('label')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" {...register('first_name')} error={errors.first_name?.message} />
              <Input label="Last Name" {...register('last_name')} error={errors.last_name?.message} />
            </div>
            <Input label="Phone" {...register('phone')} />
            <Input label="Address Line 1" {...register('address_line1')} error={errors.address_line1?.message} />
            <Input label="Address Line 2" {...register('address_line2')} />
            <div className="grid grid-cols-3 gap-4">
              <Input label="City" {...register('city')} error={errors.city?.message} />
              <Input label="State" {...register('state')} error={errors.state?.message} />
              <Input label="Postal Code" {...register('postal_code')} error={errors.postal_code?.message} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('is_default')} className="accent-brand-black" />
              Set as default address
            </label>
            <div className="flex gap-3">
              <Button type="submit" size="sm" isLoading={editingAddress ? updateMutation.isPending : createMutation.isPending}>
                {editingAddress ? 'Update Address' : 'Save Address'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => {
                setShowForm(false);
                setEditingAddress(null);
                reset();
              }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50">
          <p className="text-sm text-gray-500">No addresses saved yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div key={addr.id} className="border border-gray-200 p-5 relative">
              {addr.is_default && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-success font-bold">
                  <CheckCircleIcon className="h-4 w-4" />
                  Default
                </span>
              )}
              {addr.label && (
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {addr.label}
                </p>
              )}
              <p className="text-sm font-bold">
                {addr.first_name} {addr.last_name}
              </p>
              <p className="text-sm text-gray-500">{addr.address_line1}</p>
              {addr.address_line2 && (
                <p className="text-sm text-gray-500">{addr.address_line2}</p>
              )}
              <p className="text-sm text-gray-500">
                {addr.city}, {addr.state} {addr.postal_code}
              </p>
              {addr.phone && <p className="text-sm text-gray-500">{addr.phone}</p>}

              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setEditingAddress(addr);
                    reset({
                      label: addr.label || '',
                      first_name: addr.first_name,
                      last_name: addr.last_name,
                      phone: addr.phone || '',
                      address_line1: addr.address_line1,
                      address_line2: addr.address_line2 || '',
                      city: addr.city,
                      state: addr.state,
                      postal_code: addr.postal_code,
                      country: addr.country || 'Pakistan',
                      is_default: addr.is_default,
                    });
                    setShowForm(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black flex items-center gap-1"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                  Edit
                </button>
                {!addr.is_default && (
                  <button
                    onClick={() => defaultMutation.mutate(addr.id)}
                    className="text-xs font-heading font-bold uppercase tracking-wider text-gray-500 hover:text-brand-black"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('Delete this address?')) deleteMutation.mutate(addr.id);
                  }}
                  className="text-xs font-heading font-bold uppercase tracking-wider text-gray-400 hover:text-brand-accent flex items-center gap-1"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
