import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { userApi } from '@/api/user.api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AccountProfile() {
  const { user, setUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone: user?.phone || '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileFormData) => userApi.updateProfile(data),
    onSuccess: (res) => {
      setUser(res.data);
      toast.success('Profile updated');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  return (
    <div>
      <h2 className="text-heading font-heading uppercase mb-6">Profile Information</h2>

      <div className="max-w-lg">
        {/* Email (read-only) */}
        <div className="mb-4">
          <label className="input-label">Email</label>
          <p className="text-sm text-gray-600 bg-gray-50 px-4 py-3 border border-gray-200">
            {user?.email}
          </p>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              {...register('first_name')}
              error={errors.first_name?.message}
            />
            <Input
              label="Last Name"
              {...register('last_name')}
              error={errors.last_name?.message}
            />
          </div>
          <Input label="Phone" {...register('phone')} />
          <Button type="submit" isLoading={mutation.isPending}>
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
