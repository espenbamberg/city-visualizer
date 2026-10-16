export function entranceProgress(elapsed, delay, duration) {
  const t = Math.max(0, Math.min(1, (elapsed-delay)/duration));
  return t*t*t*(t*(t*6-15)+10);
}

// Exact critically damped spring; position and velocity survive a new target.
export function spring(state, target, dt) {
  const w = 24, t = Math.max(0, Math.min(dt, .05));
  const offset = state.x - target, c = state.v + w * offset, decay = Math.exp(-w * t);
  state.x = target + (offset + c * t) * decay;
  state.v = (state.v - w * c * t) * decay;
  if (Math.abs(state.x - target) < .0001 && Math.abs(state.v) < .001) { state.x = target; state.v = 0; }
  return state;
}

export function pointAlong(points, progress) {
  const lengths = points.slice(1).map((p,i) => Math.hypot(...p.map((n,j) => n-points[i][j])));
  let remaining = Math.max(0, Math.min(1, progress)) * lengths.reduce((a,b) => a+b, 0);
  for (let i=0; i<lengths.length; i++) {
    if (lengths[i] > 0 && remaining < lengths[i]) return points[i].map((n,j) => n+(points[i+1][j]-n)*remaining/lengths[i]);
    remaining -= lengths[i];
  }
  return [...points.at(-1)];
}
