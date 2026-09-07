'use client';

import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { Film, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, loginWithGoogle } = useAuth();

  const getRedirectPath = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('redirect') || '/';
    }
    return '/';
  };

  // If already logged in, redirect
  if (user) {
    router.push(getRedirectPath());
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          <p className="text-white/50 text-sm font-medium">Authenticating securely...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      window.location.href = getRedirectPath();
    } catch (err: any) {
      // Clean up firebase error message
      const message = err.message.replace('Firebase: ', '');
      setError(message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#050505] overflow-hidden">
      {/* Left pane: Decorative/Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-black flex-col justify-between p-12 overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-emerald-500/10 opacity-50 pointer-events-none" />
        {/* Abstract shapes */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-[120px] pointer-events-none animate-pulseGlow" />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-2xl font-black tracking-tight text-white">
            <Film className="h-8 w-8 text-amber-500" />
            <span>Reelist<span className="text-amber-500">.</span></span>
          </div>
        </div>

        <div className="relative z-10 max-w-md animate-slideUp">
          <h1 className="text-5xl font-black text-white tracking-tight mb-6 leading-tight">
            Curate your cinematic universe.
          </h1>
          <p className="text-white/60 text-lg font-medium text-balance">
            Never lose track of a great movie recommendation again. Sync your watchlist effortlessly across all your devices.
          </p>
        </div>
        <div />
      </div>

      {/* Right pane: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10 bg-transparent">
        <div className="w-full max-w-md animate-fadeIn">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center items-center gap-3 text-2xl font-black tracking-tight text-white mb-12">
            <Film className="h-8 w-8 text-amber-500" />
            <span>Reelist<span className="text-amber-500">.</span></span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-white/50 text-sm font-medium">
              {isSignUp 
                ? 'Sign up to sync your watchlist anywhere.' 
                : 'Enter your credentials to access your watchlist.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 ml-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 ml-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm mt-2 ml-1 animate-fadeIn">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 mt-6 bg-white hover:bg-neutral-200 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm font-medium">
              <span className="px-4 bg-[#050505] text-white/40 uppercase tracking-widest text-[10px]">Or continue with</span>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                setLoading(true);
                await loginWithGoogle();
                // Let the reactive 'if (user)' block handle the redirect safely
              } catch (err: any) {
                const message = err.message.replace('Firebase: ', '');
                setError(message || 'Failed to sign in with Google.');
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full h-14 mt-6 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white font-semibold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>


          <div className="mt-8 text-center">
            <p className="text-white/50 text-sm font-medium">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-amber-500 hover:text-amber-400 font-semibold hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
