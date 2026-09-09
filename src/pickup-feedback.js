import { powerNames } from './features.js';

export function pickupMessage(event, viewingTeam) {
  const owner = Math.floor(event.actor / 9) === viewingTeam ? 'YOUR TEAM' : 'OPPONENT';
  if (event.target === 13) return `${owner} · +100 CREDITS`;
  if (event.target >= 14) return `${owner} · ${powerNames[event.target]} UPGRADE`;
  return `${owner} · ${powerNames[event.target]}`;
}

export function equipmentMessage(player) {
  if (!player.gear) return 'GOLD: CREDITS · BLUE: POWER · ORANGE: UPGRADE';
  const value = player.stats?.[player.gear - 14];
  return `EQUIPMENT: ${powerNames[player.gear]}${Number.isFinite(value) ? ` ${value}` : ''} · LOST WHEN HIT`;
}
