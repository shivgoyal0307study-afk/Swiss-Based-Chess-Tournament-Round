/**
 * En Passant — Pairings & Results View
 * Supports Participant Read-Only Mode, In-Page Player Search,
 * PDF Export, and Strict Round Locking.
 */

import React, { useState } from 'react';
import { GameResult, Player, Tournament, StandingsRow } from '../types/tournament';
import { calculatePlayerStats } from '../engine/fideSwissEngine';
import { Play, ChevronRight, RotateCcw, Lock, Search, FileDown, Eye, X } from 'lucide-react';
import { exportPairingsPdf } from '../utils/pdfExport';

interface PairingsViewProps {
  tournament: Tournament;
  selectedRoundNumber: number;
  setSelectedRoundNumber: (roundNum: number) => void;
  onRecordResult: (roundNum: number, gameId: string, result: GameResult | null) => void;
  onGenerateNextRound: () => void;
  onUndoRound: (roundNum: number) => void;
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
  onStartTournament,
  isReadOnly = false,
  standings = [],
}) => {
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');

  // If tournament has 0 rounds
  if (tournament.rounds.length === 0) {
    const hasEnoughPlayers = tournament.players.filter((p) => p.active).length >= 2;

    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-8 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 mx-auto flex items-center justify-center text-amber-400 text-2xl font-bold">
            ♞
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">
              {hasEnoughPlayers ? 'Ready for Round 1' : 'No Rounds Paired Yet'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              {isReadOnly
                ? 'The arbiter has not generated Round 1 pairings yet. Check back soon for live pairings.'
                : hasEnoughPlayers
                ? `${tournament.players.length} players registered for ${tournament.roundsTotal} rounds (${
                    tournament.format === 'round_robin'
                      ? 'Round-Robin'
                      : tournament.format === 'knockout'
                      ? 'Knockout'
                      : 'Swiss'
                  }). Top seed begins with ${tournament.round1TopSeedColor === 'W' ? 'White' : 'Black'}.`
                : 'Register at least 2 active players in the Players tab to generate pairings.'}
            </p>
          </div>

          {!isReadOnly && hasEnoughPlayers && (
            <div className="pt-2">
              <button
                onClick={onStartTournament}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-neutral-950" />
                <span>Generate Round 1 Pairings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentRound =
    tournament.rounds.find((r) => r.roundNumber === selectedRoundNumber) ||
    tournament.rounds[tournament.rounds.length - 1];
  const roundNum = currentRound.roundNumber;

  const statsBeforeRound = calculatePlayerStats(tournament.players, tournament.rounds, roundNum - 1);
  const playerMap = new Map<string, Player>(tournament.players.map((p) => [p.id, p]));

  const completedGamesCount = currentRound.games.filter((g) => g.result !== null).length;
  const totalGamesCount = currentRound.games.length;
  const isRoundFinished = completedGamesCount === totalGamesCount;
  const isLatestRound = roundNum === tournament.rounds.length;

  // Previous rounds locked once subsequent rounds have been generated
  const isRoundLocked = roundNum < tournament.rounds.length || isReadOnly;

  const canGenerateNext = !isReadOnly && isRoundFinished && isLatestRound && roundNum < tournament.roundsTotal;
  const isTournamentFinished = isRoundFinished && roundNum === tournament.roundsTotal;

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Header Bar: Round Tabs, Actions, & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-850 pb-4">
        {/* Round Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tournament.rounds.map((r) => {
            const allDone = r.games.every((g) => g.result !== null);
            const isSelected = selectedRoundNumber === r.roundNumber;
            const isLocked = r.roundNumber < tournament.rounds.length;

            return (
              <button
                key={r.roundNumber}
                onClick={() => setSelectedRoundNumber(r.roundNumber)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <span>Round {r.roundNumber}</span>
                {isLocked ? (
                  <Lock className="w-3 h-3 text-neutral-500" />
                ) : allDone ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Global Arbiter & Export Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
            title="Download PDF of Round Pairings & Results"
          >
            <FileDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Download PDF</span>
          </button>

          {!isReadOnly && isLatestRound && roundNum > 1 && (
            <button
              onClick={() => onUndoRound(roundNum)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-rose-400 transition-colors"
              title="Undo current round pairings and results"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo Round</span>
            </button>
          )}

          {canGenerateNext && (
            <button
              onClick={onGenerateNextRound}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-lg transition-colors"
            >
              <span>Pair Round {roundNum + 1}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isTournamentFinished && (
            <div className="px-3 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
              Tournament Complete
            </div>
          )}
        </div>
      </div>

      {/* Notice for Read-Only / Locked rounds */}
      {isReadOnly ? (
        <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Participant Mode (Read-Only) · Showing official Round {roundNum} board pairings and results</span>
          </div>
        </div>
      ) : roundNum < tournament.rounds.length ? (
        <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-neutral-500" />
            <span>Round {roundNum} results are locked because Round {tournament.rounds.length} is already underway.</span>
          </div>
          <button
            onClick={() => setSelectedRoundNumber(tournament.rounds.length)}
            className="text-amber-400 hover:text-amber-300 font-medium"
          >
            Go to Round {tournament.rounds.length}
          </button>
        </div>
      ) : null}

      {/* Sub-Bar: Search My Board + Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-neutral-400 pt-1">
        {/* Instant Player Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search player or board #..."
            value={playerSearchQuery}
            onChange={(e) => setPlayerSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
          />
          {playerSearchQuery && (
            <button
              onClick={() => setPlayerSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Progress Counter */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          <span>
            {completedGamesCount} of {totalGamesCount} results recorded
          </span>
          <div className="w-24 sm:w-32 h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-amber-400 transition-all duration-300"
              style={{ width: `${(completedGamesCount / (totalGamesCount || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Board Pairings List */}
      <div className="space-y-2">
        {filteredGames.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-500 bg-neutral-900/30 rounded-xl border border-neutral-850">
            No pairings match "{playerSearchQuery}".
          </div>
        ) : (
          filteredGames.map((game, idx) => {
            const whitePlayer = game.whitePlayerId ? playerMap.get(game.whitePlayerId) : null;
            const blackPlayer = game.blackPlayerId ? playerMap.get(game.blackPlayerId) : null;

            const wStats = whitePlayer ? statsBeforeRound.get(whitePlayer.id) : null;
            const bStats = blackPlayer ? statsBeforeRound.get(blackPlayer.id) : null;

            // Bye Board
            if (!game.whitePlayerId || !game.blackPlayerId) {
              const byePlayer = whitePlayer || blackPlayer;
              const isPab = game.result === 'BYE_PAB';

              return (
                <div
                  key={game.id}
                  className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-neutral-500 w-7">BYE</span>
                    <div>
                      <span className="font-medium text-white">{byePlayer?.name}</span>
                      <span className="text-neutral-400 ml-1.5 font-mono text-[11px]">({byePlayer?.rating})</span>
                      <span className="text-neutral-500 ml-2">
                        {isPab ? 'Pairing-Allocated Bye (+1.0 pt)' : 'Half-Point Bye (+0.5 pt)'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-medium text-amber-400 self-end sm:self-center">
                    {isPab ? '+1.0' : '+0.5'}
                  </span>
                </div>
              );
            }

            if (!whitePlayer || !blackPlayer) return null;

            return (
              <div
                key={game.id}
                className={`bg-neutral-900/50 border border-neutral-800/80 rounded-xl p-3 sm:px-4 transition-colors ${
                  game.result !== null ? 'opacity-90' : 'hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  {/* Board Number */}
                  <div className="w-8 shrink-0 font-mono text-neutral-500 text-[11px]">
                    #{game.boardNumber ?? idx + 1}
                  </div>

                  {/* White Player */}
                  <div className="flex-1 flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-white text-neutral-950 font-bold flex items-center justify-center text-[11px] shrink-0">
                      ♔
                    </span>
                    <div className="min-w-0 truncate">
                      <span className="font-medium text-neutral-100 truncate">{whitePlayer.name}</span>
                      <span className="text-neutral-400 font-mono text-[11px] ml-1.5 shrink-0">
                        ({whitePlayer.rating})
                      </span>
                      <span className="text-neutral-500 text-[11px] font-mono ml-1.5">
                        [{wStats?.score ?? 0}p]
                      </span>
                    </div>
                  </div>

                  {/* Result Selector */}
                  <div className="flex items-center justify-center gap-1 shrink-0 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
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
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : isRoundLocked
                          ? 'text-neutral-600 cursor-not-allowed'
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
                            ? 'bg-amber-400 text-neutral-950 font-bold'
                            : isRoundLocked
                            ? 'text-neutral-600 cursor-not-allowed'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        ½ - ½
                      </button>
                    ) : (
                      <span className="px-1 text-[10px] text-neutral-500">vs</span>
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
                          ? 'bg-amber-400 text-neutral-950 font-bold'
                          : isRoundLocked
                          ? 'text-neutral-600 cursor-not-allowed'
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
                      <span className="font-medium text-neutral-100 truncate">{blackPlayer.name}</span>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                      ♚
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
