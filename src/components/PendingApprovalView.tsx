/**
 * En Passant — Director Pending Approval Screen
 * Ultra-minimalist Black & White UI
 */

import React, { useState } from 'react';
import { SUPER_ADMIN_EMAIL } from '../services/adminService';
import { ShieldAlert, RefreshCw, Eye, LogOut } from 'lucide-react';

interface PendingApprovalViewProps {
  userEmail?: string | null;
  onCheckStatus: () => Promise<void>;
  onContinueAsParticipant: () => void;
  onSignOut: () => void;
}

export const PendingApprovalView: React.FC<PendingApprovalViewProps> = ({
  userEmail,
  onCheckStatus,
  onContinueAsParticipant,
  onSignOut,
}) => {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await onCheckStatus();
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-neutral-800 selection:text-white">
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
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main minimal card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-white">
            <ShieldAlert className="w-6 h-6 stroke-[1.5]" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-lg font-bold text-white tracking-tight">
              Director Access Pending Approval
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Your account <span className="text-white font-medium">{userEmail || 'registered'}</span> has been submitted. The tournament platform administrator must approve your account before you can create and manage tournaments.
            </p>
          </div>

          {/* Admin Info Box */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3.5 text-xs space-y-1">
            <div className="text-neutral-400 font-medium">Administrator Contact:</div>
            <div className="font-mono text-white text-[11px] select-all">
              {SUPER_ADMIN_EMAIL}
            </div>
            <p className="text-[11px] text-neutral-400 pt-1">
              Once confirmed by the admin, your access will be granted instantly.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleRefresh}
              disabled={checking}
              className="w-full py-2.5 btn-brand-accent font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={onContinueAsParticipant}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-center gap-2"
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
