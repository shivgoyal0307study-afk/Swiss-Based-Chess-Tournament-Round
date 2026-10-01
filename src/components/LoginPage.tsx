/**
 * Dedicated Login & Account Page
 * Supports seamless Google Authentication while allowing full guest mode without login.
 */

import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  ShieldCheck,
  Cloud,
  HardDrive,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Trophy,
  Users,
  GitBranch,
  Sparkles,
} from 'lucide-react';

interface LoginPageProps {
  currentUser: User | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onContinueAsGuest: () => void;
  tournamentsCount: number;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentUser,
  onSignIn,
  onSignOut,
  onContinueAsGuest,
  tournamentsCount,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      await onSignIn();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          FIDE Tournament Director Platform
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-100 tracking-tight">
          Welcome to Chess Tournament Director
        </h1>
        <p className="mt-3 text-sm sm:text-base text-neutral-400">
          Run official FIDE Dutch Swiss, Round-Robin (Berger), and Knockout chess tournaments.
          Use the application instantly as a guest or sign in to sync with the cloud.
        </p>
      </div>

      {currentUser ? (
        /* Logged In State Card */
        <div className="max-w-md mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-amber-400 text-neutral-950 font-extrabold text-2xl mx-auto flex items-center justify-center shadow-lg border-4 border-neutral-800">
              {currentUser.displayName?.[0] || currentUser.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-900" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-neutral-100">
              {currentUser.displayName || 'Chess Director'}
            </h3>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">{currentUser.email}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cloud className="w-3.5 h-3.5" />
              Cloud Sync Active ({tournamentsCount} tournaments saved)
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onContinueAsGuest}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <span>Go to Tournament</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onSignOut}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-rose-300 font-medium text-xs rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      ) : (
        /* Not Logged In: Two Options (Guest vs Cloud) */
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
          {/* Guest Mode Card (No sign in needed!) */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between hover:border-neutral-700 transition-all shadow-lg">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-200">
                <HardDrive className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mb-1">
                  Zero Registration Required
                </span>
                <h3 className="text-xl font-bold text-neutral-100">Continue as Guest</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Start or manage your tournaments immediately. Everything works in your browser with automatic local storage persistence.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full FIDE Dutch Swiss, Round-Robin & Knockout engines</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Interactive result recording and automatic pairings</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>FIDE tiebreakers (Buchholz Cut 1, SB, Direct Encounter)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Auto-saved to local browser storage</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-neutral-800/80">
              <button
                onClick={onContinueAsGuest}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-xs transition-all border border-neutral-700 shadow-sm hover:border-neutral-600"
              >
                <span>Use as Guest (No Login)</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Cloud Account Card (Sign in with Google) */}
          <div className="bg-gradient-to-b from-neutral-900 via-neutral-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 mb-1">
                  Cloud Synchronized
                </span>
                <h3 className="text-xl font-bold text-neutral-100">Sign in with Google</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Back up your tournaments, active rounds, and arbiting data to Google Cloud Firestore so reload or device changes never affect your event.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Real-time cloud database backup for all rounds and boards</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Access and run your tournaments from any computer or tablet</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>My Tournaments archive: store and switch between multiple events</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Instant 1-click Google Sign-In via popup</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-neutral-800/80 space-y-3">
              <button
                onClick={handleGoogleClick}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-neutral-950 font-bold text-xs transition-all shadow-md disabled:opacity-50"
              >
                {/* Google "G" Logo */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span>{isLoading ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
              <p className="text-[11px] text-neutral-500 text-center">
                Secure authentication powered by Firebase. No password required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Feature Showcase Grid */}
      <div className="mt-14 pt-10 border-t border-neutral-800 grid sm:grid-cols-3 gap-6 text-neutral-400">
        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-200">FIDE Swiss Dutch System</h4>
            <p className="text-xs text-neutral-500 mt-1">
              Strict compliance with Handbook C.04.3 absolute criteria C1–C4 and quality scoring.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-200">Official Tiebreaker Hierarchy</h4>
            <p className="text-xs text-neutral-500 mt-1">
              Direct Encounter, Buchholz Cut 1 with virtual opponent score adjustments, SB, and wins.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-200">Berger & Knockout Formats</h4>
            <p className="text-xs text-neutral-500 mt-1">
              Automatic Berger tables for Round-Robin tournaments and seeded brackets for Knockouts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
