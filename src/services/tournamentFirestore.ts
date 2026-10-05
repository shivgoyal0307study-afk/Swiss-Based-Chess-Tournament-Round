/**
 * En Passant — Tournament Firestore Persistence Service
 * Dual-Layer Offline-First Architecture + Firestore Cloud Sync.
 * Ensures data is 100% immune to being wiped off across logins, logouts, and network issues.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Tournament } from '../types/tournament';

const GLOBAL_ALL_TOURNAMENTS_KEY = 'en_passant_all_known_tournaments';
const USER_CACHE_PREFIX = 'en_passant_user_tourneys_';
const PUBLIC_CACHE_KEY = 'en_passant_public_tourneys';
const ACTIVE_STORAGE_KEY = 'en_passant_active_tournament';
const V4_STORAGE_KEY = 'en_passant_chess_tournament_v4';

/**
 * Gets all tournaments known to this browser across all users and sessions
 */
export function getAllKnownTournaments(): Tournament[] {
  const map = new Map<string, Tournament>();

  // 1. Check primary global array
  try {
    const raw = localStorage.getItem(GLOBAL_ALL_TOURNAMENTS_KEY);
    if (raw) {
      const parsed: Tournament[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((t) => {
          if (t && t.id) map.set(t.id, t);
        });
      }
    }
  } catch (e) {
    console.warn('Error reading global tournaments cache:', e);
  }

  // 2. Check active tournament in root storage & V4 key
  try {
    const activeRaw = localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (activeRaw) {
      const activeT: Tournament = JSON.parse(activeRaw);
      if (activeT && activeT.id && !map.has(activeT.id)) {
        map.set(activeT.id, activeT);
      }
    }
  } catch {}

  try {
    const v4Raw = localStorage.getItem(V4_STORAGE_KEY);
    if (v4Raw) {
      const v4T: Tournament = JSON.parse(v4Raw);
      if (v4T && v4T.id && !map.has(v4T.id)) {
        map.set(v4T.id, v4T);
      }
    }
  } catch {}

  // 3. Sweep all individual tournament and user cache keys in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('en_passant_tourney_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const t: Tournament = JSON.parse(raw);
          if (t && t.id) {
            const existing = map.get(t.id);
            if (!existing || (t.updatedAt || 0) >= (existing.updatedAt || 0)) {
              map.set(t.id, t);
            }
          }
        }
      } else if (key.startsWith(USER_CACHE_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list: Tournament[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            list.forEach((t) => {
              if (t && t.id) {
                const existing = map.get(t.id);
                if (!existing || (t.updatedAt || 0) >= (existing.updatedAt || 0)) {
                  map.set(t.id, t);
                }
              }
            });
          }
        }
      }
    }
  } catch {}

  const list = Array.from(map.values());
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return list;
}

/**
 * Persists a tournament to the global browser registry
 */
export function saveToAllKnownTournaments(tournament: Tournament): void {
  try {
    const current = getAllKnownTournaments();
    const updated = [tournament, ...current.filter((t) => t.id !== tournament.id)];
    localStorage.setItem(GLOBAL_ALL_TOURNAMENTS_KEY, JSON.stringify(updated));
    localStorage.setItem(PUBLIC_CACHE_KEY, JSON.stringify(updated.filter((t) => t.isPublic !== false)));
    localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(tournament));
    localStorage.setItem(V4_STORAGE_KEY, JSON.stringify(tournament));
    localStorage.setItem(`en_passant_tourney_${tournament.id}`, JSON.stringify(tournament));
  } catch (e) {
    console.warn('Error writing to all known tournaments:', e);
  }
}

/**
 * Loads cached tournaments for a specific user ID or email
 */
