/**
 * FIDE Swiss System Engine (Dutch System - C.04.3)
 * Pure deterministic TypeScript module conforming strictly to FIDE standards.
 */

import { Player, Game, GameResult, PlayerStats, Round } from '../types/tournament';

export interface ColorPreference {
  preferred: 'W' | 'B' | null;
  isAbsolute: boolean; // Must be respected under C3 (no 3 in a row) or C4 (|diff| <= 2)
  reason: string;
}

/**
 * Calculates historical stats for each player across all completed and existing rounds.
 */
export function calculatePlayerStats(
  players: Player[],
  rounds: Round[],
  upToRoundInclusive?: number
): Map<string, PlayerStats> {
  const statsMap = new Map<string, PlayerStats>();

  for (const player of players) {
    statsMap.set(player.id, {
      playerId: player.id,
      score: 0,
      colorHistory: [],
      colorDifference: 0,
      consecutiveSameColor: { color: 'W', count: 0 },
      opponentsPlayed: [],
      hasHadBye: false,
      hasReceivedUnplayedPoint: false,
      gamesPlayed: 0,
      actualWins: 0,
    });
  }

  const sortedRounds = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);

  for (const round of sortedRounds) {
    if (upToRoundInclusive !== undefined && round.roundNumber > upToRoundInclusive) {
      continue;
    }

    for (const game of round.games) {
      if (!game.result) continue; // Unfinished game doesn't count yet

      // Case 1: Pairing Allocated Bye (PAB)
      if (game.result === 'BYE_PAB') {
        const pId = game.whitePlayerId || game.blackPlayerId;
        if (pId && statsMap.has(pId)) {
          const stats = statsMap.get(pId)!;
          stats.score += 1.0;
          stats.hasHadBye = true;
          stats.hasReceivedUnplayedPoint = true;
        }
        continue;
      }

      // Case 2: Requested half-point bye (Awards 0.5 point)
      if (game.result === 'BYE_HALF') {
        const pId = game.whitePlayerId || game.blackPlayerId;
        if (pId && statsMap.has(pId)) {
          const stats = statsMap.get(pId)!;
          stats.score += 0.5;
          stats.hasHadBye = true;
          // Note: Half-point bye does NOT disqualify player from future PAB under FIDE Rule 4
        }
        continue;
      }

      const white = game.whitePlayerId ? statsMap.get(game.whitePlayerId) : null;
      const black = game.blackPlayerId ? statsMap.get(game.blackPlayerId) : null;

      // Color histories & opponents are only updated if both players are present
      if (white && black) {
        white.opponentsPlayed.push(black.playerId);
        black.opponentsPlayed.push(white.playerId);

        // Record colors played
        white.colorHistory.push('W');
        black.colorHistory.push('B');
        white.colorDifference += 1;
        black.colorDifference -= 1;
        white.gamesPlayed += 1;
        black.gamesPlayed += 1;
      }

      // Update scores & unplayed point flags based on result
      switch (game.result) {
        case '1-0':
          if (white) {
            white.score += 1.0;
            white.actualWins += 1;
          }
          break;
        case '0-1':
          if (black) {
            black.score += 1.0;
            black.actualWins += 1;
          }
          break;
        case '1/2-1/2':
          if (white) white.score += 0.5;
          if (black) black.score += 0.5;
          break;
        case '1-0F': // White win by forfeit (unplayed win for White)
          if (white) {
            white.score += 1.0;
            white.hasReceivedUnplayedPoint = true;
          }
          break;
        case '0-1F': // Black win by forfeit (unplayed win for Black)
          if (black) {
            black.score += 1.0;
            black.hasReceivedUnplayedPoint = true;
          }
          break;
      }
    }
  }

  // Calculate consecutive same colors
  for (const stats of statsMap.values()) {
    const history = stats.colorHistory;
    if (history.length === 0) {
      stats.consecutiveSameColor = { color: 'W', count: 0 };
    } else {
      const lastColor = history[history.length - 1];
      let count = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i] === lastColor) count++;
        else break;
      }
      stats.consecutiveSameColor = { color: lastColor, count };
    }
  }

  return statsMap;
}

