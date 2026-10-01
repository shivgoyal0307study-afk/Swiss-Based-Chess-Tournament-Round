/**
 * New Tournament Creation Modal
 * Supports Swiss, Round-Robin, and Knockout formats
 */

import React, { useState } from 'react';
import { Tournament, TournamentFormat } from '../types/tournament';
import { PlusCircle } from 'lucide-react';

interface NewTournamentModalProps {
  onCreate: (tournament: Tournament) => void;
  onClose: () => void;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
}

export const NewTournamentModal: React.FC<NewTournamentModalProps> = ({
  onCreate,
  onClose,
  currentUserEmail,
  currentUserName,
}) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [format, setFormat] = useState<TournamentFormat>('swiss');
  const [roundsTotal, setRoundsTotal] = useState(5);
  const [topSeedColor, setTopSeedColor] = useState<'W' | 'B'>('W');

  const handleFormatChange = (newFormat: TournamentFormat) => {
    setFormat(newFormat);
    if (newFormat === 'knockout') {
      setRoundsTotal(4); // Typical for 16-player bracket
    } else if (newFormat === 'round_robin') {
      setRoundsTotal(5);
    } else {
      setRoundsTotal(5);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const newTournament: Tournament = {
      id: `tourney-${Date.now()}`,
      name: name.trim() || `${format === 'round_robin' ? 'Round-Robin' : format === 'knockout' ? 'Knockout' : 'Swiss'} Tournament`,
      location: location.trim() || undefined,
      ownerEmail: currentUserEmail || undefined,
      ownerName: currentUserName || undefined,
      allowedEmails: [],
      isPublic: true,
      format,
      roundsTotal: Number(roundsTotal) || 5,
      currentRoundNumber: 1,
      players: [],
      rounds: [],
      round1TopSeedColor: topSeedColor,
      status: 'setup',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    onCreate(newTournament);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="text-sm font-bold text-white">Create Tournament</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 text-sm p-1 rounded hover:bg-neutral-800">
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-neutral-300 mb-1">Tournament Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Autumn Masters Championship"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block font-medium text-neutral-300 mb-1">Tournament Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFormatChange('swiss')}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  format === 'swiss'
                    ? 'bg-amber-400/10 border-amber-500 text-amber-400 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="text-xs">FIDE Swiss</div>
                <div className="text-[10px] text-neutral-500 mt-0.5 font-normal">Dutch System</div>
              </button>

              <button
                type="button"
                onClick={() => handleFormatChange('round_robin')}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  format === 'round_robin'
                    ? 'bg-amber-400/10 border-amber-500 text-amber-400 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="text-xs">Round-Robin</div>
                <div className="text-[10px] text-neutral-500 mt-0.5 font-normal">Berger Tables</div>
              </button>

              <button
                type="button"
                onClick={() => handleFormatChange('knockout')}
                className={`py-2 px-3 rounded-lg border text-left transition-all ${
                  format === 'knockout'
                    ? 'bg-amber-400/10 border-amber-500 text-amber-400 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <div className="text-xs">Knockout</div>
                <div className="text-[10px] text-neutral-500 mt-0.5 font-normal">Elimination Bracket</div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-neutral-300 mb-1">Location / Venue</label>
              <input
                type="text"
                placeholder="Optional"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block font-medium text-neutral-300 mb-1">Total Scheduled Rounds</label>
              <input
                type="number"
                min={1}
                max={50}
                value={roundsTotal}
                onChange={(e) => setRoundsTotal(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-neutral-300 mb-1">
              Board 1 Top Seed Initial Color
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTopSeedColor('W')}
                className={`flex-1 py-1.5 px-3 rounded-lg border font-mono font-medium transition-colors ${
                  topSeedColor === 'W'
                    ? 'bg-neutral-200 text-neutral-950 border-white'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                White
              </button>
              <button
                type="button"
                onClick={() => setTopSeedColor('B')}
                className={`flex-1 py-1.5 px-3 rounded-lg border font-mono font-medium transition-colors ${
                  topSeedColor === 'B'
                    ? 'bg-neutral-800 text-neutral-100 border-neutral-600'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}
              >
                Black
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">Drawn by lot before Round 1.</p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-lg transition-colors"
            >
              Create Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
