# Security Specification: FIDE Chess Tournament Director

## 1. Data Invariants
1. **User Identity Isolation**: A tournament in `/users/{userId}/tournaments/{tournamentId}` can only be read, created, updated, or deleted by the authenticated user whose `request.auth.uid == userId`.
2. **Owner Id Consistency**: The `ownerId` field inside any tournament document must strictly match `request.auth.uid` on both create and update operations.
3. **Format Integrity**: Tournament `format` must be strictly one of `swiss`, `round_robin`, or `knockout`.
4. **Lot Color Integrity**: Board 1 seed 1 color `round1TopSeedColor` must be either `W` or `B`.
5. **Status Workflow Integrity**: Tournament `status` must be one of `setup`, `in_progress`, or `finished`.
6. **ID Sanitization**: All IDs (`userId`, `tournamentId`) must conform to `^[a-zA-Z0-9_\-]+$` and have length <= 128 characters to prevent path injection and Denial-of-Wallet attacks.
7. **Default-Deny Catch-All**: All paths outside of explicitly permitted user collections are completely forbidden from reads and writes.
8. **No Blanket Reads**: Listing operations are restricted to the authenticated user's own tournament subcollection.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Spoofed User ID Write (Identity Theft)**: An authenticated attacker (`uid_attacker`) tries to write to `/users/uid_victim/tournaments/t1`. Expected: PERMISSION_DENIED.
2. **Unauthenticated Read (Data Snooping)**: Unauthenticated client attempts to read `/users/user123/tournaments/t1`. Expected: PERMISSION_DENIED.
3. **Mismatched Owner ID (Privilege Escalation)**: `uid_user1` creates a tournament document with `ownerId: "uid_admin"`. Expected: PERMISSION_DENIED.
4. **Invalid Tournament Format (Schema Bypass)**: Creating a tournament with `format: "unsupported_bracket"`. Expected: PERMISSION_DENIED.
5. **Path Traversal / Special Char Document ID (ID Injection)**: Attempting to create a document with ID `../../hack` or 2000-character junk string. Expected: PERMISSION_DENIED.
6. **Ghost Admin Property (Shadow Update)**: Updating a tournament document with an injected `{ "isAdmin": true }` or `{ "isSuperUser": true }`. Expected: PERMISSION_DENIED.
7. **Negative or Non-Integer Round Number (State Corruption)**: Writing `roundsTotal: -5` or `currentRoundNumber: "three"`. Expected: PERMISSION_DENIED.
8. **Invalid Color Assignment (Rule Invariant Violation)**: Writing `round1TopSeedColor: "Green"`. Expected: PERMISSION_DENIED.
9. **Blanket Collection Query from Non-Owner (Query Scraping)**: Attempting to query `/users/{otherUser}/tournaments` without being `otherUser`. Expected: PERMISSION_DENIED.
10. **Arbitrary Root Document Write (Denial of Service)**: Attempting to create `/global_tournaments/xyz` or modify root docs. Expected: PERMISSION_DENIED.
11. **Excessive String Payload (Denial-of-Wallet)**: Injected `name` string of 500,000 characters. Expected: PERMISSION_DENIED.
12. **Tampering with Another User's Completed Round (Match Rigging)**: Direct PATCH to `/users/victim_user/tournaments/t1` from a secondary authenticated user. Expected: PERMISSION_DENIED.

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)
```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firestore Rules Security Audit', () => {
  let testEnv: any;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'formidable-study-183d0',
      firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test('DD1: Spoofed User ID Write is denied', async () => {
    const attackerDb = testEnv.authenticatedContext('uid_attacker').firestore();
    await assertFails(attackerDb.doc('users/uid_victim/tournaments/t1').set({
      id: 't1',
      ownerId: 'uid_victim',
      name: 'Hack Tourney',
      format: 'swiss',
      roundsTotal: 5,
      currentRoundNumber: 1,
      round1TopSeedColor: 'W',
      status: 'setup',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  });

  test('DD2: Unauthenticated read is denied', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthDb.doc('users/uid_victim/tournaments/t1').get());
  });

  test('DD3: Mismatched ownerId on write is denied', async () => {
    const userDb = testEnv.authenticatedContext('uid_user1').firestore();
    await assertFails(userDb.doc('users/uid_user1/tournaments/t1').set({
      id: 't1',
      ownerId: 'uid_admin',
      name: 'Tampered Tourney',
      format: 'swiss',
      roundsTotal: 5,
      currentRoundNumber: 1,
      round1TopSeedColor: 'W',
      status: 'setup',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
  });

  test('Legitimate owner can create and read own tournament', async () => {
    const userDb = testEnv.authenticatedContext('uid_user1').firestore();
    await assertSucceeds(userDb.doc('users/uid_user1/tournaments/t1').set({
      id: 't1',
      ownerId: 'uid_user1',
      name: 'Autumn Swiss 2026',
      format: 'swiss',
      roundsTotal: 5,
      currentRoundNumber: 1,
      round1TopSeedColor: 'W',
      status: 'setup',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    await assertSucceeds(userDb.doc('users/uid_user1/tournaments/t1').get());
  });
});
```