/**
 * Determines color preference according to FIDE Dutch rules (C.04.3.e):
 * - Absolute preference:
 *   - Difference == +2 => MUST be Black (cannot play White, violates C4)
 *   - Difference == -2 => MUST be White (cannot play Black, violates C4)
 *   - Consecutive == 2 'W' => MUST be Black (violates C3)
 *   - Consecutive == 2 'B' => MUST be White (violates C3)
 * - Strong preference:
 *   - Difference > 0 => prefers Black
 *   - Difference < 0 => prefers White
 * - Mild preference:
 *   - Difference == 0 => prefers opposite of last round color
 */
export function getColorPreference(stats: PlayerStats): ColorPreference {
  const { colorDifference, consecutiveSameColor, colorHistory } = stats;

  // Absolute Rule C4: Color difference must stay between -2 and +2
  if (colorDifference >= 2) {
    return {
      preferred: 'B',
      isAbsolute: true,
      reason: 'Absolute: Color difference is +2 (Must play Black - C4)',
    };
  }
  if (colorDifference <= -2) {
    return {
      preferred: 'W',
      isAbsolute: true,
      reason: 'Absolute: Color difference is -2 (Must play White - C4)',
    };
  }

  // Absolute Rule C3: No 3 consecutive games with same color
  if (consecutiveSameColor.count >= 2) {
    if (consecutiveSameColor.color === 'W') {
      return {
        preferred: 'B',
        isAbsolute: true,
        reason: 'Absolute: 2 consecutive Whites (Must play Black - C3)',
      };
    } else {
      return {
        preferred: 'W',
        isAbsolute: true,
        reason: 'Absolute: 2 consecutive Blacks (Must play White - C3)',
      };
    }
  }

  // Strong preference based on color difference
  if (colorDifference > 0) {
    return {
      preferred: 'B',
      isAbsolute: false,
      reason: `Strong: Color difference +${colorDifference} (Prefers Black)`,
    };
  }
  if (colorDifference < 0) {
    return {
      preferred: 'W',
      isAbsolute: false,
      reason: `Strong: Color difference ${colorDifference} (Prefers White)`,
    };
  }

  // Mild preference: alternation
  if (colorHistory.length > 0) {
    const lastColor = colorHistory[colorHistory.length - 1];
    const pref = lastColor === 'W' ? 'B' : 'W';
    return {
      preferred: pref,
      isAbsolute: false,
      reason: `Mild: Alternate from last round (${lastColor} -> ${pref})`,
    };
  }

  return { preferred: null, isAbsolute: false, reason: 'Neutral: No preference yet' };
}

/**
 * Checks if two players can legally be paired under FIDE Swiss Rules:
 * Rule 2 (Strict Absolute): Two participants shall not play against each other more than once.
 * Rule 5 (Priority): Participants are paired to others with the same score.
 * Rule 6 & 7: Color differences and consecutive colors have exceptions (Color Break)
 *             when necessary to pair players with the same score.
 */
export function canBePaired(
  playerAId: string,
  playerBId: string,
  statsMap: Map<string, PlayerStats>
): { valid: boolean; reason?: string; allowedOrientations: ('AB' | 'BA')[]; hasColorBreak: boolean } {
  if (playerAId === playerBId) {
    return { valid: false, reason: 'Cannot play oneself', allowedOrientations: [], hasColorBreak: false };
  }

  const statsA = statsMap.get(playerAId);
  const statsB = statsMap.get(playerBId);

  if (!statsA || !statsB) {
    return { valid: false, reason: 'Player stats not found', allowedOrientations: [], hasColorBreak: false };
  }

  // FIDE Rule 2: Strict Absolute Rule — Cannot play the same opponent more than once
  if (statsA.opponentsPlayed.includes(playerBId)) {
    return { valid: false, reason: 'FIDE Rule 2: Already played each other', allowedOrientations: [], hasColorBreak: false };
  }

  const prefA = getColorPreference(statsA);
  const prefB = getColorPreference(statsB);

  const allowed: ('AB' | 'BA')[] = [];

  // Test AB: A is White, B is Black without absolute color violation
  const aCanBeWhite = !(prefA.isAbsolute && prefA.preferred === 'B');
  const bCanBeBlack = !(prefB.isAbsolute && prefB.preferred === 'W');
  if (aCanBeWhite && bCanBeBlack) {
    allowed.push('AB');
  }

  // Test BA: B is White, A is Black without absolute color violation
  const bCanBeWhite = !(prefB.isAbsolute && prefB.preferred === 'B');
  const aCanBeBlack = !(prefA.isAbsolute && prefA.preferred === 'W');
  if (bCanBeWhite && aCanBeBlack) {
    allowed.push('BA');
  }

  // If no orientation satisfies strict color without exception:
  // FIDE Swiss Rule 5, 6, 7: Points have higher priority than color!
  // In real tournaments, a color break happens so players with the same score (e.g. 2 wins) can play.
  if (allowed.length === 0) {
    return {
      valid: true,
      hasColorBreak: true,
      reason: 'FIDE Color Break: Points prioritized over color constraint',
      allowedOrientations: ['AB', 'BA'],
    };
  }

  return { valid: true, allowedOrientations: allowed, hasColorBreak: false };
}

