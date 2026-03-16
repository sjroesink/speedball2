// ============================================================
// Speedball 2: Brutal Deluxe — League Table UI Component
// ============================================================

import Phaser from 'phaser';
import { LeagueStanding } from '../utils/types';

const COLOR_AMBER  = '#f59e0b';
const COLOR_WHITE  = '#ffffff';
const FONT_SIZE    = 6;
const ROW_HEIGHT   = 9;

/**
 * Draws a formatted league table onto the scene.
 * Sorts standings by points (desc), then goal difference (desc).
 * First-place row is highlighted in amber.
 *
 * @param scene     The Phaser scene to add text objects to
 * @param x         Left X position for the table (text is left-aligned from here)
 * @param y         Top Y position of the header row
 * @param standings Array of LeagueStanding objects (will not be mutated)
 */
export function drawLeagueTable(
  scene: Phaser.Scene,
  x: number,
  y: number,
  standings: LeagueStanding[],
): void {
  // Sort: points desc, then goal-difference desc
  const sorted = [...standings].sort((a, b) => {
    const ptsDiff = b.points - a.points;
    if (ptsDiff !== 0) return ptsDiff;
    const gdA = a.pointsFor - a.pointsAgainst;
    const gdB = b.pointsFor - b.pointsAgainst;
    return gdB - gdA;
  });

  // Header
  const header = 'TEAM           P  W  D  L  PTS';
  scene.add.text(x, y, header, {
    fontSize: `${FONT_SIZE}px`,
    color: COLOR_AMBER,
    fontFamily: 'monospace',
  }).setOrigin(0, 0);

  y += ROW_HEIGHT + 2;

  // Rows
  sorted.forEach((s, idx) => {
    const gd   = s.pointsFor - s.pointsAgainst;
    const gdStr = gd >= 0 ? `+${gd}` : `${gd}`;
    // Pad team name to 13 chars
    const teamPad = s.teamName.padEnd(13, ' ').substring(0, 13);
    const row = [
      teamPad,
      String(s.played).padStart(2),
      String(s.won).padStart(2),
      String(s.drawn).padStart(2),
      String(s.lost).padStart(2),
      String(s.points).padStart(4),
    ].join('  ');

    // Suppress unused gdStr warning — kept for potential future use
    void gdStr;

    const color = idx === 0 ? COLOR_AMBER : COLOR_WHITE;
    scene.add.text(x, y, row, {
      fontSize: `${FONT_SIZE}px`,
      color,
      fontFamily: 'monospace',
    }).setOrigin(0, 0);

    y += ROW_HEIGHT;
  });
}
