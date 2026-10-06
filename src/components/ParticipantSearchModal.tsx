/**
 * En Passant — Public Tournaments Directory
 * Ultra-minimalist Black & White UI
 * Allows participants to search, filter, and track live chess events.
 */

import React, { useState, useEffect } from 'react';
import { Tournament } from '../types/tournament';
import { calculateStandings } from '../engine/tiebreakers';
import {
  listPublicTournaments,
  subscribeToPublicTournaments,
} from '../services/tournamentFirestore';
import {
  Search,
  Trophy,
  Activity,
  History,
  Eye,
  RefreshCw,
  X,
  ArrowRight,
  Award,
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
    setLoading(true);
    const unsubscribe = subscribeToPublicTournaments((publicList) => {
      setTournaments(publicList);
      setLoading(false);
    });
    return () => unsubscribe();
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
      matchesStatus = t.status !== 'finished';
    } else if (statusFilter === 'finished') {
      matchesStatus = t.status === 'finished';
    }

    return matchesSearch && matchesFormat && matchesStatus;
  });

  const liveCount = tournaments.filter((t) => t.status !== 'finished').length;
  const finishedCount = tournaments.filter((t) => t.status === 'finished').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white font-bold text-base">
              ♞
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Tournaments Directory</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="space-y-2.5">
          {/* Main Status Segment (All / Live / Historical Archive) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black rounded-xl border border-neutral-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>All Events</span>
              <span className="text-[10px] opacity-70">({tournaments.length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('live')}
              className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'live'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Live Matches</span>
              <span className="text-[10px] opacity-70">({liveCount})</span>
            </button>

            <button
              onClick={() => setStatusFilter('finished')}
              className={`py-1.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                statusFilter === 'finished'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
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
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value as any)}
                className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white"
              >
                <option value="all">All Formats</option>
                <option value="swiss">Swiss System</option>
                <option value="round_robin">Round-Robin</option>
                <option value="knockout">Knockout</option>
              </select>

              <button
                onClick={fetchTournaments}
                disabled={loading}
                className="p-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-colors"
                title="Refresh database"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-white' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Tournament Archive & Live List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[260px]">
          {loading ? (
            <div className="py-20 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-white" />
              <span>Querying tournament directory...</span>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="py-16 text-center text-xs text-neutral-500 space-y-1 border border-dashed border-neutral-800 rounded-xl">
              <p className="font-semibold text-neutral-300">No tournaments found</p>
              <p className="text-[11px] text-neutral-500">
                {tournaments.length === 0
                  ? 'No published tournaments currently in the directory.'
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
                      ? 'bg-neutral-900 border-white'
                      : 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700'
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-900 text-neutral-300 border border-neutral-700 font-semibold flex items-center gap-1">
                          <Award className="w-3 h-3 text-white" />
                          <span>Finished Archive</span>
                        </span>
                      ) : isLive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-900 text-white border border-neutral-700 font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>Live Round {currentRnd}/{t.roundsTotal}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-900 text-neutral-400 font-medium border border-neutral-800">
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
                      <div className="text-xs text-neutral-300 font-medium flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-white" />
                        <span>{isFinished ? 'Champion:' : 'Tournament Leader:'}</span>
                        <span className="text-white font-semibold">{topLeader}</span>
                      </div>
                    )}
                  </div>

                  {/* Open History Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      className="px-3.5 py-2 rounded-xl btn-brand-accent text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-current" />
                      <span>{isFinished ? 'View Archive & Standings' : 'View Live Pairings'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-current" />
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
            <span className="text-neutral-400">Live scoreboards stream automatically</span>
          </div>
          <span className="text-[11px] font-mono text-neutral-500">FIDE Swiss Architecture</span>
        </div>
      </div>
    </div>
  );
};