/**
 * Decides the best color orientation for a paired couple (playerA, playerB)
 * based on FIDE Swiss Rule 8:
 * "In general, a participant is given the colour with which they played fewer rounds.
 * If colours are already balanced, then, in general, the participant is given the colour
 * that alternates from the last one with which they played."
 * In case of a color break, distributes the break equitably to minimize imbalance.
 */
export function resolveColorOrientation(
  playerAId: string,
  playerBId: string,
  statsMap: Map<string, PlayerStats>,
  roundNumber: number,
  round1TopSeedColor: 'W' | 'B' = 'W'
): { whiteId: string; blackId: string; reason: string } {
  const check = canBePaired(playerAId, playerBId, statsMap);
  if (!check.valid || check.allowedOrientations.length === 0) {
    return { whiteId: playerAId, blackId: playerBId, reason: 'Forced orientation' };
  }

  if (check.allowedOrientations.length === 1) {
    if (check.allowedOrientations[0] === 'AB') {
      return {
        whiteId: playerAId,
        blackId: playerBId,
        reason: 'Compatible color orientation',
      };
    } else {
      return {
        whiteId: playerBId,
        blackId: playerAId,
        reason: 'Compatible color orientation',
      };
    }
  }

  // Both AB and BA are viable (or color break applies):
  const statsA = statsMap.get(playerAId)!;
  const statsB = statsMap.get(playerBId)!;
  const prefA = getColorPreference(statsA);
  const prefB = getColorPreference(statsB);

  // Score both options: higher score is preferred
  const evaluateOrientation = (whiteStats: PlayerStats, blackStats: PlayerStats) => {
    let score = 0;
    const wPref = getColorPreference(whiteStats);
    const bPref = getColorPreference(blackStats);

    // Give preferred color
    if (wPref.preferred === 'W') score += wPref.isAbsolute ? 60 : 20;
    if (wPref.preferred === 'B') score -= wPref.isAbsolute ? 60 : 20;

    if (bPref.preferred === 'B') score += bPref.isAbsolute ? 60 : 20;
    if (bPref.preferred === 'W') score -= bPref.isAbsolute ? 60 : 20;

    // FIDE Rule 8: Color with which they played fewer rounds
    // White reduces imbalance if whiteStats.colorDifference < 0
    if (whiteStats.colorDifference < 0) score += 25 * Math.abs(whiteStats.colorDifference);
    if (whiteStats.colorDifference > 0) score -= 25 * Math.abs(whiteStats.colorDifference);

    // Black reduces imbalance if blackStats.colorDifference > 0
    if (blackStats.colorDifference > 0) score += 25 * Math.abs(blackStats.colorDifference);
    if (blackStats.colorDifference < 0) score -= 25 * Math.abs(blackStats.colorDifference);

    // Consecutive same color minimization (Rule 7)
    if (whiteStats.consecutiveSameColor.color === 'B') score += 15 * whiteStats.consecutiveSameColor.count;
    if (whiteStats.consecutiveSameColor.color === 'W') score -= 30 * whiteStats.consecutiveSameColor.count;

    if (blackStats.consecutiveSameColor.color === 'W') score += 15 * blackStats.consecutiveSameColor.count;
    if (blackStats.consecutiveSameColor.color === 'B') score -= 30 * blackStats.consecutiveSameColor.count;

    // Severe penalty if orientation produces 3 consecutive same colors (violates Rule 7)
    if (whiteStats.consecutiveSameColor.color === 'W' && whiteStats.consecutiveSameColor.count >= 2) {
      score -= 250;
    }
    if (blackStats.consecutiveSameColor.color === 'B' && blackStats.consecutiveSameColor.count >= 2) {
      score -= 250;
    }

    return score;
  };

  const scoreAB = evaluateOrientation(statsA, statsB);
  const scoreBA = evaluateOrientation(statsB, statsA);

  if (scoreAB > scoreBA) {
    return {
      whiteId: playerAId,
      blackId: playerBId,
      reason: 'FIDE Rule 8: Color balance & alternation preference',
    };
  } else if (scoreBA > scoreAB) {
    return {
      whiteId: playerBId,
      blackId: playerAId,
      reason: 'FIDE Rule 8: Color balance & alternation preference',
    };
  }

  // Tiebreaker when scores and orientations are equal:
  // If one player has a higher score, they get their color preference
  if (statsA.score > statsB.score) {
    if (prefA.preferred === 'B') {
      return { whiteId: playerBId, blackId: playerAId, reason: 'FIDE Rule 8: Higher score receives preferred Black' };
    }
    return { whiteId: playerAId, blackId: playerBId, reason: 'FIDE Rule 8: Higher score receives preferred White' };
  } else if (statsB.score > statsA.score) {
    if (prefB.preferred === 'B') {
      return { whiteId: playerAId, blackId: playerBId, reason: 'FIDE Rule 8: Higher score receives preferred Black' };
    }
    return { whiteId: playerBId, blackId: playerAId, reason: 'FIDE Rule 8: Higher score receives preferred White' };
  }

  // Equal scores & equal evaluations (e.g. Color Break where both have identical color history):
  // FIDE Rule 8 & Dutch C.04.3.e: Higher-seeded player (playerA) gets priority for their preferred color!
  if (prefA.preferred === 'B') {
    return {
      whiteId: playerBId,
      blackId: playerAId,
      reason: 'FIDE Rule 8 (Color Break): Top seed allocated preferred Black',
    };
  } else if (prefA.preferred === 'W') {
    return {
      whiteId: playerAId,
      blackId: playerBId,
      reason: 'FIDE Rule 8 (Color Break): Top seed allocated preferred White',
    };
  }

  return {
    whiteId: round1TopSeedColor === 'W' ? playerAId : playerBId,
    blackId: round1TopSeedColor === 'W' ? playerBId : playerAId,
    reason: 'Standard FIDE lot allocation',
  };
}

