/**
 * En Passant — Tournament Firestore Persistence Service
 * Supports Arbiter Role-Based Access Control, Shared Arbiter Collaborator Emails,
 * and Public Participant Search & Real-time Live Tracking.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Tournament } from '../types/tournament';

/**
 * Sanitizes tournament data for Firestore storage (NO undefined values)
 */
export function sanitizeTournament(
  tournament: Tournament,
  ownerId?: string,
  ownerEmail?: string | null,
  ownerName?: string | null
): Record<string, any> {
  const cleanOwnerId = tournament.ownerId || ownerId || 'anonymous';
  const cleanOwnerEmail = (tournament.ownerEmail || ownerEmail || '').trim().toLowerCase();
  const cleanOwnerName = tournament.ownerName || ownerName || '';
  const cleanAllowed = (tournament.allowedEmails || [])
    .map((e) => String(e).trim().toLowerCase())
    .filter(Boolean);

  return {
    id: String(tournament.id),
    ownerId: cleanOwnerId,
    ownerEmail: cleanOwnerEmail,
    ownerName: cleanOwnerName,
    allowedEmails: cleanAllowed,
    isPublic: tournament.isPublic !== false,
    name: tournament.name || 'Untitled Tournament',
    location: tournament.location || '',
    format: tournament.format || 'swiss',
    roundsTotal: Number(tournament.roundsTotal) || 5,
    currentRoundNumber: Number(tournament.currentRoundNumber) || 1,
    round1TopSeedColor: tournament.round1TopSeedColor || 'W',
    status: tournament.status || 'setup',
    createdAt: tournament.createdAt || Date.now(),
    updatedAt: Date.now(),
    players: (tournament.players || []).map((p) => ({
      id: p.id,
      name: p.name,
      rating: Number(p.rating) || 1500,
      active: p.active !== false,
      title: p.title || '',
      federation: p.federation || '',
      initialRank: p.initialRank != null ? Number(p.initialRank) : null,
      halfPointByeRequestedRounds: p.halfPointByeRequestedRounds || [],
    })),
    rounds: (tournament.rounds || []).map((r) => ({
      roundNumber: r.roundNumber,
      isCompleted: Boolean(r.isCompleted),
      createdAt: r.createdAt || Date.now(),
      games: (r.games || []).map((g) => ({
        id: g.id,
        round: g.round,
        boardNumber: g.boardNumber != null ? Number(g.boardNumber) : null,
        whitePlayerId: g.whitePlayerId ?? null,
        blackPlayerId: g.blackPlayerId ?? null,
        result: g.result ?? null,
        manualOverride: Boolean(g.manualOverride),
      })),
    })),
  };
}

/**
 * Saves a tournament to top-level /tournaments/{id} and user collection
 * Enforces that only the creator/owner or allowed arbiter can save.
 */
