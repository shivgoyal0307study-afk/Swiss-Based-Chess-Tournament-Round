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
} from './services/tournamentFirestore';
import { Header } from './components/Header';
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

  // Tournament state (clean default, no hardcoded sample players)
  const [tournament, setTournament] = useState<Tournament>(() => {
    try {
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
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const isInitialLoadRef = useRef(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Access Control / RBAC:
  // Can edit: Creator of tournament OR email in allowedEmails
  const canEdit = Boolean(
    currentUser &&
      tournament &&
      (
        tournament.ownerId === currentUser.uid ||
        (currentUser.email && tournament.ownerEmail && tournament.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        (currentUser.email && tournament.allowedEmails?.map((e) => e.toLowerCase()).includes(currentUser.email.toLowerCase()))
      )
  );

  const isCreator = Boolean(
    currentUser &&
      tournament &&
      (
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
        // Authenticated as arbiter: exit participant mode
        setIsParticipant(false);
        localStorage.removeItem(PARTICIPANT_KEY);
        syncUserProfile(user).catch(console.error);

        try {
          setIsSyncing(true);
          const cloudTournaments = await listUserTournaments(user.uid, user.email);
          setUserTournaments(cloudTournaments);

          if (cloudTournaments.length > 0) {
            const lastActiveId = localStorage.getItem(`en_passant_user_active_${user.uid}`);
            const match =
              cloudTournaments.find((t) => t.id === lastActiveId) ||
              cloudTournaments.find((t) => t.id === tournament.id) ||
              cloudTournaments[0];

            setTournament(match);
            setSelectedRoundNumber(match.currentRoundNumber || match.rounds.length || 1);
            localStorage.setItem(`en_passant_user_active_${user.uid}`, match.id);
          } else {
            // First time this arbiter logs in: create a fresh, strictly isolated tournament
            const initialTourney = createDefaultTournamentForUser(user.uid, user.email, user.displayName);
            setTournament(initialTourney);
            setSelectedRoundNumber(1);
            localStorage.setItem(`en_passant_user_active_${user.uid}`, initialTourney.id);
            await saveTournamentToFirestore(user.uid, initialTourney, user.email, user.displayName);
            setUserTournaments([initialTourney]);
          }
        } catch (err) {
          console.error('Error fetching user cloud tournaments:', err);
        } finally {
          setIsSyncing(false);
          isInitialLoadRef.current = false;
        }
      } else {
        setUserTournaments([]);
        isInitialLoadRef.current = false;
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time live subscription to current tournament for participant live updates
  useEffect(() => {
    if (!tournament?.id) return;
    const unsub = subscribeToTournament(
      tournament.id,
      (updated) => {
        // Only adopt changes from cloud if user is NOT currently in the middle of editing local changes
        if (!canEdit || isParticipant) {
          setTournament(updated);
          if (updated.rounds.length > 0 && selectedRoundNumber > updated.rounds.length) {
            setSelectedRoundNumber(updated.rounds.length);
          }
        }
      },
      (err) => console.warn('Live subscription notice:', err.message)
    );
    return () => unsub();
  }, [tournament.id, canEdit, isParticipant]);

  // Save tournament to localStorage and Firestore (Only if user has edit permissions)
  useEffect(() => {
    if (tournament?.id) {
      try {
        localStorage.setItem(`en_passant_tourney_${tournament.id}`, JSON.stringify(tournament));
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
          setTimeout(() => setIsSyncing(false), 500);
        }
      }, 600);
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
      await signOut(auth);
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
      const round1Games = generateRoundPairings(1, tournament);
      const newRound = {
        roundNumber: 1,
        games: round1Games,
        isCompleted: false,
        createdAt: Date.now(),
      };
      setTournament((prev) => ({
        ...prev,
        rounds: [newRound],
        currentRoundNumber: 1,
        status: 'in_progress',
        updatedAt: Date.now(),
      }));
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

    setTournament((prev) => {
      const nextRounds = prev.rounds.map((round) => {
        if (round.roundNumber !== roundNum) return round;

        const nextGames = round.games.map((game) => {
          if (game.id !== gameId) return game;
          return { ...game, result };
        });

        const isCompleted = nextGames.every((g) => g.result !== null);
        return { ...round, games: nextGames, isCompleted };
      });

      const isTournamentFinished =
        nextRounds.length === prev.roundsTotal &&
        nextRounds.every((r) => r.isCompleted);

      return {
        ...prev,
        rounds: nextRounds,
        currentRoundNumber: roundNum,
        status: isTournamentFinished ? 'finished' : prev.status,
        updatedAt: Date.now(),
      };
    });
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

      setTournament((prev) => ({
        ...prev,
        rounds: [...prev.rounds, newRound],
        currentRoundNumber: nextRoundNum,
        updatedAt: Date.now(),
      }));
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
      setTournament((prev) => {
        const nextRounds = prev.rounds.filter((r) => r.roundNumber !== roundNum);
        const newCurrRound = Math.max(1, nextRounds.length);
        return {
          ...prev,
          rounds: nextRounds,
          currentRoundNumber: newCurrRound,
          status: 'in_progress',
          updatedAt: Date.now(),
        };
      });
      setSelectedRoundNumber(Math.max(1, roundNum - 1));
      showNotification(`Round ${roundNum} undone.`);
    }
  };

  const handleUpdatePlayers = (newPlayers: Player[]) => {
    if (!canEdit) {
      alert('Only tournament creators and allowed arbiters can modify the player roster.');
      return;
    }
    setTournament((prev) => ({
      ...prev,
      players: newPlayers,
      updatedAt: Date.now(),
    }));
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
    setTournament(selected);
    setSelectedRoundNumber(selected.currentRoundNumber || selected.rounds.length || 1);
    setActiveTab('pairings');
    if (currentUser) {
      localStorage.setItem(`en_passant_user_active_${currentUser.uid}`, selected.id);
    }
    showNotification(`Opened: ${selected.name}`);
  };

  const handleDeleteTournament = async (tournamentId: string) => {
    if (currentUser) {
      try {
        await deleteTournamentFromFirestore(currentUser.uid, tournamentId);
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
        initialMode={isSignup ? 'signup' : isPart ? 'participant' : 'login'}
      />
    );
  }

  // ==========================================
  // MAIN WORKSPACE
  // ==========================================
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Top Header */}
      <Header
        tournament={tournament}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewTournament={() => setShowNewTourneyModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenUserTournaments={() => setShowUserTournamentsModal(true)}
        isSyncing={isSyncing}
        canEdit={canEdit}
        isParticipant={isParticipant || (!canEdit && !currentUser)}
        onOpenParticipantSearch={() => setShowParticipantSearch(true)}
        onOpenShareAccess={() => setShowShareAccessModal(true)}
        onSwitchToDirectorLogin={() => {
          setIsParticipant(false);
          localStorage.removeItem(PARTICIPANT_KEY);
        }}
      />

      {/* Notification Banner */}
      {bannerMessage && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-4 text-center text-xs font-semibold text-amber-300 transition-all">
          {bannerMessage}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
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
            if (currentUser) {
              localStorage.setItem(`en_passant_user_active_${currentUser.uid}`, freshId);
              await saveTournamentToFirestore(
                currentUser.uid,
                tourneyWithOwner,
                currentUser.email,
                currentUser.displayName
              );
            }
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
    </div>
  );
}
