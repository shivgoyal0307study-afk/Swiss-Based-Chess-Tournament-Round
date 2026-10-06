/**
 * En Passant — Chess Tournament Platform
 * Features:
 * - Participant Login (No ID or Password required) with tournament search & live pairing view
 * - Arbiter Access Control (Creator + Allowed Collaborator Emails only can edit)
 * - Immutability of previous rounds once next round starts
 * - Clean minimal UI with all sample data removed
 * - PDF export for Pairings, Standings, and Results
 */

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { Tournament, GameResult, Player } from './types/tournament';
import { generateRoundPairings } from './engine/fideSwissEngine';
import { calculateStandings } from './engine/tiebreakers';
import { auth, googleProvider } from './services/firebase';
import {
  saveTournamentToFirestore,
  listUserTournaments,
  deleteTournamentFromFirestore,
  syncUserProfile,
  subscribeToTournament,
  getAllKnownTournaments,
  saveToAllKnownTournaments,
  getTournamentById,
} from './services/tournamentFirestore';
import { Sidebar } from './components/Sidebar';
import { Menu, Sun, Moon, Share2, Check } from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import { calculateFormatTotalRounds } from './engine/formatPairings';
import { PairingsView } from './components/PairingsView';
import { StandingsTable } from './components/StandingsTable';
import { CrossTableView } from './components/CrossTableView';
import { PlayerManager } from './components/PlayerManager';
import { NewTournamentModal } from './components/NewTournamentModal';
import { ExportImportModal } from './components/ExportImportModal';
import { UserTournamentsModal } from './components/UserTournamentsModal';
import { ParticipantSearchModal } from './components/ParticipantSearchModal';
import { ShareAccessModal } from './components/ShareAccessModal';
import { AuthPage } from './components/AuthPage';
import { PendingApprovalView } from './components/PendingApprovalView';
import { AdminPortalModal } from './components/AdminPortalModal';
import { getDirectorStatus, isSuperAdmin } from './services/adminService';

const STORAGE_KEY = 'en_passant_chess_tournament_v4';
const PARTICIPANT_KEY = 'en_passant_participant_mode';

