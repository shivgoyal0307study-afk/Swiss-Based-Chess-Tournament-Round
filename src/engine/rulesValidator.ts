/**
 * FIDE Swiss System Rules Validator & Arbiter Audit Tool
 * Validates Absolute Criteria C1, C2, C3, C4 and quality criteria across all rounds.
 */

import { Player, Round, Game } from '../types/tournament';

export interface RuleViolation {
  rule: 'C1' | 'C2' | 'C3' | 'C4';
  severity: 'error' | 'warning';
  title: string;
  description: string;
  roundNumber?: number;
  playerIds: string[];
  playerNames: string[];
}

export interface ValidationReport {
  isValid: boolean;
  violations: RuleViolation[];
  c1Passed: boolean;
  c2Passed: boolean;
  c3Passed: boolean;
  c4Passed: boolean;
  statistics: {
    totalGames: number;
    totalByes: number;
    colorBalanceAvg: number;
    maxColorDiff: number;
  };
}

export function validateTournamentRules(
  players: Player[],
  rounds: Round[]
): ValidationReport {
  const violations: RuleViolation[] = [];
  const playerMap = new Map<string, Player>(players.map((p) => [p.id, p]));

  // Tracking structures
  // C1: Opponent pairs played (unordered set of pairs)
  const gamesPlayed = new Map<string, { round: number; count: number }>();

  // C2: Unplayed points count & PAB count
  const pabCounts = new Map<string, number>();
  const unplayedPoints = new Map<string, { round: number; type: string }[]>();

  // C3 & C4: Color history per player
  const colorHistories = new Map<string, { color: 'W' | 'B'; round: number }[]>();

  for (const p of players) {
    pabCounts.set(p.id, 0);
    unplayedPoints.set(p.id, []);
    colorHistories.set(p.id, []);
  }

  const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  for (const round of sortedRounds) {
    for (const game of round.games) {
      // Check PAB / Unplayed byes
      if (game.result === 'BYE_PAB') {
        const pId = game.whitePlayerId || game.blackPlayerId;
        if (pId) {
          const currentPab = pabCounts.get(pId) ?? 0;
          pabCounts.set(pId, currentPab + 1);

          const prevUnplayed = unplayedPoints.get(pId) ?? [];
          if (prevUnplayed.length > 0) {
            // C2 Violation: Player received PAB after already getting an unplayed point
            const pName = playerMap.get(pId)?.name ?? pId;
            violations.push({
              rule: 'C2',
              severity: 'error',
              title: 'C2 Absolute Violation: Multiple unplayed points / PAB',
              description: `${pName} received a Pairing Allocated Bye in Round ${round.roundNumber}, but had already received an unplayed point in Round ${prevUnplayed[0].round} (${prevUnplayed[0].type}).`,
              roundNumber: round.roundNumber,
              playerIds: [pId],
              playerNames: [pName],
            });
          }

          unplayedPoints.get(pId)?.push({ round: round.roundNumber, type: 'BYE_PAB' });
        }
        continue;
      }

      if (game.result === '1-0F') {
        const wId = game.whitePlayerId;
        if (wId) {
          unplayedPoints.get(wId)?.push({ round: round.roundNumber, type: '1-0F (Forfeit win)' });
        }
      } else if (game.result === '0-1F') {
        const bId = game.blackPlayerId;
        if (bId) {
          unplayedPoints.get(bId)?.push({ round: round.roundNumber, type: '0-1F (Forfeit win)' });
        }
      }

      const wId = game.whitePlayerId;
      const bId = game.blackPlayerId;

      if (!wId || !bId) continue;

      // C1: Check duplicate pairings
      const pairKey = [wId, bId].sort().join('___');
      const existing = gamesPlayed.get(pairKey);
      if (existing) {
        const name1 = playerMap.get(wId)?.name ?? wId;
        const name2 = playerMap.get(bId)?.name ?? bId;
        violations.push({
          rule: 'C1',
          severity: 'error',
          title: 'C1 Absolute Violation: Duplicate Pairing',
          description: `${name1} and ${name2} played each other again in Round ${round.roundNumber} (previously played in Round ${existing.round}).`,
          roundNumber: round.roundNumber,
          playerIds: [wId, bId],
          playerNames: [name1, name2],
        });
      } else {
        gamesPlayed.set(pairKey, { round: round.roundNumber, count: 1 });
      }

      // Record colors
      colorHistories.get(wId)?.push({ color: 'W', round: round.roundNumber });
      colorHistories.get(bId)?.push({ color: 'B', round: round.roundNumber });
    }
  }

  // Check C2: Any player with > 1 PAB
  for (const [pId, count] of pabCounts.entries()) {
    if (count > 1) {
      const pName = playerMap.get(pId)?.name ?? pId;
      violations.push({
        rule: 'C2',
        severity: 'error',
        title: 'C2 Absolute Violation: Multiple PAB Byes',
        description: `${pName} received ${count} Pairing Allocated Byes. FIDE allows at most 1 PAB per player.`,
        playerIds: [pId],
        playerNames: [pName],
      });
    }
  }

  // Check C3 & C4: Color histories
  let maxDiffOverall = 0;
  let totalDiffSum = 0;
  let totalPlayersCounted = 0;

  for (const [pId, history] of colorHistories.entries()) {
    const pName = playerMap.get(pId)?.name ?? pId;

    // C3: 3 consecutive same colors
    for (let i = 0; i <= history.length - 3; i++) {
      const c1 = history[i].color;
      const c2 = history[i + 1].color;
      const c3 = history[i + 2].color;
      if (c1 === c2 && c2 === c3) {
        violations.push({
          rule: 'C3',
          severity: 'error',
          title: 'C3 Absolute Violation: 3 Consecutive Same Colors',
          description: `${pName} was assigned ${c1 === 'W' ? 'White' : 'Black'} 3 times in a row in Rounds ${history[i].round}, ${history[i + 1].round}, and ${history[i + 2].round}.`,
          roundNumber: history[i + 2].round,
          playerIds: [pId],
          playerNames: [pName],
        });
      }
    }

    // C4: Color difference check at any round
    let whiteCount = 0;
    let blackCount = 0;
    for (const item of history) {
      if (item.color === 'W') whiteCount++;
      else blackCount++;
      const diff = whiteCount - blackCount;
      if (Math.abs(diff) > 2) {
        violations.push({
          rule: 'C4',
          severity: 'error',
          title: 'C4 Absolute Violation: Color Difference Exceeds ±2',
          description: `${pName}'s color difference reached ${diff > 0 ? '+' : ''}${diff} after Round ${item.round} (White: ${whiteCount}, Black: ${blackCount}). Max permitted is ±2.`,
          roundNumber: item.round,
          playerIds: [pId],
          playerNames: [pName],
        });
      }
    }

    const finalDiff = Math.abs(whiteCount - blackCount);
    if (finalDiff > maxDiffOverall) maxDiffOverall = finalDiff;
    totalDiffSum += finalDiff;
    totalPlayersCounted++;
  }

  const c1Violations = violations.filter((v) => v.rule === 'C1');
  const c2Violations = violations.filter((v) => v.rule === 'C2');
  const c3Violations = violations.filter((v) => v.rule === 'C3');
  const c4Violations = violations.filter((v) => v.rule === 'C4');

  return {
    isValid: violations.length === 0,
    violations,
    c1Passed: c1Violations.length === 0,
    c2Passed: c2Violations.length === 0,
    c3Passed: c3Violations.length === 0,
    c4Passed: c4Violations.length === 0,
    statistics: {
      totalGames: gamesPlayed.size,
      totalByes: Array.from(pabCounts.values()).reduce((a, b) => a + b, 0),
      colorBalanceAvg: totalPlayersCounted > 0 ? Number((totalDiffSum / totalPlayersCounted).toFixed(2)) : 0,
      maxColorDiff: maxDiffOverall,
    },
  };
}
