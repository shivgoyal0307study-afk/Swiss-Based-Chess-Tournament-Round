/**
 * En Passant — Side Navigation Bar
 * Clean, modern, responsive side navigation bar.
 * Replaces redundant top bars and provides focused, distraction-free access
 * to Pairings, Standings, Crosstable, Players, Themes, and Arbiter tools.
 */

import React, { useEffect, useState } from 'react';
import {
  Trophy,
  GitBranch,
  Table,
  Users,
  Search,
  Plus,
  FileDown,
  ShieldCheck,
  Pin,
  PinOff,
  X,
  LogOut,
  LogIn,
  Eye,
  Share2,
  Check,
  Sun,
  Moon,
} from 'lucide-react';
import { Tournament } from '../types/tournament';
import type { User } from 'firebase/auth';
import { isSuperAdmin } from '../services/adminService';
import { useTheme } from '../context/ThemeContext';
import { calculateFormatTotalRounds } from '../engine/formatPairings';

export interface SidebarProps {
  tournament: Tournament;
  activeTab: 'pairings' | 'standings' | 'crosstable' | 'players';
  setActiveTab: (tab: 'pairings' | 'standings' | 'crosstable' | 'players') => void;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  isPinned?: boolean;
  setIsPinned?: (pinned: boolean) => void;
  // Actions
  onNewTournament: () => void;
  onOpenExport: () => void;
  onOpenUserTournaments: () => void;
  onOpenParticipantSearch: () => void;
  onOpenShareAccess: () => void;
  onOpenAdminPortal?: () => void;
  currentUser: User | null;
  onSignOut: () => void;
  onSwitchToDirectorLogin: () => void;
  canEdit: boolean;
  isParticipant: boolean;
  isSyncing?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tournament,
  activeTab,
  setActiveTab,
  isOpen = true,
  setIsOpen,
  isPinned = false,
  setIsPinned,
  onNewTournament,
  onOpenExport,
  onOpenUserTournaments,
  onOpenParticipantSearch,
  onOpenShareAccess,
  onOpenAdminPortal,
  currentUser,
  onSignOut,
  onSwitchToDirectorLogin,
  canEdit,
  isParticipant,
  isSyncing = false,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const userIsAdmin = currentUser?.email ? isSuperAdmin(currentUser.email) : false;
  const allowedCount = tournament.allowedEmails?.length || 0;
  const currentRoundNum = tournament.rounds.length > 0 ? tournament.rounds.length : 1;
  const completedRounds = tournament.rounds.filter((r) => r.isCompleted).length;
  const totalRoundsCount =
    tournament.format === 'round_robin' || tournament.format === 'knockout'
      ? calculateFormatTotalRounds(tournament.format, tournament.players.length, tournament.roundsTotal)
      : tournament.roundsTotal;

