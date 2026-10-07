/**
 * En Passant — Director Approval & Admin Access Service
 * Super Admin: shivgoyal0307@gmail.com
 * Handles real-time approval workflows for tournament director accounts.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { DirectorRequest } from '../types/tournament';

export const SUPER_ADMIN_EMAIL = 'shivgoyal0307@gmail.com';
const LOCAL_REQUESTS_KEY = 'en_passant_director_requests';
const BROADCAST_CHANNEL_NAME = 'en_passant_director_channel';

// Cross-tab real-time communication channel
let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  channel = null;
}

function broadcastStatusUpdate(payload: {
  uid: string;
  email?: string;
  status: 'approved' | 'pending' | 'rejected';
}) {
  try {
    channel?.postMessage({ type: 'STATUS_UPDATE', ...payload, timestamp: Date.now() });
  } catch {}
}

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Reads all cached director requests from localStorage (deduplicated by uid)
 */
function getCachedRequests(): Map<string, DirectorRequest> {
  const map = new Map<string, DirectorRequest>();
  try {
    const raw = localStorage.getItem(LOCAL_REQUESTS_KEY);
    if (raw) {
      const parsed: DirectorRequest[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((r) => {
          if (r && r.uid && !r.uid.startsWith('email_')) {
            map.set(r.uid, r);
          }
        });
      }
    }
  } catch {}
  return map;
}

/**
 * Saves requests map to localStorage (deduplicated, sorted)
 */
