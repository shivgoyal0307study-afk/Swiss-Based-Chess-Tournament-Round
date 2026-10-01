/**
 * Official FIDE Standings & Tiebreakers Table
 * With interactive breakdown drilldowns, tabular figures, and search.
 */

import React, { useState } from 'react';
import { StandingsRow, Tournament } from '../types/tournament';
import { ChevronDown, ChevronUp, Search, Info, HelpCircle, FileDown } from 'lucide-react';
import { exportStandingsPdf } from '../utils/pdfExport';

interface StandingsTableProps {
  standings: StandingsRow[];
  totalRounds: number;
  tournament?: Tournament;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({ standings, totalRounds, tournament }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [showTiebreakerHelp, setShowTiebreakerHelp] = useState(false);

  const filteredStandings = standings.filter(
    (row) =>
      row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (row.title && row.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDownloadPdf = () => {
    if (tournament) {
      exportStandingsPdf(tournament, standings);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            Tournament Standings
          </h2>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
            <span>FIDE Official Tiebreaker Hierarchy</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setShowTiebreakerHelp(!showTiebreakerHelp)}
              className="text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Tiebreaker Rules
            </button>
          </div>
        </div>

        {/* Search & PDF Download */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {tournament && (
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors shrink-0"
              title="Download PDF of Standings & Tiebreakers"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Download PDF</span>
            </button>
          )}

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search player or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Tiebreaker Rules Help Box */}
      {showTiebreakerHelp && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-xs text-neutral-300 space-y-2">
          <div className="font-semibold text-neutral-100 flex items-center justify-between">
            <span>FIDE Tiebreaker Hierarchy (Evaluated in strict sequence):</span>
            <button
              onClick={() => setShowTiebreakerHelp(false)}
              className="text-neutral-500 hover:text-neutral-300"
            >
              ✕
            </button>
          </div>
          <ol className="list-decimal pl-5 space-y-1 text-neutral-400">
            <li>
              <strong className="text-neutral-200">Total Points (Pts):</strong> Primary score (1 for win, 0.5 for draw, 0 for loss).
            </li>
            <li>
              <strong className="text-neutral-200">Direct Encounter (DE):</strong> Score in mutual games among tied players. Only applied if ALL players in the tied group played each other.
            </li>
            <li>
              <strong className="text-neutral-200">Buchholz Cut 1 (BH-C1):</strong> Sum of opponents' scores, excluding the single lowest-scoring opponent. Unplayed games apply FIDE C.04.1.f Virtual Opponent adjustment.
            </li>
            <li>
              <strong className="text-neutral-200">Buchholz (BH):</strong> Total sum of scores of all opponents.
            </li>
            <li>
              <strong className="text-neutral-200">Sonneborn-Berger (SB):</strong> Sum of 100% of scores of defeated opponents + 50% of scores of drawn opponents.
            </li>
            <li>
              <strong className="text-neutral-200">Cumulative Score (Prog):</strong> Sum of progressive tournament scores after each round.
            </li>
            <li>
              <strong className="text-neutral-200">Number of Wins (W):</strong> Total actual victories won.
            </li>
            <li>
              <strong className="text-neutral-200">Initial Rating:</strong> Higher initial starting rating breaks remaining ties.
            </li>
          </ol>
        </div>
      )}

      {/* Standings Table */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 font-mono">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                <th className="py-2.5 px-4 min-w-[200px]">Player</th>
                <th className="py-2.5 px-3 text-right font-medium">Rating</th>
                <th className="py-2.5 px-3 text-right font-bold text-amber-400">Pts</th>
                <th className="py-2.5 px-3 text-right" title="Direct Encounter (Head-to-head)">DE</th>
                <th className="py-2.5 px-3 text-right" title="Buchholz Cut 1 (lowest opponent dropped)">BH-C1</th>
                <th className="py-2.5 px-3 text-right" title="Buchholz (Sum of opponent scores)">BH</th>
                <th className="py-2.5 px-3 text-right" title="Sonneborn-Berger score">SB</th>
                <th className="py-2.5 px-3 text-right" title="Cumulative progressive score">Prog</th>
                <th className="py-2.5 px-3 text-right" title="Number of won games">W</th>
                <th className="py-2.5 px-3 text-right" title="Games played">Pl</th>
                <th className="py-2.5 px-3 text-right" title="Color balance (White - Black games)">W-B</th>
                <th className="py-2.5 px-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredStandings.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-xs text-neutral-500">
                    {standings.length === 0
                      ? 'No players registered yet. Add players in the Players tab to view standings.'
                      : 'No players match the search criteria.'}
                  </td>
                </tr>
              ) : (
                filteredStandings.map((row) => {
                  const isExpanded = expandedPlayerId === row.playerId;
                  const isTop3 = row.rank <= 3;

                return (
                  <React.Fragment key={row.playerId}>
                    <tr
                      onClick={() => setExpandedPlayerId(isExpanded ? null : row.playerId)}
                      className={`hover:bg-neutral-800/40 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-neutral-800/30' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                        {row.rank === 1 ? (
                          <span className="font-bold text-amber-400">1</span>
                        ) : row.rank === 2 ? (
                          <span className="font-semibold text-neutral-200">2</span>
                        ) : row.rank === 3 ? (
                          <span className="font-semibold text-neutral-400">3</span>
                        ) : (
                          <span className="text-neutral-500">{row.rank}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {row.title && (
                            <span className="text-[11px] font-bold text-amber-400 shrink-0 font-mono">
                              {row.title}
                            </span>
                          )}
                          <span className="font-semibold text-neutral-100 hover:text-amber-300 transition-colors">
                            {row.name}
                          </span>
                          {!row.active && (
                            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1 rounded">
                              Withdrawn
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-400">
                        {row.rating}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-sm font-bold text-amber-400">
                        {row.score.toFixed(1)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300">
                        {row.directEncounter > 0 ? row.directEncounter.toFixed(1) : '—'}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-neutral-200">
                        {row.buchholzCut1.toFixed(1)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-400">
                        {row.buchholz.toFixed(1)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-300">
                        {row.sonnebornBerger.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-400">
                        {row.cumulativeScore.toFixed(1)}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-400">
                        {row.wins}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-500">
                        {row.gamesPlayed}
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums text-neutral-500">
                        {row.colorBalance > 0 ? `+${row.colorBalance}` : row.colorBalance}
                      </td>

                      <td className="py-3 px-3 text-center text-neutral-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </td>
                    </tr>

                    {/* Drilldown Drawer for this player */}
                    {isExpanded && row.details && (
                      <tr className="bg-neutral-950/70 border-b border-neutral-800">
                        <td colSpan={13} className="p-4">
                          <div className="space-y-4 max-w-4xl mx-auto">
                            <div className="flex items-center justify-between text-xs border-b border-neutral-800 pb-2">
                              <span className="font-semibold text-neutral-200">
                                Detailed Tiebreaker Breakdown for {row.name} ({row.rating})
                              </span>
                              <span className="text-neutral-500">
                                Rank #{row.rank} · {row.score.toFixed(1)} Points
                              </span>
                            </div>

                            {/* Opponents Table */}
                            <div>
                              <div className="text-[11px] font-medium text-neutral-400 mb-1.5">
                                Opponents & Points Breakdown:
                              </div>
                              <div className="border border-neutral-800 rounded-lg overflow-hidden bg-neutral-900/60">
                                <table className="w-full text-[11px]">
                                  <thead className="bg-neutral-950 text-neutral-400 font-mono border-b border-neutral-800">
                                    <tr>
                                      <th className="py-2 px-3 text-left">Rnd</th>
                                      <th className="py-2 px-3 text-left">Opponent</th>
                                      <th className="py-2 px-3 text-center">Color</th>
                                      <th className="py-2 px-3 text-center">Result</th>
                                      <th className="py-2 px-3 text-right">Opp. Final Pts</th>
                                      <th className="py-2 px-3 text-right">SB Earned</th>
                                      <th className="py-2 px-3 text-left">Buchholz Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-neutral-800/50">
                                    {row.details.opponents.map((opp, idx) => {
                                      const isCut =
                                        opp.opponentId === row.details?.buchholzExcludedId ||
                                        (opp.isVirtual && !row.details?.buchholzExcludedId);

                                      let sbEarned = 0;
                                      if (opp.pointsAwarded === 1.0) sbEarned = opp.opponentFinalScore;
                                      else if (opp.pointsAwarded === 0.5) sbEarned = opp.opponentFinalScore * 0.5;

                                      return (
                                        <tr
                                          key={idx}
                                          className={`hover:bg-neutral-800/30 ${
                                            isCut ? 'bg-rose-950/10' : ''
                                          }`}
                                        >
                                          <td className="py-2 px-3 font-mono tabular-nums">
                                            R{opp.round}
                                          </td>
                                          <td className="py-2 px-3 font-medium text-neutral-200">
                                            {opp.opponentName}{' '}
                                            {opp.opponentRating ? `(${opp.opponentRating})` : ''}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono">
                                            {opp.color === 'W' ? (
                                              <span className="text-neutral-200 bg-neutral-800 px-1 rounded">White</span>
                                            ) : opp.color === 'B' ? (
                                              <span className="text-neutral-400 bg-neutral-950 px-1 rounded border border-neutral-800">Black</span>
                                            ) : (
                                              '—'
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center font-mono font-bold text-neutral-100">
                                            {opp.result || 'Pending'}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-300">
                                            {opp.opponentFinalScore.toFixed(1)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono tabular-nums text-amber-400">
                                            {sbEarned.toFixed(2)}
                                          </td>
                                          <td className="py-2 px-3 text-left">
                                            {isCut ? (
                                              <span className="text-[10px] text-rose-400 font-medium">
                                                Excluded for BH-C1 (lowest)
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-neutral-400">
                                                Counted in BH & BH-C1
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Math summary */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-neutral-900/80 p-3 rounded-lg border border-neutral-800">
                              <div>
                                <span className="text-neutral-500">Buchholz (BH):</span>{' '}
                                <span className="text-neutral-200 font-bold">{row.buchholz.toFixed(1)}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500">BH Cut 1 (BH-C1):</span>{' '}
                                <span className="text-neutral-200 font-bold">{row.buchholzCut1.toFixed(1)}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500">Sonneborn-Berger:</span>{' '}
                                <span className="text-neutral-200 font-bold">{row.sonnebornBerger.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