function createDefaultTournament(): Tournament {
  return {
    id: `tourney-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: 'Tournament',
    format: 'swiss',
    roundsTotal: 5,
    currentRoundNumber: 1,
    players: [],
    rounds: [],
    round1TopSeedColor: 'W',
    status: 'setup',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    allowedEmails: [],
    isPublic: true,
  };
}

function createDefaultTournamentForUser(
  userId?: string,
  userEmail?: string | null,
  userName?: string | null
): Tournament {
  const freshId = `tourney-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: freshId,
    name: userName ? `${userName}'s Tournament` : 'FIDE Swiss Championship',
    format: 'swiss',
    roundsTotal: 5,
    currentRoundNumber: 1,
    players: [],
    rounds: [],
    round1TopSeedColor: 'W',
    status: 'setup',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ownerId: userId,
    ownerEmail: userEmail || undefined,
    ownerName: userName || undefined,
    allowedEmails: [],
    isPublic: true,
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [userTournaments, setUserTournaments] = useState<Tournament[]>([]);
  const [showUserTournamentsModal, setShowUserTournamentsModal] = useState<boolean>(false);
  const [showParticipantSearch, setShowParticipantSearch] = useState<boolean>(false);
  const [showShareAccessModal, setShowShareAccessModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Participant mode (no credentials required)
  const [isParticipant, setIsParticipant] = useState<boolean>(() => {
    return localStorage.getItem(PARTICIPANT_KEY) === 'true';
  });

  // Tournament state (clean default, supports instant URL deep-linking)
  const [tournament, setTournament] = useState<Tournament>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get('t') || params.get('tournament');
        if (urlId) {
          const cached = localStorage.getItem(`en_passant_tourney_${urlId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id) return parsed;
          }
          const all = getAllKnownTournaments();
          const match = all.find((t) => t.id === urlId);
          if (match) return match;
        }
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.name) {
          return {
            ...createDefaultTournament(),
            ...parsed,
          };
        }
      }
      const allKnown = getAllKnownTournaments();
      if (allKnown.length > 0) {
        return allKnown[0];
      }
    } catch (e) {
      console.error('Failed to load tournament from localStorage', e);
    }
    return createDefaultTournament();
  });

  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number>(() => {
    return tournament.currentRoundNumber || (tournament.rounds.length > 0 ? tournament.rounds.length : 1);
  });

  const [activeTab, setActiveTab] = useState<'pairings' | 'standings' | 'crosstable' | 'players'>('pairings');
  const [showNewTourneyModal, setShowNewTourneyModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showAdminPortalModal, setShowAdminPortalModal] = useState<boolean>(false);
  const [directorStatus, setDirectorStatus] = useState<'approved' | 'pending' | 'rejected' | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Hidden Side Navigation Bar states (Linear / Notion / Lichess style)
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('en_passant_sidebar_open') === 'true';
    } catch {
      return false;
    }
  });

  const [isSidebarPinned, setIsSidebarPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('en_passant_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('en_passant_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  const handleSetPinned = (pinned: boolean) => {
    setIsSidebarPinned(pinned);
    try {
      localStorage.setItem('en_passant_sidebar_pinned', String(pinned));
    } catch {}
  };

  // Keyboard shortcut: Cmd+B / Ctrl+B to toggle hidden side navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const { theme, toggleTheme } = useTheme();

  const handleCopyLiveLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?t=${tournament.id}` : '';
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      showNotification('Copied live tournament link to clipboard!');
    }
  };

  const isInitialLoadRef = useRef(true);
  const prevRoundsCountRef = useRef(tournament.rounds.length);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tournamentRef = useRef(tournament);
  tournamentRef.current = tournament;

  // Mount effect: load tournament from cloud if referenced in URL and not locally cached
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('t') || params.get('tournament');
    if (urlId && urlId !== tournament.id) {
      getTournamentById(urlId)
        .then((fetched) => {
          if (fetched && fetched.id) {
            setTournament(fetched);
            setSelectedRoundNumber(fetched.currentRoundNumber || (fetched.rounds.length > 0 ? fetched.rounds.length : 1));
            setIsParticipant(true);
            localStorage.setItem(PARTICIPANT_KEY, 'true');
            saveToAllKnownTournaments(fetched);
          }
        })
        .catch(console.warn);
    }
  }, []);

  // Sync active tournament ID to browser URL so it can be shared instantly
  useEffect(() => {
    if (tournament?.id && typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        if (
          url.searchParams.get('t') !== tournament.id &&
          !window.location.pathname.includes('login') &&
          !window.location.pathname.includes('signup')
        ) {
          url.searchParams.set('t', tournament.id);
          window.history.replaceState(null, '', url.toString());
        }
      } catch {}
    }
  }, [tournament.id]);

  // Access Control / RBAC:
  // Can edit: Super Admin (shivgoyal0307@gmail.com) OR Creator of tournament OR email in allowedEmails
  const canEdit = Boolean(
    currentUser &&
      (directorStatus === 'approved' || isSuperAdmin(currentUser.email)) &&
      tournament &&
      (
        isSuperAdmin(currentUser.email) ||
        tournament.ownerId === currentUser.uid ||
        (currentUser.email && tournament.ownerEmail && tournament.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.email && tournament.allowedEmails?.map((e) => e.toLowerCase()).includes(currentUser.email.toLowerCase())) ||
        !tournament.ownerId ||
        tournament.ownerId === 'anonymous' ||
        tournament.ownerId === 'local_user'
      )
  );

  const isCreator = Boolean(
    currentUser &&
      tournament &&
      (
        isSuperAdmin(currentUser.email) ||
        tournament.ownerId === currentUser.uid ||
        (currentUser.email && tournament.ownerEmail && tournament.ownerEmail.toLowerCase() === currentUser.email.toLowerCase())
      )
  );

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);

      if (user) {
        // Authenticated: exit participant mode
        setIsParticipant(false);
        localStorage.removeItem(PARTICIPANT_KEY);
        syncUserProfile(user).catch(console.error);

        // Verify Director approval status
        const status = await getDirectorStatus(user);
        setDirectorStatus(status);

        if (status !== 'approved' && !isSuperAdmin(user.email)) {
          setIsSyncing(false);
          isInitialLoadRef.current = false;
          return;
        }

        try {
          setIsSyncing(true);
          const cloudTournaments = await listUserTournaments(user.uid, user.email);
          const allKnown = getAllKnownTournaments();
          
          // Merge local and cloud tournaments without losing any
          const mergedMap = new Map<string, Tournament>();
          allKnown.forEach((t) => {
            if (t && t.id) mergedMap.set(t.id, t);
          });
          cloudTournaments.forEach((t) => {
            if (t && t.id) {
              const existing = mergedMap.get(t.id);
              if (!existing || (t.updatedAt || 0) >= (existing.updatedAt || 0)) {
                mergedMap.set(t.id, t);
              }
            }
          });
          const combined = Array.from(mergedMap.values());
          combined.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

          setUserTournaments(combined);

          if (combined.length > 0) {
            const lastActiveId = localStorage.getItem(`en_passant_user_active_${user.uid}`);
            const match =
              combined.find((t) => t.id === lastActiveId) ||
              combined.find((t) => t.id === tournament?.id) ||
              combined[0];

            setTournament(match);
            setSelectedRoundNumber(match.currentRoundNumber || match.rounds.length || 1);
            localStorage.setItem(`en_passant_user_active_${user.uid}`, match.id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(match));
            saveToAllKnownTournaments(match);
          } else {
            // Brand new user with 0 tournaments: create initial isolated tournament
            const initialTourney = createDefaultTournamentForUser(user.uid, user.email, user.displayName);
            setTournament(initialTourney);
            setSelectedRoundNumber(1);
            localStorage.setItem(`en_passant_user_active_${user.uid}`, initialTourney.id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initialTourney));
            saveToAllKnownTournaments(initialTourney);
            saveTournamentToFirestore(user.uid, initialTourney, user.email, user.displayName).catch(console.warn);
            setUserTournaments([initialTourney]);
          }
        } catch (err) {
          console.error('Error fetching user cloud tournaments:', err);
        } finally {
          setIsSyncing(false);
          isInitialLoadRef.current = false;
        }
      } else {
        // User logged out: preserve current state and all known tournaments in memory & storage
        const allKnown = getAllKnownTournaments();
        setUserTournaments(allKnown);
        setDirectorStatus(null);
        isInitialLoadRef.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper to instantly save and sync tournament changes without debounce
  const syncTournamentImmediate = async (updatedTournament: Tournament) => {
    try {
      localStorage.setItem(`en_passant_tourney_${updatedTournament.id}`, JSON.stringify(updatedTournament));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTournament));
      saveToAllKnownTournaments(updatedTournament);
      if (currentUser) {
        localStorage.setItem(`en_passant_user_active_${currentUser.uid}`, updatedTournament.id);
      }
    } catch (e) {
      console.error('Failed to save to local cache:', e);
    }

    if (currentUser && canEdit) {
      try {
        setIsSyncing(true);
        await saveTournamentToFirestore(currentUser.uid, updatedTournament, currentUser.email, currentUser.displayName);
        setUserTournaments((prev) => {
          const index = prev.findIndex((t) => t.id === updatedTournament.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedTournament;
            return next.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          }
          return [updatedTournament, ...prev];
        });
      } catch (err) {
        console.error('Error syncing tournament to Firestore:', err);
      } finally {
        setTimeout(() => setIsSyncing(false), 200);
      }
    }
  };

  // Real-time live subscription to current tournament
  // Provides instantaneous updates across all participants, arbiters, and spectators
  useEffect(() => {
    if (!tournament?.id) return;
    const unsub = subscribeToTournament(
      tournament.id,
      (updated, hasPendingWrites) => {
        // If snapshot originated from local write on this client that has not completed yet, skip
        if (hasPendingWrites) return;

        const currentLocal = tournamentRef.current;
        const cloudTime = updated.updatedAt || 0;
        const localTime = currentLocal.updatedAt || 0;

        const hasDifferentRounds =
          JSON.stringify(updated.rounds) !== JSON.stringify(currentLocal.rounds);
        const hasDifferentStatus = updated.status !== currentLocal.status;
        const hasDifferentPlayers = updated.players.length !== currentLocal.players.length;

        // Apply update whenever cloud is newer OR rounds/games/status differ
        if (cloudTime >= localTime || hasDifferentRounds || hasDifferentStatus || hasDifferentPlayers) {
          setTournament(updated);
          try {
            localStorage.setItem(`en_passant_tourney_${updated.id}`, JSON.stringify(updated));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            saveToAllKnownTournaments(updated);
          } catch {}

          setUserTournaments((prev) => {
            const index = prev.findIndex((t) => t.id === updated.id);
            if (index >= 0) {
              const next = [...prev];
              next[index] = updated;
              return next.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            }
            return [updated, ...prev];
          });

          // Only auto-advance round viewer if a brand new round was actually paired
          const newRoundsCount = updated.rounds?.length || 0;
          if (newRoundsCount > prevRoundsCountRef.current) {
            setSelectedRoundNumber(newRoundsCount);
            prevRoundsCountRef.current = newRoundsCount;
          } else {
            setSelectedRoundNumber((curr) => {
              if (newRoundsCount > 0 && curr > newRoundsCount) {
                return newRoundsCount;
              }
              return curr;
            });
          }
        }
      },
      (err) => console.warn('Live subscription notice:', err.message)
    );
    return () => unsub();
  }, [tournament.id]);

  // Save tournament to localStorage and Firestore (Only if user has edit permissions)
  useEffect(() => {
    if (tournament?.id) {
      try {
        localStorage.setItem(`en_passant_tourney_${tournament.id}`, JSON.stringify(tournament));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
        saveToAllKnownTournaments(tournament);
        if (currentUser) {
          localStorage.setItem(`en_passant_user_active_${currentUser.uid}`, tournament.id);
        }
      } catch (e) {
        console.error('Failed to save tournament to localStorage', e);
      }
    }

    if (currentUser && canEdit && !isInitialLoadRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Rapid 150ms debounce for near-instantaneous live Firestore updates
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          setIsSyncing(true);
          await saveTournamentToFirestore(currentUser.uid, tournament, currentUser.email, currentUser.displayName);
          setUserTournaments((prev) => {
            const index = prev.findIndex((t) => t.id === tournament.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = tournament;
              return updated.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            }
            return [tournament, ...prev];
          });
        } catch (err) {
          console.error('Error syncing tournament to Firestore:', err);
        } finally {
          setTimeout(() => setIsSyncing(false), 300);
        }
      }, 150);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [tournament, currentUser, canEdit]);

  const handleSelectRound = (roundNum: number) => {
    setSelectedRoundNumber(roundNum);
    if (canEdit) {
      setTournament((prev) => {
        if (prev.currentRoundNumber === roundNum) return prev;
        return {
          ...prev,
          currentRoundNumber: roundNum,
          updatedAt: Date.now(),
        };
      });
    }
  };

  useEffect(() => {
    if (tournament.rounds.length > 0 && selectedRoundNumber > tournament.rounds.length) {
      setSelectedRoundNumber(tournament.rounds.length);
    }
  }, [tournament.rounds.length, selectedRoundNumber]);

  const standings = calculateStandings(
    tournament.players,
    tournament.rounds,
    tournament.roundsTotal
  );

  const showNotification = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => setBannerMessage(null), 3500);
  };

  // Google Sign In
  const handleSignInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setIsParticipant(false);
      localStorage.removeItem(PARTICIPANT_KEY);
      showNotification('Signed in as Arbiter. Tournaments synced.');
      try {
        window.history.pushState(null, '', '/');
      } catch {}
    } catch (err: any) {
      console.error('Sign in error:', err);
      throw err;
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      if (tournament?.id) {
        localStorage.setItem(`en_passant_tourney_${tournament.id}`, JSON.stringify(tournament));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tournament));
        saveToAllKnownTournaments(tournament);
      }
      await signOut(auth);
      const all = getAllKnownTournaments();
      setUserTournaments(all);
      setIsParticipant(false);
      localStorage.removeItem(PARTICIPANT_KEY);
      try {
        window.history.pushState(null, '', '/login');
      } catch {}
      showNotification('Signed out.');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Participant entry (No password required)
  const handleEnterAsParticipant = () => {
    setIsParticipant(true);
    localStorage.setItem(PARTICIPANT_KEY, 'true');
    setShowParticipantSearch(true);
    setActiveTab('pairings');
  };

  // Start Tournament / Generate Round 1 (Guarded by canEdit)
  const handleStartTournament = () => {
    if (!canEdit) {
      alert('You do not have arbiter permissions to start this tournament.');
      return;
    }

    try {
      const activePlayers = tournament.players.filter((p) => p.active);
      if (activePlayers.length < 2) {
        alert('Need at least 2 active players to start a tournament.');
        setActiveTab('players');
        return;
      }

      // For Knockout and Round Robin, total rounds depend on active player count
      const computedRoundsTotal =
        tournament.format === 'round_robin' || tournament.format === 'knockout'
          ? calculateFormatTotalRounds(tournament.format, activePlayers.length, tournament.roundsTotal)
          : tournament.roundsTotal;

      const tournamentForPairing = {
        ...tournament,
        roundsTotal: computedRoundsTotal,
      };

      const round1Games = generateRoundPairings(1, tournamentForPairing);
      const newRound = {
        roundNumber: 1,
        games: round1Games,
        isCompleted: false,
        createdAt: Date.now(),
      };
      const nextTournament: Tournament = {
        ...tournament,
        roundsTotal: computedRoundsTotal,
        rounds: [newRound],
        currentRoundNumber: 1,
        status: 'in_progress',
        updatedAt: Date.now(),
      };
      setTournament(nextTournament);
      syncTournamentImmediate(nextTournament);
      setSelectedRoundNumber(1);
      setActiveTab('pairings');
      showNotification('Round 1 pairings generated.');
    } catch (err: any) {
      alert(`Pairing error: ${err.message}`);
    }
  };

  // Record result (Guarded by canEdit & locked round rule)
  const handleRecordResult = (roundNum: number, gameId: string, result: GameResult | null) => {
    if (!canEdit) {
      alert('Only tournament creators and allowed arbiters can enter results.');
      return;
    }

    // Previous round locked rule
    if (roundNum < tournament.rounds.length) {
      alert(`Round ${roundNum} is locked. Previous rounds cannot be changed once next rounds have started.`);
      return;
    }

    const nextRounds = tournament.rounds.map((round) => {
      if (round.roundNumber !== roundNum) return round;

      const nextGames = round.games.map((game) => {
        if (game.id !== gameId) return game;
        return { ...game, result };
      });

      const isCompleted = nextGames.every((g) => g.result !== null);
      return { ...round, games: nextGames, isCompleted };
    });

    const isTournamentFinished =
      nextRounds.length === tournament.roundsTotal &&
      nextRounds.every((r) => r.isCompleted);

    const nextTournament: Tournament = {
      ...tournament,
      rounds: nextRounds,
      currentRoundNumber: roundNum,
      status: isTournamentFinished ? 'finished' : tournament.status,
      updatedAt: Date.now(),
    };

    setTournament(nextTournament);
    // Instant Firestore sync without debounce for real-time responsiveness
    syncTournamentImmediate(nextTournament);
  };

  // Generate Next Round Pairings (Guarded by canEdit)
  const handleGenerateNextRound = () => {
    if (!canEdit) {
      alert('Only tournament creators and allowed arbiters can pair rounds.');
      return;
    }

    try {
      const nextRoundNum = tournament.rounds.length + 1;
      if (nextRoundNum > tournament.roundsTotal) {
        showNotification('All tournament rounds have already been completed!');
        return;
      }

      const current = tournament.rounds[tournament.rounds.length - 1];
      if (current && !current.games.every((g) => g.result !== null)) {
        alert('Please enter results for all games in the current round before generating the next round.');
        return;
      }

      const nextGames = generateRoundPairings(nextRoundNum, tournament);
      const newRound = {
        roundNumber: nextRoundNum,
        games: nextGames,
        isCompleted: false,
        createdAt: Date.now(),
      };

      const nextTournament: Tournament = {
        ...tournament,
        rounds: [...tournament.rounds, newRound],
        currentRoundNumber: nextRoundNum,
        updatedAt: Date.now(),
      };

      setTournament(nextTournament);
      syncTournamentImmediate(nextTournament);
      setSelectedRoundNumber(nextRoundNum);
      showNotification(`Round ${nextRoundNum} pairings generated.`);
    } catch (err: any) {
      alert(`Pairing error: ${err.message}`);
    }
  };

  // Undo Last Round (Guarded by canEdit)
  const handleUndoRound = (roundNum: number) => {
    if (!canEdit) {
      alert('Only tournament creators and allowed arbiters can undo rounds.');
      return;
    }

    if (confirm(`Are you sure you want to delete Round ${roundNum} pairings and results?`)) {
      const nextRounds = tournament.rounds.filter((r) => r.roundNumber !== roundNum);
      const newCurrRound = Math.max(1, nextRounds.length);
      const nextTournament: Tournament = {
        ...tournament,
        rounds: nextRounds,
        currentRoundNumber: newCurrRound,
        status: nextRounds.length === 0 ? 'setup' : 'in_progress',
        updatedAt: Date.now(),
      };

      setTournament(nextTournament);
      syncTournamentImmediate(nextTournament);
      setSelectedRoundNumber(Math.max(1, roundNum - 1));
      showNotification(`Round ${roundNum} undone.`);
    }
  };

  const handleUpdatePlayers = (newPlayers: Player[]) => {
    if (!canEdit) {
      alert('Only tournament creators and allowed arbiters can modify the player roster.');
      return;
    }
    setTournament((prev) => {
      let roundsTotal = prev.roundsTotal;
      if (prev.format === 'round_robin' || prev.format === 'knockout') {
        const activeCount = newPlayers.filter((p) => p.active).length;
        roundsTotal = calculateFormatTotalRounds(prev.format, activeCount, prev.roundsTotal);
      }
      return {
        ...prev,
        players: newPlayers,
        roundsTotal,
        updatedAt: Date.now(),
      };
    });
  };

  const handleUpdateAllowedEmails = (newAllowed: string[]) => {
    setTournament((prev) => ({
      ...prev,
      allowedEmails: newAllowed,
      updatedAt: Date.now(),
    }));
    showNotification(`Updated arbiter permissions (${newAllowed.length} allowed).`);
  };

  const handleSelectTournament = (selected: Tournament) => {
    let roundsTotal = selected.roundsTotal;
    if (selected.format === 'round_robin' || selected.format === 'knockout') {
      const activeCount = selected.players.filter((p) => p.active).length;
      roundsTotal = calculateFormatTotalRounds(selected.format, activeCount, selected.roundsTotal);
    }
    const synced = { ...selected, roundsTotal };
    setTournament(synced);
    setSelectedRoundNumber(synced.currentRoundNumber || synced.rounds.length || 1);
    setActiveTab('pairings');
    if (currentUser) {
      localStorage.setItem(`en_passant_user_active_${currentUser.uid}`, synced.id);
    }
    showNotification(`Opened: ${synced.name}`);
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (currentUser) {
      try {
        await deleteTournamentFromFirestore(currentUser.uid, tournamentId, currentUser.email);
        const remaining = userTournaments.filter((t) => t.id !== tournamentId);
        setUserTournaments(remaining);
        if (tournament.id === tournamentId) {
          if (remaining.length > 0) {
            setTournament(remaining[0]);
            setSelectedRoundNumber(remaining[0].currentRoundNumber || 1);
            localStorage.setItem(`en_passant_user_active_${currentUser.uid}`, remaining[0].id);
          } else {
            const fresh = createDefaultTournamentForUser(currentUser.uid, currentUser.email, currentUser.displayName);
            setTournament(fresh);
            setSelectedRoundNumber(1);
            setUserTournaments([fresh]);
            localStorage.setItem(`en_passant_user_active_${currentUser.uid}`, fresh.id);
            await saveTournamentToFirestore(currentUser.uid, fresh, currentUser.email, currentUser.displayName);
          }
        }
        showNotification('Tournament deleted.');
      } catch (err: any) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  };

  // ==========================================
  // GATEWAY RENDER: /login or /signup
  // When not authenticated and not in participant mode
  // ==========================================
  if (!currentUser && !isParticipant) {
    const isSignup = typeof window !== 'undefined' && window.location.pathname.includes('signup');
    const isPart = typeof window !== 'undefined' && window.location.pathname.includes('participant');

    return (
      <AuthPage
        onSignInWithGoogle={handleSignInWithGoogle}
        onEnterAsParticipant={handleEnterAsParticipant}
        onSelectTournament={(t) => {
          setTournament(t);
          setSelectedRoundNumber(t.currentRoundNumber || (t.rounds.length > 0 ? t.rounds.length : 1));
          setIsParticipant(true);
          localStorage.setItem(PARTICIPANT_KEY, 'true');
          localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
          saveToAllKnownTournaments(t);
        }}
        initialMode={isSignup ? 'signup' : isPart ? 'participant' : 'login'}
      />
    );
  }

  // ==========================================
  // PENDING DIRECTOR APPROVAL RENDER
  // Requires confirmation by Super Admin (shivgoyal0307@gmail.com)
  // ==========================================
  if (currentUser && directorStatus === 'pending' && !isParticipant && !isSuperAdmin(currentUser.email)) {
    return (
      <PendingApprovalView
        userEmail={currentUser.email}
        onCheckStatus={async () => {
          const status = await getDirectorStatus(currentUser);
          setDirectorStatus(status);
          if (status === 'approved') {
            showNotification('Your Director access has been approved! Welcome.');
          }
        }}
        onContinueAsParticipant={handleEnterAsParticipant}
        onSignOut={handleSignOut}
      />
    );
  }

  // ==========================================
  // MAIN WORKSPACE
  // ==========================================
  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans selection:bg-[#4b4e6d] selection:text-white transition-colors">
      {/* Hidden Side Navigation Bar */}
      <Sidebar
        tournament={tournament}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isPinned={isSidebarPinned}
        setIsPinned={handleSetPinned}
        onNewTournament={() => setShowNewTourneyModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenUserTournaments={() => setShowUserTournamentsModal(true)}
        onOpenParticipantSearch={() => setShowParticipantSearch(true)}
        onOpenShareAccess={() => setShowShareAccessModal(true)}
        onOpenAdminPortal={() => setShowAdminPortalModal(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onSwitchToDirectorLogin={() => {
          setIsParticipant(false);
          localStorage.removeItem(PARTICIPANT_KEY);
        }}
        canEdit={canEdit}
        isParticipant={isParticipant || (!canEdit && !currentUser)}
        isSyncing={isSyncing}
      />

      {/* Main Workspace Frame (Responsive to Pinned Sidebar) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ease-out ${
          isSidebarPinned && isSidebarOpen ? 'lg:pl-72' : ''
        }`}
      >
        {/* Floating Menu Button (Top navigation bar removed; accessible when sidebar is unpinned or closed) */}
        {(!isSidebarPinned || !isSidebarOpen) && (
          <div className="fixed top-4 left-4 sm:top-5 sm:left-5 z-30 flex items-center gap-2">
            <button
              onClick={handleToggleSidebar}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/95 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 shadow-md backdrop-blur-md transition-all text-xs font-semibold cursor-pointer"
              title="Open Navigation Menu (⌘+B)"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4 text-[#84dcc6]" />
              <span className="font-bold text-white truncate max-w-[140px] sm:max-w-[220px]">
                {tournament.name}
              </span>
              <span className="hidden sm:inline text-[10px] font-mono text-neutral-400 bg-neutral-800/80 px-1.5 py-0.5 rounded">
                ⌘B
              </span>
            </button>
          </div>
        )}

        {/* Floating Top-Right Controls (Quick Theme Switch & Share Live) */}
        <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-30 flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-neutral-900/95 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 shadow-md backdrop-blur-md transition-all cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle Light / Dark theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-[#4b4e6d]" />
            )}
          </button>
          <button
            onClick={handleCopyLiveLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900/95 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 shadow-md backdrop-blur-md transition-all text-xs font-medium cursor-pointer"
            title="Copy real-time live link to share"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500 font-semibold text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[#84dcc6]" />
                <span className="hidden sm:inline text-[11px]">Share</span>
              </>
            )}
          </button>
        </div>

        {/* Floating Toast Notification */}
        {bannerMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-neutral-700 shadow-2xl py-2 px-3.5 rounded-xl text-xs font-semibold text-white transition-all animate-in fade-in slide-in-from-bottom-2">
            {bannerMessage}
          </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 pb-16 ${!isSidebarPinned || !isSidebarOpen ? 'pt-16 sm:pt-20' : 'pt-6 sm:pt-8'}`}>
          {activeTab === 'pairings' && (
            <PairingsView
              tournament={tournament}
              selectedRoundNumber={selectedRoundNumber}
              setSelectedRoundNumber={handleSelectRound}
              onRecordResult={handleRecordResult}
              onGenerateNextRound={handleGenerateNextRound}
              onUndoRound={handleUndoRound}
              onStartTournament={handleStartTournament}
              isReadOnly={!canEdit}
              standings={standings}
            />
          )}

          {activeTab === 'standings' && (
            <StandingsTable
              standings={standings}
              totalRounds={tournament.roundsTotal}
              tournament={tournament}
            />
          )}

          {activeTab === 'crosstable' && (
            <CrossTableView tournament={tournament} standings={standings} />
          )}

          {activeTab === 'players' && (
            <PlayerManager
              tournament={tournament}
              onUpdatePlayers={handleUpdatePlayers}
              isReadOnly={!canEdit}
            />
          )}
        </main>
      </div>

      {/* Participant Search Modal */}
      {showParticipantSearch && (
        <ParticipantSearchModal
          onSelectTournament={(t) => {
            handleSelectTournament(t);
            setShowParticipantSearch(false);
          }}
          onClose={() => setShowParticipantSearch(false)}
          currentTournamentId={tournament.id}
        />
      )}

      {/* Share Access & Allowed Arbiter Emails Modal */}
      {showShareAccessModal && (
        <ShareAccessModal
          tournament={tournament}
          currentEmail={currentUser?.email || null}
          isCreator={isCreator}
          onUpdateAllowedEmails={handleUpdateAllowedEmails}
          onClose={() => setShowShareAccessModal(false)}
        />
      )}

      {/* New Tournament Creation Modal */}
      {showNewTourneyModal && (
        <NewTournamentModal
          currentUserEmail={currentUser?.email}
          currentUserName={currentUser?.displayName}
          onCreate={async (t) => {
            const freshId = `tourney-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            const tourneyWithOwner: Tournament = {
              ...t,
              id: freshId,
              ownerId: currentUser?.uid,
              ownerEmail: currentUser?.email || undefined,
              ownerName: currentUser?.displayName || undefined,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setTournament(tourneyWithOwner);
            setSelectedRoundNumber(1);
            setActiveTab('players');
            // Safely keep all previous tournaments in state
            setUserTournaments((prev) => [tourneyWithOwner, ...prev.filter((item) => item.id !== freshId)]);
            saveToAllKnownTournaments(tourneyWithOwner);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tourneyWithOwner));
            const activeUid = currentUser?.uid || 'local_user';
            localStorage.setItem(`en_passant_user_active_${activeUid}`, freshId);
            await saveTournamentToFirestore(
              activeUid,
              tourneyWithOwner,
              currentUser?.email,
              currentUser?.displayName
            );
            showNotification(`Created tournament: ${t.name}`);
          }}
          onClose={() => setShowNewTourneyModal(false)}
        />
      )}

      {/* Saved Cloud Tournaments Modal */}
      {showUserTournamentsModal && (
        <UserTournamentsModal
          tournaments={userTournaments}
          currentTournamentId={tournament.id}
          onSelectTournament={handleSelectTournament}
          onDeleteTournament={handleDeleteTournament}
          onNewTournament={() => setShowNewTourneyModal(true)}
          onClose={() => setShowUserTournamentsModal(false)}
          userEmail={currentUser?.email}
        />
      )}

      {/* Export, Print & PDF Modal */}
      {showExportModal && (
        <ExportImportModal
          tournament={tournament}
          standings={standings}
          onImportTournament={(t) => {
            if (!canEdit) {
              alert('Only tournament arbiters can import or restore data.');
              return;
            }
            setTournament(t);
            setSelectedRoundNumber(t.currentRoundNumber || (t.rounds.length > 0 ? t.rounds.length : 1));
            showNotification(`Imported: ${t.name}`);
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Super Admin Portal Modal (shivgoyal0307@gmail.com) */}
      {showAdminPortalModal && (
        <AdminPortalModal
          onClose={() => setShowAdminPortalModal(false)}
          currentUserEmail={currentUser?.email}
          onShowNotification={showNotification}
        />
      )}
    </div>
  );
}
