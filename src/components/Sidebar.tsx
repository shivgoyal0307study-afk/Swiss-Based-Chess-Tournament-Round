/**
 * En Passant — Hidden Side Navigation Bar
 * Inspired by Linear, Lichess, Notion & Vercel design systems.
 * Supports hidden drawer mode (zero desktop intrusion), pinned workspace mode,
 * and comprehensive tournament & arbiter controls.
 */

import React, { useEffect } from 'react';
import {
  Trophy,
  GitBranch,
  Table,
  Users,
  Search,
  Plus,
  FileDown,
  ShieldCheck,
  BookOpen,
  Scale,
  PanelLeftClose,
  Pin,
  PinOff,
  X,
  LogOut,
  LogIn,
  Eye,
  Crown,
  Share2,
  Sun,
  Moon,
} from 'lucide-react';
import { Tournament } from '../types/tournament';
import type { User } from 'firebase/auth';
import { isSuperAdmin } from '../services/adminService';
import { useTheme } from '../context/ThemeContext';

export interface SidebarProps {
  tournament: Tournament;
  activeTab: 'pairings' | 'standings' | 'crosstable' | 'players';
  setActiveTab: (tab: 'pairings' | 'standings' | 'crosstable' | 'players') => void;
  // Modern hidden side navigation props
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  isPinned?: boolean;
  setIsPinned?: (pinned: boolean) => void;
  // Backwards compatibility props
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  // Actions
  onNewTournament: () => void;
  onOpenExport: () => void;
  onOpenUserTournaments: () => void;
  onOpenParticipantSearch: () => void;
  onOpenShareAccess: () => void;
  onOpenRulesAudit: () => void;
  onOpenFideRules: () => void;
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
  isOpen = false,
  setIsOpen,
  isPinned = false,
  setIsPinned,
  isCollapsed = false,
  setIsCollapsed,
  isMobileOpen = false,
  setIsMobileOpen,
  onNewTournament,
  onOpenExport,
  onOpenUserTournaments,
  onOpenParticipantSearch,
  onOpenShareAccess,
  onOpenRulesAudit,
  onOpenFideRules,
  onOpenAdminPortal,
  currentUser,
  onSignOut,
  onSwitchToDirectorLogin,
  canEdit,
  isParticipant,
  isSyncing = false,
}) => {
  // Resolve effective open status (handles either modern isOpen or legacy isMobileOpen)
  const effectiveOpen = isOpen || isMobileOpen;

  const closeSidebar = () => {
    if (setIsOpen) setIsOpen(false);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  // Keyboard shortcut: Escape closes unpinned sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && effectiveOpen && !isPinned) {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveOpen, isPinned]);

  const userIsAdmin = currentUser?.email ? isSuperAdmin(currentUser.email) : false;
  const allowedCount = tournament.allowedEmails?.length || 0;
  const { theme, toggleTheme } = useTheme();
  const currentRoundNum = tournament.rounds.length > 0 ? tournament.rounds.length : 1;
  const completedRounds = tournament.rounds.filter((r) => r.isCompleted).length;

  const navItems: {
    id: 'pairings' | 'standings' | 'crosstable' | 'players';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    {
      id: 'pairings',
      label: 'Pairings & Results',
      icon: GitBranch,
      badge: `R${currentRoundNum}`,
    },
    {
      id: 'standings',
      label: 'Standings & Tiebreakers',
      icon: Trophy,
    },
    {
      id: 'crosstable',
      label: 'Crosstable Matrix',
      icon: Table,
    },
    {
      id: 'players',
      label: 'Players Roster',
      icon: Users,
      badge: tournament.players.length,
    },
  ];

  const handleNavClick = (id: 'pairings' | 'standings' | 'crosstable' | 'players') => {
    setActiveTab(id);
    // If not pinned, auto-close the drawer on navigation for maximum focus
    if (!isPinned) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Backdrop overlay for unpinned / mobile drawer */}
      {effectiveOpen && !isPinned && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Slide-out Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-neutral-950 border-r border-neutral-800/90 w-72 sm:w-80 shadow-2xl transition-transform duration-250 ease-out ${
          effectiveOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main Navigation Menu"
      >
        {/* Header Zone: Brand + Pin & Close Controls */}
        <div className="h-14 border-b border-neutral-800/80 px-4 flex items-center justify-between shrink-0 bg-neutral-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white text-black font-bold flex items-center justify-center text-base shrink-0 shadow-xs">
              ♞
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold tracking-tight text-white block truncate leading-tight">
                En Passant
              </span>
              <span className="text-[10px] text-neutral-400 font-mono block truncate">
                FIDE Swiss Championship
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
                title={isPinned ? 'Unpin sidebar (auto-hide drawer mode)' : 'Pin sidebar to workspace'}
                aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={closeSidebar}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              title="Close navigation menu (Esc)"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-5 scrollbar-thin">
          {/* Active Tournament Card */}
          <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-mono text-neutral-400 font-semibold">
                Active Tournament
              </span>
              <span className="text-[10px] font-mono text-neutral-300 capitalize">
                {tournament.format === 'round_robin'
                  ? 'Round-Robin'
                  : tournament.format === 'knockout'
                  ? 'Knockout'
                  : 'FIDE Swiss'}
              </span>
            </div>

            <div>
              <h3 className="text-xs font-bold text-white truncate" title={tournament.name}>
                {tournament.name}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 font-mono">
                <span>
                  Round {currentRoundNum} of {tournament.roundsTotal}
                </span>
                <span>·</span>
                <span>{completedRounds} completed</span>
              </div>
            </div>

            {/* Quick Actions inside Card */}
            <div className="pt-1.5 flex items-center gap-1.5 border-t border-neutral-800/60">
              <button
                onClick={() => {
                  onOpenUserTournaments();
                  if (!isPinned) closeSidebar();
                }}
                className="flex-1 px-2.5 py-1 text-[11px] font-medium text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded border border-neutral-800 transition-colors truncate text-center"
              >
                All Events
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    onNewTournament();
                    if (!isPinned) closeSidebar();
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-black bg-white hover:bg-neutral-200 rounded transition-colors shrink-0 flex items-center gap-1"
                  title="Create New Tournament"
                >
                  <Plus className="w-3 h-3 text-black" />
                  <span>New</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 1: Tournament Arena Views */}
          <div className="space-y-1">
            <span className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1.5">
              Tournament Arena
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
                      ? 'bg-white text-black font-semibold shadow-xs'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-black' : 'text-neutral-400 group-hover:text-white'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ${
                        isActive
                          ? 'bg-neutral-200 text-black font-bold'
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

          {/* Section 2: Arbiter & Event Tools */}
          <div className="space-y-1 pt-3 border-t border-neutral-800/80">
            <span className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold block mb-1.5">
              Tools & Directory
            </span>

            {/* Search Ongoing Tournaments */}
            <button
              onClick={() => {
                onOpenParticipantSearch();
                if (!isPinned) closeSidebar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group"
            >
              <Search className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
              <span className="flex-1 text-left truncate">Search Live Events</span>
            </button>

            {/* Official FIDE Swiss Rules Modal */}
            <button
              onClick={() => {
                onOpenFideRules();
                if (!isPinned) closeSidebar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group"
            >
              <BookOpen className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
              <span className="flex-1 text-left truncate">FIDE Swiss Rules (9)</span>
            </button>

            {/* Arbiter Invariants Compliance Audit */}
            <button
              onClick={() => {
                onOpenRulesAudit();
                if (!isPinned) closeSidebar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group"
            >
              <Scale className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
              <span className="flex-1 text-left truncate">Pairing Rules Audit</span>
            </button>

            {/* Share Arbiter Access */}
            {canEdit && (
              <button
                onClick={() => {
                  onOpenShareAccess();
                  if (!isPinned) closeSidebar();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
                  <span className="truncate">Collaborators & Arbiters</span>
                </div>
                {allowedCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 text-neutral-400 border border-neutral-800 shrink-0">
                    {allowedCount}
                  </span>
                )}
              </button>
            )}

            {/* Export & Print */}
            <button
              onClick={() => {
                onOpenExport();
                if (!isPinned) closeSidebar();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors group"
            >
              <FileDown className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
              <span className="flex-1 text-left truncate">Export PDF & Standings</span>
            </button>

            {/* Super Admin Portal (shivgoyal0307@gmail.com) */}
            {userIsAdmin && onOpenAdminPortal && (
              <button
                onClick={() => {
                  onOpenAdminPortal();
                  if (!isPinned) closeSidebar();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-neutral-200 text-black transition-colors shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 text-black shrink-0" />
                <span className="flex-1 text-left truncate">Super Admin Portal</span>
              </button>
            )}
          </div>
        </div>

        {/* User Account / Footer Zone */}
        <div className="border-t border-neutral-800/80 p-3 shrink-0 bg-neutral-950 space-y-2">
          {/* Live Sync Status Indicator */}
          <div className="px-2.5 py-1.5 rounded-lg bg-neutral-900/60 border border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span>{isSyncing ? 'Syncing...' : 'Live Realtime Sync'}</span>
            </div>
            <span className="text-[10px] text-neutral-500">Firestore</span>
          </div>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800/80 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-400" />
              )}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
              {theme === 'dark' ? 'Theme: Dark' : 'Theme: Light'}
            </span>
          </button>

          {/* Account Profile Bar */}
          {currentUser ? (
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center shrink-0">
                  {(currentUser.displayName?.[0] || currentUser.email?.[0] || 'A').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono block truncate">
                    {userIsAdmin ? 'Super Admin' : canEdit ? 'Director / Arbiter' : 'Spectator'}
                  </span>
                </div>
              </div>

              <button
                onClick={onSignOut}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors shrink-0"
                title="Sign out of director account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full pt-1">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Eye className="w-3.5 h-3.5 text-neutral-400" />
                <span>Participant</span>
              </div>
              <button
                onClick={onSwitchToDirectorLogin}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors"
              >
                <LogIn className="w-3 h-3" />
                <span>Director Login</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
