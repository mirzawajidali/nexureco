import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/auth.api';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { APP_NAME } from '@/utils/constants';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setSubmitted(true);
    } catch {
      // Still show success to not reveal if email exists
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password | {APP_NAME}</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {submitted ? (
            <div className="text-center">
              <h1 className="text-heading-xl font-heading uppercase mb-4">Check Your Email</h1>
              <p className="text-sm text-gray-500 mb-8">
                If an account exists with that email, we've sent a password reset link.
                Check your inbox and follow the instructions.
              </p>
              <Link to="/login">
                <Button variant="secondary">Back to Sign In</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-10">
                <h1 className="text-display font-heading uppercase mb-2">Reset Password</h1>
                <p className="text-sm text-gray-500">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                  label="Email"
                  type="email"
                  placeholder="your@email.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Button type="submit" fullWidth isLoading={isLoading} size="lg">
                  Send Reset Link
                </Button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  to="/login"
                  className="text-xs font-heading font-bold uppercase tracking-wider hover:text-gray-600 transition-colors"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
