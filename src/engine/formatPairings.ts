/**
 * Round-Robin & Knockout Tournament Pairing Engines
 */

import { Player, Game, Round } from '../types/tournament';

/**
 * Standard Berger Tables Round-Robin Generator:
 * Generates all rounds such that every player plays every other player exactly once,
 * with balanced White/Black alternating colors.
 * If number of players is odd, a dummy "bye" player is added.
 */
export function generateRoundRobinPairings(
  roundNumber: number,
  players: Player[],
  round1TopSeedColor: 'W' | 'B' = 'W'
): Game[] {
  const activePlayers = players.filter((p) => p.active);
  // Sort players by rating descending
  const sorted = [...activePlayers].sort((a, b) => b.rating - a.rating);

  const n = sorted.length;
  if (n < 2) return [];

  // If odd, add a null placeholder for BYE
  const participants: (Player | null)[] = [...sorted];
  if (n % 2 !== 0) {
    participants.push(null);
  }

  const totalParticipants = participants.length;
  const totalRounds = totalParticipants - 1;

  if (roundNumber > totalRounds) {
    throw new Error(`Round ${roundNumber} exceeds total Round-Robin rounds (${totalRounds}).`);
  }

  // Berger circle method:
  // Position 0 is fixed. The rest rotate clockwise by (roundNumber - 1).
  const rotating = participants.slice(1);
  const shift = (roundNumber - 1) % rotating.length;
  const currentRotation = [
    participants[0],
    ...rotating.slice(rotating.length - shift),
    ...rotating.slice(0, rotating.length - shift),
  ];

  const games: Game[] = [];
  const half = totalParticipants / 2;
  let boardNum = 1;

  for (let i = 0; i < half; i++) {
    const p1 = currentRotation[i];
    const p2 = currentRotation[totalParticipants - 1 - i];

    // Check if one is a Bye
    if (p1 === null && p2 !== null) {
      games.push({
        id: `rr-r${roundNumber}-bye-${p2.id}`,
        round: roundNumber,
        boardNumber: boardNum++,
        whitePlayerId: p2.id,
        blackPlayerId: null,
        result: 'BYE_PAB',
      });
      continue;
    }

    if (p2 === null && p1 !== null) {
      games.push({
        id: `rr-r${roundNumber}-bye-${p1.id}`,
        round: roundNumber,
        boardNumber: boardNum++,
        whitePlayerId: p1.id,
        blackPlayerId: null,
        result: 'BYE_PAB',
      });
      continue;
    }

    if (!p1 || !p2) continue;

    // Color alternation in round robin:
    // Alternates based on round number and board index
    const isWhiteFirst = (roundNumber + i) % 2 === 0;
    const whiteId = isWhiteFirst ? p1.id : p2.id;
    const blackId = isWhiteFirst ? p2.id : p1.id;

    games.push({
      id: `rr-r${roundNumber}-b${boardNum}`,
      round: roundNumber,
      boardNumber: boardNum,
      whitePlayerId: whiteId,
      blackPlayerId: blackId,
      result: null,
    });
    boardNum++;
  }

  return games;
}

/**
 * Single Elimination Knockout Generator:
 * Round 1: Standard bracket seeding (1 vs N, 2 vs N-1, etc.).
 * Next Rounds: Winners from previous round games advance.
 */
export function generateKnockoutPairings(
  roundNumber: number,
  players: Player[],
  completedRounds: Round[],
  round1TopSeedColor: 'W' | 'B' = 'W'
): Game[] {
  const activePlayers = players.filter((p) => p.active);
  const sorted = [...activePlayers].sort((a, b) => b.rating - a.rating);

  if (roundNumber === 1) {
    // Next power of 2
    let bracketSize = 2;
    while (bracketSize < sorted.length) {
      bracketSize *= 2;
    }

    // Assign byes if needed for top seeds
    const byesCount = bracketSize - sorted.length;
    const games: Game[] = [];
    let boardNum = 1;

    // Seeded pairs: top seeds play bottom seeds
    const topHalf = sorted.slice(0, bracketSize / 2);
    const bottomHalf = sorted.slice(bracketSize / 2);

    for (let i = 0; i < bracketSize / 2; i++) {
      const topSeed = sorted[i];
      const bottomSeed = sorted[bracketSize - 1 - i];

      if (topSeed && !bottomSeed) {
        // Bye advance for top seed
        games.push({
          id: `ko-r1-bye-${topSeed.id}`,
          round: 1,
          boardNumber: boardNum++,
          whitePlayerId: topSeed.id,
          blackPlayerId: null,
          result: 'BYE_PAB',
        });
      } else if (topSeed && bottomSeed) {
        const isWhite = i % 2 === 0;
        games.push({
          id: `ko-r1-b${boardNum}`,
          round: 1,
          boardNumber: boardNum++,
          whitePlayerId: isWhite ? topSeed.id : bottomSeed.id,
          blackPlayerId: isWhite ? bottomSeed.id : topSeed.id,
          result: null,
        });
      }
    }
    return games;
  }

  // For Round 2+: Get winners from the previous round
  const prevRound = completedRounds.find((r) => r.roundNumber === roundNumber - 1);
  if (!prevRound) {
    throw new Error(`Previous round ${roundNumber - 1} not found.`);
  }

  const winners: string[] = [];
  for (const game of prevRound.games) {
    if (game.result === '1-0' || game.result === '1-0F') {
      if (game.whitePlayerId) winners.push(game.whitePlayerId);
    } else if (game.result === '0-1' || game.result === '0-1F') {
      if (game.blackPlayerId) winners.push(game.blackPlayerId);
    } else if (game.result === 'BYE_PAB') {
      const pId = game.whitePlayerId || game.blackPlayerId;
      if (pId) winners.push(pId);
    } else if (game.result === '1/2-1/2') {
      throw new Error(`Knockout match on Board ${game.boardNumber} ended in a draw! In knockout format, a tiebreak/armageddon winner must be determined.`);
    } else {
      throw new Error(`Pending game on Board ${game.boardNumber} in Round ${roundNumber - 1}.`);
    }
  }

  if (winners.length <= 1) {
    throw new Error('Tournament has already concluded! Final champion determined.');
  }

  const games: Game[] = [];
  let boardNum = 1;
  for (let i = 0; i < winners.length; i += 2) {
    const p1 = winners[i];
    const p2 = winners[i + 1];

    if (p1 && !p2) {
      games.push({
        id: `ko-r${roundNumber}-bye-${p1}`,
        round: roundNumber,
        boardNumber: boardNum++,
        whitePlayerId: p1,
        blackPlayerId: null,
        result: 'BYE_PAB',
      });
    } else if (p1 && p2) {
      games.push({
        id: `ko-r${roundNumber}-b${boardNum}`,
        round: roundNumber,
        boardNumber: boardNum++,
        whitePlayerId: p1,
        blackPlayerId: p2,
        result: null,
      });
    }
  }

  return games;
}
