/**
 * En Passant — Navigation Header
 * Minimalist Black & White UI
 * Features: Role-aware controls (Arbiter vs Participant),
 * Super Admin Portal shortcut for shivgoyal0307@gmail.com,
 * Access Sharing / Collaborators management, and Participant Search.
 */

import React from 'react';
import {
  Trophy,
  Users,
  GitBranch,
  Table,
  FolderOpen,
  Cloud,
  LogOut,
  Plus,
  Share2,
  ShieldCheck,
  Search,
  Eye,
  LogIn,
} from 'lucide-react';
import { Tournament } from '../types/tournament';
import type { User } from 'firebase/auth';
import { isSuperAdmin } from '../services/adminService';

interface HeaderProps {
  tournament: Tournament;
  activeTab: 'pairings' | 'standings' | 'crosstable' | 'players';
  setActiveTab: (tab: 'pairings' | 'standings' | 'crosstable' | 'players') => void;
  onNewTournament: () => void;
  onOpenExport: () => void;
  currentUser: User | null;
  onSignOut: () => void;
  onOpenUserTournaments: () => void;
  isSyncing?: boolean;
  canEdit: boolean;
  isParticipant: boolean;
  onOpenParticipantSearch: () => void;
  onOpenShareAccess: () => void;
  onSwitchToDirectorLogin: () => void;
  onOpenAdminPortal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tournament,
  activeTab,
  setActiveTab,
  onNewTournament,
  onOpenExport,
  currentUser,
  onSignOut,
  onOpenUserTournaments,
  isSyncing = false,
  canEdit,
  isParticipant,
  onOpenParticipantSearch,
  onOpenShareAccess,
  onSwitchToDirectorLogin,
  onOpenAdminPortal,
}) => {
  const allowedCount = tournament.allowedEmails?.length || 0;
  const userInitial = (currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'A').toUpperCase();

  const formatLabel =
    tournament.format === 'round_robin'
      ? 'Round-Robin'
      : tournament.format === 'knockout'
      ? 'Knockout'
      : 'Swiss';

  const userIsAdmin = isSuperAdmin(currentUser?.email);

  return (
    <header className="border-b border-neutral-800 bg-black sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
          {/* Logo & Tournament Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-white text-base">
                ♞
              </div>
              <span className="font-bold tracking-tight text-white text-sm hidden md:inline">
                En Passant
              </span>
            </div>

            <span className="text-neutral-700 hidden sm:inline">/</span>

            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
              <span className="truncate max-w-[130px] md:max-w-xs text-white font-medium">
                {tournament.name}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 text-neutral-400 border border-neutral-800">
                {formatLabel}
              </span>
              {!canEdit && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-900 text-neutral-300 border border-neutral-700 flex items-center gap-1">
                  <Eye className="w-2.5 h-2.5 text-neutral-400" />
                  <span>View Only</span>
                </span>
              )}
              <span className="text-neutral-600">·</span>
              <span>
                Round {tournament.rounds.length > 0 ? tournament.rounds.length : 1}/{tournament.roundsTotal}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('pairings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'pairings'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Pairings</span>
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'standings'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Standings</span>
            </button>
            <button
              onClick={() => setActiveTab('crosstable')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'crosstable'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Cross Table</span>
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'players'
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Players ({tournament.players.length})</span>
            </button>
          </nav>

          {/* Actions & Role State */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Ongoing Tournaments (Available to all, crucial for participants) */}
            <button
              onClick={onOpenParticipantSearch}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
              title="Search and view all tournaments"
            >
              <Search className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Search Events</span>
            </button>

            {/* Read-Only Participant Indicator */}
            {isParticipant ? (
              <div className="flex items-center gap-1.5">
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-neutral-900 text-neutral-300 border border-neutral-800">
                  <Eye className="w-3 h-3 text-neutral-400" />
                  <span>Participant View</span>
                </span>
                <button
                  onClick={onSwitchToDirectorLogin}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Director Login</span>
                </button>
              </div>
            ) : (
              <>
                {/* Super Admin Portal Button (shivgoyal0307@gmail.com) */}
                {userIsAdmin && onOpenAdminPortal && (
                  <button
                    onClick={onOpenAdminPortal}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors"
                    title="Super Admin Portal: Confirm & approve new director accounts"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-black" />
                    <span>Admin Portal</span>
                  </button>
                )}

                {/* Arbiter Edit Mode: Share Access Button */}
                {canEdit && (
                  <button
                    onClick={onOpenShareAccess}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
                    title="Share arbiter access with allowed emails"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Access</span>
                    {allowedCount > 0 && (
                      <span className="px-1 text-[10px] font-mono bg-neutral-800 text-white rounded">
                        {allowedCount}
                      </span>
                    )}
                  </button>
                )}

                {/* Cloud Sync Indicator */}
                <div
                  className="hidden xl:flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 px-2 py-1 rounded-md"
                  title="Cloud sync status"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-white animate-pulse' : 'bg-white'}`} />
                  <Cloud className="w-3 h-3 text-neutral-400" />
                  <span>{isSyncing ? 'Saving' : 'Saved'}</span>
                </div>

                {/* My Tournaments */}
                <button
                  onClick={onOpenUserTournaments}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
                  title="My Tournaments"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="hidden md:inline">My Tournaments</span>
                </button>

                {/* Export & Print */}
                <button
                  onClick={onOpenExport}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
                  title="Export Bulletin / Backup"
                >
                  <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Export</span>
                </button>

                {/* New Tournament */}
                {canEdit && (
                  <button
                    onClick={onNewTournament}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New</span>
                  </button>
                )}

                {/* User Avatar & Logout */}
                {currentUser && (
                  <div className="flex items-center gap-1 pl-1">
                    <div
                      className="w-7 h-7 rounded-lg bg-neutral-900 text-white font-semibold text-xs flex items-center justify-center border border-neutral-700"
                      title={`Director: ${currentUser.email || currentUser.displayName || ''}`}
                    >
                      {userInitial}
                    </div>
                    <button
                      onClick={onSignOut}
                      className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors"
                      title="Sign Out"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden flex items-center overflow-x-auto border-t border-neutral-800 px-4 py-1.5 gap-1.5 text-xs bg-black">
        <button
          onClick={() => setActiveTab('pairings')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'pairings' ? 'bg-white text-black' : 'text-neutral-400'
          }`}
        >
          Pairings
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'standings' ? 'bg-white text-black' : 'text-neutral-400'
          }`}
        >
          Standings
        </button>
        <button
          onClick={() => setActiveTab('crosstable')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'crosstable' ? 'bg-white text-black' : 'text-neutral-400'
          }`}
        >
          Cross Table
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'players' ? 'bg-white text-black' : 'text-neutral-400'
          }`}
        >
          Players ({tournament.players.length})
        </button>
      </div>
    </header>
  );
};
