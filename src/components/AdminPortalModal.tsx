/**
 * En Passant — Super Admin Portal
 * Restricted exclusively to: shivgoyal0307@gmail.com
 * Minimalist Black & White UI
 */

import React, { useState, useEffect } from 'react';
import { DirectorRequest } from '../types/tournament';
import {
  subscribeToDirectorRequests,
  updateDirectorStatus,
  SUPER_ADMIN_EMAIL,
} from '../services/adminService';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  Search,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface AdminPortalModalProps {
  onClose: () => void;
  currentUserEmail?: string | null;
  onShowNotification?: (msg: string) => void;
}

export const AdminPortalModal: React.FC<AdminPortalModalProps> = ({
  onClose,
  currentUserEmail,
  onShowNotification,
}) => {
  const [requests, setRequests] = useState<DirectorRequest[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [processingUid, setProcessingUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToDirectorRequests((list) => {
      setRequests(list);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (uid: string, status: 'approved' | 'rejected') => {
    setProcessingUid(uid);
    try {
      await updateDirectorStatus(uid, status, currentUserEmail || SUPER_ADMIN_EMAIL);
      if (onShowNotification) {
        onShowNotification(`Director request ${status}.`);
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleManualApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualEmail.trim().toLowerCase();
    if (!clean) return;

    const pseudoUid = `manual_${Date.now()}`;
    setProcessingUid(pseudoUid);
    try {
      await updateDirectorStatus(pseudoUid, 'approved', currentUserEmail || SUPER_ADMIN_EMAIL, clean);
      setManualEmail('');
      if (onShowNotification) {
        onShowNotification(`Approved director: ${clean}`);
      }
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setProcessingUid(null);
    }
  };

  const filtered = requests.filter((r) => {
    if (filter === 'pending' && r.status !== 'pending') return false;
    if (filter === 'approved' && r.status !== 'approved') return false;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        r.email.toLowerCase().includes(q) ||
        (r.displayName && r.displayName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white font-bold">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Super Admin Portal
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white text-black font-semibold">
                  {SUPER_ADMIN_EMAIL}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Confirm, approve, and manage Tournament Director permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-neutral-900 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('pending')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'pending'
                  ? 'btn-brand-accent shadow-xs'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              {pendingCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filter === 'pending' ? 'bg-black/20 text-current' : 'bg-neutral-800 text-white'}`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilter('approved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'approved'
                  ? 'btn-brand-accent shadow-xs'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Approved Directors</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filter === 'approved' ? 'bg-black/20 text-current' : 'bg-neutral-800 text-neutral-400'}`}>
                {approvedCount}
              </span>
            </button>

            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'btn-brand-accent shadow-xs'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <span>All ({requests.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        {/* Quick Pre-Approval Input */}
        <form onSubmit={handleManualApprove} className="flex gap-2">
          <input
            type="email"
            placeholder="Pre-approve director by email (e.g. arbiter@chessclub.com)..."
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pre-Approve</span>
          </button>
        </form>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
          {filtered.length === 0 ? (
            <div className="h-44 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-neutral-500 text-xs">
              <UserCheck className="w-8 h-8 stroke-[1.2] mb-2 text-neutral-600" />
              <span>
                {filter === 'pending'
                  ? 'No pending director access requests at this time.'
                  : 'No director accounts match the current filter.'}
              </span>
            </div>
          ) : (
            filtered.map((req) => {
              const isProcessing = processingUid === req.uid;
              const isApproved = req.status === 'approved';
              const isPending = req.status === 'pending';

              return (
                <div
                  key={req.uid}
                  className="bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs">
                        {req.email}
                      </span>
                      {req.displayName && (
                        <span className="text-[11px] text-neutral-400">
                          ({req.displayName})
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          isApproved
                            ? 'bg-neutral-800 text-white border-neutral-700'
                            : isPending
                            ? 'bg-white text-black border-white'
                            : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                        }`}
                      >
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-400 font-mono">
                      Requested: {new Date(req.requestedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(req.uid, 'approved')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 btn-brand-accent text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Approve Access</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.uid, 'rejected')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    ) : isApproved ? (
                      <button
                        onClick={() => handleUpdateStatus(req.uid, 'rejected')}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Revoke Access
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus(req.uid, 'approved')}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-lg transition-colors"
                      >
                        Re-Approve
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 pt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>Admin verification mode active</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
