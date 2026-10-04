/**
 * FIDE Swiss Chess Tournament Data Structures
 * Strict TypeScript definitions conforming to FIDE Swiss System (Dutch System / C.04.3)
 */

export interface Player {
  id: string;
  name: string;
  rating: number;
  active: boolean;
  title?: 'GM' | 'IM' | 'FM' | 'CM' | 'WGM' | 'WIM' | 'WFM' | 'WCM' | '';
  federation?: string;
  initialRank?: number;
  halfPointByeRequestedRounds?: number[]; // Rounds where player requested 0.5 bye in advance
}

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '1-0F' | '0-1F' | 'BYE_PAB' | 'BYE_HALF';

export interface Game {
  id: string;
  round: number;
  boardNumber?: number;
  whitePlayerId: string | null; // null for PAB or unassigned
  blackPlayerId: string | null; // null for PAB
  result: GameResult | null;
  manualOverride?: boolean;
}

export interface PlayerStats {
  playerId: string;
  score: number;
  colorHistory: ('W' | 'B')[];
  colorDifference: number; // White games minus Black games
  consecutiveSameColor: { color: 'W' | 'B'; count: number };
  opponentsPlayed: string[]; // List of opponent player IDs
  hasHadBye: boolean; // Has received a PAB (Pairing Allocated Bye)
  hasReceivedUnplayedPoint: boolean; // Has received PAB or 1-0F / 0-1F unplayed win
  gamesPlayed: number;
  actualWins: number;
}

export interface StandingsRow {
  rank: number;
  playerId: string;
  name: string;
  title?: string;
  rating: number;
  score: number;
  directEncounter: number;
  buchholzCut1: number;
  buchholz: number;
  sonnebornBerger: number;
  cumulativeScore: number;
  wins: number;
  gamesPlayed: number;
  colorBalance: number;
  active: boolean;
  details?: {
    opponents: {
      round: number;
      opponentId: string | null;
      opponentName: string;
      opponentRating: number;
      opponentFinalScore: number;
      color: 'W' | 'B' | '-';
      result: GameResult | null;
      pointsAwarded: number;
      isVirtual?: boolean;
    }[];
    buchholzExcludedId?: string | null;
    buchholzExcludedScore?: number;
  };
}

export interface Round {
  roundNumber: number;
  games: Game[];
  isCompleted: boolean;
  createdAt: number;
}

export type TournamentFormat = 'swiss' | 'round_robin' | 'knockout';

export interface Tournament {
  id: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  allowedEmails?: string[]; // Arbiter emails with edit access
  isPublic?: boolean;
  name: string;
  location?: string;
  format: TournamentFormat;
  roundsTotal: number;
  currentRoundNumber: number;
  players: Player[];
  rounds: Round[];
  round1TopSeedColor: 'W' | 'B'; // FIDE initial lot drawn for seed 1
  status: 'setup' | 'in_progress' | 'finished';
  createdAt: number;
  updatedAt: number;
}

export interface PairingAudit {
  round: number;
  totalBoards: number;
  pabPlayerId: string | null;
  criteriaChecks: {
    rule: 'C1' | 'C2' | 'C3' | 'C4';
    description: string;
    passed: boolean;
    violatingPairs?: string[];
  }[];
  scoreGroups: {
    score: number;
    playerCount: number;
    downfloaters: string[];
    upfloaters: string[];
  }[];
}

export interface DirectorRequest {
  uid: string;
  email: string;
  displayName?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}
