import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { userApi } from '@/api/user.api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function AccountPassword() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      userApi.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      reset();
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to change password');
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    mutation.mutate({
      current_password: data.current_password,
      new_password: data.new_password,
    });
  };

  return (
    <div>
      <h2 className="text-heading font-heading uppercase mb-6">Change Password</h2>

      <div className="max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            {...register('current_password')}
            error={errors.current_password?.message}
          />
          <Input
            label="New Password"
            type="password"
            {...register('new_password')}
            error={errors.new_password?.message}
          />
          <Input
            label="Confirm New Password"
            type="password"
            {...register('confirm_password')}
            error={errors.confirm_password?.message}
          />
          <Button type="submit" isLoading={mutation.isPending}>
            Update Password
          </Button>
        </form>
      </div>
    </div>
  );
}
