const unit = 22.4 / 576;

// Preserve useful court coverage while filling portrait and wide displays.
export function cameraExtent(aspect) {
  const halfHeight = Math.max(92 * unit, (160 * unit) / aspect);
  return { halfWidth: halfHeight * aspect, halfHeight };
}

export function damping(rate, dt) {
  return 1 - Math.exp(-rate * Math.max(0, dt));
}

export function cameraTarget(x, z, extent) {
  const bound = (value, limit) => Math.max(-limit, Math.min(limit, value));
  return {
    x: bound(x, Math.max(0, 23.2 - extent.halfHeight)),
    z: bound(z, Math.max(0, 12 - extent.halfWidth)),
  };
}

// Interpolate headings over the shortest arc, including the -PI/PI seam.
export function smoothFacing(current, target, dt) {
  const delta = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  // Bound abrupt AI/snapshot reversals to 720 degrees per second. Integrate
  // the capped exponential exactly so rendering FPS does not change the turn.
  const rate = 16, maxSpeed = 4 * Math.PI;
  const distance = Math.abs(delta), threshold = maxSpeed / rate;
  const elapsed = Math.max(0, dt);
  const linearTime = Math.max(0, (distance - threshold) / maxSpeed);
  const linear = Math.min(elapsed, linearTime);
  const remaining = (distance - maxSpeed * linear) *
    Math.exp(-rate * (elapsed - linear));
  return current + Math.sign(delta) * (distance - remaining);
}