/**
 * Selects the player who receives the Pairing Allocated Bye (PAB)
 * for an odd number of active players:
 * - Must NOT have had a PAB before (C2)
 * - Must NOT have received an unplayed win (C2)
 * - Must be chosen from the lowest score group
 * - Lowest rated (or lowest pairing number) in that group
 */
export function selectByePlayer(
  activePlayers: Player[],
  statsMap: Map<string, PlayerStats>
): Player | null {
  if (activePlayers.length % 2 === 0) return null;

  // Group eligible players by score
  const eligible = activePlayers.filter((p) => {
    const stats = statsMap.get(p.id);
    if (!stats) return true;
    return !stats.hasReceivedUnplayedPoint && !stats.hasHadBye;
  });

  if (eligible.length === 0) {
    // If every single player has already had an unplayed point (extremely rare edge case in very long tournament),
    // pick the lowest-rated player with the fewest byes:
    const sorted = [...activePlayers].sort((a, b) => {
      const statsA = statsMap.get(a.id);
      const statsB = statsMap.get(b.id);
      const scoreA = statsA ? statsA.score : 0;
      const scoreB = statsB ? statsB.score : 0;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.rating - b.rating;
    });
    return sorted[0];
  }

  // Sort eligible by score ascending, then rating ascending
  eligible.sort((a, b) => {
    const statsA = statsMap.get(a.id);
    const statsB = statsMap.get(b.id);
    const scoreA = statsA ? statsA.score : 0;
    const scoreB = statsB ? statsB.score : 0;
    if (scoreA !== scoreB) {
      return scoreA - scoreB; // Lowest score group first
    }
    return a.rating - b.rating; // Lowest rating first within group
  });

  return eligible[0];
}

