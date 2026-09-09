import { randomByte } from "./attributes.js";
const unit = 22.4 / 576;
// Amiga powerup_fns (0x4616), translated to our public effect identifiers.
const powerKinds = [10, 1, 3, 4, 5, 6, 7, 8, 2, 9, 11, 12];
function random(s) {
  randomByte(s);
  return s.rng[0] >>> 0;
}
// Amiga randomise_powerup_positions / randomise_coin_position: 16-unit grid.
export function spawnPickup(s, slot) {
  const item = s.pickups[slot];
  if (slot === 6) {
    const x = 72 + (random(s) & 0x1f0);
    const y = 72 + (random(s) & 0x3f0);
    const value = random(s);
    Object.assign(item, { x: (576 - y) * unit, z: (x - 320) * unit,
      kind: 14 + (((value >>> 16) + 1) & 7), wait: (value & 255) / 25, life: 0 });
    s.armourPickupsLeft = 2;
    return;
  }
  const coin = slot >= 2,
    quadrant = slot - 2;
  const x =
    72 + (random(s) & (coin ? 0xf0 : 0x1f0)) + (coin && quadrant % 2 ? 256 : 0);
  const y =
    72 + (random(s) & 0x1f0) + ((coin ? quadrant >= 2 : slot === 1) ? 512 : 0);
  item.x = (576 - y) * unit;
  item.z = (x - 320) * unit;
  if (coin) {
    item.kind = 13;
    item.wait = ((random(s) & 31) + 32) / 25;
  } else {
    let value, kind;
    do {
      value = random(s);
      kind = (value >>> 16) & 15;
    } while (kind >= 12 || (s.training && kind === 1));
    item.kind = powerKinds[kind];
    item.wait = ((value & 255) | 128) / 25;
  }
  item.life = 0; // Visible coins and powers remain until collected.
}