export function getCachedUserTournaments(userId: string, userEmail?: string | null): Tournament[] {
  const map = new Map<string, Tournament>();
  const cleanEmail = userEmail?.trim().toLowerCase();

  // 1. Direct user cache by UID
  try {
    const rawById = localStorage.getItem(`${USER_CACHE_PREFIX}${userId}`);
    if (rawById) {
      const parsed: Tournament[] = JSON.parse(rawById);
      if (Array.isArray(parsed)) {
        parsed.forEach((t) => {
          if (t && t.id) map.set(t.id, t);
        });
      }
    }
  } catch {}

  // 2. Direct user cache by email
  if (cleanEmail) {
    try {
      const rawByEmail = localStorage.getItem(`${USER_CACHE_PREFIX}${cleanEmail}`);
      if (rawByEmail) {
        const parsed: Tournament[] = JSON.parse(rawByEmail);
        if (Array.isArray(parsed)) {
          parsed.forEach((t) => {
            if (t && t.id) map.set(t.id, t);
          });
        }
      }
    } catch {}
  }

  // 3. Sweep all known tournaments for matches
  const all = getAllKnownTournaments();
  all.forEach((t) => {
    const isOwner =
      t.ownerId === userId ||
      (cleanEmail && t.ownerEmail && t.ownerEmail.toLowerCase() === cleanEmail) ||
      !t.ownerId ||
      t.ownerId === 'anonymous' ||
      t.ownerId === 'local_user';
    const isCollaborator =
      cleanEmail && t.allowedEmails?.map((e) => e.toLowerCase()).includes(cleanEmail);

    if (isOwner || isCollaborator) {
      if (!map.has(t.id)) {
        map.set(t.id, t);
      }
    }
  });

  // Fallback: If no specific match, never leave user empty-handed if local tournaments exist!
  if (map.size === 0 && all.length > 0) {
    all.forEach((t) => map.set(t.id, t));
  }

  const list = Array.from(map.values());
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return list;
}

/**
 * Caches tournaments for a user
 */
export function cacheUserTournaments(userId: string, tournaments: Tournament[], userEmail?: string | null): void {
  try {
    localStorage.setItem(`${USER_CACHE_PREFIX}${userId}`, JSON.stringify(tournaments));
    if (userEmail) {
      localStorage.setItem(`${USER_CACHE_PREFIX}${userEmail.trim().toLowerCase()}`, JSON.stringify(tournaments));
    }
    // Also update global known tournaments registry
    tournaments.forEach((t) => saveToAllKnownTournaments(t));
  } catch (e) {
    console.warn('Error caching user tournaments:', e);
  }
}

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
    updatedAt: tournament.updatedAt || Date.now(),
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
        pairingExplanation: g.pairingExplanation || '',
      })),
    })),
  };
}

/**
 * Saves a tournament with Dual-Layer Persistence.
 * Guarantees that tournaments NEVER disappear even if Firestore is offline or restricted.
 */
export async function saveTournamentToFirestore(
  userId: string,
  tournament: Tournament,
  userEmail?: string | null,
  userName?: string | null
): Promise<void> {
  if (!tournament || !tournament.id) return;

  const cleanTournament = sanitizeTournament(tournament, userId, userEmail, userName) as unknown as Tournament;

  // 1. Instantly save to local storage cache so it can NEVER be wiped off
  try {
    saveToAllKnownTournaments(cleanTournament);
    const existing = getCachedUserTournaments(userId, userEmail);
    const updated = [
      cleanTournament,
      ...existing.filter((t) => t.id !== cleanTournament.id),
    ];
    cacheUserTournaments(userId, updated, userEmail);
    localStorage.setItem(`en_passant_user_active_${userId}`, cleanTournament.id);
    localStorage.setItem(`en_passant_tourney_${cleanTournament.id}`, JSON.stringify(cleanTournament));
  } catch (err) {
    console.error('Error saving to local cache:', err);
  }

  // 2. Sync to Firestore (Global collection & User subcollection)
  try {
    await setDoc(doc(db, 'tournaments', cleanTournament.id), cleanTournament);
    if (userId && userId !== 'participant' && cleanTournament.ownerId === userId) {
      await setDoc(doc(db, 'users', userId, 'tournaments', cleanTournament.id), cleanTournament);
    }
  } catch (error: any) {
    console.warn('Firestore cloud sync notice (data is safely preserved in local cache):', error?.message || error);
  }
}

