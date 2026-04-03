'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { apiService } from '@/lib/api';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'student',
    organization: '',
    className: '',
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.signup(
        formData.email,
        formData.password,
        formData.name,
        '',
        formData.role as 'student' | 'tutor',
        formData.organization,
        formData.className
      );

      localStorage.setItem('auth_token', response.token);
      router.push('/dashboard');
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Failed to create account'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-80 h-80 bg-primary-200 rounded-full blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary-200 rounded-full blur-3xl opacity-10"></div>
      </div>

      <div className="w-full max-w-md">
        {/* Back button */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
        >
          ← Back to Home
        </Link>

        <Card variant="elevated" size="lg" className="animate-slide-up shadow-xl">
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl">🎓</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                Interrogo
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
              Create Your Account
            </h1>
            <p className="text-gray-600 text-center">
              Start practicing oral exams with real-time AI feedback
            </p>
            <p className="text-xs text-center text-gray-500 mt-3">
              Free plan: up to 10 exams/month. Pro Monthly: €3.99/month.
            </p>
          </div>

          {apiError && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4 mb-6 flex items-start gap-3 animate-slide-in-right">
              <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-error-800">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 mb-8">
            <Input
              label="Full Name"
              type="text"
              placeholder="Carlo Rossi"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              size="lg"
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              size="lg"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              error={errors.password}
              helperText="At least 6 characters"
              size="lg"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              error={errors.confirmPassword}
              size="lg"
            />

            <div>
              <label className="block mb-2 text-sm font-semibold text-secondary-700">Account type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`rounded-md border p-2 text-sm font-medium ${formData.role === 'student' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700'}`}
                  onClick={() => setFormData({ ...formData, role: 'student' })}
                >
                  Student
                </button>
                <button
                  type="button"
                  className={`rounded-md border p-2 text-sm font-medium ${formData.role === 'tutor' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700'}`}
                  onClick={() => setFormData({ ...formData, role: 'tutor' })}
                >
                  Tutor/Teacher
                </button>
              </div>
            </div>

            <Input
              label="Organization (optional)"
              type="text"
              placeholder="e.g. High School Galileo"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              size="lg"
            />

            <Input
              label="Class (optional)"
              type="text"
              placeholder="e.g. 3A"
              value={formData.className}
              onChange={(e) => setFormData({ ...formData, className: e.target.value })}
              size="lg"
            />

            <Button
              fullWidth={true}
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
              {!isLoading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4">
              Already have an account?
            </p>
            <Button
              fullWidth={true}
              variant="outline"
              size="lg"
              type="button"
              onClick={() => router.push('/login')}
            >
              Login
            </Button>
          </div>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-6">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="text-primary-600 hover:underline">
            Terms
          </Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
