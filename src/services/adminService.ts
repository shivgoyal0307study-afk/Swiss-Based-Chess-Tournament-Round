/**
 * En Passant — Director Approval & Admin Access Service
 * Super Admin: shivgoyal0307@gmail.com
 * Handles approval workflows for new director accounts.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { DirectorRequest } from '../types/tournament';

export const SUPER_ADMIN_EMAIL = 'shivgoyal0307@gmail.com';
const LOCAL_REQUESTS_KEY = 'en_passant_director_requests';

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Reads all cached director requests from localStorage
 */
function getCachedRequests(): Map<string, DirectorRequest> {
  const map = new Map<string, DirectorRequest>();
  try {
    const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
    if (raw) {
      const parsed: DirectorRequest[] = JSON.parse(raw);
      parsed.forEach((r) => map.set(r.uid, r));
    }
  } catch {}
  return map;
}

/**
 * Saves requests map to localStorage
 */
function saveCachedRequests(requests: DirectorRequest[]): void {
  try {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests));
  } catch {}
}

/**
 * Checks approval status for a director account.
 * Super Admin (shivgoyal0307@gmail.com) is always approved.
 * New users start in 'pending' status until approved by Super Admin.
 */
export async function getDirectorStatus(user: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<'approved' | 'pending' | 'rejected'> {
  if (!user || !user.uid) return 'pending';

  // Super Admin is always auto-approved
  if (isSuperAdmin(user.email)) {
    return 'approved';
  }

  const cleanEmail = (user.email || '').trim().toLowerCase();

  // 1. Check local cache (by UID or Email)
  const allCached = Array.from(getCachedRequests().values());
  const cachedMatch = allCached.find(
    (r) => r.uid === user.uid || (cleanEmail && r.email && r.email.toLowerCase() === cleanEmail)
  );

  if (cachedMatch) {
    if (cachedMatch.status === 'approved' || cachedMatch.status === 'rejected') {
      return cachedMatch.status;
    }
  }

  // 2. Check Firestore
  try {
    const docRef = doc(db, 'director_requests', user.uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as DirectorRequest;
      const map = getCachedRequests();
      map.set(user.uid, data);
      saveCachedRequests(Array.from(map.values()));
      return data.status;
    } else {
      // Check if pre-approved by email in collection
      const map = getCachedRequests();
      let matchedReq: DirectorRequest | null = null;
      for (const req of map.values()) {
        if (cleanEmail && req.email && req.email.toLowerCase() === cleanEmail) {
          matchedReq = req;
          break;
        }
      }

      if (matchedReq && matchedReq.status === 'approved') {
        // Link this UID to the approved record
        const updated: DirectorRequest = {
          ...matchedReq,
          uid: user.uid,
          email: cleanEmail,
          displayName: user.displayName || matchedReq.displayName || '',
          status: 'approved',
        };
        map.set(user.uid, updated);
        saveCachedRequests(Array.from(map.values()));
        await setDoc(doc(db, 'director_requests', user.uid), updated);
        return 'approved';
      }

      // Create new pending request for this new director
      const newReq: DirectorRequest = {
        uid: user.uid,
        email: cleanEmail,
        displayName: user.displayName || '',
        status: 'pending',
        requestedAt: Date.now(),
      };
      await setDoc(docRef, newReq);
      map.set(user.uid, newReq);
      saveCachedRequests(Array.from(map.values()));
      return 'pending';
    }
  } catch (err) {
    console.warn('Could not query Firestore for director status, using local cache:', err);
    if (!cachedMatch) {
      const newReq: DirectorRequest = {
        uid: user.uid,
        email: cleanEmail,
        displayName: user.displayName || '',
        status: 'pending',
        requestedAt: Date.now(),
      };
      const map = getCachedRequests();
      map.set(user.uid, newReq);
      saveCachedRequests(Array.from(map.values()));
    }
    return cachedMatch?.status || 'pending';
  }
}

/**
 * Lists all director requests for the Super Admin
 */
export async function listDirectorRequests(): Promise<DirectorRequest[]> {
  const map = getCachedRequests();

  try {
    const colRef = collection(db, 'director_requests');
    const snap = await getDocs(colRef);
    snap.forEach((d) => {
      const data = d.data() as DirectorRequest;
      if (data && data.uid) {
        map.set(data.uid, data);
      }
    });
  } catch (err) {
    console.warn('Could not list requests from cloud:', err);
  }

  const list = Array.from(map.values());
  list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
  saveCachedRequests(list);
  return list;
}

/**
 * Updates a director request status (Approved or Rejected)
 */
export async function updateDirectorStatus(
  uid: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  email?: string,
  displayName?: string
): Promise<void> {
  const map = getCachedRequests();
  const existing = map.get(uid);

  const cleanEmail = (email || existing?.email || '').trim().toLowerCase();

  const updated: DirectorRequest = {
    uid,
    email: cleanEmail,
    displayName: displayName || existing?.displayName || '',
    status,
    requestedAt: existing?.requestedAt || Date.now(),
    reviewedAt: Date.now(),
    reviewedBy,
  };

  map.set(uid, updated);
  if (cleanEmail) {
    map.set(`email_${cleanEmail}`, updated);
  }
  saveCachedRequests(Array.from(map.values()));

  try {
    await setDoc(doc(db, 'director_requests', uid), updated, { merge: true });
  } catch (err) {
    console.warn('Could not update director status in cloud:', err);
  }
}

/**
 * Real-time subscription to director requests for the Super Admin Portal
 */
export function subscribeToDirectorRequests(
  onUpdate: (requests: DirectorRequest[]) => void
): () => void {
  // Emit local cache immediately
  listDirectorRequests().then(onUpdate).catch(() => {});

  try {
    const colRef = collection(db, 'director_requests');
    return onSnapshot(
      colRef,
      (snap) => {
        const map = getCachedRequests();
        snap.forEach((d) => {
          const data = d.data() as DirectorRequest;
          if (data && data.uid) {
            map.set(data.uid, data);
          }
        });
        const list = Array.from(map.values());
        list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
        saveCachedRequests(list);
        onUpdate(list);
      },
      (err) => console.warn('Director requests subscription warning:', err)
    );
  } catch {
    return () => {};
  }
}
