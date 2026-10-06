/**
 * User Tournaments Manager Modal
 * Displays list of all saved tournaments for the authenticated user,
 * allowing switching, deleting, and creating new tournaments.
 * Minimalist Black & White UI
 */

import React from 'react';
import { Tournament } from '../types/tournament';
import { FolderOpen, Plus, Trash2, Calendar, Trophy, Users, Check, ArrowRight } from 'lucide-react';

interface UserTournamentsModalProps {
  tournaments: Tournament[];
  currentTournamentId: string;
  onSelectTournament: (tournament: Tournament) => void;
  onDeleteTournament: (tournamentId: string) => void;
  onNewTournament: () => void;
  onClose: () => void;
  userEmail?: string | null;
}

export const UserTournamentsModal: React.FC<UserTournamentsModalProps> = ({
  tournaments,
  currentTournamentId,
  onSelectTournament,
  onDeleteTournament,
  onNewTournament,
  onClose,
  userEmail,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Saved Tournaments</h3>
              <p className="text-xs text-neutral-400">
                {userEmail || 'Local & Cloud Storage'}
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

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-neutral-400 font-medium">
            {tournaments.length} {tournaments.length === 1 ? 'Tournament' : 'Tournaments'}
          </span>
          <button
            onClick={() => {
              onClose();
              onNewTournament();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-brand-accent rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tournament</span>
          </button>
        </div>

        {/* List of tournaments */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {tournaments.length === 0 ? (
            <div className="h-44 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-neutral-500 text-xs">
              <Trophy className="w-8 h-8 text-neutral-600 mb-2 opacity-50" />
              <p className="font-medium text-neutral-300">No tournaments saved yet</p>
              <p className="text-neutral-500 mt-1">
                Your tournaments and current round progress will automatically appear here.
              </p>
            </div>
          ) : (
            tournaments.map((t) => {
              const isCurrent = t.id === currentTournamentId;
              const formatLabel =
                t.format === 'round_robin'
                  ? 'Round-Robin'
                  : t.format === 'knockout'
                  ? 'Knockout'
                  : 'FIDE Swiss';

              return (
                <div
                  key={t.id}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-neutral-900 border-white/40 ring-1 ring-white/20'
                      : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-white truncate">{t.name}</h4>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#84dcc6] text-[#11221c] dark:bg-[#84dcc6] dark:text-[#11221c]">
                          <Check className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {formatLabel}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                        {t.status === 'finished'
                          ? 'Finished'
                          : t.status === 'in_progress'
                          ? `Round ${t.currentRoundNumber || 1}/${t.roundsTotal}`
                          : 'Setup'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-neutral-400" />
                        {t.players?.length || 0} Players
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-neutral-400" />
                        {t.rounds?.length || 0} / {t.roundsTotal} Rounds
                      </span>
                      {t.updatedAt && (
                        <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.updatedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isCurrent && (
                      <button
                        onClick={() => {
                          onSelectTournament(t);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold btn-brand-accent rounded-lg transition-all cursor-pointer"
                      >
                        Open
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Delete tournament "${t.name}"? This cannot be undone.`)) {
                          onDeleteTournament(t.id);
                        }
                      }}
                      className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
                      title="Delete Tournament"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 pt-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
