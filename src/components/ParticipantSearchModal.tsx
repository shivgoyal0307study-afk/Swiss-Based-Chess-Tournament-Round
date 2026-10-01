/**
 * En Passant — Participant Tournament Directory & Historical Archive
 * Requires no ID or password.
 * Allows players, parents, arbiters, and spectators to search all tournaments,
 * filter between live ongoing matches and historical completed championships,
 * and view live pairings, board results, standings, and cross-tables.
 */

import React, { useState, useEffect } from 'react';
import { Tournament } from '../types/tournament';
import { listPublicTournaments } from '../services/tournamentFirestore';
import { calculateStandings } from '../engine/tiebreakers';
import {
  Search,
  Trophy,
  Calendar,
  Users,
  ArrowRight,
  X,
  RefreshCw,
  Eye,
  Sparkles,
  History,
  Activity,
  Award,
  Clock,
} from 'lucide-react';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'finished'>('all');
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
      (t.ownerEmail && t.ownerEmail.toLowerCase().includes(q)) ||
      (t.ownerName && t.ownerName.toLowerCase().includes(q));

    const matchesFormat = filterFormat === 'all' || t.format === filterFormat;

    let matchesStatus = true;
    if (statusFilter === 'live') {
      matchesStatus = t.status === 'in_progress' || (t.rounds.length > 0 && t.status !== 'finished');
    } else if (statusFilter === 'finished') {
      matchesStatus = t.status === 'finished';
    }

    return matchesSearch && matchesFormat && matchesStatus;
  });

  const liveCount = tournaments.filter(
    (t) => t.status === 'in_progress' || (t.rounds.length > 0 && t.status !== 'finished')
  ).length;
  const finishedCount = tournaments.filter((t) => t.status === 'finished').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-bold text-lg">
              ♞
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Participant Portal & Historical Archive</h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 font-mono font-semibold border border-amber-400/30">
                  Open Access
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Search ongoing championships, view round-by-round pairings, and review completed tournament histories
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

        {/* Filter Navigation Tabs */}
        <div className="space-y-2.5">
          {/* Main Status Segment (All / Live / Historical Archive) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800/80 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>All Events</span>
              <span className="text-[10px] opacity-70">({tournaments.length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('live')}
              className={`py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'live'
                  ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Live Matches</span>
              <span className="text-[10px] opacity-70">({liveCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('finished')}
              className={`py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'finished'
                  ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-emerald-400" />
              <span>Historical Archives</span>
              <span className="text-[10px] opacity-70">({finishedCount})</span>
            </button>
          </div>

          {/* Search Bar & Sub-Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search tournament name, arbiter, city, or ID..."
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

            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value as any)}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-300 focus:outline-none focus:border-amber-400"
              >
                <option value="all">All Formats</option>
                <option value="swiss">Swiss System</option>
                <option value="round_robin">Round-Robin</option>
                <option value="knockout">Knockout</option>
              </select>

              <button
                onClick={fetchTournaments}
                disabled={loading}
                className="p-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-400 hover:text-neutral-200 transition-colors"
                title="Refresh database"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tournament Archive & Live List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[260px]">
          {loading ? (
            <div className="py-20 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              <span>Querying tournament database...</span>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-500 space-y-1">
              <p className="font-semibold text-neutral-400">No tournaments found</p>
              <p className="text-[11px] text-neutral-600">
                {tournaments.length === 0
                  ? 'No published tournaments currently in the database.'
                  : 'No tournaments match the selected status or query filters.'}
              </p>
            </div>
          ) : (
            filteredTournaments.map((t) => {
              const isSelected = t.id === currentTournamentId;
              const completedRounds = t.rounds.filter((r) => r.isCompleted).length;
              const currentRnd = t.rounds.length > 0 ? t.rounds.length : 1;
              const activePlayers = t.players.filter((p) => p.active).length;
              const isFinished = t.status === 'finished';
              const isLive = t.status === 'in_progress' || (t.rounds.length > 0 && !isFinished);

              // Calculate leader / winner if rounds exist
              let topLeader: string | null = null;
              if (t.rounds.length > 0 && t.players.length > 0) {
                try {
                  const s = calculateStandings(t.players, t.rounds, t.roundsTotal);
                  if (s.length > 0 && s[0].score > 0) {
                    topLeader = `${s[0].name} (${s[0].score} pts)`;
                  }
                } catch {}
              }

              const formattedDate = t.createdAt
                ? new Date(t.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTournament(t)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-400/5 border-amber-400/50 ring-1 ring-amber-400/30'
                      : 'bg-neutral-950/70 hover:bg-neutral-850/60 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white truncate">{t.name}</span>

                      {/* Format Badge */}
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300 uppercase">
                        {t.format === 'round_robin' ? 'Round-Robin' : t.format === 'knockout' ? 'Knockout' : 'Swiss'}
                      </span>

                      {/* Status Tag */}
                      {isFinished ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>Finished Archive</span>
                        </span>
                      ) : isLive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span>Live Round {currentRnd}/{t.roundsTotal}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-neutral-400 font-medium">
                          Setup Phase
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap">
                      {t.location && <span>📍 {t.location}</span>}
                      {t.location && <span className="text-neutral-600">·</span>}
                      <span>
                        {completedRounds} of {t.roundsTotal} rounds finished
                      </span>
                      <span className="text-neutral-600">·</span>
                      <span>👥 {activePlayers} players</span>
                      <span className="text-neutral-600">·</span>
                      <span className="text-neutral-500 font-mono text-[11px]">{formattedDate}</span>
                    </div>

                    {/* Champion / Leader preview */}
                    {topLeader && (
                      <div className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isFinished ? 'Champion:' : 'Tournament Leader:'}</span>
                        <span className="text-white font-semibold">{topLeader}</span>
                      </div>
                    )}
                  </div>

                  {/* Open History Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      className="px-3.5 py-2 rounded-xl bg-neutral-900 group-hover:bg-amber-400 group-hover:text-neutral-950 text-neutral-200 text-xs font-semibold border border-neutral-700 hover:border-amber-400 transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isFinished ? 'View History & Standings' : 'View Live Pairings'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 pt-3 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <span>{filteredTournaments.length} tournament(s) available</span>
            <span className="text-neutral-600">·</span>
            <span className="text-amber-400/80">Pairings and standings updated in real time</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">FIDE Swiss Architecture</span>
        </div>
      </div>
    </div>
  );
};