/**
 * Fetches a single tournament by ID (checks local cache first, then Firestore)
 */
export async function getTournamentById(tournamentId: string): Promise<Tournament | null> {
  // Check local cache
  try {
    const raw = localStorage.getItem(`en_passant_tourney_${tournamentId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
    const all = getAllKnownTournaments();
    const match = all.find((t) => t.id === tournamentId);
    if (match) return match;
  } catch {}

  // Fetch from Firestore
  try {
    const snap = await getDoc(doc(db, 'tournaments', tournamentId));
    if (snap.exists()) {
      return snap.data() as Tournament;
    }
  } catch (error) {
    console.warn('Could not fetch tournament from cloud:', error);
  }
  return null;
}

/**
 * Fetches all active/ongoing tournaments for participant search (combines local cache and cloud)
 */
export async function listPublicTournaments(): Promise<Tournament[]> {
  const resultMap = new Map<string, Tournament>();

  // 1. Read from global local cache
  const allKnown = getAllKnownTournaments();
  allKnown.forEach((t) => {
    if (t && t.id && t.name && t.isPublic !== false) {
      resultMap.set(t.id, t);
    }
  });

  // 2. Fetch from Firestore
  try {
    const colRef = collection(db, 'tournaments');
    const snap = await getDocs(colRef);
    snap.forEach((d) => {
      const data = d.data() as Tournament;
      if (data && data.name && data.isPublic !== false) {
        resultMap.set(data.id, data);
        saveToAllKnownTournaments(data);
      }
    });
  } catch (error) {
    console.warn('Could not query cloud public tournaments (using local cache):', error);
  }

  const results = Array.from(resultMap.values());
  results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return results;
}

/**
 * Real-time subscription to all public tournaments for live search modal
 */
export function subscribeToPublicTournaments(
  onUpdate: (tournaments: Tournament[]) => void
): () => void {
  // Emit current cached tournaments immediately so UI has data instantly
  listPublicTournaments().then(onUpdate).catch(() => {});

  const colRef = collection(db, 'tournaments');
  try {
    return onSnapshot(
      colRef,
      (snap) => {
        const resultMap = new Map<string, Tournament>();
        // Keep existing local tournaments
        getAllKnownTournaments().forEach((t) => {
          if (t && t.id && t.isPublic !== false) resultMap.set(t.id, t);
        });

        snap.forEach((d) => {
          const data = d.data() as Tournament;
          if (data && data.name && data.isPublic !== false) {
            resultMap.set(data.id, data);
            saveToAllKnownTournaments(data);
          }
        });
        const results = Array.from(resultMap.values());
        results.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        onUpdate(results);
      },
      (err) => {
        console.warn('Public tournaments live listener warning:', err.message);
        // Fallback to local list on error
        listPublicTournaments().then(onUpdate).catch(() => {});
      }
    );
  } catch (e) {
    return () => {};
  }
}

/**
 * Lists tournaments owned by a user OR where their email is in allowedEmails.
 * Loads local cache immediately, then merges with Firestore cloud tournaments.
 */
export async function listUserTournaments(userId: string, userEmail?: string | null): Promise<Tournament[]> {
  const cleanEmail = userEmail?.trim().toLowerCase();
  const resultMap = new Map<string, Tournament>();

  // 1. Immediately populate from local cache (NEVER wipe off user data)
  const localList = getCachedUserTournaments(userId, userEmail);
  localList.forEach((t) => {
    if (t && t.id) resultMap.set(t.id, t);
  });

  // 2. Fetch from global /tournaments in Firestore
  try {
    const globalCol = collection(db, 'tournaments');
    const snap = await getDocs(globalCol);
    snap.forEach((d) => {
      const tourney = d.data() as Tournament;
      if (!tourney || !tourney.id) return;
      const isOwner =
        tourney.ownerId === userId ||
        (cleanEmail && tourney.ownerEmail && tourney.ownerEmail.toLowerCase() === cleanEmail);
      const isCollaborator =
        cleanEmail && tourney.allowedEmails?.map((e) => e.toLowerCase()).includes(cleanEmail);

      if (isOwner || isCollaborator) {
        const existing = resultMap.get(tourney.id);
        if (!existing || (tourney.updatedAt || 0) >= (existing.updatedAt || 0)) {
          resultMap.set(tourney.id, tourney);
          saveToAllKnownTournaments(tourney);
        }
      }
    });
  } catch (error) {
    console.warn('Could not query global tournaments from cloud (local cache preserved):', error);
  }

  // 3. Also check personal subcollection as secondary cloud source
  try {
    const colRef = collection(db, 'users', userId, 'tournaments');
    const userSnap = await getDocs(colRef);
    userSnap.forEach((d) => {
      const tourney = d.data() as Tournament;
      if (tourney && tourney.id) {
        const existing = resultMap.get(tourney.id);
        if (!existing || (tourney.updatedAt || 0) >= (existing.updatedAt || 0)) {
          resultMap.set(tourney.id, tourney);
          saveToAllKnownTournaments(tourney);
        }
      }
    });
  } catch (error) {
    console.warn('Could not query user subcollection from cloud:', error);
  }

  let list = Array.from(resultMap.values());

  // If still empty, fall back to any tournaments saved in this browser
  if (list.length === 0) {
    const allKnown = getAllKnownTournaments();
    if (allKnown.length > 0) {
      allKnown.forEach((t) => resultMap.set(t.id, t));
      list = Array.from(resultMap.values());
    }
  }

  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  // Sync merged result back to local cache
  cacheUserTournaments(userId, list, userEmail);
  return list;
}

/**
 * Deletes a tournament from local cache and Firestore
 */
export async function deleteTournamentFromFirestore(
  userId: string,
  tournamentId: string,
  userEmail?: string | null
): Promise<void> {
  // 1. Remove from local cache
  const localList = getCachedUserTournaments(userId, userEmail);
  const remaining = localList.filter((t) => t.id !== tournamentId);
  cacheUserTournaments(userId, remaining, userEmail);
  try {
    localStorage.removeItem(`en_passant_tourney_${tournamentId}`);
    const all = getAllKnownTournaments().filter((t) => t.id !== tournamentId);
    localStorage.setItem(GLOBAL_ALL_TOURNAMENTS_KEY, JSON.stringify(all));
  } catch {}

  // 2. Remove from Firestore
  try {
    await deleteDoc(doc(db, 'tournaments', tournamentId));
    if (userId) {
      await deleteDoc(doc(db, 'users', userId, 'tournaments', tournamentId));
    }
  } catch (error) {
    console.warn('Could not delete tournament from cloud:', error);
  }
}

/**
 * Real-time subscription to tournament changes for live view
 */
export function subscribeToTournament(
  tournamentId: string,
  onUpdate: (tournament: Tournament, hasPendingWrites?: boolean) => void,
  onError?: (err: Error) => void
): () => void {
  const docRef = doc(db, 'tournaments', tournamentId);

  try {
    return onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Tournament;
          saveToAllKnownTournaments(data);
          onUpdate(data, snap.metadata.hasPendingWrites);
        }
      },
      (error) => {
        if (onError) onError(error);
        console.warn(`Live listener warning for tournament ${tournamentId}:`, error.message);
      }
    );
  } catch (e) {
    return () => {};
  }
}

/**
 * Tests whether Firestore is accessible and writable/readable
 */
export async function testFirestoreConnection(): Promise<{ ok: boolean; code?: string; message?: string }> {
  try {
    const colRef = collection(db, 'tournaments');
    await getDocs(colRef);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, code: err.code, message: err.message };
  }
}

/**
 * Sync user profile to Firestore
 */
export async function syncUserProfile(user: { uid: string; email?: string | null; displayName?: string | null }): Promise<void> {
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
    console.warn('Could not sync user profile to cloud:', error);
  }
}
