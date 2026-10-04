/**
 * FIDE Dutch System (C.04.3) Arbiter Compliance Audit
 * Inspects all rounds and games for Absolute Criteria C1, C2, C3, C4.
 */

import React from 'react';
import { Player, Round, Tournament } from '../types/tournament';
import { validateTournamentRules } from '../engine/rulesValidator';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

interface RulesAuditModalProps {
  tournament: Tournament;
}

export const RulesAuditModal: React.FC<RulesAuditModalProps> = ({ tournament }) => {
  const report = validateTournamentRules(tournament.players, tournament.rounds);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              report.isValid
                ? 'bg-neutral-950 border border-neutral-700 text-white'
                : 'bg-neutral-950 border border-neutral-700 text-neutral-300'
            }`}
          >
            {report.isValid ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-neutral-100">
                FIDE Dutch Swiss Invariants Audit (C.04.3)
              </h2>
              {report.isValid ? (
                <span className="text-[11px] font-semibold text-white bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
                  100% FIDE Compliant
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-white bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-700">
                  {report.violations.length} Violations Detected
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              Automatic arbiter verification auditing all {tournament.rounds.length} rounds and{' '}
              {report.statistics.totalGames} games against absolute pairing criteria C1, C2, C3, and C4.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 text-xs font-mono border-t sm:border-t-0 sm:border-l border-neutral-800 pt-4 sm:pt-0 sm:pl-6 shrink-0">
          <div>
            <div className="text-neutral-500 text-[10px]">Total Games</div>
            <div className="text-sm font-bold text-neutral-200 tabular-nums">
              {report.statistics.totalGames}
            </div>
          </div>
          <div>
            <div className="text-neutral-500 text-[10px]">Byes (PAB)</div>
            <div className="text-sm font-bold text-neutral-200 tabular-nums">
              {report.statistics.totalByes}
            </div>
          </div>
          <div>
            <div className="text-neutral-500 text-[10px]">Avg Color Diff</div>
            <div className="text-sm font-bold text-neutral-200 tabular-nums">
              {report.statistics.colorBalanceAvg}
            </div>
          </div>
          <div>
            <div className="text-neutral-500 text-[10px]">Max Diff</div>
            <div className="text-sm font-bold text-neutral-200 tabular-nums">
              ±{report.statistics.maxColorDiff}
            </div>
          </div>
        </div>
      </div>

      {/* The 4 Absolute Criteria Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* C1 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-white">Criterion C1</span>
            {report.c1Passed ? (
              <span className="text-white flex items-center gap-1 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-white" /> Passed
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1 text-xs font-medium">
                <XCircle className="w-4 h-4 text-neutral-400" /> Violation
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-neutral-200">No Duplicate Pairings</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Two players shall not play each other more than once in the same tournament. Checked across all pairings
            in rounds 1 through {tournament.rounds.length || 1}.
          </p>
        </div>

        {/* C2 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-white">Criterion C2</span>
            {report.c2Passed ? (
              <span className="text-white flex items-center gap-1 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-white" /> Passed
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1 text-xs font-medium">
                <XCircle className="w-4 h-4 text-neutral-400" /> Violation
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-neutral-200">Bye Allocation Invariants</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            A player cannot receive a Pairing Allocated Bye (PAB) more than once, nor receive a PAB if they have
            already received an unplayed win (e.g. forfeit win).
          </p>
        </div>

        {/* C3 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-white">Criterion C3</span>
            {report.c3Passed ? (
              <span className="text-white flex items-center gap-1 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-white" /> Passed
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1 text-xs font-medium">
                <XCircle className="w-4 h-4 text-neutral-400" /> Violation
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-neutral-200">No 3 Consecutive Same Colors</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            No player shall be assigned the same color three times in succession (i.e. neither W-W-W nor B-B-B is
            permitted under any circumstances).
          </p>
        </div>

        {/* C4 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-white">Criterion C4</span>
            {report.c4Passed ? (
              <span className="text-white flex items-center gap-1 text-xs font-medium">
                <CheckCircle2 className="w-4 h-4 text-white" /> Passed
              </span>
            ) : (
              <span className="text-neutral-400 flex items-center gap-1 text-xs font-medium">
                <XCircle className="w-4 h-4 text-neutral-400" /> Violation
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-neutral-200">Color Difference Limit (|diff| ≤ 2)</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            No player's total color difference (White games minus Black games) may exceed +2 or -2 after any round.
          </p>
        </div>
      </div>

      {/* Violation Detail Log if any */}
      {report.violations.length > 0 && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            Violations Audit Log ({report.violations.length})
          </h3>
          <div className="space-y-2">
            {report.violations.map((v, idx) => (
              <div
                key={idx}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{v.title}</span>
                  {v.roundNumber && (
                    <span className="font-mono text-neutral-500">Round {v.roundNumber}</span>
                  )}
                </div>
                <p className="text-neutral-300">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official FIDE Dutch Rules Reference Box */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-5 text-xs text-neutral-400 space-y-2">
        <h4 className="font-semibold text-neutral-300">FIDE Swiss Rules Reference (Handbook Section C.04.3)</h4>
        <p>
          The Dutch System is the primary FIDE Swiss pairing system. It divides players into score groups, sorts by
          rating, and matches the top half of each group with the bottom half while strictly maintaining absolute
          criteria C1 through C4. When an odd player must move between brackets, the downfloater is chosen to maximize
          legal pairing count and minimize score gap divergence.
        </p>
      </div>
    </div>
  );
};
