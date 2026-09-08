const unit = 22.4 / 576;

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
