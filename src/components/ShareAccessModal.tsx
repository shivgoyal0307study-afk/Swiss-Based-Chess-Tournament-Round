/**
 * En Passant — Tournament Access & Collaborators Modal
 * Allows the tournament creator to manage allowed arbiter emails for shared editing.
 */

import React, { useState } from 'react';
import { Tournament } from '../types/tournament';
import { ShieldCheck, Plus, Trash2, Mail, X, UserCheck, Lock } from 'lucide-react';

interface ShareAccessModalProps {
  tournament: Tournament;
  currentEmail: string | null;
  isCreator: boolean;
  onUpdateAllowedEmails: (allowedEmails: string[]) => void;
  onClose: () => void;
}

export const ShareAccessModal: React.FC<ShareAccessModalProps> = ({
  tournament,
  currentEmail,
  isCreator,
  onUpdateAllowedEmails,
  onClose,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const allowedList = tournament.allowedEmails || [];

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = newEmail.trim().toLowerCase();

    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (clean === tournament.ownerEmail?.toLowerCase()) {
      setError('This email is already the tournament creator.');
      return;
    }

    if (allowedList.map((e) => e.toLowerCase()).includes(clean)) {
      setError('This email is already in the allowed arbiters list.');
      return;
    }

    const updated = [...allowedList, clean];
    onUpdateAllowedEmails(updated);
    setNewEmail('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updated = allowedList.filter((e) => e.toLowerCase() !== emailToRemove.toLowerCase());
    onUpdateAllowedEmails(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tournament Access Control</h3>
              <p className="text-[11px] text-neutral-400">Manage allowed assistant arbiter emails</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-sm p-1 rounded hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Card */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Tournament Creator:</span>
            <span className="font-mono text-neutral-200 font-medium">
              {tournament.ownerEmail || 'Primary Arbiter'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-850 pt-2">
            Only the creator and emails listed below have permission to record results, generate rounds, and modify players. All other users have read-only participant view.
          </p>
        </div>

        {/* Add Allowed Email Form (Creator Only) */}
        {isCreator ? (
          <form onSubmit={handleAddEmail} className="space-y-2">
            <label className="block text-xs font-medium text-neutral-300">
              Grant Arbiter Access (Add Email)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  placeholder="arbiter@chessfederation.org"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                />
                <Mail className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="submit"
                className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
          </form>
        ) : (
          <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl text-xs text-neutral-400 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Only the tournament creator can add or remove allowed arbiter emails.</span>
          </div>
        )}

        {/* Allowed Emails List */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-neutral-300">
              Allowed Arbiters ({allowedList.length})
            </span>
            <span className="text-[11px] font-mono">Full Edit Access</span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 border border-neutral-800/80 rounded-xl p-2 bg-neutral-950/50">
            {allowedList.length === 0 ? (
              <p className="text-center text-xs text-neutral-500 py-4">
                No extra arbiters added yet. Only the creator has edit access.
              </p>
            ) : (
              allowedList.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono text-neutral-200 truncate">{email}</span>
                  </div>
                  {isCreator && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="p-1 text-neutral-500 hover:text-rose-400 transition-colors ml-2"
                      title="Revoke access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
