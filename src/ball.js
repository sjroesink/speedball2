import { velocityUnit } from "./attributes.js";

// set_ball_speed (0x108e0): throw controls the time before velocity steps down.
export function setBallSpeed(ball, attribute) {
  ball.speedTimer = attribute >>> 1;
  ball.nextSlowdown = (attribute >>> 2) + (attribute >>> 3) + (attribute >>> 4);
  ball.slowFraction = 0;
}
export function slowBallFrame(ball) {
  if (ball.owner >= 0 || (!ball.vx && !ball.vz)) return;
  // Original longitudinal coordinates 48..1104, centered at 576.
  const terrainY = Math.round(576 - ball.x / (22.4 / 576));
  if (ball.vx && (terrainY < 48 || terrainY > 1104)) return;
  const timer = ball.speedTimer ?? 0;
  const next = ball.nextSlowdown ?? 0;
  if (timer === 0 || next > timer) {
    if (timer > 0) ball.nextSlowdown = (next >>> 1) + (next >>> 2);
    for (const key of ["vx", "vz"]) {
      const value = ball[key];
      let reduced =
        Math.sign(value) * Math.max(0, Math.abs(value) - velocityUnit);
      if (Math.abs(reduced) < 1e-9) reduced = 0;
      // step_slow_ball preserves the final velocity unit while airborne.
      if (reduced !== 0 || ball.h <= 0.25) ball[key] = reduced;
    }
  }
  if (timer > 0) ball.speedTimer = timer - 1;
}
export function slowBall(ball, dt) {
  ball.slowFraction = (ball.slowFraction ?? 0) + dt * 25;
  while (ball.slowFraction >= 1 - 1e-9) {
    ball.slowFraction = Math.max(0, ball.slowFraction - 1);
    slowBallFrame(ball);
  }
}

export function reflectBall(ball, axis) {
  const velocity = axis === "x" ? "vx" : "vz";
  const direction = axis === "x" ? "dirX" : "dirZ";
  ball[velocity] = -ball[velocity];
  if (ball[direction] !== undefined) ball[direction] = -ball[direction];
  if (axis === "x") ball.speedTimer = Math.ceil((ball.speedTimer ?? 0) / 2);
}
export function warpBall(ball, attribute) {
  let dx = ball.dirX,
    dz = ball.dirZ;
  if (dx === undefined || dz === undefined) {
    const angle =
      (Math.round(Math.atan2(ball.vz, ball.vx) / (Math.PI / 4)) * Math.PI) / 4;
    dx = Math.round(Math.cos(angle));
    dz = Math.round(Math.sin(angle));
  }
  ball.z = -Math.sign(ball.z) * 11.2;
  const drift = ball.vz;
  ball.vx = dx * 8 * velocityUnit;
  ball.vz = dz === 0 ? drift : dz * 8 * velocityUnit;
  ball.dirX = dx;
  ball.dirZ = dz;
  setBallSpeed(ball, attribute);
}

// throwing_action_fn 0x10882: only a zero component can receive release input.
export function steerRelease(ball, input = {}) {
  if (ball.vz === 0) ball.vz = Math.sign(input.z || 0) * 4 * velocityUnit;
  else if (ball.vx === 0) ball.vx = Math.sign(input.x || 0) * 4 * velocityUnit;
}

// Amiga memory 0x6c32 / 0x6c94; -2 terminator holds the final ground stage.
export const highFlight = [
  1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6,
  6, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 1, 1, 0,
];
// Amiga anim_ball_launch at 0x6d8a; final -2 holds the last stage.
export const launchFlight = [0,7,7,8,8,9,9,10,10,6,6,6,6,6,6,6,6,6,6,6,6,6,6,10,10,9,9,8,8,7,7,0];
export const lowFlight = [...Array(16).fill(1), 0];
export function startFlight(b, high) {
  b.flightKind = high ? 2 : 1;
  b.flightIndex = -1;
  b.flightFraction = 0;
  b.flightStage = 1;
  b.h = 0.75;
  b.vh = 0;
}
export function flightStep(b, dt) {
  if (!b.flightKind) return false;
  b.flightFraction += dt * 25;
  const frames = b.flightKind === 3 ? launchFlight : b.flightKind === 2 ? highFlight : lowFlight;
  while (b.flightFraction >= 1 - 1e-9) {
    b.flightFraction = Math.max(0, b.flightFraction - 1);
    b.flightIndex = Math.min(b.flightIndex + 1, frames.length - 1);
    b.flightStage = frames[b.flightIndex];
  }
  // Launch sprites 7..10 depict the near-deck ascent/descent.
  const heightStage = b.flightKind === 3 && b.flightStage >= 7 ? b.flightStage - 6 : b.flightStage;
  b.h = 0.25 + heightStage * 0.5;
  b.vh = 0;
  return true;
}
