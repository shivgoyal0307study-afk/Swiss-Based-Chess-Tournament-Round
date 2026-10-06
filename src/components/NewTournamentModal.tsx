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
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    // Swiss requires manual rounds or defaults to 5.
    // Knockout & Round-Robin rounds depend entirely on registered player count.
    const initialRounds = format === 'swiss' ? (Number(roundsTotal) || 5) : 1;

    const newTournament: Tournament = {
      id: `tourney-${Date.now()}`,
      name: name.trim() || `${format === 'round_robin' ? 'Round-Robin' : format === 'knockout' ? 'Knockout' : 'Swiss'} Tournament`,
      location: location.trim() || undefined,
      ownerEmail: currentUserEmail || undefined,
      ownerName: currentUserName || undefined,
      allowedEmails: [],
      isPublic: true,
      format,
      roundsTotal: initialRounds,
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="text-sm font-bold text-white">Create Tournament</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-sm p-1 rounded hover:bg-neutral-900 transition-colors">
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
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="block font-medium text-neutral-300 mb-1">Tournament Format</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFormatChange('swiss')}
                className={`py-2 px-3 rounded-lg border text-left transition-all cursor-pointer ${
                  format === 'swiss'
                    ? 'btn-brand-accent font-semibold border-transparent shadow-xs'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="text-xs">FIDE Swiss</div>
                <div className={`text-[10px] mt-0.5 font-normal ${format === 'swiss' ? 'opacity-80' : 'text-neutral-500'}`}>Dutch System</div>
              </button>

              <button
                type="button"
                onClick={() => handleFormatChange('round_robin')}
                className={`py-2 px-3 rounded-lg border text-left transition-all cursor-pointer ${
                  format === 'round_robin'
                    ? 'btn-brand-accent font-semibold border-transparent shadow-xs'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="text-xs">Round-Robin</div>
                <div className={`text-[10px] mt-0.5 font-normal ${format === 'round_robin' ? 'opacity-80' : 'text-neutral-500'}`}>Berger Tables</div>
              </button>

              <button
                type="button"
                onClick={() => handleFormatChange('knockout')}
                className={`py-2 px-3 rounded-lg border text-left transition-all cursor-pointer ${
                  format === 'knockout'
                    ? 'btn-brand-accent font-semibold border-transparent shadow-xs'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="text-xs">Knockout</div>
                <div className={`text-[10px] mt-0.5 font-normal ${format === 'knockout' ? 'opacity-80' : 'text-neutral-500'}`}>Elimination Bracket</div>
              </button>
            </div>
          </div>

          {format === 'swiss' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-300 mb-1">Location / Venue</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
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
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-medium text-neutral-300 mb-1">Location / Venue</label>
              <input
                type="text"
                placeholder="Optional"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              />
              <p className="text-[11px] text-neutral-400 mt-1.5">
                Number of rounds is automatically determined by registered players.
              </p>
            </div>
          )}

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
                    ? 'bg-white text-black border-white font-bold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                White
              </button>
              <button
                type="button"
                onClick={() => setTopSeedColor('B')}
                className={`flex-1 py-1.5 px-3 rounded-lg border font-mono font-medium transition-colors ${
                  topSeedColor === 'B'
                    ? 'bg-neutral-800 text-white border-neutral-600 font-bold'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
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
              className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold btn-brand-accent rounded-lg transition-colors cursor-pointer"
            >
              Create Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