function saveCachedRequests(requests: DirectorRequest[]): void {
  try {
    // Deduplicate by uid
    const dedup = new Map<string, DirectorRequest>();
    requests.forEach((r) => {
      if (r && r.uid && !r.uid.startsWith('email_')) {
        dedup.set(r.uid, r);
      }
    });
    const list = Array.from(dedup.values());
    list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(list));
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

  // 2. Check Firestore direct document by UID
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
      // 3. Document with UID does not exist: Check if user was pre-approved by email in Firestore!
      let foundApprovedByEmail = false;
      let matchedReq: DirectorRequest | null = null;

      if (cleanEmail) {
        try {
          const colRef = collection(db, 'director_requests');
          const q = query(colRef, where('email', '==', cleanEmail));
          const querySnap = await getDocs(q);

          querySnap.forEach((d) => {
            const data = d.data() as DirectorRequest;
            if (data.status === 'approved') {
              foundApprovedByEmail = true;
              matchedReq = data;
            } else if (!matchedReq) {
              matchedReq = data;
            }
          });
        } catch (e) {
          console.warn('Could not query director_requests by email in Firestore:', e);
        }
      }

      // Also check local cache for pre-approval
      if (!foundApprovedByEmail && cleanEmail) {
        for (const req of allCached) {
          if (req.email && req.email.toLowerCase() === cleanEmail && req.status === 'approved') {
            foundApprovedByEmail = true;
            matchedReq = req;
            break;
          }
        }
      }

      if (foundApprovedByEmail && matchedReq) {
        // Link this user UID to the approved record!
        const approvedRecord: DirectorRequest = {
          ...matchedReq,
          uid: user.uid,
          email: cleanEmail,
          displayName: user.displayName || matchedReq.displayName || '',
          status: 'approved',
          reviewedAt: Date.now(),
          reviewedBy: matchedReq.reviewedBy || SUPER_ADMIN_EMAIL,
        };
        const map = getCachedRequests();
        map.set(user.uid, approvedRecord);
        saveCachedRequests(Array.from(map.values()));

        await setDoc(doc(db, 'director_requests', user.uid), approvedRecord);
        broadcastStatusUpdate({ uid: user.uid, email: cleanEmail, status: 'approved' });
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
      const map = getCachedRequests();
      map.set(user.uid, newReq);
      saveCachedRequests(Array.from(map.values()));
      broadcastStatusUpdate({ uid: user.uid, email: cleanEmail, status: 'pending' });
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
 * Real-time subscription to a specific user's approval status.
 * Listens via Firestore onSnapshot, BroadcastChannel across tabs, and localStorage events.
 * Provides instant real-time transition from Pending -> Approved!
 */
export function subscribeToUserDirectorStatus(
  user: { uid: string; email?: string | null; displayName?: string | null },
  onStatusChange: (status: 'approved' | 'pending' | 'rejected') => void
): () => void {
  if (!user || !user.uid) return () => {};

  // Super Admin is always auto-approved
  if (isSuperAdmin(user.email)) {
    onStatusChange('approved');
    return () => {};
  }

  const cleanEmail = (user.email || '').trim().toLowerCase();

  // 1. Check local cache immediately
  const cached = getCachedRequests().get(user.uid);
  if (cached && (cached.status === 'approved' || cached.status === 'rejected')) {
    onStatusChange(cached.status);
    if (cached.status === 'approved') return () => {};
  }

  let isUnsubscribed = false;

  // 2. BroadcastChannel listener (instant real-time updates across tabs in same browser)
  const handleBroadcast = (event: MessageEvent) => {
    if (isUnsubscribed || !event.data || event.data.type !== 'STATUS_UPDATE') return;
    const { uid, email, status } = event.data;
    if (uid === user.uid || (cleanEmail && email && email.toLowerCase() === cleanEmail)) {
      if (status === 'approved' || status === 'rejected' || status === 'pending') {
        const map = getCachedRequests();
        const existing = map.get(user.uid) || {
          uid: user.uid,
          email: cleanEmail,
          displayName: user.displayName || '',
          requestedAt: Date.now(),
          status,
        };
        map.set(user.uid, { ...existing, status });
        saveCachedRequests(Array.from(map.values()));
        onStatusChange(status);
      }
    }
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  // 3. Storage event listener (fallback cross-tab communication)
  const handleStorage = (e: StorageEvent) => {
    if (isUnsubscribed || e.key !== LOCAL_REQUESTS_KEY) return;
    try {
      const map = getCachedRequests();
      const match = map.get(user.uid) || (cleanEmail ? Array.from(map.values()).find((r) => r.email?.toLowerCase() === cleanEmail) : null);
      if (match && match.status) {
        onStatusChange(match.status);
      }
    } catch {}
  };
  window.addEventListener('storage', handleStorage);

  // 4. Firestore real-time onSnapshot listener on director_requests/{user.uid}
  let unsubFirestore: (() => void) | null = null;
  try {
    const docRef = doc(db, 'director_requests', user.uid);
    unsubFirestore = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (isUnsubscribed) return;
        if (snap.exists()) {
          const data = snap.data() as DirectorRequest;
          if (data && data.status) {
            const map = getCachedRequests();
            map.set(user.uid, data);
            saveCachedRequests(Array.from(map.values()));
            onStatusChange(data.status);
          }
        } else if (cleanEmail) {
          // If no doc under user.uid yet, check if approved doc exists for their email
          const colRef = collection(db, 'director_requests');
          const q = query(colRef, where('email', '==', cleanEmail));
          getDocs(q).then((querySnap) => {
            if (isUnsubscribed) return;
            querySnap.forEach((d) => {
              const data = d.data() as DirectorRequest;
              if (data.status === 'approved') {
                const map = getCachedRequests();
                const approvedRecord: DirectorRequest = {
                  ...data,
                  uid: user.uid,
                  email: cleanEmail,
                  status: 'approved',
                };
                map.set(user.uid, approvedRecord);
                saveCachedRequests(Array.from(map.values()));
                setDoc(doc(db, 'director_requests', user.uid), approvedRecord, { merge: true }).catch(() => {});
                onStatusChange('approved');
              }
            });
          }).catch(() => {});
        }
      },
      (err) => {
        console.warn('Real-time director status listener notice:', err);
      }
    );
  } catch (err) {
    console.warn('Could not setup Firestore onSnapshot for director status:', err);
  }

  // Periodic fallback poll every 3 seconds to guarantee updates even on flaky networks
  const pollTimer = setInterval(() => {
    if (isUnsubscribed) return;
    getDirectorStatus(user).then((status) => {
      if (!isUnsubscribed && status) {
        onStatusChange(status);
      }
    }).catch(() => {});
  }, 3000);

  return () => {
    isUnsubscribed = true;
    clearInterval(pollTimer);
    if (unsubFirestore) unsubFirestore();
    if (channel) channel.removeEventListener('message', handleBroadcast);
    window.removeEventListener('storage', handleStorage);
  };
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
      const id = data.uid || d.id;
      if (id && !id.startsWith('email_')) {
        map.set(id, { ...data, uid: id, email: (data.email || '').trim().toLowerCase() });
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
 * Saves to Firestore, local cache, and broadcasts to all active tabs instantly.
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

  // Update local cache
  map.set(uid, updated);
  saveCachedRequests(Array.from(map.values()));

  // Broadcast instantly to all tabs (0ms latency)
  broadcastStatusUpdate({ uid, email: cleanEmail, status });

  // Update Firestore
  try {
    await setDoc(doc(db, 'director_requests', uid), updated, { merge: true });

    // Also update users/{uid} document so profile metadata is synchronized
    if (!uid.startsWith('manual_') && !uid.startsWith('preapproved_')) {
      await setDoc(
        doc(db, 'users', uid),
        {
          directorStatus: status,
          isApproved: status === 'approved',
          reviewedAt: Date.now(),
          reviewedBy,
        },
        { merge: true }
      );
    }

    // If an email was specified and there are other requests matching this email (e.g. pre-approval vs real UID),
    // update them as well so everything stays in sync
    if (cleanEmail) {
      try {
        const colRef = collection(db, 'director_requests');
        const q = query(colRef, where('email', '==', cleanEmail));
        const snap = await getDocs(q);
        snap.forEach((d) => {
          if (d.id !== uid) {
            setDoc(doc(db, 'director_requests', d.id), { status, reviewedAt: Date.now(), reviewedBy }, { merge: true }).catch(() => {});
          }
        });
      } catch {}
    }
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

  // BroadcastChannel listener for immediate optimistic updates in admin portal
  const handleBroadcast = (event: MessageEvent) => {
    if (!event.data || event.data.type !== 'STATUS_UPDATE') return;
    const { uid, email, status } = event.data;
    const map = getCachedRequests();
    const existing = map.get(uid);
    if (existing) {
      map.set(uid, { ...existing, status });
    } else {
      map.set(uid, {
        uid,
        email: email || '',
        status,
        requestedAt: Date.now(),
      });
    }
    const list = Array.from(map.values());
    list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
    saveCachedRequests(list);
    onUpdate(list);
  };

  if (channel) {
    channel.addEventListener('message', handleBroadcast);
  }

  let unsubFirestore: (() => void) | null = null;
  try {
    const colRef = collection(db, 'director_requests');
    unsubFirestore = onSnapshot(
      colRef,
      (snap) => {
        const freshMap = new Map<string, DirectorRequest>();

        // Build cleanly from Firestore documents
        snap.forEach((d) => {
          const data = d.data() as DirectorRequest;
          const id = data.uid || d.id;
          if (id && !id.startsWith('email_')) {
            freshMap.set(id, {
              ...data,
              uid: id,
              email: (data.email || '').trim().toLowerCase(),
            });
          }
        });

        // Also merge any offline items from local cache if not yet synced
        const cached = getCachedRequests();
        cached.forEach((item, id) => {
          if (!freshMap.has(id)) {
            freshMap.set(id, item);
          }
        });

        const list = Array.from(freshMap.values());
        list.sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0));
        saveCachedRequests(list);
        onUpdate(list);
      },
      (err) => console.warn('Director requests subscription warning:', err)
    );
  } catch {
    unsubFirestore = null;
  }

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (channel) channel.removeEventListener('message', handleBroadcast);
  };
}