export async function saveTournamentToFirestore(
  userId: string,
  tournament: Tournament,
  userEmail?: string | null,
  userName?: string | null
): Promise<void> {
  if (!tournament || !tournament.id) return;
  const path = `tournaments/${tournament.id}`;

  const cleanEmail = userEmail?.trim().toLowerCase();
  const isOwner =
    !tournament.ownerId ||
    tournament.ownerId === userId ||
    (cleanEmail && tournament.ownerEmail === cleanEmail);
  const isCollaborator =
    cleanEmail && tournament.allowedEmails?.map((e) => e.toLowerCase()).includes(cleanEmail);

  if (!isOwner && !isCollaborator) {
    console.warn(`Permission denied: User ${userId} is not allowed to edit tournament ${tournament.id}`);
    return;
  }

  try {
    const cleanTournament = sanitizeTournament(tournament, userId, userEmail, userName);

    // Save to global collection for discovery, participant view, and collaborator access
    await setDoc(doc(db, 'tournaments', cleanTournament.id), cleanTournament);

    // Also mirror to user subcollection if user is the owner
    if (userId && userId !== 'participant' && cleanTournament.ownerId === userId) {
      await setDoc(doc(db, 'users', userId, 'tournaments', cleanTournament.id), cleanTournament);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches a single tournament by ID (accessible by anyone)
 */
export async function getTournamentById(tournamentId: string): Promise<Tournament | null> {
  const path = `tournaments/${tournamentId}`;
  try {
    const snap = await getDoc(doc(db, 'tournaments', tournamentId));
    if (snap.exists()) {
      return snap.data() as Tournament;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Fetches all active/ongoing tournaments for participant search
 */
export async function listPublicTournaments(): Promise<Tournament[]> {
  const path = 'tournaments';
  try {
    const colRef = collection(db, 'tournaments');
    const snap = await getDocs(colRef);
    const results: Tournament[] = [];
    snap.forEach((d) => {
      const data = d.data() as Tournament;
      if (data && data.name) {
        results.push(data);
      }
    });
    results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Real-time subscription to all public tournaments for live search modal
 */
export function subscribeToPublicTournaments(
  onUpdate: (tournaments: Tournament[]) => void
): () => void {
  const colRef = collection(db, 'tournaments');
  return onSnapshot(
    colRef,
    (snap) => {
      const results: Tournament[] = [];
      snap.forEach((d) => {
        const data = d.data() as Tournament;
        if (data && data.name) {
          results.push(data);
        }
      });
      results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      onUpdate(results);
    },
    (err) => console.warn('Public tournaments live listener error:', err)
  );
}

/**
 * Lists tournaments owned by a user OR where their email is in allowedEmails
 */
export async function listUserTournaments(userId: string, userEmail?: string | null): Promise<Tournament[]> {
  const cleanEmail = userEmail?.trim().toLowerCase();
  const resultMap = new Map<string, Tournament>();

  try {
    // 1. Fetch from global /tournaments
    const globalCol = collection(db, 'tournaments');
    const snap = await getDocs(globalCol);
    snap.forEach((d) => {
      const tourney = d.data() as Tournament;
      if (!tourney || !tourney.id) return;
      const isOwner = tourney.ownerId === userId || (cleanEmail && tourney.ownerEmail && tourney.ownerEmail.toLowerCase() === cleanEmail);
      const isCollaborator = cleanEmail && tourney.allowedEmails?.map((e) => e.toLowerCase()).includes(cleanEmail);

      if (isOwner || isCollaborator) {
        resultMap.set(tourney.id, tourney);
      }
    });
  } catch (error) {
    console.warn('Could not list from global tournaments:', error);
  }

  try {
    // 2. Also check personal subcollection as fallback
    const colRef = collection(db, 'users', userId, 'tournaments');
    const userSnap = await getDocs(colRef);
    userSnap.forEach((d) => {
      const tourney = d.data() as Tournament;
      if (tourney && tourney.id) {
        resultMap.set(tourney.id, tourney);
      }
    });
  } catch (error) {
    console.warn('Could not list from personal subcollection:', error);
  }

  const list = Array.from(resultMap.values());
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return list;
}

/**
 * Deletes a tournament from Firestore (Owner only)
 */
export async function deleteTournamentFromFirestore(userId: string, tournamentId: string): Promise<void> {
  const path = `tournaments/${tournamentId}`;
  try {
    await deleteDoc(doc(db, 'tournaments', tournamentId));
    if (userId) {
      await deleteDoc(doc(db, 'users', userId, 'tournaments', tournamentId));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Real-time subscription to tournament changes for live view
 */
export function subscribeToTournament(
  tournamentId: string,
  onUpdate: (tournament: Tournament) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `tournaments/${tournamentId}`;
  const docRef = doc(db, 'tournaments', tournamentId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as Tournament);
      }
    },
    (error) => {
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Sync user profile
 */
export async function syncUserProfile(user: { uid: string; email?: string | null; displayName?: string | null }): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Resets entire database by deleting all tournament documents
 */
export async function resetEntireDatabase(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'tournaments'));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    console.error('Error resetting database:', error);
  }
}
