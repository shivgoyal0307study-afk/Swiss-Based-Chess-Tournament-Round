/**
 * FIDE Official Tiebreakers Hierarchy & Standings Calculation
 * Conforms to FIDE Handbook C.04.1 & C.04.3
 */

import { Player, Game, GameResult, Round, StandingsRow, PlayerStats } from '../types/tournament';
import { calculatePlayerStats } from './fideSwissEngine';

export interface OpponentDetail {
  round: number;
  opponentId: string | null;
  opponentName: string;
  opponentRating: number;
  opponentFinalScore: number;
  color: 'W' | 'B' | '-';
  result: GameResult | null;
  pointsAwarded: number;
  isVirtual?: boolean;
}

/**
 * Calculates FIDE Standings with full tiebreaker hierarchies.
 */
export function calculateStandings(
  players: Player[],
  rounds: Round[],
  roundsTotal: number
): StandingsRow[] {
  const statsMap = calculatePlayerStats(players, rounds);
  const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));

  // Calculate progressive score (cumulative sum after each round)
  const cumulativeScores = calculateCumulativeScores(players, rounds);

  // Pre-calculate raw scores
  const playerScores = new Map<string, number>();
  for (const p of players) {
    playerScores.set(p.id, statsMap.get(p.id)?.score ?? 0);
  }

  // Pre-calculate opponent lists and virtual scores for Buchholz and Sonneborn-Berger
  const opponentDetailsMap = new Map<string, OpponentDetail[]>();

  for (const player of players) {
    const details: OpponentDetail[] = [];
    let runningScore = 0;

    for (const round of rounds) {
      const game = round.games.find(
        (g) => g.whitePlayerId === player.id || g.blackPlayerId === player.id
      );

      if (!game || !game.result) continue;

      const isWhite = game.whitePlayerId === player.id;
      const isBlack = game.blackPlayerId === player.id;
      const color: 'W' | 'B' | '-' = isWhite ? 'W' : isBlack ? 'B' : '-';

      let pts = 0;
      if (game.result === '1-0') pts = isWhite ? 1 : 0;
      else if (game.result === '0-1') pts = isBlack ? 1 : 0;
      else if (game.result === '1/2-1/2') pts = 0.5;
      else if (game.result === '1-0F') pts = isWhite ? 1 : 0;
      else if (game.result === '0-1F') pts = isBlack ? 1 : 0;
      else if (game.result === 'BYE_PAB') pts = 1.0;
      else if (game.result === 'BYE_HALF') pts = 0.5;

      const preGameScore = runningScore;
      runningScore += pts;

      // Handle unplayed games with FIDE Virtual Opponent adjustment (FIDE C.04.1.f)
      if (game.result === 'BYE_PAB' || game.result === 'BYE_HALF' || (game.result === '1-0F' && !isBlack) || (game.result === '0-1F' && !isWhite)) {
        // Virtual opponent formula: preGameScore + 0.5 * (roundsTotal - round.roundNumber + 1)
        const remainingRounds = Math.max(0, roundsTotal - round.roundNumber);
        const virtualScore = preGameScore + 0.5 + remainingRounds * 0.5;

        details.push({
          round: round.roundNumber,
          opponentId: null,
          opponentName: game.result === 'BYE_PAB' ? 'PAB (Full-Point Bye)' : 'Half-Point Bye',
          opponentRating: player.rating,
          opponentFinalScore: virtualScore,
          color: '-',
          result: game.result,
          pointsAwarded: pts,
          isVirtual: true,
        });
      } else {
        const oppId = isWhite ? game.blackPlayerId : game.whitePlayerId;
        const opponent = oppId ? playerMap.get(oppId) : null;
        const oppFinalScore = oppId ? (playerScores.get(oppId) ?? 0) : 0;

        details.push({
          round: round.roundNumber,
          opponentId: oppId,
          opponentName: opponent ? opponent.name : 'Unknown Opponent',
          opponentRating: opponent?.rating ?? 0,
          opponentFinalScore: oppFinalScore,
          color,
          result: game.result,
          pointsAwarded: pts,
          isVirtual: false,
        });
      }
    }

    opponentDetailsMap.set(player.id, details);
  }

  // Calculate Buchholz, Buchholz Cut 1, and Sonneborn-Berger
  const buchholzMap = new Map<string, number>();
  const buchholzCut1Map = new Map<string, { value: number; excludedId: string | null; excludedScore: number }>();
  const sonnebornBergerMap = new Map<string, number>();

  for (const player of players) {
    const details = opponentDetailsMap.get(player.id) ?? [];
    const oppScores = details.map((d) => d.opponentFinalScore);

    const bh = oppScores.reduce((sum, s) => sum + s, 0);
    buchholzMap.set(player.id, bh);

    // Buchholz Cut 1: Drop the lowest score
    if (oppScores.length > 0) {
      let minScore = oppScores[0];
      let minIdx = 0;
      for (let i = 1; i < oppScores.length; i++) {
        if (oppScores[i] < minScore) {
          minScore = oppScores[i];
          minIdx = i;
        }
      }
      const bhCut1 = bh - minScore;
      buchholzCut1Map.set(player.id, {
        value: bhCut1,
        excludedId: details[minIdx].opponentId,
        excludedScore: minScore,
      });
    } else {
      buchholzCut1Map.set(player.id, { value: 0, excludedId: null, excludedScore: 0 });
    }

    // Sonneborn-Berger:
    // Wins count 100% of opponent score, Draws count 50%
    let sb = 0;
    for (const d of details) {
      if (d.pointsAwarded === 1.0) {
        sb += d.opponentFinalScore * 1.0;
      } else if (d.pointsAwarded === 0.5) {
        sb += d.opponentFinalScore * 0.5;
      }
    }
    sonnebornBergerMap.set(player.id, sb);
  }

  // Calculate Direct Encounter (Head-to-Head)
  // According to FIDE C.04.1: Direct Encounter applies only if ALL tied players have played each other.
  const directEncounterMap = calculateDirectEncounters(players, rounds, playerScores);

  // Assemble rows
  const rows: StandingsRow[] = players.map((player) => {
    const stats = statsMap.get(player.id)!;
    const de = directEncounterMap.get(player.id) ?? 0;
    const bh = buchholzMap.get(player.id) ?? 0;
    const bhCut1Info = buchholzCut1Map.get(player.id) ?? {
      value: 0,
      excludedId: null,
      excludedScore: 0,
    };
    const sb = sonnebornBergerMap.get(player.id) ?? 0;
    const cum = cumulativeScores.get(player.id) ?? 0;
    const details = opponentDetailsMap.get(player.id) ?? [];

    return {
      rank: 1,
      playerId: player.id,
      name: player.name,
      title: player.title,
      rating: player.rating,
      score: stats.score,
      directEncounter: de,
      buchholzCut1: bhCut1Info.value,
      buchholz: bh,
      sonnebornBerger: sb,
      cumulativeScore: cum,
      wins: stats.actualWins,
      gamesPlayed: stats.gamesPlayed,
      colorBalance: stats.colorDifference,
      active: player.active,
      details: {
        opponents: details,
        buchholzExcludedId: bhCut1Info.excludedId,
        buchholzExcludedScore: bhCut1Info.excludedScore,
      },
    };
  });

  // Sort rows strictly in accordance with FIDE Tiebreaker Hierarchy:
  // 1. Total Points (Score)
  // 2. Direct Encounter (Head-to-Head among tied players)
  // 3. Buchholz Cut 1 (BH-C1)
  // 4. Buchholz System (BH)
  // 5. Sonneborn-Berger (SB)
  // 6. Cumulative / Progressive Score
  // 7. Number of Wins (actual wins)
  // 8. Initial Rating
  // 9. Name
  rows.sort((a, b) => {
    // 1. Score
    if (b.score !== a.score) return b.score - a.score;

    // 2. Direct Encounter (only non-zero if all mutually tied played each other)
    if (b.directEncounter !== a.directEncounter) {
      return b.directEncounter - a.directEncounter;
    }

    // 3. Buchholz Cut 1
    if (Math.abs(b.buchholzCut1 - a.buchholzCut1) > 0.001) {
      return b.buchholzCut1 - a.buchholzCut1;
    }

    // 4. Buchholz
    if (Math.abs(b.buchholz - a.buchholz) > 0.001) {
      return b.buchholz - a.buchholz;
    }

    // 5. Sonneborn-Berger
    if (Math.abs(b.sonnebornBerger - a.sonnebornBerger) > 0.001) {
      return b.sonnebornBerger - a.sonnebornBerger;
    }

    // 6. Cumulative Score
    if (Math.abs(b.cumulativeScore - a.cumulativeScore) > 0.001) {
      return b.cumulativeScore - a.cumulativeScore;
    }

    // 7. Number of Wins
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    // 8. Initial Rating
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }

    return a.name.localeCompare(b.name);
  });

  // Assign 1-indexed ranks
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return rows;
}

