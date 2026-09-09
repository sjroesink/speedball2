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
