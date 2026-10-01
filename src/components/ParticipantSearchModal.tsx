/**
 * En Passant — Participant Tournament Directory & Search
 * Requires no ID or password.
 * Allows players, parents, and spectators to search all tournaments
 * and view live pairings, previous results, standings, and cross-tables.
 */

import React, { useState, useEffect } from 'react';
import { Tournament } from '../types/tournament';
import { listPublicTournaments } from '../services/tournamentFirestore';
import { Search, Trophy, Calendar, Users, ArrowRight, X, RefreshCw, Eye, Sparkles } from 'lucide-react';

interface ParticipantSearchModalProps {
  onSelectTournament: (tournament: Tournament) => void;
  onClose: () => void;
  currentTournamentId?: string;
}

export const ParticipantSearchModal: React.FC<ParticipantSearchModalProps> = ({
  onSelectTournament,
  onClose,
  currentTournamentId,
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormat, setFilterFormat] = useState<'all' | 'swiss' | 'round_robin' | 'knockout'>('all');

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const publicList = await listPublicTournaments();
      setTournaments(publicList);
    } catch (err) {
      console.error('Error fetching public tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const filteredTournaments = tournaments.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.location && t.location.toLowerCase().includes(q)) ||
      t.id.toLowerCase().includes(q) ||
      (t.ownerEmail && t.ownerEmail.toLowerCase().includes(q));

    const matchesFormat = filterFormat === 'all' || t.format === filterFormat;
    return matchesSearch && matchesFormat;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-bold">
              ♞
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Participant Tournament Search</h2>
              <p className="text-xs text-neutral-400">
                Browse ongoing tournaments, search pairings, and view previous results
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-sm p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search by tournament name, city, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 overflow-x-auto text-[11px] pb-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilterFormat('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterFormat === 'all'
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                All Formats
              </button>
              <button
                onClick={() => setFilterFormat('swiss')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterFormat === 'swiss'
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Swiss
              </button>
              <button
                onClick={() => setFilterFormat('round_robin')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterFormat === 'round_robin'
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Round-Robin
              </button>
              <button
                onClick={() => setFilterFormat('knockout')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  filterFormat === 'knockout'
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Knockout
              </button>
            </div>

            <button
              onClick={fetchTournaments}
              disabled={loading}
              className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 text-[11px] shrink-0"
              title="Refresh list"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tournament Results List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              <span>Loading public tournaments...</span>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="py-14 text-center text-xs text-neutral-500">
              {tournaments.length === 0
                ? 'No published tournaments currently found.'
                : 'No tournaments match your search filter.'}
            </div>
          ) : (
            filteredTournaments.map((t) => {
              const isSelected = t.id === currentTournamentId;
              const completedRounds = t.rounds.filter((r) => r.isCompleted).length;
              const currentRnd = t.rounds.length > 0 ? t.rounds.length : 1;
              const activePlayers = t.players.filter((p) => p.active).length;

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTournament(t)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-neutral-800/80 border-amber-400/50 ring-1 ring-amber-400/30'
                      : 'bg-neutral-950/60 hover:bg-neutral-800/50 border-neutral-800/80'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white truncate">{t.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 uppercase">
                        {t.format}
                      </span>
                      {t.status === 'finished' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          Finished
                        </span>
                      ) : t.rounds.length > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Ongoing (R{currentRnd})
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 font-medium">
                          Setup
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                      {t.location && <span>{t.location}</span>}
                      {t.location && <span className="text-neutral-600">·</span>}
                      <span>
                        Round {currentRnd} of {t.roundsTotal} ({completedRounds} completed)
                      </span>
                      <span className="text-neutral-600">·</span>
                      <span>{activePlayers} players</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-amber-400 hover:text-neutral-950 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5 group"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Pairings & Results</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 pt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>{filteredTournaments.length} tournament(s) available</span>
          <span className="text-neutral-400">Real-time live pairings</span>
        </div>
      </div>
    </div>
  );
};
