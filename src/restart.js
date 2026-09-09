import { emit } from "./events.js";
import { flightStep } from "./ball.js";
import { movementSpeed, restorePower } from "./attributes.js";
import { advanceSteering } from "./steering.js";
import { startInjury } from "./features.js";
import { advancePlayerPose } from "./player-pose.js";

export function beginRestart(s, pause = 0) {
  s.restartPhase = 1;
  s.restartTicks = 0;
  s.pause = pause;
  s.charge = [0, 0];
  s.ball = {
    x: 0,
    z: 0,
    h: 0.25,
    vx: 0,
    vz: 0,
    vh: 0,
    owner: -1,
    lastTouch: -1,
    lock: 0,
    after: 0,
    electric: 0,
    charged: false,
  };
}

// Match restart: prepare_ball_launch waits for every player, then the deck
// reaches frame 19 and the ball reaches frame 21 before the clock resumes.
export function restartStep(s, dt, launchPosition, medicalFormation = false) {
  if (!s.restartPhase && !medicalFormation) return false;
  if (s.restartPhase === 1 || medicalFormation) {
    // step_prepare_ball_launch clears temporary powers before formation.
    if (!medicalFormation && s.effect.kind) {
      restorePower(s);
      s.effect = { kind: 0, team: -1, time: 0 };
    }
    let ready = true;
    for (let slot = 0; slot < 9; slot++)
      for (const team of [1, 0]) {
        const i = team * 9 + slot,
          p = s.players[i];
        if (medicalFormation && s.medical.player === i) continue;
        p.actionTime = Math.max(0, p.actionTime - (p.fallPosePending ? 0 : dt));
        p.stun = Math.max(0, p.stun - (p.fallPosePending ? 0 : dt));
        p.aiWait = Math.max(0, (p.aiWait || 0) - dt);
        if (p.health <= 0) {
          if (advancePlayerPose(s, i, dt)) return true;
          if (!medicalFormation && startInjury(s, i)) return true;
          ready = false;
          continue;
        }
        if (p.actionTime > 1e-9 || p.aiWait > 1e-9) {
          ready = false;
          if (advancePlayerPose(s, i, dt)) return true;
          continue;
        }
        p.action = 0;
        p.jumping = false;
        const [x, z] = launchPosition(s, i),
          [vx, vz] = advanceSteering(p, x, z);
        const speed = movementSpeed(p, false);
        p.moveX = vx * speed;
        p.moveZ = vz * speed;
        p.x += Math.sign(vx) * Math.min(Math.abs(x - p.x), speed * dt);
        p.z += Math.sign(vz) * Math.min(Math.abs(z - p.z), speed * dt);
        if (p.x !== x || p.z !== z) {
          ready = false;
          p.fx = vx;
          p.fz = vz;
        } else {
          p.fx = (team === 0 ? 1 : -1) * (s.period === 2 ? -1 : 1);
          p.fz = 0;
          p.moveX = p.moveZ = 0;
        }
        // Formation movement still advances sprites in the original player pass.
        if (advancePlayerPose(s, i, dt)) return true;
      }
    if (ready && !medicalFormation) {
      emit(s, 22, -1, -1, 0, 0, 0.1);
      s.restartPhase = 2;
      s.restartTicks = 0;
    }
  } else {
    const previous = s.restartTicks;
    s.restartTicks += dt * 25;
    if (s.restartTicks >= 19) {
      if (previous < 19) emit(s, 23, -1, -1, 0, 0, 0.25);
      if (s.ball.flightKind !== 3) Object.assign(s.ball, {
        flightKind: 3, flightIndex: -1, flightStage: 0, flightFraction: 0, vh: 0,
      });
      flightStep(s.ball, (s.restartTicks - Math.max(19, previous)) / 25);
    }
    if (s.restartTicks >= 40 - 1e-9) s.restartPhase = 0;
  }
  return true;
}
