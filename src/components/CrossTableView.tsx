/**
 * Official FIDE Tournament Cross Table (Grid Matrix)
 * Displays standard notation per round (e.g. 12w1, 4b½, 7w0, BYE+)
 */

import React from 'react';
import { Player, Round, StandingsRow, Tournament } from '../types/tournament';

interface CrossTableViewProps {
  tournament: Tournament;
  standings: StandingsRow[];
}

export const CrossTableView: React.FC<CrossTableViewProps> = ({ tournament, standings }) => {
  // Sort initial players by starting rank (rating descending) to determine Seed #
  const sortedInitial = [...tournament.players].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  const seedMap = new Map<string, number>();
  sortedInitial.forEach((p, idx) => {
    seedMap.set(p.id, idx + 1);
  });

  // Map each round and game to player cell info
  // playerRoundData: Map<playerId, Map<roundNumber, string>>
  const playerRoundData = new Map<string, Map<number, { text: string; bgClass: string; title: string }>>();

  for (const player of tournament.players) {
    playerRoundData.set(player.id, new Map());
  }

  for (const round of tournament.rounds) {
    for (const game of round.games) {
      if (!game.result) continue;

      if (game.result === 'BYE_PAB') {
        const pId = game.whitePlayerId || game.blackPlayerId;
        if (pId && playerRoundData.has(pId)) {
          playerRoundData.get(pId)!.set(round.roundNumber, {
            text: 'BYE 1',
            bgClass: 'bg-emerald-950/40 text-emerald-300 font-bold',
            title: `Round ${round.roundNumber}: Pairing Allocated Bye (+1.0)`,
          });
        }
        continue;
      }

      if (game.result === 'BYE_HALF') {
        const pId = game.whitePlayerId || game.blackPlayerId;
        if (pId && playerRoundData.has(pId)) {
          playerRoundData.get(pId)!.set(round.roundNumber, {
            text: 'BYE ½',
            bgClass: 'bg-neutral-800 text-neutral-300',
            title: `Round ${round.roundNumber}: Half-Point Bye (+0.5)`,
          });
        }
        continue;
      }

      const wId = game.whitePlayerId;
      const bId = game.blackPlayerId;
      if (!wId || !bId) continue;

      const wSeed = seedMap.get(wId) ?? '?';
      const bSeed = seedMap.get(bId) ?? '?';

      let wSymbol = '';
      let bSymbol = '';
      let wBg = '';
      let bBg = '';

      if (game.result === '1-0' || game.result === '1-0F') {
        wSymbol = `${bSeed}w1`;
        bSymbol = `${wSeed}b0`;
        wBg = 'bg-emerald-950/40 text-emerald-300 font-semibold';
        bBg = 'bg-rose-950/30 text-rose-300';
      } else if (game.result === '0-1' || game.result === '0-1F') {
        wSymbol = `${bSeed}w0`;
        bSymbol = `${wSeed}b1`;
        wBg = 'bg-rose-950/30 text-rose-300';
        bBg = 'bg-emerald-950/40 text-emerald-300 font-semibold';
      } else if (game.result === '1/2-1/2') {
        wSymbol = `${bSeed}w½`;
        bSymbol = `${wSeed}b½`;
        wBg = 'bg-neutral-800/80 text-neutral-300';
        bBg = 'bg-neutral-800/80 text-neutral-300';
      }

      playerRoundData.get(wId)?.set(round.roundNumber, {
        text: wSymbol,
        bgClass: wBg,
        title: `Round ${round.roundNumber}: vs Seed #${bSeed} (White) Result: ${game.result}`,
      });

      playerRoundData.get(bId)?.set(round.roundNumber, {
        text: bSymbol,
        bgClass: bBg,
        title: `Round ${round.roundNumber}: vs Seed #${wSeed} (Black) Result: ${game.result}`,
      });
    }
  }

  // Display rows sorted by current Standings rank
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-100">FIDE Crosstable Matrix</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Cell format: <span className="font-mono text-neutral-300">[Opponent Seed][Color (w/b)][Result (1, ½, 0)]</span>.
          E.g. <span className="font-mono text-neutral-200">5w1</span> means played seed #5 with White and won.
        </p>
      </div>

      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 font-mono">
              <tr>
                <th className="py-3 px-3 text-center w-12" title="Final Rank">Rk</th>
                <th className="py-3 px-3 text-center w-12" title="Initial Seed Number">#</th>
                <th className="py-3 px-4 min-w-[200px]">Player Name</th>
                <th className="py-3 px-3 text-right">Rating</th>

                {/* Round columns */}
                {Array.from({ length: tournament.roundsTotal }).map((_, idx) => (
                  <th key={idx} className="py-3 px-3 text-center font-semibold min-w-[64px]">
                    R{idx + 1}
                  </th>
                ))}

                <th className="py-3 px-3 text-right font-bold text-amber-400">Pts</th>
                <th className="py-3 px-3 text-right" title="Buchholz Cut 1">BH-C1</th>
                <th className="py-3 px-3 text-right" title="Sonneborn-Berger">SB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono">
              {standings.length === 0 ? (
                <tr>
                  <td colSpan={7 + tournament.roundsTotal} className="py-8 text-center text-xs text-neutral-500 font-sans">
                    No tournament games or cross-table records yet. Register players and pair rounds to populate the matrix.
                  </td>
                </tr>
              ) : (
                standings.map((row) => {
                  const seed = seedMap.get(row.playerId) ?? '—';
                  const roundsMap = playerRoundData.get(row.playerId);

                return (
                  <tr key={row.playerId} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-amber-300 tabular-nums">
                      {row.rank}
                    </td>

                    <td className="py-2.5 px-3 text-center text-neutral-500 tabular-nums">
                      {seed}
                    </td>

                    <td className="py-2.5 px-4 font-sans font-medium text-neutral-100">
                      <div className="flex items-center gap-1.5">
                        {row.title && (
                          <span className="text-[10px] font-bold text-amber-400 font-mono">
                            {row.title}
                          </span>
                        )}
                        <span>{row.name}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right text-neutral-400 tabular-nums">
                      {row.rating}
                    </td>

                    {/* Rounds cells */}
                    {Array.from({ length: tournament.roundsTotal }).map((_, idx) => {
                      const rNum = idx + 1;
                      const cell = roundsMap?.get(rNum);

                      if (!cell) {
                        return (
                          <td key={rNum} className="py-2.5 px-3 text-center text-neutral-700">
                            —
                          </td>
                        );
                      }

                      return (
                        <td key={rNum} className="py-2.5 px-2 text-center" title={cell.title}>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono tabular-nums ${cell.bgClass}`}
                          >
                            {cell.text}
                          </span>
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-right font-bold text-amber-400 text-sm tabular-nums">
                      {row.score.toFixed(1)}
                    </td>

                    <td className="py-2.5 px-3 text-right text-neutral-300 tabular-nums">
                      {row.buchholzCut1.toFixed(1)}
                    </td>

                    <td className="py-2.5 px-3 text-right text-neutral-400 tabular-nums">
                      {row.sonnebornBerger.toFixed(2)}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