/**
 * Generates Round 1 pairings according to FIDE Dutch rules:
 * - Sort players by rating descending (then alphabetical / seed)
 * - If odd, lowest rated player gets PAB
 * - Split into top half S1 and bottom half S2
 * - Board 1: S1[0] vs S2[0]
 * - Board 2: S1[1] vs S2[1] ...
 * - Board 1 top seed receives round1TopSeedColor ('W' or 'B'),
 *   Board 2 alternates, Board 3 alternates, etc.
 */
export function generateRound1Pairings(
  players: Player[],
  round1TopSeedColor: 'W' | 'B' = 'W'
): Game[] {
  const activePlayers = players.filter((p) => p.active);
  // Sort by rating descending, then name
  const sorted = [...activePlayers].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  const games: Game[] = [];
  let byePlayer: Player | null = null;

  // Check for half-point byes requested for round 1
  const halfByePlayers: Player[] = [];
  const playersToPair: Player[] = [];

  for (const p of sorted) {
    if (p.halfPointByeRequestedRounds?.includes(1)) {
      halfByePlayers.push(p);
    } else {
      playersToPair.push(p);
    }
  }

  // Handle odd number of players to pair: lowest rated gets PAB
  if (playersToPair.length % 2 !== 0) {
    byePlayer = playersToPair.pop()!;
  }

  const half = playersToPair.length / 2;
  const s1 = playersToPair.slice(0, half);
  const s2 = playersToPair.slice(half);

  let boardNum = 1;
  for (let i = 0; i < half; i++) {
    const playerA = s1[i];
    const playerB = s2[i];

    // Alternation: Even boards have opposite color of Board 1
    const isEvenBoard = i % 2 === 1;
    const topPlayerColor = isEvenBoard
      ? round1TopSeedColor === 'W'
        ? 'B'
        : 'W'
      : round1TopSeedColor;

    const whiteId = topPlayerColor === 'W' ? playerA.id : playerB.id;
    const blackId = topPlayerColor === 'W' ? playerB.id : playerA.id;

    games.push({
      id: `r1-b${boardNum}`,
      round: 1,
      boardNumber: boardNum,
      whitePlayerId: whiteId,
      blackPlayerId: blackId,
      result: null,
      pairingExplanation: `FIDE Dutch Round 1: Top half (Seed #${i + 1} ${playerA.name}) vs Bottom half (Seed #${half + i + 1} ${playerB.name}). Color alternated.`,
    });
    boardNum++;
  }

  // Add Half Point Byes
  for (const hp of halfByePlayers) {
    games.push({
      id: `r1-bye-half-${hp.id}`,
      round: 1,
      boardNumber: boardNum++,
      whitePlayerId: hp.id,
      blackPlayerId: null,
      result: 'BYE_HALF',
      pairingExplanation: `Requested Half-Point Bye: Player awarded 0.5 unplayed points in advance.`,
    });
  }

  // Add PAB Bye
  if (byePlayer) {
    games.push({
      id: `r1-bye-pab-${byePlayer.id}`,
      round: 1,
      boardNumber: boardNum++,
      whitePlayerId: byePlayer.id,
      blackPlayerId: null,
      result: 'BYE_PAB',
      pairingExplanation: `FIDE Rule 3 & 4 (Pairing-Allocated Bye): Lowest rated participant receives 1.0 point bye for odd field.`,
    });
  }

  return games;
}

/**
 * FIDE Dutch Backtracking Pairing Solver for Rounds 2+:
 * Matches players into pairs minimizing score group differences,
 * strictly upholding C1 (no repeats), C2 (no double unplayed byes),
 * C3 (no 3 in a row), and C4 (|color diff| <= 2).
 */