  const closeSidebar = () => {
    if (setIsOpen) setIsOpen(false);
  };

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?t=${tournament.id}` : '';
    if (url && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Keyboard shortcut: Escape closes unpinned sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isPinned) {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPinned]);

  const navItems: {
    id: 'pairings' | 'standings' | 'crosstable' | 'players';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    {
      id: 'pairings',
      label: 'Pairings',
      icon: GitBranch,
      badge: `R${currentRoundNum}`,
    },
    {
      id: 'standings',
      label: 'Standings',
      icon: Trophy,
    },
    {
      id: 'crosstable',
      label: 'Cross Table',
      icon: Table,
    },
    {
      id: 'players',
      label: 'Players',
      icon: Users,
      badge: tournament.players.length,
    },
  ];

  const handleNavClick = (id: 'pairings' | 'standings' | 'crosstable' | 'players') => {
    setActiveTab(id);
    if (!isPinned) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Backdrop overlay for drawer mode on mobile or unpinned desktop */}
      {isOpen && !isPinned && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-neutral-950 border-r border-neutral-800/80 w-64 sm:w-72 shadow-xl transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation"
      >
        {/* Brand & Controls */}
        <div className="h-14 border-b border-neutral-800/80 px-4 flex items-center justify-between shrink-0 bg-neutral-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#84dcc6] text-[#11221c] font-bold flex items-center justify-center text-sm shrink-0 shadow-xs">
              ♞
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold tracking-tight text-white block truncate">
                En Passant
              </span>
              <span className="text-[10px] text-neutral-400 font-mono block truncate">
                Chess Arbiter
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Pin Toggle */}
            {setIsPinned && (
              <button
                onClick={() => setIsPinned(!isPinned)}
                className={`hidden lg:flex p-1.5 rounded-lg transition-colors ${
                  isPinned
                    ? 'text-white bg-neutral-900 border border-neutral-700'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
                title={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={closeSidebar}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              title="Close menu (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
          {/* Active Tournament Card */}
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-400 font-semibold truncate max-w-[130px]">
                {tournament.format === 'round_robin'
                  ? 'Round-Robin'
                  : tournament.format === 'knockout'
                  ? 'Knockout'
                  : 'FIDE Swiss'}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Round {currentRoundNum}/{totalRoundsCount}
              </span>
            </div>

            <h3 className="text-xs font-bold text-white truncate" title={tournament.name}>
              {tournament.name}
            </h3>

            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-neutral-400 font-mono">
              <span>{tournament.players.length} Players</span>
              <span>·</span>
              <span>{completedRounds} Completed</span>
            </div>

            <div className="pt-2 flex items-center gap-1.5 border-t border-neutral-800/60">
              <button
                onClick={() => {
                  onOpenUserTournaments();
                  if (!isPinned) closeSidebar();
                }}
                className="flex-1 px-2 py-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 transition-colors truncate text-center"
              >
                All Events
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    onNewTournament();
                    if (!isPinned) closeSidebar();
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold btn-brand-accent rounded-lg transition-colors shrink-0 flex items-center gap-1"
                  title="Create New Tournament"
                >
                  <Plus className="w-3 h-3 text-current" />
                  <span>New</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Views */}
          <div className="space-y-1">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
              Views
            </span>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'nav-item-active shadow-xs'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-current' : 'text-neutral-400 group-hover:text-white'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                        isActive
                          ? 'font-bold bg-black/15 text-current'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tournament Tools */}
          <div className="space-y-1 pt-2 border-t border-neutral-800/80">
            <span className="px-2 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1">
              Actions
            </span>

            {/* Share Live Link */}
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {copiedLink ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Share2 className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
                )}
                <span className="truncate">{copiedLink ? 'Link Copied!' : 'Share Live Link'}</span>
              </div>
            </button>

            {/* Search Ongoing Tournaments */}
            <button
              onClick={() => {
                onOpenParticipantSearch();
                if (!isPinned) closeSidebar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group cursor-pointer"
            >
              <Search className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
              <span className="flex-1 text-left truncate">Search Events</span>
            </button>

            {/* Arbiter Access */}
            {canEdit && (
              <button
                onClick={() => {
                  onOpenShareAccess();
                  if (!isPinned) closeSidebar();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
                  <span className="truncate">Arbiter Access</span>
                </div>
                {allowedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 text-neutral-400 border border-neutral-800 shrink-0">
                    {allowedCount}
                  </span>
                )}
              </button>
            )}

            {/* Export & PDF */}
            <button
              onClick={() => {
                onOpenExport();
                if (!isPinned) closeSidebar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
              <span className="flex-1 text-left truncate">Export & Backup</span>
            </button>

            {/* Super Admin Portal (shivgoyal0307@gmail.com) */}
            {userIsAdmin && onOpenAdminPortal && (
              <button
                onClick={() => {
                  onOpenAdminPortal();
                  if (!isPinned) closeSidebar();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold btn-brand-accent transition-colors shadow-xs cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-current shrink-0" />
                <span className="flex-1 text-left truncate">Admin Portal</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer Zone: Theme Toggle & User Account */}
        <div className="border-t border-neutral-800/80 p-3 shrink-0 bg-neutral-950 space-y-2">
          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/80 transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#4b4e6d]" />
              )}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              {theme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Account Profile Bar */}
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#4b4e6d] text-white dark:bg-white dark:text-neutral-900 font-bold text-xs flex items-center justify-center shrink-0">
                  {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'A').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono block truncate">
                    {userIsAdmin ? 'Super Admin' : canEdit ? 'Arbiter' : 'Spectator'}
                  </span>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors shrink-0 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full pt-1">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Eye className="w-3.5 h-3.5 text-neutral-400" />
                <span>Spectator</span>
              </div>
              <button
                onClick={onSwitchToDirectorLogin}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold btn-brand-accent rounded-lg transition-colors cursor-pointer"
              >
                <LogIn className="w-3 h-3" />
                <span>Login</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