/**
 * Calculates Direct Encounter (Head-to-Head) scores for tied groups.
 * FIDE Rule: Direct Encounter is only valid if ALL tied players have played against each other.
 */
function calculateDirectEncounters(
  players: Player[],
  rounds: Round[],
  playerScores: Map<string, number>
): Map<string, number> {
  const deMap = new Map<string, number>();
  for (const p of players) {
    deMap.set(p.id, 0);
  }

  // Group players by identical score
  const scoreGroups = new Map<number, string[]>();
  for (const [playerId, score] of playerScores.entries()) {
    if (!scoreGroups.has(score)) {
      scoreGroups.set(score, []);
    }
    scoreGroups.get(score)!.push(playerId);
  }

  // Index all games between players
  // mutualResults[pA][pB] = points pA scored against pB
  const mutualResults = new Map<string, Map<string, number>>();

  for (const round of rounds) {
    for (const game of round.games) {
      if (!game.result || !game.whitePlayerId || !game.blackPlayerId) continue;
      const wId = game.whitePlayerId;
      const bId = game.blackPlayerId;

      if (!mutualResults.has(wId)) mutualResults.set(wId, new Map());
      if (!mutualResults.has(bId)) mutualResults.set(bId, new Map());

      let wPts = 0;
      let bPts = 0;
      if (game.result === '1-0') {
        wPts = 1;
        bPts = 0;
      } else if (game.result === '0-1') {
        wPts = 0;
        bPts = 1;
      } else if (game.result === '1/2-1/2') {
        wPts = 0.5;
        bPts = 0.5;
      } else if (game.result === '1-0F') {
        wPts = 1;
        bPts = 0;
      } else if (game.result === '0-1F') {
        wPts = 0;
        bPts = 1;
      }

      mutualResults.get(wId)!.set(bId, wPts);
      mutualResults.get(bId)!.set(wId, bPts);
    }
  }

  // Check each score group
  for (const [, tiedPlayerIds] of scoreGroups.entries()) {
    if (tiedPlayerIds.length <= 1) continue;

    // Check if ALL pairs in this tied group have played each other
    let allPlayed = true;
    for (let i = 0; i < tiedPlayerIds.length; i++) {
      for (let j = i + 1; j < tiedPlayerIds.length; j++) {
        const p1 = tiedPlayerIds[i];
        const p2 = tiedPlayerIds[j];
        if (!mutualResults.get(p1)?.has(p2)) {
          allPlayed = false;
          break;
        }
      }
      if (!allPlayed) break;
    }

    if (allPlayed) {
      // Direct encounter applies! Sum points scored within this mini-group
      for (const pId of tiedPlayerIds) {
        let deScore = 0;
        for (const oppId of tiedPlayerIds) {
          if (pId === oppId) continue;
          deScore += mutualResults.get(pId)?.get(oppId) ?? 0;
        }
        deMap.set(pId, deScore);
      }
    }
  }

  return deMap;
}