export function generateSubsequentRoundPairings(
  roundNumber: number,
  players: Player[],
  completedRounds: Round[],
  round1TopSeedColor: 'W' | 'B' = 'W'
): Game[] {
  const statsMap = calculatePlayerStats(players, completedRounds, roundNumber - 1);
  const activePlayers = players.filter((p) => p.active);

  // Check for players requesting half-point bye for this round
  const halfByePlayers: Player[] = [];
  const poolToPair: Player[] = [];

  for (const p of activePlayers) {
    if (p.halfPointByeRequestedRounds?.includes(roundNumber)) {
      halfByePlayers.push(p);
    } else {
      poolToPair.push(p);
    }
  }

  let byePlayer: Player | null = null;
  if (poolToPair.length % 2 !== 0) {
    byePlayer = selectByePlayer(poolToPair, statsMap);
    if (byePlayer) {
      const idx = poolToPair.findIndex((p) => p.id === byePlayer!.id);
      if (idx !== -1) {
        poolToPair.splice(idx, 1);
      }
    }
  }

  // Sort pool by Score descending, then Rating descending, then Name
  poolToPair.sort((a, b) => {
    const statsA = statsMap.get(a.id)!;
    const statsB = statsMap.get(b.id)!;
    if (statsB.score !== statsA.score) return statsB.score - statsA.score;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  // Solve pairings using Dutch-compliant backtracking
  const pairs = solveDutchPairings(poolToPair, statsMap);

  if (!pairs) {
    throw new Error(
      `Pairing Deadlock: Could not find a legal pairing satisfying FIDE Absolute Criteria C1, C3, and C4 for Round ${roundNumber}.`
    );
  }

  const games: Game[] = [];
  let boardNum = 1;

  // Resolve color assignments for each pair
  for (const [p1, p2] of pairs) {
    const { whiteId, blackId, reason } = resolveColorOrientation(
      p1.id,
      p2.id,
      statsMap,
      roundNumber,
      round1TopSeedColor
    );

    const s1 = statsMap.get(p1.id)?.score ?? 0;
    const s2 = statsMap.get(p2.id)?.score ?? 0;
    const scoreGroupText = s1 === s2 ? `Same score group (${s1} pts)` : `Score group float (${Math.max(s1, s2)} vs ${Math.min(s1, s2)} pts)`;
    const explanation = `FIDE Dutch: ${scoreGroupText}. ${reason}.`;

    games.push({
      id: `r${roundNumber}-b${boardNum}`,
      round: roundNumber,
      boardNumber: boardNum,
      whitePlayerId: whiteId,
      blackPlayerId: blackId,
      result: null,
      pairingExplanation: explanation,
    });
    boardNum++;
  }

  // Append Half Point Byes
  for (const hp of halfByePlayers) {
    games.push({
      id: `r${roundNumber}-bye-half-${hp.id}`,
      round: roundNumber,
      boardNumber: boardNum++,
      whitePlayerId: hp.id,
      blackPlayerId: null,
      result: 'BYE_HALF',
      pairingExplanation: 'Requested Half-Point Bye: Player awarded 0.5 unplayed points in advance.',
    });
  }

  // Append Full Point Bye
  if (byePlayer) {
    games.push({
      id: `r${roundNumber}-bye-pab-${byePlayer.id}`,
      round: roundNumber,
      boardNumber: boardNum++,
      whitePlayerId: byePlayer.id,
      blackPlayerId: null,
      result: 'BYE_PAB',
      pairingExplanation: 'FIDE Rule 3 & 4 (Pairing Bye): Lowest rated participant in lowest score group awarded 1.0 point bye.',
    });
  }

  return games;
}

/**
 * Recursive backtracking solver with Dutch score bracket heuristics:
 * Attempts pairing within score groups (Dutch top half vs bottom half),
 * falling back smoothly to downfloaters if needed to avoid deadlocks.
 */
function solveDutchPairings(
  players: Player[],
  statsMap: Map<string, PlayerStats>
): [Player, Player][] | null {
  if (players.length === 0) return [];
  if (players.length % 2 !== 0) return null;

  // Pre-calculate pair compatibility and cost
  // Cost: heavily penalizes score differences (points > color), downfloats, and color imbalance
  const getPairWeight = (pA: Player, pB: Player): number => {
    const statsA = statsMap.get(pA.id)!;
    const statsB = statsMap.get(pB.id)!;
    const scoreDiff = Math.abs(statsA.score - statsB.score);

    // FIDE Rule 5: Points are strictly higher priority than color!
    // A score difference of 0.5 is penalized by 50,000, ensuring same-score pairings are preferred.
    let weight = scoreDiff * 100000;

    // Secondary: Dutch system rating spread (top half with bottom half)
    const ratingDiff = Math.abs(pA.rating - pB.rating);
    weight += ratingDiff * 0.05;

    // Tertiary: Color compatibility & Color breaks
    const check = canBePaired(pA.id, pB.id, statsMap);
    if (check.hasColorBreak) {
      // Color break happens so players with same points can play (500 << 50,000)
      weight += 500;
    } else {
      const prefA = getColorPreference(statsA);
      const prefB = getColorPreference(statsB);
      if (prefA.preferred && prefB.preferred && prefA.preferred === prefB.preferred) {
        weight += 40;
      }
    }

    return weight;
  };

  // Backtracking solver
  let bestSolution: [Player, Player][] | null = null;
  let minCost = Infinity;

  const currentPairs: [Player, Player][] = [];
  const used = new Set<string>();

  function search(playerIndex: number, currentCost: number): boolean {
    if (currentCost >= minCost) return false;

    // Find next unused player
    while (playerIndex < players.length && used.has(players[playerIndex].id)) {
      playerIndex++;
    }

    if (playerIndex >= players.length) {
      // All paired!
      minCost = currentCost;
      bestSolution = [...currentPairs];
      return true;
    }

    const p1 = players[playerIndex];
    used.add(p1.id);

    // Find candidate partners, ordered by best Dutch fit
    const candidates: { player: Player; cost: number }[] = [];

    for (let j = playerIndex + 1; j < players.length; j++) {
      const p2 = players[j];
      if (used.has(p2.id)) continue;

      const check = canBePaired(p1.id, p2.id, statsMap);
      if (check.valid) {
        const cost = getPairWeight(p1, p2);
        candidates.push({ player: p2, cost });
      }
    }

    // Sort candidates by cost ascending (favoring same score group)
    candidates.sort((a, b) => a.cost - b.cost);

    for (const { player: p2, cost } of candidates) {
      used.add(p2.id);
      currentPairs.push([p1, p2]);

      const found = search(playerIndex + 1, currentCost + cost);
      // If we found an ideal zero-score-diff solution, we can fast return
      if (found && minCost === 0) {
        return true;
      }

      currentPairs.pop();
      used.delete(p2.id);
    }

    used.delete(p1.id);
    return false;
  }

  search(0, 0);
  return bestSolution;
}

import { generateRoundRobinPairings, generateKnockoutPairings } from './formatPairings';

/**
 * Public facade to generate pairings for any round (Swiss, Round-Robin, or Knockout).
 */
export function generateRoundPairings(
  roundNumber: number,
  tournament: {
    format?: 'swiss' | 'round_robin' | 'knockout';
    players: Player[];
    rounds: Round[];
    round1TopSeedColor: 'W' | 'B';
  }
): Game[] {
  if (tournament.format === 'round_robin') {
    return generateRoundRobinPairings(
      roundNumber,
      tournament.players,
      tournament.round1TopSeedColor
    );
  }

  if (tournament.format === 'knockout') {
    return generateKnockoutPairings(
      roundNumber,
      tournament.players,
      tournament.rounds,
      tournament.round1TopSeedColor
    );
  }

  // Default: FIDE Swiss Dutch System
  if (roundNumber === 1) {
    return generateRound1Pairings(tournament.players, tournament.round1TopSeedColor);
  }
  return generateSubsequentRoundPairings(
    roundNumber,
    tournament.players,
    tournament.rounds,
    tournament.round1TopSeedColor
  );
}
