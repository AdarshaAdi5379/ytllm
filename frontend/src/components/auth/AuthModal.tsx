import { useState, FormEvent } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { loginUser, registerUser } from '../../api/client';
import { supabase } from '../../lib/supabase';
import {
  signInWithGoogle,
  signInWithGitHub,
  signInWithEmail,
  signUpWithEmail,
  resetPasswordForEmail,
  updatePassword,
} from '../../lib/auth';

interface Props {
  onClose: () => void;
  initialTab?: 'login' | 'register' | 'forgotPassword' | 'setPassword';
}

export function AuthModal({ onClose, initialTab }: Props) {
  const [tab, setTab] = useState<'login' | 'register' | 'forgotPassword' | 'setPassword'>(initialTab || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setSupabaseAuth = useAuthStore((s) => s.setSupabaseAuth);
  const clearPasswordRecovery = useAuthStore((s) => s.clearPasswordRecovery);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();

    if (tab === 'forgotPassword') {
      if (!trimmedEmail) {
        setError('Please enter your email address.');
        return;
      }
      setLoading(true);
      try {
        await resetPasswordForEmail(trimmedEmail);
        setResetSent(true);
      } catch (err) {
        setError((err as Error).message || 'Failed to send reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (tab === 'setPassword') {
      if (!password) {
        setError('Please enter a new password.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        await updatePassword(password);
        // After successful update, the user is now signed in — resolve from session
        const { getSupabaseSession } = await import('../../lib/auth');
        const session = await getSupabaseSession();
        if (session?.access_token) {
          await setSupabaseAuth(session.access_token);
        }
        clearPasswordRecovery();
        onClose();
      } catch (err) {
        setError((err as Error).message || 'Failed to reset password.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (tab === 'register') {
      if (!confirmPassword) {
        setError('Please confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (supabase) {
        if (tab === 'login') {
          const data = await signInWithEmail(trimmedEmail, password);
          if (data.session?.access_token) {
            await setSupabaseAuth(data.session.access_token);
          }
        } else {
          const data = await signUpWithEmail(trimmedEmail, password);
          if (data.session?.access_token) {
            await setSupabaseAuth(data.session.access_token);
          } else {
            setError('Account created! Check your email for a verification link to sign in.');
            return;
          }
        }
      } else {
        const result = tab === 'login'
          ? await loginUser(trimmedEmail, password)
          : await registerUser(trimmedEmail, password, confirmPassword);
        setAuth(result.user, result.access_token);
      }
      onClose();
    } catch (err) {
      const apiErr = err as Error & { code?: string };
      if (apiErr.code === 'OAUTH_ACCOUNT') {
        if (supabase) {
          setError('This account uses Google/GitHub sign-in. Please use the OAuth buttons below.');
        } else {
          setError('This account uses Google/GitHub sign-in, which is not available right now.');
        }
      } else {
        setError((err as Error).message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError('');
    setOauthLoading(provider);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGitHub();
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || `${provider} sign in failed.`);
      setOauthLoading(null);
    }
  };

  const showHeader = tab === 'login' || tab === 'register';
  const showTabs = tab === 'login' || tab === 'register';
  const showOAuth = supabase && tab === 'login' || supabase && tab === 'register';

  // Set password view
  if (tab === 'setPassword') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <KeyRound size={20} className="text-brand-500" />
              <h2 className="text-base font-semibold text-gray-900">Set New Password</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-sm text-gray-600">Enter your new password below.</p>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Re-enter your new password"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
            {loading && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-brand-500">Resetting password...</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Forgot password — reset sent success view
  if (tab === 'forgotPassword' && resetSent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Check Your Email</h2>
          <p className="text-sm text-gray-600 mb-6">
            We've sent a password reset link to <strong>{email}</strong>. Click the link to reset your password.
          </p>
          <button
            onClick={() => { setTab('login'); setResetSent(false); setEmail(''); setError(''); }}
            className="text-sm text-brand-500 hover:text-brand-600 font-medium"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {tab === 'forgotPassword' ? (
              <>
                <Lock size={20} className="text-brand-500" />
                <h2 className="text-base font-semibold text-gray-900">Reset Password</h2>
              </>
            ) : showHeader ? (
              <>
                {tab === 'login' ? <LogIn size={20} className="text-brand-500" /> : <UserPlus size={20} className="text-brand-500" />}
                <h2 className="text-base font-semibold text-gray-900">
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                </h2>
              </>
            ) : null}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        {showTabs && (
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setTab('login'); setError(''); setConfirmPassword(''); setOauthLoading(null); }}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                tab === 'login' ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); setConfirmPassword(''); setOauthLoading(null); }}
              className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${
                tab === 'register' ? 'text-brand-500 border-b-2 border-brand-500' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Forgot password — email input view */}
        {tab === 'forgotPassword' && !resetSent && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-sm text-gray-600">Enter your email and we'll send you a reset link.</p>
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
            {loading && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-brand-500">Sending reset link...</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => { setTab('login'); setError(''); }}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Sign In
            </button>
          </form>
        )}

        {/* OAuth buttons */}
        {showOAuth && (
          <div className="px-5 pt-5 space-y-2">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={loading || oauthLoading !== null}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {oauthLoading === 'google' ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {oauthLoading === 'google' ? 'Redirecting to Google...' : 'Continue with Google'}
            </button>

            <button
              type="button"
              onClick={() => handleOAuth('github')}
              disabled={loading || oauthLoading !== null}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {oauthLoading === 'github' ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#24292F">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.576 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              )}
              {oauthLoading === 'github' ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
            </button>

            {/* Separator */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">or</span>
              </div>
            </div>
          </div>
        )}

        {/* Email/Password Form (login/register only) */}
        {(tab === 'login' || tab === 'register') && (
          <form onSubmit={handleSubmit} className={`${showOAuth ? 'px-5 pb-5' : 'p-5'} space-y-4`}>
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  disabled={loading || oauthLoading !== null}
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  disabled={loading || oauthLoading !== null}
                />
              </div>
            </div>
            {tab === 'register' && (
              <div>
                <label htmlFor="auth-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    disabled={loading || oauthLoading !== null}
                  />
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {tab === 'login' && supabase && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setTab('forgotPassword'); setError(''); setPassword(''); }}
                  className="text-xs text-brand-500 hover:text-brand-600 font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500" role="alert">{error}</p>
            )}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-brand-500">{tab === 'login' ? 'Signing in...' : 'Creating account...'}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || oauthLoading !== null || !email.trim() || !password}
              className="w-full py-2.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}