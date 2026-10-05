/**
 * En Passant — Top Workspace Navbar
 * Features: Hidden Side Navigation toggle button,
 * Tournament Breadcrumbs & Status, Segmented View Switcher,
 * Live Cloud Sync indicator, Quick Share Link, and Arbiter/Admin tools.
 */

import React, { useState } from 'react';
import {
  Menu,
  PanelLeft,
  Share2,
  Check,
  Search,
  BookOpen,
  Plus,
  ShieldCheck,
  LogIn,
  Trophy,
  GitBranch,
  Table,
  Users,
} from 'lucide-react';
import { Tournament } from '../types/tournament';
import type { User } from 'firebase/auth';
import { isSuperAdmin } from '../services/adminService';

export interface TopNavbarProps {
  tournament: Tournament;
  activeTab: 'pairings' | 'standings' | 'crosstable' | 'players';
  setActiveTab: (tab: 'pairings' | 'standings' | 'crosstable' | 'players') => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  // Backwards compatibility
  isSidebarCollapsed?: boolean;
  onOpenMobileSidebar?: () => void;
  // Action triggers
  onOpenParticipantSearch: () => void;
  onOpenFideRules: () => void;
  onOpenExport: () => void;
  onNewTournament: () => void;
  onOpenShareAccess: () => void;
  onOpenAdminPortal?: () => void;
  onSwitchToDirectorLogin: () => void;
  canEdit: boolean;
  isParticipant: boolean;
  isSyncing?: boolean;
  currentUser: User | null;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  tournament,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  onToggleSidebar,
  onOpenMobileSidebar,
  onOpenParticipantSearch,
  onOpenFideRules,
  onOpenExport,
  onNewTournament,
  onOpenShareAccess,
  onOpenAdminPortal,
  onSwitchToDirectorLogin,
  canEdit,
  isParticipant,
  isSyncing = false,
  currentUser,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const userIsAdmin = isSuperAdmin(currentUser?.email);
  const currentRoundNum = tournament.rounds.length > 0 ? tournament.rounds.length : 1;

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?t=${tournament.id}` : '';
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleToggle = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    } else if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
  };

  return (
    <header className="h-14 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-3 sm:px-5">
      {/* Left: Menu Toggle & Tournament Identity */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* Hidden Sidebar Menu Button */}
        <button
          onClick={handleToggle}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors shrink-0"
          title="Toggle Navigation Menu (⌘+B)"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4 text-neutral-200" />
          <span className="text-xs font-medium hidden md:inline">Menu</span>
        </button>

        {/* Brand Icon */}
        <div className="w-6 h-6 rounded-md bg-white text-black font-bold flex items-center justify-center text-xs shrink-0">
          ♞
        </div>

        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center gap-2 min-w-0 text-xs">
          <span
            className="font-semibold text-white truncate max-w-[130px] sm:max-w-[220px]"
            title={tournament.name}
          >
            {tournament.name}
          </span>
          <span className="text-neutral-600 hidden sm:inline">·</span>
          <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline shrink-0">
            Round {currentRoundNum} of {tournament.roundsTotal}
          </span>
        </div>
      </div>

      {/* Center: In-View Segmented Navigation Tabs */}
      <nav className="hidden lg:flex items-center gap-1 bg-neutral-900/80 border border-neutral-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('pairings')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-colors ${
            activeTab === 'pairings'
              ? 'bg-white text-black font-semibold shadow-xs'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Pairings</span>
        </button>

        <button
          onClick={() => setActiveTab('standings')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-colors ${
            activeTab === 'standings'
              ? 'bg-white text-black font-semibold shadow-xs'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Standings</span>
        </button>

        <button
          onClick={() => setActiveTab('crosstable')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-colors ${
            activeTab === 'crosstable'
              ? 'bg-white text-black font-semibold shadow-xs'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Cross Table</span>
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-colors ${
            activeTab === 'players'
              ? 'bg-white text-black font-semibold shadow-xs'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Players ({tournament.players.length})</span>
        </button>
      </nav>

      {/* Right: Actions, Live Sync, Share & Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Live Cloud Sync Pulse Indicator */}
        <div
          className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 px-2 py-1 rounded-md bg-neutral-900/60 border border-neutral-800"
          title={isSyncing ? 'Syncing to Firestore cloud...' : 'Realtime Sync Connected'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Live'}</span>
        </div>

        {/* Share Live Link Button */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
          title="Copy shareable live link for players and spectators"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium hidden sm:inline">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-neutral-200" />
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>

        {/* Search Events Button */}
        <button
          onClick={onOpenParticipantSearch}
          className="p-1.5 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
          title="Search all public tournaments"
        >
          <Search className="w-3.5 h-3.5 text-neutral-200" />
        </button>

        {/* FIDE Rules Button */}
        <button
          onClick={onOpenFideRules}
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
          title="9 Official FIDE Swiss System Rules"
        >
          <BookOpen className="w-3.5 h-3.5 text-neutral-200" />
          <span>FIDE Rules</span>
        </button>

        {/* Super Admin Portal button if shivgoyal0307@gmail.com */}
        {userIsAdmin && onOpenAdminPortal && (
          <button
            onClick={onOpenAdminPortal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors shadow-xs"
            title="Super Admin Portal (Director Approvals)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-black" />
            <span className="hidden md:inline">Admin</span>
          </button>
        )}

        {/* Arbiter New Tournament button */}
        {canEdit && !userIsAdmin && (
          <button
            onClick={onNewTournament}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors shadow-xs"
            title="Create New Tournament"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            <span className="hidden md:inline">New Event</span>
          </button>
        )}

        {/* Participant Switch to Login Button */}
        {isParticipant && (
          <button
            onClick={onSwitchToDirectorLogin}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors"
            title="Director Login"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Director Login</span>
          </button>
        )}

        {/* User Avatar */}
        {currentUser && (
          <button
            onClick={handleToggle}
            className="w-7 h-7 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center shrink-0 ml-1 hover:ring-2 hover:ring-neutral-400 transition-all"
            title={`${currentUser.displayName || currentUser.email} (Click to open menu)`}
          >
            {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'A').toUpperCase()}
          </button>
        )}
      </div>
    </header>
  );
};
