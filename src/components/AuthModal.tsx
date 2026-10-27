import React, { useState } from 'react';
import { X, Eye, EyeOff, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../api';
import type { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetRole, setTargetRole] = useState('Senior Full-Stack Engineer');
  const [targetCompany, setTargetCompany] = useState('Stripe');
  const [experienceLevel, setExperienceLevel] = useState('Senior (5-8 years)');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const res = await api.register({
          name,
          email,
          password,
          target_role: targetRole,
          target_company: targetCompany,
          experience_level: experienceLevel,
        });
        onSuccess(res.user);
      } else {
        const res = await api.login({ email, password });
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({
        email: 'raghav@example.com',
        password: 'Password123!',
      });
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError('Could not sign into demo account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05070e]/85 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#131b31] via-[#0d1424] to-[#070b16] border border-white/[0.12] border-t-white/[0.25] rounded-3xl shadow-2xl shadow-black/80 overflow-hidden p-6 sm:p-8">
        {/* Subtle ambient lighting orbs */}
        <div className="absolute -top-24 -right-24 w-52 h-52 bg-violet-600/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-52 h-52 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button with subtle depth */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-500 p-0.5 mb-3.5 shadow-lg shadow-violet-600/30">
            <div className="w-full h-full bg-[#0c1222] rounded-[14px] flex items-center justify-center border-t border-white/25">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {mode === 'register' ? 'Create Your Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {mode === 'register'
              ? 'Start preparing with your personalized AI interview coach'
              : 'Sign in to access your interview workspace and study packs'}
          </p>
        </div>

        {/* 3D Quick Demo Button */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full mb-5 flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-violet-950/60 via-indigo-950/40 to-slate-900 border border-violet-500/40 hover:border-violet-400/60 text-violet-200 text-xs font-semibold transition-all cursor-pointer shadow-md shadow-violet-950/50 group active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping shadow-[0_0_8px_#22d3ee]" />
            <span className="text-slate-200">Instant Demo: <strong className="text-white">Raghav (Senior Full-Stack)</strong></span>
          </div>
          <span className="text-[11px] text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-bold">
            Try 1-Click <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-white/[0.08]"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Or continue with email</span>
          <div className="flex-grow border-t border-white/[0.08]"></div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-900/60 text-rose-300 text-xs flex items-start gap-2 shadow-sm">
            <span className="font-bold">•</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form with 3D inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full px-3.5 py-2.5 input-3d rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3.5 py-2.5 input-3d rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3.5 py-2.5 input-3d rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Role</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Full-Stack Engineer"
                  className="w-full px-3 py-2 input-3d rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Company</label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. Stripe, Google"
                  className="w-full px-3 py-2 input-3d rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2.5 py-3 px-4 rounded-xl font-bold text-xs tracking-wider uppercase btn-3d-primary text-white cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : mode === 'register' ? (
              'Create Free Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer switch */}
        <div className="mt-5 text-center text-xs text-slate-400">
          {mode === 'register' ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="text-cyan-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(null); }}
                className="text-cyan-400 hover:underline font-semibold"
              >
                Register
              </button>
            </p>
          )}
        </div>

        {/* Security badge */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Salted password hashing & per-user isolated storage</span>
        </div>
      </div>
    </div>
  );
};