/**
 * Calculates Cumulative / Progressive Score:
 * Sum of accumulated scores after each round.
 */
function calculateCumulativeScores(
  players: Player[],
  rounds: Round[]
): Map<string, number> {
  const cumMap = new Map<string, number>();
  for (const p of players) {
    cumMap.set(p.id, 0);
  }

  const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const currentRunningScore = new Map<string, number>();
  for (const p of players) {
    currentRunningScore.set(p.id, 0);
  }

  for (const round of sortedRounds) {
    for (const game of round.games) {
      if (!game.result) continue;

      const wId = game.whitePlayerId;
      const bId = game.blackPlayerId;

      if (game.result === 'BYE_PAB') {
        const pId = wId || bId;
        if (pId) currentRunningScore.set(pId, (currentRunningScore.get(pId) ?? 0) + 1.0);
        continue;
      }
      if (game.result === 'BYE_HALF') {
        const pId = wId || bId;
        if (pId) currentRunningScore.set(pId, (currentRunningScore.get(pId) ?? 0) + 0.5);
        continue;
      }

      if (wId) {
        let pts = 0;
        if (game.result === '1-0' || game.result === '1-0F') pts = 1;
        else if (game.result === '1/2-1/2') pts = 0.5;
        currentRunningScore.set(wId, (currentRunningScore.get(wId) ?? 0) + pts);
      }

      if (bId) {
        let pts = 0;
        if (game.result === '0-1' || game.result === '0-1F') pts = 1;
        else if (game.result === '1/2-1/2') pts = 0.5;
        currentRunningScore.set(bId, (currentRunningScore.get(bId) ?? 0) + pts);
      }
    }

    // Add this round's progressive score to cumulative total
    for (const p of players) {
      const curScore = currentRunningScore.get(p.id) ?? 0;
      cumMap.set(p.id, (cumMap.get(p.id) ?? 0) + curScore);
    }
  }

  return cumMap;
}
