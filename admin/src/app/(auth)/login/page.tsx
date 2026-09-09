'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { api, ApiError } from '@/lib/api';
import { setAuthSession, isAllowedAdminRole } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res: any = await api.post('/auth/login', {
        email: email.trim(),
        password,
      });

      const user = res.data?.user;
      if (!user || !isAllowedAdminRole(user.role)) {
        throw new Error(
          `Unauthorized: Your account role (${user?.role || 'UNKNOWN'}) does not have administrative privileges.`,
        );
      }

      setAuthSession({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          profile: user.profile,
        },
      });

      toastSuccess(`Welcome back, ${user.profile?.fullName || user.email}!`);
      router.push('/overview');
    } catch (err: any) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err?.message || 'Login failed. Please verify your credentials.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = () => {
    setEmail('admin@sanipay.ng');
    setPassword('AdminSecurePassword123!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none glow-ambient" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none glow-ambient" />

      <div className="w-full max-w-md z-10">
        {/* Brand Banner */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 flex items-center justify-center shadow-xl shadow-emerald-500/20 text-slate-950 font-black mb-3.5">
            <Zap className="w-7 h-7 fill-slate-950" />
          </div>
          <h1 className="text-2xl font-bold text-slate-50 tracking-tight">
            SaniPay Admin Console
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise back-office authentication
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-8 backdrop-blur-2xl border-slate-800 shadow-2xl">
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Administrator Email"
              type="email"
              placeholder="admin@sanipay.ng"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              <span>Authenticate & Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">
              Local Development Mode
            </span>
            <button
              type="button"
              onClick={handleDemoFill}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors underline cursor-pointer"
            >
              Fill default admin credentials
            </button>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          Authorized personnel only. All access attempts are logged to the immutable audit trail.
        </p>
      </div>
    </div>
  );
}
