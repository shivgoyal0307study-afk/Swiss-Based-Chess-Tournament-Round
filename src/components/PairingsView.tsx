/**
 * En Passant — Pairings & Results View
 * Ultra-minimalist Black & White UI
 * Supports Participant Read-Only Mode with Full Previous Round History,
 * In-Page Player Search, PDF Export, and Strict Round Locking.
 */

import React, { useState } from 'react';
import { GameResult, Player, Tournament, StandingsRow } from '../types/tournament';
import { calculatePlayerStats } from '../engine/fideSwissEngine';
import { calculateFormatTotalRounds } from '../engine/formatPairings';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Lock,
  Search,
  FileDown,
  X,
  History,
  Share2,
  Check,
  CheckCircle,
  Award,
} from 'lucide-react';
import { exportPairingsPdf } from '../utils/pdfExport';

interface PairingsViewProps {
  tournament: Tournament;
  selectedRoundNumber: number;
  setSelectedRoundNumber: (roundNum: number) => void;
  onRecordResult: (roundNum: number, gameId: string, result: GameResult | null) => void;
  onGenerateNextRound: () => void;
  onUndoRound: (roundNum: number) => void;
  onSubmitResults?: () => void;
  onStartTournament: () => void;
  isReadOnly?: boolean;
  standings?: StandingsRow[];
}

