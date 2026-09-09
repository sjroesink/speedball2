const unit = 22.4 / 576;

// target_predicted_position (0x10aaa), lookahead table 0x020a.
// Reflect once per axis, as the original does, including corner bounces.
export function predictedTarget(x, z, vx, vz, intelligence) {
  const shift = Math.max(0, Math.min(2, Math.floor((intelligence - 100) / 50)));
  const steps = 2 ** shift;
  let tx = Math.round(z / unit + 320) + Math.round(vz / unit / 25) * steps;
  let ty = Math.round(576 - x / unit) - Math.round(vx / unit / 25) * steps;
  if (tx <= 32) tx = 64 - tx;
  else if (tx >= 608) tx = 1216 - tx;
  if (ty <= 32) ty = 64 - ty;
  else if (ty >= 1120) ty = 2240 - ty;
  return [(576 - ty) * unit, (tx - 320) * unit];
}

// start_moving_towards_target / move_towards_target: integer half-axis
// direction tests, a 32-unit near-target box and separate axis arrival.
export function steerToTarget(p, x, z, fresh = false) {
  const dx = Math.round(x / unit) - Math.round(p.x / unit);
  const dz = Math.round(z / unit) - Math.round(p.z / unit);
  const ax = Math.abs(dx),
    az = Math.abs(dz);
  const near = !fresh && ax <= 32 && az <= 32;
  let vx = near || ax > Math.floor(az / 2) ? Math.sign(dx) : 0;
  let vz = near || az > Math.floor(ax / 2) ? Math.sign(dz) : 0;
  if (ax < 4) {
    p.x = x;
    vx = 0;
  }
  if (az < 4) {
    p.z = z;
    vz = 0;
  }
  return [vx, vz];
}
