import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { ButtonSpinner } from '@/components/common/LoadingSpinner';
import clsx from 'clsx';

const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp, sessionLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      terms: false,
    },
    mode: 'onSubmit',
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      if (data.password !== data.confirmPassword) {
        setError('confirmPassword', {
          type: 'manual',
          message: 'Passwords do not match',
        });
        return;
      }

      const { error } = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setError('root', {
            type: 'manual',
            message: 'An account with this email already exists. Please sign in instead.',
          });
        } else if (error.message.includes('Password should be at least')) {
          setError('password', {
            type: 'manual',
            message: error.message,
          });
        } else if (error.message.includes('Invalid email')) {
          setError('email', {
            type: 'manual',
            message: 'Please enter a valid email address',
          });
        } else {
          setError('root', {
            type: 'manual',
            message: error.message || 'Failed to create account. Please try again.',
          });
        }
        return;
      }

      // Redirect to login with success message
      navigate('/login', { 
        state: { message: 'Account created successfully! Please check your email to confirm your account.' }
      });
    } catch (error) {
      console.error('Registration error:', error);
      setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const isLoading = isSubmitting || sessionLoading;

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
                d="M20 7L12 3L4 7v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join{' '}
            <span className="font-medium text-primary-600">
              Inventory Management System
            </span>
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

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="label">
                  First Name
                </label>
                <input
                  {...register('firstName', {
                    required: 'First name is required',
                    minLength: {
                      value: 2,
                      message: 'First name must be at least 2 characters',
                    },
                  })}
                  type="text"
                  autoComplete="given-name"
                  className={clsx(
                    'input',
                    errors.firstName && 'input-error'
                  )}
                  placeholder="First name"
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-error-600">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="label">
                  Last Name
                </label>
                <input
                  {...register('lastName', {
                    required: 'Last name is required',
                    minLength: {
                      value: 1,
                      message: 'Last name must be at least 1 character',
                    },
                  })}
                  type="text"
                  autoComplete="family-name"
                  className={clsx(
                    'input',
                    errors.lastName && 'input-error'
                  )}
                  placeholder="Last name"
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-error-600">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

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
                className={clsx(
                  'input',
                  errors.email && 'input-error'
                )}
                placeholder="Enter your email"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="label">
                Role
              </label>
              <select
                {...register('role', {
                  required: 'Role is required',
                })}
                className={clsx(
                  'input',
                  errors.role && 'input-error'
                )}
                disabled={isLoading}
              >
                <option value="user">User</option>
                <option value="warehouse_staff">Warehouse Staff</option>
                <option value="sales_staff">Sales Staff</option>
                <option value="purchaser">Purchaser</option>
                <option value="manager">Manager</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-error-600">
                  {errors.role.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={clsx(
                    'input pr-10',
                    errors.password && 'input-error'
                  )}
                  placeholder="Create a password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600">
                  {errors.password.message}
                </p>
              )}
              <div className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters with uppercase, lowercase, and number
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value) =>
                      value === password || 'Passwords do not match',
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={clsx(
                    'input pr-10',
                    errors.confirmPassword && 'input-error'
                  )}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-error-600">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('terms', {
                  validate: (value) => value === true || 'You must accept the terms and conditions',
                })}
                id="terms"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={isLoading}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-gray-700">
                I agree to the{' '}
                <Link
                  to="/terms"
                  className="font-medium text-primary-600 hover:text-primary-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link
                  to="/privacy"
                  className="font-medium text-primary-600 hover:text-primary-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </Link>
              </label>
              {errors.terms && (
                <p className="mt-1 text-sm text-error-600">
                  {errors.terms.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <ButtonSpinner className="mr-2" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;