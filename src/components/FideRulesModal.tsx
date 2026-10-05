/**
 * En Passant — Official FIDE Swiss System Rules Reference Modal
 * Conforms strictly to FIDE Swiss Rules (FIDE Handbook C.04.1 & C.04.3 Dutch System)
 * Transparently explains the 9 core Swiss System rules and how En Passant enforces them.
 */

import React from 'react';
import { X, CheckCircle2, Shield, Info, ArrowRight, BookOpen, Scale, Award } from 'lucide-react';

interface FideRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FideRulesModal: React.FC<FideRulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const rules = [
    {
      num: 1,
      title: 'Declared Number of Rounds',
      fideText: 'The number of rounds to be played is declared beforehand.',
      implementation:
        'En Passant declares total rounds at tournament creation (typically 3 to 11 rounds based on field size). The round count remains fixed throughout the competition.',
    },
    {
      num: 2,
      title: 'No Repeat Pairings',
      fideText: 'Two participants shall not play against each other more than once.',
      implementation:
        'Strict absolute criterion (FIDE Dutch C1). Backtracking solver guarantees that no two players are ever paired against each other more than once in the same tournament.',
    },
    {
      num: 3,
      title: 'Pairing-Allocated Bye (PAB)',
      fideText:
        'Should the number of participants to be paired be odd, one participant is not paired. This participant receives a pairing-allocated bye: no opponent, no colour and as many points as are rewarded for a win, unless the rules of the tournament state otherwise. This number of points shall be the same for all pairing-allocated byes.',
      implementation:
        'When an odd number of active players must be paired, the eligible player from the lowest score bracket receives a 1.0 point PAB with no assigned color or opponent.',
    },
    {
      num: 4,
      title: 'No Multiple Unplayed Win Points',
      fideText:
        'A participant who has already received a pairing allocated bye, or has already scored in one single round, without playing, as many points as rewarded for a win, shall not receive the pairing allocated bye.',
      implementation:
        'FIDE Dutch C2 criterion: Any player who already received a PAB, or an unplayed forfeit win (1-0F or 0-1F), is strictly disqualified from receiving a future PAB.',
    },
    {
      num: 5,
      title: 'Same Score Group Pairing (Points Priority)',
      fideText: 'In general, participants are paired to others with the same score.',
      implementation:
        'Points are the highest priority in pairing (FIDE Rule 5). Players in the same score group (e.g. 2 wins / 2.0 pts) are paired together. Color break exceptions are applied when necessary to prioritize matching players with the same score over color preferences.',
    },
    {
      num: 6,
      title: 'Color Difference Limits (±2)',
      fideText:
        'For each participant the difference between the number of rounds they play with Black and the number of rounds they play with White shall not be greater than 2 or less than -2. Each pairing system may have exceptions to this rule.',
      implementation:
        'FIDE Dutch C4 criterion: The engine ensures a player’s color difference remains within -2 and +2. In rare late-round deadlocks where points must be prioritized, an official color break exception is executed to preserve same-score competition.',
    },
    {
      num: 7,
      title: 'Maximum Two Consecutive Same Colors',
      fideText:
        'No participants shall receive the same colour three times in a row. Each pairing system may have exceptions to this rule.',
      implementation:
        'FIDE Dutch C3 criterion: No player is assigned three consecutive Whites or three consecutive Blacks under normal operation. If two players with equal scores both have the same color history, the color break allocates preferred color to the higher seed.',
    },
    {
      num: 8,
      title: 'Color Allocation Priority & Alternation',
      fideText:
        'In general, a participant is given the colour with which they played fewer rounds. If colours are already balanced, then, in general, the participant is given the colour that alternates from the last one with which they played.',
      implementation:
        'Players with color deficits are awarded their deficient color. When colors are equal (0 diff), color alternates from previous round. In ties between players with the same preference, the higher-seeded participant receives priority.',
    },
    {
      num: 9,
      title: 'Full Pairing Transparency',
      fideText:
        'The pairing rules must be such transparent that the person who is in charge for the pairing can explain them.',
      implementation:
        'Every game displays transparent pairing rationale (Score Group, Color Preference, Alternation, or Color Break reason) so arbiters, players, and spectators can inspect and understand every pairing decision.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center font-bold text-white text-base">
              ♞
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Official FIDE Swiss System Rules</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700">
                  FIDE Handbook C.04
                </span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                9 General Swiss Rules strictly implemented by En Passant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Key Principle Banner */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-start gap-3">
            <Scale className="w-4 h-4 text-white shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-white block">
                FIDE Core Principle: Points Take Priority Over Color
              </span>
              <p className="text-neutral-400 leading-relaxed">
                Under official FIDE Swiss regulations, pairing participants with the same score is the fundamental rule. When two players share the top score (e.g. 2 wins out of 2) and both had Black or both had White, a <strong>Color Break</strong> occurs: the players are paired together and the higher seed receives their preferred color.
              </p>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.num}
                className="bg-neutral-900/50 border border-neutral-800/80 rounded-xl p-4 space-y-2 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-800 text-white font-mono font-bold text-[11px] flex items-center justify-center border border-neutral-700">
                      {rule.num}
                    </span>
                    <span className="font-bold text-white text-xs">{rule.title}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    <span>Compliant</span>
                  </span>
                </div>

                {/* Official Rule Text */}
                <div className="pl-7">
                  <blockquote className="border-l-2 border-neutral-700 pl-3 py-1 italic text-neutral-300 text-xs">
                    "{rule.fideText}"
                  </blockquote>
                </div>

                {/* Engine Implementation */}
                <div className="pl-7 pt-1 flex items-start gap-2 text-neutral-400 text-[11px] leading-relaxed">
                  <ArrowRight className="w-3 h-3 text-neutral-500 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-neutral-300">En Passant Engine:</strong> {rule.implementation}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-900/50">
          <span className="text-[11px] text-neutral-500 font-mono">
            Deterministic FIDE Dutch Pairing Solver
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-colors"
          >
            Close Rules
          </button>
        </div>
      </div>
    </div>
  );
};
