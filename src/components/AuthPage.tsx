/**
 * En Passant
 * Authentication Gateway with Dedicated Participant Access
 * No sign-up or password required for participants to search tournaments & view live pairings.
 */

import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Search,
  ArrowRight,
  Shield,
  Users,
} from 'lucide-react';

interface AuthPageProps {
  onSignInWithGoogle: () => Promise<void>;
  onEnterAsParticipant: () => void;
  initialMode?: 'login' | 'signup' | 'participant';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSignInWithGoogle,
  onEnterAsParticipant,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'participant'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('signup')) {
      setMode('signup');
    } else if (path.includes('participant')) {
      setMode('participant');
    } else if (path.includes('login')) {
      setMode('login');
    }
  }, []);

  const handleModeSwitch = (newMode: 'login' | 'signup' | 'participant') => {
    setMode(newMode);
    setErrorMessage(null);
    try {
      window.history.pushState(
        null,
        '',
        newMode === 'signup' ? '/signup' : newMode === 'participant' ? '/participant' : '/login'
      );
    } catch {}
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (name.trim() && userCredential.user) {
          await updateProfile(userCredential.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password provider is disabled in Firebase Console. Please enable Email/Password under Authentication > Sign-in method in Firebase Console.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setLoading(true);
    try {
      await onSignInWithGoogle();
    } catch (err: any) {
      console.error('Google auth error:', err);
      const isUnauthDomain =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('auth/unauthorized-domain');

      if (isUnauthDomain) {
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'Netlify domain';
        setErrorMessage(
          `Domain "${hostname}" is not authorized. Add it in Firebase Console > Authentication > Settings > Authorized domains, or use Email & Password below.`
        );
      } else {
        setErrorMessage(err.message || 'Google sign-in was cancelled or failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Clean Top Header */}
      <header className="border-b border-neutral-850 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-amber-400 font-bold">
            <span className="text-lg leading-none">♞</span>
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            En Passant
          </span>
        </div>

        {/* Quick Participant Shortcut */}
        <button
          onClick={onEnterAsParticipant}
          className="text-xs text-neutral-300 hover:text-amber-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-amber-400" />
          <span>Participant Search</span>
        </button>
      </header>

      {/* Centered Minimal Auth Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-7 space-y-5 shadow-xl">
          {/* Navigation Mode Tabs */}
          <div className="flex border-b border-neutral-800 pb-2 gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`pb-1.5 transition-colors ${
                mode === 'login'
                  ? 'border-b-2 border-amber-400 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Director Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`pb-1.5 transition-colors ${
                mode === 'signup'
                  ? 'border-b-2 border-amber-400 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('participant')}
              className={`pb-1.5 transition-colors flex items-center gap-1 ${
                mode === 'participant'
                  ? 'border-b-2 border-amber-400 text-amber-400 font-bold'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <span>Participant</span>
              <span className="text-[9px] bg-amber-400/10 text-amber-400 px-1 rounded border border-amber-400/30">Free</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* MODE: PARTICIPANT LOGIN (No ID or Password Required)     */}
          {/* ======================================================== */}
          {mode === 'participant' ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Participant Access</span>
                  <span className="text-amber-400 text-sm">♟</span>
                </h1>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  No account or password required. Search all ongoing tournaments to view pairings, live board results, and standings.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs text-neutral-400">
                <div className="flex items-center gap-2 text-neutral-200 font-medium">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>Search by Tournament or Player</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-500">
                  Search any active tournament, check your board number, opponent, color assignment, and official round score.
                </p>
              </div>

              <button
                type="button"
                onClick={onEnterAsParticipant}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Search className="w-4 h-4 text-neutral-950" />
                <span>Search Ongoing Tournaments</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className="text-xs text-neutral-400 hover:text-neutral-200 underline"
                >
                  Arbiter or Director? Sign in to manage
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* MODE: DIRECTOR / ARBITER AUTHENTICATION                  */
            /* ======================================================== */
            <>
              <div>
                <h1 className="text-base font-bold text-white">
                  {mode === 'login' ? 'Arbiter Sign In' : 'Create Arbiter Account'}
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  {mode === 'login'
                    ? 'Only tournament creators and allowed arbiters can edit tournaments.'
                    : 'Register to create and manage your own tournaments.'}
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-200 font-medium text-xs transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-neutral-800 w-full" />
                <span className="bg-neutral-900 px-2 text-[11px] text-neutral-500 uppercase tracking-wider font-mono">
                  or email
                </span>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3 text-xs">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-neutral-300 font-medium mb-1">Director Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Your Name / Title"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                      />
                      <UserIcon className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="arbiter@tournament.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                    />
                    <Mail className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-400 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-neutral-300 font-medium mb-1">Confirm Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs transition-colors mt-2 disabled:opacity-50"
                >
                  {loading
                    ? 'Processing...'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Create Arbiter Account'}
                </button>
              </form>

              {/* Bottom Switcher to Participant Mode */}
              <div className="pt-2 border-t border-neutral-800 text-center">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('participant')}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center justify-center gap-1.5 w-full font-medium"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Participant Login (No password needed)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
