/**
 * En Passant — Tournament Export, PDF Download & Backup Modal
 */

import React, { useState } from 'react';
import { Tournament, StandingsRow } from '../types/tournament';
import { Download, Upload, Copy, Check, FileDown, FileText, Printer } from 'lucide-react';
import { exportPairingsPdf, exportStandingsPdf } from '../utils/pdfExport';

interface ExportImportModalProps {
  tournament: Tournament;
  standings: StandingsRow[];
  onImportTournament: (imported: Tournament) => void;
  onClose: () => void;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  tournament,
  standings,
  onImportTournament,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'export' | 'csv' | 'import'>('pdf');
  const [importJson, setImportJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState('');

  const jsonString = JSON.stringify(tournament, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament.name.toLowerCase().replace(/\s+/g, '_')}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    let csv = 'Rank,Name,Title,Rating,Score,DirectEncounter,BuchholzCut1,Buchholz,SonnebornBerger,Progressive,Wins,GamesPlayed\n';
    for (const row of standings) {
      csv += `${row.rank},"${row.name}",${row.title || ''},${row.rating},${row.score},${row.directEncounter},${row.buchholzCut1},${row.buchholz},${row.sonnebornBerger},${row.cumulativeScore},${row.wins},${row.gamesPlayed}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tournament.name.toLowerCase().replace(/\s+/g, '_')}_standings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    try {
      setImportError('');
      const parsed = JSON.parse(importJson);
      if (!parsed.players || !Array.isArray(parsed.players)) {
        throw new Error('Invalid tournament data format: missing players array');
      }
      onImportTournament(parsed);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse tournament JSON.');
    }
  };

  const currentRoundNum = tournament.rounds.length > 0 ? tournament.rounds.length : 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Export & Download Documents</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 text-sm p-1 rounded hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        {/* Modal Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 px-4 gap-2 pt-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`px-3 py-2 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'pdf'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>PDF Documents</span>
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'csv'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            CSV Standings
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            JSON Backup
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-2 border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Restore Backup
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* TAB: PDF Documents */}
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <p className="text-neutral-400">
                Generate and download official PDF documents for print distribution and bulletin notices.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {/* Standings PDF */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white text-xs block">Official Standings PDF</span>
                    <p className="text-[11px] text-neutral-400">
                      Landscape formatted ranking table with Buchholz, Sonneborn-Berger, and Direct Encounter tiebreakers.
                    </p>
                  </div>
                  <button
                    onClick={() => exportStandingsPdf(tournament, standings)}
                    className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download Standings PDF</span>
                  </button>
                </div>

                {/* Round Pairings PDF */}
                <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-white text-xs block">
                      Round {currentRoundNum} Pairings PDF
                    </span>
                    <p className="text-[11px] text-neutral-400">
                      Printable board pairing sheet with board numbers, player titles, ratings, and recorded outcomes.
                    </p>
                  </div>
                  <button
                    onClick={() => exportPairingsPdf(tournament, currentRoundNum, standings)}
                    className="w-full py-2 px-3 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download Round {currentRoundNum} PDF</span>
                  </button>
                </div>
              </div>

              {/* All Rounds Quick Export */}
              {tournament.rounds.length > 1 && (
                <div className="space-y-2 pt-2 border-t border-neutral-850">
                  <span className="font-semibold text-neutral-300 block">Download Previous Round Pairings:</span>
                  <div className="flex flex-wrap gap-2">
                    {tournament.rounds.map((r) => (
                      <button
                        key={r.roundNumber}
                        onClick={() => exportPairingsPdf(tournament, r.roundNumber, standings)}
                        className="px-2.5 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md transition-colors flex items-center gap-1"
                      >
                        <FileDown className="w-3 h-3 text-amber-400" />
                        <span>Round {r.roundNumber} PDF</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CSV Standings */}
          {activeTab === 'csv' && (
            <div className="space-y-3">
              <p className="text-neutral-400">
                Download a clean comma-separated (.csv) file of the complete tournament standings for spreadsheet analysis.
              </p>
              <button
                onClick={handleDownloadCsv}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Standings CSV</span>
              </button>
            </div>
          )}

          {/* TAB: JSON Backup */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              <p className="text-neutral-400">
                Complete tournament backup in standard JSON format (includes all rounds, pairings, results, and players).
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadJson}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json Backup</span>
                </button>
                <button
                  onClick={handleCopyJson}
                  className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={jsonString}
                className="w-full h-44 bg-neutral-950 border border-neutral-800 rounded-xl p-3 font-mono text-[11px] text-neutral-400 focus:outline-none"
              />
            </div>
          )}

          {/* TAB: Restore Backup */}
          {activeTab === 'import' && (
            <div className="space-y-3">
              <p className="text-neutral-400">
                Paste raw tournament JSON to restore tournament data:
              </p>
              {importError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {importError}
                </div>
              )}
              <textarea
                rows={7}
                placeholder="Paste tournament JSON here..."
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 font-mono text-[11px] text-neutral-200 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleImportSubmit}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold rounded-lg transition-colors"
              >
                Restore Tournament Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
