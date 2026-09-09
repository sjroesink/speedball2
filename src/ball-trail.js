// Ten samples at 60 Hz retain the same trail duration at any rendering FPS.
export class BallTrail {
  constructor() { this.points = []; this.previous = null; this.remainder = 0; }
  update(position, dt, active) {
    if (!active) {
      this.points = []; this.previous = null; this.remainder = 0;
      return this.points;
    }
    const point = {x:position.x,y:position.y,z:position.z};
    const previous = this.previous;
    if (!previous || Math.hypot(point.x-previous.x,point.y-previous.y,point.z-previous.z)>5) {
      this.points = [point]; this.previous = point; this.remainder = 0;
      return this.points;
    }
    if (!(dt > 0)) return this.points;
    const interval = 1/60;
    // Long suspended frames must not draw a path through a stale position.
    if (dt > .25) {
      this.points = [point]; this.previous = point; this.remainder = 0;
      return this.points;
    }
    for (let elapsed=interval-this.remainder;elapsed<=dt+1e-9;elapsed+=interval) {
      const alpha=Math.min(1,elapsed/dt);
      this.points.unshift({x:previous.x+(point.x-previous.x)*alpha,
        y:previous.y+(point.y-previous.y)*alpha,z:previous.z+(point.z-previous.z)*alpha});
    }
    this.points.length=Math.min(10,this.points.length);
    this.remainder=(this.remainder+dt)%interval;
    if (this.remainder<1e-9 || interval-this.remainder<1e-9) this.remainder=0;
    this.previous=point;
    return this.points;
  }
}
