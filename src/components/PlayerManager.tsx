/**
 * En Passant — Tournament Player Roster & Advanced CSV / Excel Import
 * Supports .xlsx, .xls, .csv, and tab-delimited text files.
 * Enforces role-based read-only mode for participants and non-collaborators.
 * All hardcoded and sample data removed.
 */

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Player, Tournament } from '../types/tournament';
import {
  UserPlus,
  FileSpreadsheet,
  Upload,
  Trash2,
  Power,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';

interface PlayerManagerProps {
  tournament: Tournament;
  onUpdatePlayers: (players: Player[]) => void;
  isReadOnly?: boolean;
}

export const PlayerManager: React.FC<PlayerManagerProps> = ({
  tournament,
  onUpdatePlayers,
  isReadOnly = false,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTab, setImportTab] = useState<'file' | 'text'>('file');

  // Individual form state
  const [name, setName] = useState('');
  const [rating, setRating] = useState('1500');
  const [title, setTitle] = useState<Player['title']>('');
  const [federation, setFederation] = useState('');

  // File import state
  const [parsedPlayers, setParsedPlayers] = useState<Player[]>([]);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isTournamentStarted = tournament.rounds.length > 0;

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!name.trim()) return;

    const newPlayer: Player = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      rating: parseInt(rating) || 1500,
      active: true,
      title: title || undefined,
      federation: federation.trim().toUpperCase() || undefined,
    };

    onUpdatePlayers([...tournament.players, newPlayer]);
    setName('');
    setRating('1500');
    setTitle('');
    setFederation('');
    setShowAddForm(false);
  };

  const processRawRows = (rows: any[][]): Player[] => {
    if (!rows || rows.length === 0) return [];

    let startIdx = 0;
    let nameCol = 0;
    let ratingCol = 1;
    let titleCol = 2;
    let fedCol = 3;

    // Detect header row
    const firstRow = rows[0].map((c) => String(c || '').toLowerCase().trim());
    const hasHeader = firstRow.some(
      (c) => c.includes('name') || c.includes('player') || c.includes('rating') || c.includes('elo')
    );

    if (hasHeader) {
      startIdx = 1;
      firstRow.forEach((col, idx) => {
        if (col.includes('name') || col.includes('player')) nameCol = idx;
        else if (col.includes('rating') || col.includes('elo') || col.includes('fide')) ratingCol = idx;
        else if (col.includes('title')) titleCol = idx;
        else if (col.includes('fed') || col.includes('country') || col.includes('noc')) fedCol = idx;
      });
    }

    const validTitles = new Set(['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM']);
    const players: Player[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawName = String(row[nameCol] ?? '').trim();
      if (!rawName || rawName.startsWith('#')) continue;

      const rawRating = row[ratingCol];
      let pRating = 1500;
      if (typeof rawRating === 'number') {
        pRating = Math.round(rawRating);
      } else if (rawRating) {
        const parsed = parseInt(String(rawRating).replace(/[^\d]/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0) pRating = parsed;
      }

      const rawTitle = String(row[titleCol] ?? '').trim().toUpperCase();
      const pTitle = validTitles.has(rawTitle) ? (rawTitle as Player['title']) : undefined;

      const rawFed = String(row[fedCol] ?? '').trim().toUpperCase();
      const pFed = rawFed && rawFed.length <= 4 && rawFed !== 'NONE' ? rawFed : undefined;

      players.push({
        id: `p-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: rawName,
        rating: pRating,
        active: true,
        title: pTitle,
        federation: pFed,
      });
    }

    return players;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('Spreadsheet contains no sheets.');

        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false }) as any[][];
        const players = processRawRows(rawRows);
        if (players.length === 0) {
          throw new Error('No valid player rows found. Ensure columns include Name and Rating.');
        }

        setParsedPlayers(players);
      } catch (err: any) {
        console.error('File parse error:', err);
        setImportError(err.message || 'Failed to read file. Please ensure it is a valid CSV or Excel file.');
        setParsedPlayers([]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleParseText = () => {
    setImportError(null);
    if (!bulkText.trim()) return;

    try {
      const lines = bulkText.split('\n');
      const rows = lines.map((l) =>
        l.includes('\t') ? l.split('\t').map((p) => p.trim()) : l.split(',').map((p) => p.trim())
      );
      const players = processRawRows(rows);
      if (players.length === 0) {
        throw new Error('No valid players could be parsed from text.');
      }
      setParsedPlayers(players);
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse text.');
    }
  };

  const handleConfirmImport = (mode: 'append' | 'replace') => {
    if (isReadOnly) return;
    if (parsedPlayers.length === 0) return;

    if (mode === 'replace') {
      if (isTournamentStarted) {
        alert('Cannot replace roster after tournament rounds have started.');
        return;
      }
      onUpdatePlayers(parsedPlayers);
    } else {
      onUpdatePlayers([...tournament.players, ...parsedPlayers]);
    }

    setShowImportModal(false);
    setParsedPlayers([]);
    setImportFileName(null);
    setBulkText('');
  };

  // Clean template with no hardcoded sample players
  const handleDownloadSampleCsv = () => {
    const templateContent = 'Name,Rating,Title,Federation\n';
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'players_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const togglePlayerActive = (id: string) => {
    if (isReadOnly) return;
    const updated = tournament.players.map((p) => {
      if (p.id === id) {
        return { ...p, active: !p.active };
      }
      return p;
    });
    onUpdatePlayers(updated);
  };

  const deletePlayer = (id: string) => {
    if (isReadOnly) return;
    if (isTournamentStarted) {
      alert('Cannot delete players after tournament rounds have started. You can set them to Withdrawn instead.');
      return;
    }
    onUpdatePlayers(tournament.players.filter((p) => p.id !== id));
  };

  const toggleHalfPointBye = (playerId: string, roundNumber: number) => {
    if (isReadOnly) return;
    const updated = tournament.players.map((p) => {
      if (p.id === playerId) {
        const existing = p.halfPointByeRequestedRounds ?? [];
        const next = existing.includes(roundNumber)
          ? existing.filter((r) => r !== roundNumber)
          : [...existing, roundNumber];
        return { ...p, halfPointByeRequestedRounds: next };
      }
      return p;
    });
    onUpdatePlayers(updated);
  };

  const sortedPlayers = [...tournament.players].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  const activeCount = tournament.players.filter((p) => p.active).length;
  const avgRating =
    tournament.players.length > 0
      ? Math.round(
          tournament.players.reduce((sum, p) => sum + p.rating, 0) / tournament.players.length
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
            <span>Registered Players ({tournament.players.length})</span>
            {isReadOnly && (
              <span className="text-[11px] font-normal text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Read-Only View
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
            <span>{activeCount} Active</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Avg Rating: {avgRating}</span>
            <span aria-hidden="true">·</span>
            <span>
              {activeCount % 2 !== 0 ? (
                <span className="text-amber-400 font-medium">Odd count (1 bye per round)</span>
              ) : (
                <span className="text-neutral-400">Even count</span>
              )}
            </span>
          </div>
        </div>

        {/* Action Buttons for Directors */}
        {!isReadOnly && !isTournamentStarted && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
              title="Import players from CSV or Excel (.xlsx, .xls) spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-neutral-400" />
              <span>Import CSV / Excel</span>
            </button>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-neutral-950 rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Add Player</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Single Player Form */}
      {showAddForm && !isReadOnly && (
        <form
          onSubmit={handleAddPlayer}
          className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-5 gap-3"
        >
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Player Full Name</label>
            <input
              type="text"
              required
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Rating</label>
            <input
              type="number"
              required
              min="100"
              max="3500"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:border-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-neutral-400 mb-1">Title (Optional)</label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value as Player['title'])}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 font-mono focus:outline-none focus:border-white"
            >
              <option value="">None</option>
              <option value="GM">GM</option>
              <option value="IM">IM</option>
              <option value="FM">FM</option>
              <option value="CM">CM</option>
              <option value="WGM">WGM</option>
              <option value="WIM">WIM</option>
              <option value="WFM">WFM</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 py-1.5 px-3 bg-white hover:bg-neutral-200 text-black font-semibold text-xs rounded-lg transition-colors"
            >
              Save Player
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* CSV & Excel File Import Modal */}
      {showImportModal && !isReadOnly && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Import Players Spreadsheet</h3>
                  <p className="text-xs text-neutral-400">
                    Upload an Excel (.xlsx, .xls) or CSV (.csv) file
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setParsedPlayers([]);
                  setImportError(null);
                }}
                className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-Tabs: Upload File vs Paste Text */}
            <div className="flex border-b border-neutral-800 gap-4 text-xs font-semibold">
              <button
                onClick={() => setImportTab('file')}
                className={`pb-2 border-b-2 transition-all ${
                  importTab === 'file'
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Upload Excel / CSV File
              </button>
              <button
                onClick={() => setImportTab('text')}
                className={`pb-2 border-b-2 transition-all ${
                  importTab === 'text'
                    ? 'border-white text-white'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Paste Text
              </button>
            </div>

            {/* Error Message */}
            {importError && (
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-white" />
                <span>{importError}</span>
              </div>
            )}

            {/* TAB 1: File Upload */}
            {importTab === 'file' && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-700 hover:border-white bg-neutral-950 rounded-xl p-8 text-center cursor-pointer transition-all space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls, .tsv, .txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 mx-auto flex items-center justify-center text-white">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-200 block">
                      {importFileName ? importFileName : 'Click to choose CSV or Excel file'}
                    </span>
                    <span className="text-[11px] text-neutral-500 mt-0.5 block">
                      Supported: .xlsx, .xls, .csv, .txt
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
                  <span>Columns: Name, Rating, Title (optional), Federation (optional)</span>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="text-white hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Blank Template</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Text Paste */}
            {importTab === 'text' && (
              <div className="space-y-3">
                <p className="text-xs text-neutral-400">
                  Paste rows (one player per line):
                  <br />
                  <span className="font-mono text-[11px] text-neutral-300">Name, Rating, Title, Federation</span>
                </p>
                <textarea
                  rows={5}
                  placeholder={`Player Name, Rating, Title, Federation`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-100 font-mono focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={handleParseText}
                  className="px-3.5 py-1.5 text-xs font-medium text-black bg-white hover:bg-neutral-200 rounded-lg transition-colors font-semibold"
                >
                  Parse Text
                </button>
              </div>
            )}

            {/* Parsed Players Preview Table */}
            {parsedPlayers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-800 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{parsedPlayers.length} players ready to import</span>
                  </span>
                  <span className="text-neutral-400 font-mono text-[11px]">
                    Avg Rating: {Math.round(parsedPlayers.reduce((s, p) => s + p.rating, 0) / parsedPlayers.length)}
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto border border-neutral-800 rounded-xl bg-neutral-900">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 w-10">#</th>
                        <th className="py-2 px-3 font-sans">Name</th>
                        <th className="py-2 px-3 text-right">Rating</th>
                        <th className="py-2 px-3 text-center">Title</th>
                        <th className="py-2 px-3 text-center">Fed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      {parsedPlayers.slice(0, 50).map((p, i) => (
                        <tr key={i} className="hover:bg-neutral-800/40">
                          <td className="py-1.5 px-3 text-neutral-500">{i + 1}</td>
                          <td className="py-1.5 px-3 font-sans font-medium text-neutral-100">{p.name}</td>
                          <td className="py-1.5 px-3 text-right">{p.rating}</td>
                          <td className="py-1.5 px-3 text-center text-white font-semibold">{p.title || '—'}</td>
                          <td className="py-1.5 px-3 text-center text-neutral-400">{p.federation || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedPlayers.length > 50 && (
                    <div className="p-2 text-center text-[11px] text-neutral-500 bg-neutral-900/50">
                      + {parsedPlayers.length - 50} more players in file...
                    </div>
                  )}
                </div>

                {/* Import Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedPlayers([]);
                      setImportFileName(null);
                    }}
                    className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmImport('append')}
                    className="px-4 py-1.5 text-xs font-semibold bg-white hover:bg-neutral-200 text-black rounded-lg transition-colors"
                  >
                    Add {parsedPlayers.length} Players to Roster
                  </button>
                  {!isTournamentStarted && tournament.players.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleConfirmImport('replace')}
                      className="px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg transition-colors"
                      title="Replace current roster completely with imported list"
                    >
                      Replace Roster
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Roster Table */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 font-mono">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Seed</th>
                <th className="py-2.5 px-4 min-w-[200px]">Player Name</th>
                <th className="py-2.5 px-3 text-right">Rating</th>
                <th className="py-2.5 px-3 text-center">Title</th>
                <th className="py-2.5 px-3 text-center">Fed</th>
                <th className="py-2.5 px-4 text-center">Half-Point Byes (Rounds)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {!isReadOnly && <th className="py-2.5 px-3 text-center w-16">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {sortedPlayers.map((player, idx) => {
                const requestedByes = player.halfPointByeRequestedRounds ?? [];

                return (
                  <tr key={player.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-neutral-500">
                      {idx + 1}
                    </td>

                    <td className="py-2.5 px-4 font-medium text-neutral-100">
                      {player.name}
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-300">
                      {player.rating}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono">
                      {player.title ? (
                        <span className="text-[11px] font-semibold text-white bg-neutral-800 px-1 rounded">
                          {player.title}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-neutral-400">
                      {player.federation || '—'}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {Array.from({ length: tournament.roundsTotal }).map((_, rIdx) => {
                          const rNum = rIdx + 1;
                          const hasRequested = requestedByes.includes(rNum);
                          const roundAlreadyStarted = rNum <= tournament.rounds.length;

                          return (
                            <button
                              key={rNum}
                              disabled={isReadOnly || roundAlreadyStarted}
                              onClick={() => toggleHalfPointBye(player.id, rNum)}
                              className={`w-5 h-5 rounded text-[10px] font-mono transition-colors ${
                                hasRequested
                                  ? 'bg-white text-black font-bold'
                                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                              } ${isReadOnly || roundAlreadyStarted ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={
                                isReadOnly
                                  ? 'Read-only view'
                                  : roundAlreadyStarted
                                  ? `Round ${rNum} has already started`
                                  : `Toggle Half-Point Bye for Round ${rNum}`
                              }
                            >
                              {rNum}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {isReadOnly ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            player.active
                              ? 'bg-neutral-900 text-white border border-neutral-700'
                              : 'bg-neutral-950 text-neutral-500 border border-neutral-800'
                          }`}
                        >
                          {player.active ? 'Active' : 'Withdrawn'}
                        </span>
                      ) : (
                        <button
                          onClick={() => togglePlayerActive(player.id)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            player.active
                              ? 'bg-neutral-900 text-white border border-neutral-700'
                              : 'bg-neutral-950 text-neutral-500 border border-neutral-800'
                          }`}
                          title={player.active ? 'Click to set as Withdrawn' : 'Click to reactivate player'}
                        >
                          <Power className="w-2.5 h-2.5" />
                          <span>{player.active ? 'Active' : 'Withdrawn'}</span>
                        </button>
                      )}
                    </td>

                    {!isReadOnly && (
                      <td className="py-2.5 px-3 text-center">
                        {!isTournamentStarted && (
                          <button
                            onClick={() => deletePlayer(player.id)}
                            className="p-1 text-neutral-500 hover:text-white transition-colors"
                            title="Remove player"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}

              {sortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={isReadOnly ? 7 : 8} className="py-12 text-center text-xs text-neutral-500">
                    No players registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