export const PairingsView: React.FC<PairingsViewProps> = ({
  tournament,
  selectedRoundNumber,
  setSelectedRoundNumber,
  onRecordResult,
  onGenerateNextRound,
  onUndoRound,
  onSubmitResults,
  onStartTournament,
  isReadOnly = false,
  standings = [],
}) => {
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [showFideRules, setShowFideRules] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const handleCopyLiveLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?t=${tournament.id}` : '';
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // If tournament has 0 rounds
  if (tournament.rounds.length === 0) {
    const hasEnoughPlayers = tournament.players.filter((p) => p.active).length >= 2;

    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 mx-auto flex items-center justify-center text-white text-2xl font-bold">
            ♞
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {hasEnoughPlayers ? 'Ready for Round 1' : 'No Rounds Paired Yet'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {isReadOnly
                ? 'The arbiter has not generated Round 1 pairings yet. Check back soon for live pairings.'
                : hasEnoughPlayers
                ? `${tournament.players.length} players registered. Ready to start.`
                : 'Register at least 2 active players in the Players tab to generate pairings.'}
            </p>
          </div>

          {!isReadOnly && hasEnoughPlayers && (
            <div className="pt-2">
              <button
                onClick={onStartTournament}
                className="px-5 py-2.5 btn-brand-accent font-semibold text-xs rounded-xl transition-all inline-flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Generate Round 1 Pairings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const latestRoundNum = tournament.rounds.length;
  const currentRound =
    tournament.rounds.find((r) => r.roundNumber === selectedRoundNumber) ||
    tournament.rounds[tournament.rounds.length - 1];
  const roundNum = currentRound.roundNumber;

  const statsBeforeRound = calculatePlayerStats(tournament.players, tournament.rounds, roundNum - 1);
  const playerMap = new Map<string, Player>(tournament.players.map((p) => [p.id, p]));

  const completedGamesCount = currentRound.games.filter((g) => g.result !== null).length;
  const totalGamesCount = currentRound.games.length;
  const isRoundFinished = completedGamesCount === totalGamesCount;
  const isLatestRound = roundNum === latestRoundNum;

  // Previous rounds locked once subsequent rounds have been generated, in read-only mode, or when tournament is finished
  const isRoundLocked = roundNum < latestRoundNum || isReadOnly || tournament.status === 'finished';
  const isViewingPastRound = roundNum < latestRoundNum;

  const effectiveTotalRounds =
    tournament.format === 'round_robin' || tournament.format === 'knockout'
      ? calculateFormatTotalRounds(tournament.format, tournament.players.filter((p) => p.active).length, tournament.roundsTotal)
      : tournament.roundsTotal;

  const isTournamentFinished =
    tournament.status === 'finished' || (isRoundFinished && roundNum >= effectiveTotalRounds);

  const canGenerateNext =
    !isReadOnly &&
    tournament.status !== 'finished' &&
    isRoundFinished &&
    isLatestRound &&
    roundNum < effectiveTotalRounds;

  // Option to submit official results: available after Round 3 once current round games are finished
  const canSubmitResults =
    !isReadOnly &&
    tournament.status !== 'finished' &&
    latestRoundNum >= 3 &&
    isLatestRound &&
    isRoundFinished;

  // Filter games by player search
  const filteredGames = currentRound.games.filter((game) => {
    if (!playerSearchQuery.trim()) return true;
    const q = playerSearchQuery.toLowerCase().trim();
    const white = game.whitePlayerId ? playerMap.get(game.whitePlayerId) : null;
    const black = game.blackPlayerId ? playerMap.get(game.blackPlayerId) : null;
    const boardStr = String(game.boardNumber || '');

    return (
      (white && white.name.toLowerCase().includes(q)) ||
      (black && black.name.toLowerCase().includes(q)) ||
      boardStr === q ||
      `#${boardStr}` === q
    );
  });

  const handleDownloadPdf = () => {
    exportPairingsPdf(tournament, roundNum, standings);
  };

  const handlePrevRound = () => {
    if (roundNum > 1) {
      setSelectedRoundNumber(roundNum - 1);
    }
  };

  const handleNextRound = () => {
    if (roundNum < latestRoundNum) {
      setSelectedRoundNumber(roundNum + 1);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4 font-sans text-neutral-100">
      {/* Top Header Bar: Round Tabs, Prev/Next, Actions & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        {/* Round Switcher with Previous/Next Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {/* Previous Round Button */}
          <button
            onClick={handlePrevRound}
            disabled={roundNum <= 1}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 bg-neutral-900 border border-neutral-800 transition-colors"
            title="Previous Round"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Round Number Tabs */}
          {tournament.rounds.map((r) => {
            const allDone = r.games.every((g) => g.result !== null);
            const isSelected = selectedRoundNumber === r.roundNumber;
            const isPast = r.roundNumber < latestRoundNum;

            return (
              <button
                key={r.roundNumber}
                onClick={() => setSelectedRoundNumber(r.roundNumber)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'round-tab-active shadow-xs'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <span>Round {r.roundNumber}</span>
                {isPast ? (
                  <Lock className={`w-3 h-3 ${isSelected ? 'opacity-80' : 'text-neutral-500'}`} />
                ) : allDone ? (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-current' : 'bg-white'}`} />
                ) : (
                  <span className={`w-1.5 h-1.5 rounded-full border ${isSelected ? 'border-current' : 'border-neutral-400'}`} />
                )}
              </button>
            );
          })}

          {/* Next Round Button */}
          <button
            onClick={handleNextRound}
            disabled={roundNum >= latestRoundNum}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 bg-neutral-900 border border-neutral-800 transition-colors"
            title="Next Round"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Actions: Share, PDF, Undo & Pair Next */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {/* Share Live Link */}
          <button
            onClick={handleCopyLiveLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Copy real-time live link to share"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-current" />
                <span>Share Live</span>
              </>
            )}
          </button>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            title="Download PDF of Round Pairings & Results"
          >
            <FileDown className="w-3.5 h-3.5 text-current" />
            <span>PDF</span>
          </button>

          {/* Undo option: strictly removed when tournament completed */}
          {!isReadOnly && isLatestRound && roundNum > 1 && !isTournamentFinished && tournament.status !== 'finished' && (
            <button
              onClick={() => onUndoRound(roundNum)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Undo current round pairings and results"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          )}

          {canGenerateNext && (
            <button
              onClick={onGenerateNextRound}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold btn-brand-accent rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <span>Pair Round {roundNum + 1}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* After Round 3: option to submit official results */}
          {canSubmitResults && (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#4b4e6d] hover:bg-[#3b3d56] text-white dark:bg-[#84dcc6] dark:hover:bg-[#68cbb2] dark:text-[#11221c] rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Submit official tournament results and finalize standings"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Submit Results</span>
            </button>
          )}

          {(tournament.status === 'finished' || (isTournamentFinished && !canSubmitResults)) && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Results Submitted · Complete</span>
            </div>
          )}
        </div>
      </div>

      {/* Participant / Arbiter Past Round Notice */}
      {isViewingPastRound && (
        <div className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-center justify-between text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>
              Viewing <strong>Round {roundNum}</strong> (Completed). Live tournament is currently in Round {latestRoundNum}.
            </span>
          </div>
          <button
            onClick={() => setSelectedRoundNumber(latestRoundNum)}
            className="px-2.5 py-1 btn-brand-accent font-semibold text-[11px] rounded transition-colors shrink-0 cursor-pointer"
          >
            Jump to Live Round {latestRoundNum}
          </button>
        </div>
      )}

      {/* Sub-Bar: Search My Board + Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400 pt-1">
        {/* Instant Player Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by player name or board #..."
            value={playerSearchQuery}
            onChange={(e) => setPlayerSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
          />
          {playerSearchQuery && (
            <button
              onClick={() => setPlayerSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Progress Tracker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-white font-medium">{completedGamesCount}</span>
            <span>/</span>
            <span>{totalGamesCount} Games Completed</span>
          </div>

          <div className="w-24 h-1.5 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#84dcc6] dark:bg-[#84dcc6] transition-all duration-300"
              style={{
                width: `${totalGamesCount > 0 ? (completedGamesCount / totalGamesCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Boards / Pairings List */}
      <div className="space-y-2 pt-1">
        {filteredGames.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
            {playerSearchQuery
              ? `No boards found matching "${playerSearchQuery}" in Round ${roundNum}.`
              : 'No pairings in this round.'}
          </div>
        ) : (
          filteredGames.map((game, idx) => {
            const whitePlayer = game.whitePlayerId ? playerMap.get(game.whitePlayerId) : null;
            const blackPlayer = game.blackPlayerId ? playerMap.get(game.blackPlayerId) : null;

            const wStats = whitePlayer ? statsBeforeRound.get(whitePlayer.id) : null;
            const bStats = blackPlayer ? statsBeforeRound.get(blackPlayer.id) : null;

            // Bye Board: Gives 1.0 point
            if (!game.whitePlayerId || !game.blackPlayerId) {
              const byePlayer = whitePlayer || blackPlayer;

              return (
                <div
                  key={game.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-neutral-500 w-7">BYE</span>
                    <div>
                      <span className="font-semibold text-white">{byePlayer?.name}</span>
                      <span className="text-neutral-400 ml-1.5 font-mono text-[11px]">({byePlayer?.rating})</span>
                      <span className="text-neutral-400 ml-2 font-medium">
                        Bye (+1.0 pt)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-white self-end sm:self-center px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    1 - 0 (+1.0 pt)
                  </span>
                </div>
              );
            }

            if (!whitePlayer || !blackPlayer) return null;

            return (
              <div
                key={game.id}
                className={`bg-neutral-950 border border-neutral-800 rounded-xl p-3 sm:px-4 transition-colors ${
                  game.result !== null ? 'opacity-95' : 'hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Board Number */}
                  <div className="w-8 shrink-0 font-mono text-neutral-500 text-[11px]">
                    #{game.boardNumber ?? idx + 1}
                  </div>

                  {/* White Player */}
                  <div className="flex-1 flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full piece-badge-white font-bold flex items-center justify-center text-[11px] shrink-0 shadow-xs">
                      ♔
                    </span>
                    <div className="min-w-0 truncate">
                      <span className="font-semibold text-white truncate">{whitePlayer.name}</span>
                      <span className="text-neutral-400 font-mono text-[11px] ml-1.5 shrink-0">
                        ({whitePlayer.rating})
                      </span>
                      <span className="text-neutral-500 text-[11px] font-mono ml-1.5">
                        [{wStats?.score ?? 0}p]
                      </span>
                    </div>
                  </div>

                  {/* Result Buttons or Read-Only Display */}
                  <div className="flex items-center justify-center gap-1.5 shrink-0 my-1 sm:my-0 bg-neutral-900 border border-neutral-800 px-2 py-1 rounded-lg">
                    {/* 1-0 */}
                    <button
                      disabled={isRoundLocked}
                      onClick={() => {
                        if (!isRoundLocked) {
                          onRecordResult(roundNum, game.id, game.result === '1-0' ? null : '1-0');
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                        game.result === '1-0'
                          ? 'result-btn-active'
                          : isRoundLocked
                          ? 'text-neutral-500 cursor-not-allowed'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      1 - 0
                    </button>

                    {/* Draw */}
                    {tournament.format !== 'knockout' ? (
                      <button
                        disabled={isRoundLocked}
                        onClick={() => {
                          if (!isRoundLocked) {
                            onRecordResult(roundNum, game.id, game.result === '1/2-1/2' ? null : '1/2-1/2');
                          }
                        }}
                        className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                          game.result === '1/2-1/2'
                            ? 'result-btn-active'
                            : isRoundLocked
                            ? 'text-neutral-500 cursor-not-allowed'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        ½ - ½
                      </button>
                    ) : (
                      <span className="px-1 text-[10px] text-neutral-500 font-mono">vs</span>
                    )}

                    {/* 0-1 */}
                    <button
                      disabled={isRoundLocked}
                      onClick={() => {
                        if (!isRoundLocked) {
                          onRecordResult(roundNum, game.id, game.result === '0-1' ? null : '0-1');
                        }
                      }}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                        game.result === '0-1'
                          ? 'result-btn-active'
                          : isRoundLocked
                          ? 'text-neutral-500 cursor-not-allowed'
                          : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      0 - 1
                    </button>
                  </div>

                  {/* Black Player */}
                  <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0 text-right">
                    <div className="min-w-0 truncate">
                      <span className="text-neutral-500 text-[11px] font-mono mr-1.5">
                        [{bStats?.score ?? 0}p]
                      </span>
                      <span className="text-neutral-400 font-mono text-[11px] mr-1.5 shrink-0">
                        ({blackPlayer.rating})
                      </span>
                      <span className="font-semibold text-white truncate">{blackPlayer.name}</span>
                    </div>
                    <span className="w-5 h-5 rounded-full piece-badge-black font-bold flex items-center justify-center text-[11px] shrink-0 shadow-xs">
                      ♚
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Submit Official Results Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Submit Tournament Results</h3>
                <p className="text-xs text-neutral-400">Finalize official standings after Round {roundNum}</p>
              </div>
            </div>

            <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-neutral-300">
                <span className="text-neutral-400">Rounds Completed:</span>
                <span className="font-mono font-semibold">{roundNum} of {effectiveTotalRounds}</span>
              </div>
              <div className="flex justify-between text-neutral-300">
                <span className="text-neutral-400">Total Players:</span>
                <span className="font-mono font-semibold">{tournament.players.length}</span>
              </div>
              {standings && standings.length > 0 && (
                <div className="flex justify-between text-neutral-300 border-t border-neutral-800/80 pt-2">
                  <span className="text-neutral-400">Tournament Leader:</span>
                  <span className="font-semibold text-white truncate max-w-[180px]">
                    {standings[0].name} ({standings[0].score.toFixed(1)} pts)
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Submitting results marks the tournament as completed. Previous rounds will remain locked and official standings will be certified.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm(false);
                  if (onSubmitResults) onSubmitResults();
                }}
                className="px-4 py-1.5 text-xs font-semibold btn-brand-accent rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Confirm & Submit Results</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
