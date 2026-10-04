/**
 * En Passant — Authentication & Public Tournaments Gateway
 * Ultra-minimalist Black & White UI
 * Dedicated Live Tournaments Directory + Participant Access + Director Portal
 */

import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { SUPER_ADMIN_EMAIL } from '../services/adminService';
import { Tournament } from '../types/tournament';
import {
  subscribeToPublicTournaments,
  listPublicTournaments,
} from '../services/tournamentFirestore';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  User as UserIcon,
  Search,
  ArrowRight,
  Shield,
  Users,
  Trophy,
  Activity,
  Calendar,
  Award,
  RefreshCw,
} from 'lucide-react';

interface AuthPageProps {
  onSignInWithGoogle: () => Promise<void>;
  onEnterAsParticipant: () => void;
  onSelectTournament?: (tournament: Tournament) => void;
  initialMode?: 'login' | 'signup' | 'participant';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSignInWithGoogle,
  onEnterAsParticipant,
  onSelectTournament,
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

  // Live Tournaments Directory
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<'all' | 'live' | 'finished'>('all');

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

  // Subscribe to live tournaments
  useEffect(() => {
    setTournamentsLoading(true);
    listPublicTournaments()
      .then((list) => {
        setTournaments(list);
        setTournamentsLoading(false);
      })
      .catch(() => setTournamentsLoading(false));

    const unsubscribe = subscribeToPublicTournaments((list) => {
      setTournaments(list);
      setTournamentsLoading(false);
    });
    return () => unsubscribe();
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

  const handleOpenTournament = (t: Tournament) => {
    if (onSelectTournament) {
      onSelectTournament(t);
    } else {
      onEnterAsParticipant();
    }
  };

  // Filtered live events
  const filteredTournaments = tournaments.filter((t) => {
    const q = eventSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.location && t.location.toLowerCase().includes(q)) ||
      t.id.toLowerCase().includes(q) ||
      (t.ownerEmail && t.ownerEmail.toLowerCase().includes(q)) ||
      (t.ownerName && t.ownerName.toLowerCase().includes(q));

    let matchesStatus = true;
    if (eventFilter === 'live') {
      matchesStatus = t.status !== 'finished';
    } else if (eventFilter === 'finished') {
      matchesStatus = t.status === 'finished';
    }

    return matchesSearch && matchesStatus;
  });

  const liveEventsCount = tournaments.filter((t) => t.status !== 'finished').length;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
      {/* Clean Top Header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-white text-base">
            ♞
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block">
              En Passant
            </span>
            <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
              FIDE Swiss Tournament Arbiter
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEnterAsParticipant}
            className="text-xs text-neutral-300 hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-white" />
            <span>Search Events {liveEventsCount > 0 && `(${liveEventsCount})`}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: 2-Column Split Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Section: Live Tournaments Directory */}
        <div className="flex-1 w-full space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-white" />
                <span>Live & Ongoing Tournaments</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono">
                  {tournaments.length}
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Select any tournament to view round pairings, board assignments, results, and standings.
              </p>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-1 rounded-lg text-xs self-start sm:self-center">
              <button
                onClick={() => setEventFilter('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  eventFilter === 'all'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setEventFilter('live')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  eventFilter === 'live'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Live ({liveEventsCount})
              </button>
              <button
                onClick={() => setEventFilter('finished')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  eventFilter === 'finished'
                    ? 'bg-white text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Finished
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tournament name, arbiter, or location..."
              value={eventSearchQuery}
              onChange={(e) => setEventSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Tournaments List */}
          <div className="space-y-3">
            {tournamentsLoading ? (
              <div className="p-12 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2 border border-dashed border-neutral-800 rounded-2xl">
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span>Checking tournament directory...</span>
              </div>
            ) : filteredTournaments.length === 0 ? (
              <div className="p-10 text-center text-xs text-neutral-500 space-y-2 border border-dashed border-neutral-800 rounded-2xl bg-neutral-950">
                <p className="font-semibold text-neutral-300">No tournaments found</p>
                <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                  {tournaments.length === 0
                    ? 'No tournaments published yet. Sign in as Director to create a new tournament.'
                    : 'No tournaments match your search filter.'}
                </p>
              </div>
            ) : (
              filteredTournaments.map((t) => {
                const isFinished = t.status === 'finished';
                const currentRnd = t.rounds.length > 0 ? t.rounds.length : 1;
                const activePlayers = t.players?.filter((p) => p.active !== false).length || 0;
                const formatLabel =
                  t.format === 'round_robin'
                    ? 'Round-Robin'
                    : t.format === 'knockout'
                    ? 'Knockout'
                    : 'Swiss';

                return (
                  <div
                    key={t.id}
                    onClick={() => handleOpenTournament(t)}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-600 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white group-hover:text-white transition-colors truncate">
                          {t.name}
                        </span>

                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 uppercase">
                          {formatLabel}
                        </span>

                        {isFinished ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-900 text-neutral-300 border border-neutral-700 font-semibold flex items-center gap-1">
                            <Award className="w-3 h-3 text-white" />
                            <span>Finished</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-900 text-white border border-neutral-700 font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span>Round {currentRnd}/{t.roundsTotal}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                        {t.location && <span>📍 {t.location}</span>}
                        {t.location && <span className="text-neutral-700">·</span>}
                        <span>👥 {activePlayers} players</span>
                        <span className="text-neutral-700">·</span>
                        <span>{t.rounds.length} rounds paired</span>
                        {t.ownerName && (
                          <>
                            <span className="text-neutral-700">·</span>
                            <span className="text-neutral-500">Arbiter: {t.ownerName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTournament(t);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-black" />
                        <span>View Live Board</span>
                        <ArrowRight className="w-3.5 h-3.5 text-black" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Section: Director Access & Authentication */}
        <div className="w-full lg:w-96 shrink-0 bg-neutral-950 border border-neutral-800 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl">
          {/* Navigation Mode Tabs */}
          <div className="flex border-b border-neutral-800 pb-2 gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`pb-1.5 transition-colors ${
                mode === 'login'
                  ? 'border-b-2 border-white text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Director Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`pb-1.5 transition-colors ${
                mode === 'signup'
                  ? 'border-b-2 border-white text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('participant')}
              className={`pb-1.5 transition-colors flex items-center gap-1.5 ${
                mode === 'participant'
                  ? 'border-b-2 border-white text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Participant</span>
              <span className="text-[9px] bg-neutral-900 text-neutral-300 px-1 py-0.2 rounded border border-neutral-700">Open</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* MODE: PARTICIPANT ACCESS (No Password Required)          */}
          {/* ======================================================== */}
          {mode === 'participant' ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Participant & Spectator View</span>
                </h1>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  No account or password required. Search all tournaments, view round pairings, past results, and live standings.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2 text-xs text-neutral-400">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Search className="w-3.5 h-3.5 text-white" />
                  <span>Search Any Tournament</span>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-400">
                  Search any active tournament, check your board number, opponent, color assignment, and official round score.
                </p>
              </div>

              <button
                type="button"
                onClick={onEnterAsParticipant}
                className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4 text-black" />
                <span>Search Ongoing Tournaments</span>
                <ArrowRight className="w-3.5 h-3.5 text-black" />
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className="text-xs text-neutral-400 hover:text-white underline"
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
                  {mode === 'login' ? 'Director Sign In' : 'Create Director Account'}
                </h1>
                <p className="text-xs text-neutral-400 mt-1">
                  {mode === 'login'
                    ? 'Sign in to create, pair, and arbitrate chess tournaments.'
                    : 'Register for a director account. Access is confirmed by admin.'}
                </p>
              </div>

              {/* Admin Confirmation Notice on Signup */}
              {mode === 'signup' && (
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-white">
                    <Shield className="w-3 h-3 text-neutral-400" />
                    <span>Administrator Approval Required</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed">
                    New director accounts must be confirmed by the admin (<code className="text-white text-[10px] font-mono">{SUPER_ADMIN_EMAIL}</code>) before creating tournaments.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Google Sign-In */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-white font-medium text-xs transition-colors disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#FFFFFF"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#D4D4D4"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#A3A3A3"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#737373"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-neutral-800 w-full" />
                <span className="bg-neutral-950 px-2 text-[11px] text-neutral-500 uppercase tracking-wider font-mono">
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
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white"
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
                      placeholder="director@chess.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white"
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
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
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
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-colors mt-2 disabled:opacity-50"
                >
                  {loading
                    ? 'Processing...'
                    : mode === 'login'
                    ? 'Sign In'
                    : 'Create Director Account'}
                </button>
              </form>

              {/* Bottom Switcher to Participant Mode */}
              <div className="pt-2 border-t border-neutral-800 text-center">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('participant')}
                  className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 w-full font-medium"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Participant View (No password needed)</span>
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
