/**
 * En Passant — PDF Generation & Export Utility
 * Exports clean, official tournament documents:
 * - Round Pairings & Results PDF
 * - Official Standings & Tiebreakers PDF
 * - Crosstable Matrix PDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tournament, StandingsRow, Player } from '../types/tournament';

function addDocumentHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 25);
  doc.text(title, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 110);
  doc.text(subtitle, 14, 25);

  doc.setDrawColor(220, 220, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 28, doc.internal.pageSize.getWidth() - 14, 28);
}

function addDocumentFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    const text = `En Passant Chess Platform · Page ${i} of ${pageCount}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.text(text, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }
}

/**
 * Downloads a PDF of pairings and results for a specific round
 */
export function exportPairingsPdf(
  tournament: Tournament,
  roundNumber: number,
  standings?: StandingsRow[]
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const round = tournament.rounds.find((r) => r.roundNumber === roundNumber);
  const playerMap = new Map<string, Player>(tournament.players.map((p) => [p.id, p]));
  const scoreMap = new Map<string, number>(standings ? standings.map((s) => [s.playerId, s.score]) : []);

  const title = tournament.name;
  const subtitle = `Round ${roundNumber} Pairings & Results · ${tournament.format.toUpperCase()} · ${new Date().toLocaleDateString()}`;
  addDocumentHeader(doc, title, subtitle);

  if (!round || !round.games || round.games.length === 0) {
    doc.setFontSize(11);
    doc.text('No pairings available for this round.', 14, 38);
    doc.save(`${sanitizeFileName(tournament.name)}_Round_${roundNumber}_Pairings.pdf`);
    return;
  }

  const tableRows = round.games.map((game, idx) => {
    const white = game.whitePlayerId ? playerMap.get(game.whitePlayerId) : null;
    const black = game.blackPlayerId ? playerMap.get(game.blackPlayerId) : null;

    if (!game.whitePlayerId || !game.blackPlayerId) {
      const byePlayer = white || black;
      return [
        'BYE',
        byePlayer ? `${byePlayer.title ? byePlayer.title + ' ' : ''}${byePlayer.name}` : 'Unknown',
        byePlayer ? String(byePlayer.rating) : '—',
        game.result === 'BYE_PAB' ? '+1.0' : '+0.5',
        'HALF/PAB BYE',
        '—',
        '—',
        '—',
      ];
    }

    const wScore = scoreMap.has(game.whitePlayerId) ? `[${scoreMap.get(game.whitePlayerId)}p]` : '';
    const bScore = scoreMap.has(game.blackPlayerId) ? `[${scoreMap.get(game.blackPlayerId)}p]` : '';

    const wName = `${white?.title ? white.title + ' ' : ''}${white?.name || 'Unknown'} ${wScore}`;
    const bName = `${black?.title ? black.title + ' ' : ''}${black?.name || 'Unknown'} ${bScore}`;

    return [
      String(game.boardNumber ?? idx + 1),
      wName,
      String(white?.rating || '—'),
      game.result ? formatResultDisplay(game.result) : '—',
      String(black?.rating || '—'),
      bName,
    ];
  });

  autoTable(doc, {
    startY: 32,
    head: [['Brd', 'White Player', 'Elo', 'Result', 'Elo', 'Black Player']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      textColor: [30, 30, 35],
    },
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'left' },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
  });

  addDocumentFooter(doc);
  doc.save(`${sanitizeFileName(tournament.name)}_Round_${roundNumber}_Pairings.pdf`);
}

/**
 * Downloads a PDF of official Standings and tiebreakers
 */
export function exportStandingsPdf(tournament: Tournament, standings: StandingsRow[]): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const title = tournament.name;
  const currentRnd = tournament.rounds.length;
  const subtitle = `Official Standings & FIDE Tiebreakers · After Round ${currentRnd} of ${tournament.roundsTotal} · ${new Date().toLocaleDateString()}`;
  addDocumentHeader(doc, title, subtitle);

  const tableRows = standings.map((row) => [
    String(row.rank),
    `${row.title ? row.title + ' ' : ''}${row.name}`,
    String(row.rating),
    String(row.score),
    String(row.directEncounter),
    String(row.buchholzCut1),
    String(row.buchholz),
    String(row.sonnebornBerger),
    String(row.cumulativeScore),
    String(row.wins),
    String(row.gamesPlayed),
    row.active ? 'Active' : 'Withdrawn',
  ]);

  autoTable(doc, {
    startY: 32,
    head: [['Rk', 'Player Name', 'Elo', 'Pts', 'DE', 'BH-C1', 'BH', 'SB', 'Prog', 'W', 'Pl', 'Status']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      textColor: [30, 30, 35],
    },
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      1: { halign: 'left' },
      2: { halign: 'right', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 16, fontStyle: 'bold', textColor: [180, 83, 9] },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 16 },
      6: { halign: 'right', cellWidth: 16 },
      7: { halign: 'right', cellWidth: 16 },
      8: { halign: 'right', cellWidth: 14 },
      9: { halign: 'center', cellWidth: 12 },
      10: { halign: 'center', cellWidth: 12 },
      11: { halign: 'center', cellWidth: 20 },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 250],
    },
  });

  addDocumentFooter(doc);
  doc.save(`${sanitizeFileName(tournament.name)}_Standings.pdf`);
}

function formatResultDisplay(res: string): string {
  if (res === '1/2-1/2') return '½ - ½';
  return res;
}

function sanitizeFileName(name: string): string {
  return (name || 'Tournament').replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 30);
}
