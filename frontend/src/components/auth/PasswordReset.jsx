import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { ButtonSpinner } from '@/components/common/LoadingSpinner';
import clsx from 'clsx';

const PasswordReset = () => {
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    getValues,
  } = useForm({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      const { error } = await resetPassword(data.email);

      if (error) {
        if (error.message.includes('User not found')) {
          setError('email', {
            type: 'manual',
            message: 'No account found with this email address',
          });
        } else if (error.message.includes('Invalid email')) {
          setError('email', {
            type: 'manual',
            message: 'Please enter a valid email address',
          });
        } else {
          setError('root', {
            type: 'manual',
            message: error.message || 'Failed to send reset email. Please try again.',
          });
        }
        return;
      }

      setEmailSent(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const handleResendEmail = async () => {
    const email = getValues('email');
    if (email) {
      await resetPassword(email);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-success-100">
              <svg
                className="h-8 w-8 text-success-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Check your email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              We've sent a password reset link to{' '}
              <span className="font-medium text-gray-900">
                {getValues('email')}
              </span>
            </p>
          </div>

          <div className="card">
            <div className="card-body text-center space-y-4">
              <div className="text-sm text-gray-600">
                <p>Click the link in the email to reset your password.</p>
                <p className="mt-2">
                  If you don't see the email, check your spam folder.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleResendEmail}
                  className="btn-secondary w-full"
                >
                  Resend email
                </button>

                <Link
                  to="/login"
                  className="btn-primary w-full flex items-center justify-center"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to sign in
                </Link>
              </div>

              <div className="text-xs text-gray-500">
                <p>
                  Still having trouble?{' '}
                  <a
                    href="mailto:support@inventoryms.com"
                    className="text-primary-600 hover:text-primary-500"
                  >
                    Contact support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <svg
              className="h-8 w-8 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {errors.root && (
            <div className="alert-error">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-error-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{errors.root.message}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              Email address
            </label>
            <input
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              type="email"
              autoComplete="email"
              autoFocus
              className={clsx(
                'input',
                errors.email && 'input-error'
              )}
              placeholder="Enter your email address"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-error-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <ButtonSpinner className="mr-2" />
                  Sending reset link...
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Send reset link
                </>
              )}
            </button>

            <Link
              to="/login"
              className="btn-secondary w-full flex items-center justify-center"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to sign in
            </Link>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordReset;