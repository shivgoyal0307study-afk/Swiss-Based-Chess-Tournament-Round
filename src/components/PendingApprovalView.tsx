/**
 * En Passant — Director Pending Approval Screen
 * Real-time responsive Black & White UI with Coolors palette
 */

import React, { useState } from 'react';
import { SUPER_ADMIN_EMAIL } from '../services/adminService';
import { ShieldAlert, RefreshCw, Eye, LogOut, Radio, XCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PendingApprovalViewProps {
  userEmail?: string | null;
  status?: 'pending' | 'rejected' | null;
  onCheckStatus: () => Promise<void>;
  onContinueAsParticipant: () => void;
  onSignOut: () => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  userEmail,
  status = 'pending',
  onCheckStatus,
  onContinueAsParticipant,
  onSignOut,
}) => {
  const [checking, setChecking] = useState(false);
  const { theme } = useTheme();

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await onCheckStatus();
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  const isRejected = status === 'rejected';

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#4b4e6d] selection:text-white transition-colors">
      {/* Top minimal header */}
      <header className="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-white text-base">
            ♞
          </div>
          <span className="font-bold tracking-tight text-white text-sm">
            En Passant
          </span>
        </div>

        <button
          onClick={onSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main minimal card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-7 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex justify-center">
            {isRejected ? (
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <XCircle className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
                <ShieldAlert className="w-7 h-7 stroke-[1.5]" />
              </div>
            )}
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-lg font-bold text-white tracking-tight">
              {isRejected
                ? 'Director Access Declined'
                : 'Director Access Pending Approval'}
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Your account{' '}
              <span className="text-white font-medium">{userEmail || 'registered'}</span>{' '}
              {isRejected
                ? 'was not granted Director permissions. You may continue in Participant Mode or contact the administrator.'
                : 'has been submitted. The tournament platform administrator will approve your account. Once approved, this screen will update automatically in real time.'}
            </p>
          </div>

          {/* Real-time sync status banner */}
          {!isRejected && (
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium w-fit mx-auto">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Listening live for administrator approval...</span>
            </div>
          )}

          {/* Admin Info Box */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3.5 text-xs space-y-1">
            <div className="text-neutral-400 font-medium">Administrator Contact:</div>
            <div className="font-mono text-white text-[11px] select-all font-semibold">
              {SUPER_ADMIN_EMAIL}
            </div>
            <p className="text-[11px] text-neutral-400 pt-1">
              Approvals sync instantly across browsers via live cloud channels.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="w-full py-2.5 btn-brand-accent font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status Now'}</span>
            </button>

            <button
              onClick={onContinueAsParticipant}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span>Continue in Participant Mode</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
