import { active } from "./features.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clamp, jumpHeight } from "./game.js";

export class ArenaRenderer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#090f17");
    this.scene.fog = new THREE.Fog("#090f17", 55, 110);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.prepend(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 150);
    this.camera.position.set(-30, 42, 22);
    this.camera.lookAt(0, 0, 0);
    this.focus = new THREE.Vector3();
    this.players = [];
    this.effects = [];
    this.lastEvent = 0;
    this.follow = false;
    this.scene.add(new THREE.HemisphereLight(0xbcddff, 0x233341, 2.4));
    const l = new THREE.DirectionalLight(0xd5edff, 2.6);
    l.position.set(-10, 30, 5);
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    Object.assign(l.shadow.camera, {
      left: -27,
      right: 27,
      top: 27,
      bottom: -27,
    });
    this.scene.add(l);
    for (const [x, color] of [
      [-19, 0x00cfff],
      [19, 0xff4b1b],
    ]) {
      const p = new THREE.PointLight(color, 45, 16);
      p.position.set(x, 3, 0);
      this.scene.add(p);
    }
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.68, 0.82, 40),
      new THREE.MeshBasicMaterial({ color: 0xb0f16c, side: THREE.DoubleSide }),
    );
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.position.y = 0.1;
    this.scene.add(this.marker);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.shadow);
    this.aim = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(),
      2.8,
      0xb0f16c,
      0.65,
      0.38,
    );
    this.scene.add(this.aim);
    new ResizeObserver(() => this.resize()).observe(container);
  }
  async load() {
    const loader = new GLTFLoader();
    const [arena, cyan, orange, ball, impact, pickups, medic] =
      await Promise.all(
        [
          "arena",
          "player-cyan",
          "player-orange",
          "ball",
          "impact",
          "pickups",
          "medic",
        ].map((n) => loader.loadAsync(`/assets/${n}.glb`)),
      );
    this.scene.add(arena.scene);
    this.pickupBank = pickups.scene;
    this.pickupMeshes = Array.from({ length: 7 }, () => ({
      kind: 0,
      mesh: null,
    }));
    this.medics = Array.from({ length: 18 }, () => {
      const m = medic.scene.clone();
      m.visible = false;
      this.scene.add(m);
      return m;
    });
    this.goalShields = [];
    arena.scene.traverse((o) => {
      if (o.isMesh && o.name.startsWith("GoalShield")) {
        o.visible = false;
        o.material = o.material.clone();
        o.material.transparent = true;
        o.material.opacity = 0.45;
        this.goalShields.push(o);
      }
    });

    arena.scene.traverse((o) => {
      if (o.isMesh) {
        o.receiveShadow = true;
        o.castShadow = true;
      }
    });
    this.stars = [];
    arena.scene.traverse((o) => {
      if (o.name.startsWith("Star_") && o.isMesh) {
        o.material = o.material.clone();
        this.stars.push(o);
      }
    });
    this.players = Array.from({ length: 18 }, (_, i) => {
      const gltf = i < 9 ? cyan : orange,
        wrapper = new THREE.Group(),
        model = gltf.scene.clone();
      wrapper.add(model);
      this.scene.add(wrapper);
      model.traverse((m) => {
        if (m.isMesh) {
          m.castShadow = true;
          m.material = m.material.clone();
          if (m.material.emissiveIntensity) m.material.emissiveIntensity *= 0.3;
        }
      });
      const mixer = new THREE.AnimationMixer(model),
        clips = {};
      for (const clip of gltf.animations) {
        const action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        clips[clip.name] = action;
      }
      return { wrapper, model, mixer, clips, active: -1 };
    });
    this.ball = ball.scene;
    this.scene.add(this.ball);
    this.impact = impact.scene;
    this.trail = Array.from({ length: 10 }, () => {
      const m = ball.scene.clone();
      m.scale.setScalar(0.35);
      m.traverse((o) => {
        if (o.isMesh) {
          o.material = o.material.clone();
          o.material.transparent = true;
          o.material.opacity = 0.35;
        }
      });
      m.visible = false;
      this.scene.add(m);
      return m;
    });
    this.trailPositions = [];
  }
  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.aspect = w / h;
    const half = this.follow ? Math.max(8.3, 10.2 / this.aspect) : 24;
    this.camera.left = -half * this.aspect;
    this.camera.right = half * this.aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
  }
  setFollow(value) {
    if (this.follow !== value) {
      this.follow = value;
      this.resize();
      this.focus.set(0, 0, 0);
    }
  }
  burst(x, z, h, color = 0xcfffff) {
    if (!this.impact) return;
    const mesh = this.impact.clone();
    mesh.position.set(x, h, z);
    mesh.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.color.setHex(color);
        o.material.emissive?.setHex(color);
        o.material.transparent = true;
      }
    });
    this.scene.add(mesh);
    this.effects.push({ mesh, life: 0.4 });
  }
  draw(s, dt, team) {
    if (!this.ball) return;
    const b = s.ball;
    this.players.forEach((actor, i) => {
      const p = s.players[i],
        o = actor.wrapper,
        dx = p.x - o.position.x,
        dz = p.z - o.position.z;
      o.position.x += dx * (Math.abs(dx) > 5 ? 1 : Math.min(1, dt * 22));
      o.position.z += dz * (Math.abs(dz) > 5 ? 1 : Math.min(1, dt * 22));
      o.position.y = jumpHeight(p);
      o.rotation.y = Math.atan2(p.fx, p.fz);
      const moving = Math.hypot(dx, dz) > 0.045;
      const visualAction = p.action || (moving ? 5 : 0);
      if (actor.active !== visualAction) {
        actor.mixer.stopAllAction();
        actor.model.position.set(0, 0, 0);
        actor.model.rotation.set(0, 0, 0);
        actor.active = visualAction;
        const name = ["", "Slide", "Jump", "Throw", "Hit", "Run"][visualAction];
        const action = Object.entries(actor.clips).find(([key]) =>
          key.includes(name),
        )?.[1];
        if (name && action) {
          action.setLoop(
            visualAction === 5 ? THREE.LoopRepeat : THREE.LoopOnce,
            visualAction === 5 ? Infinity : 1,
          );
          action.reset().play();
        }
      }
      actor.mixer.update(dt);
      o.visible = p.health > 0 || p.injury > 1;
      actor.model.rotation.x = p.health <= 0 ? Math.PI / 2 : 0;
      const medic = this.medics[i];
      medic.visible = p.injury > 0;
      if (medic.visible) {
        const side = p.z < 0 ? -12 : 12,
          elapsed = 6 - p.injury;
        const z =
          elapsed < 2
            ? THREE.MathUtils.lerp(side, p.z, elapsed / 2)
            : THREE.MathUtils.lerp(p.z, side, clamp((elapsed - 2) / 3, 0, 1));
        medic.position.set(p.x, 0, z);
        if (elapsed >= 2) {
          o.position.z = z;
          o.position.y = 0.7;
        }
      }
      actor.model.traverse((m) => {
        if (m.isMesh && m.material.emissive) {
          m.material.emissive.setHex(
            active(s, 10, p.team)
              ? 0x0088cc
              : active(s, 1, 1 - p.team)
                ? 0x446688
                : 0x000000,
          );
          m.material.emissiveIntensity = active(s, 10, p.team) ? 1.1 : 0.35;
        }
      });

      // Fallback posture also makes state readable if an old cached GLB has no clips.
      if (!Object.keys(actor.clips).length) {
        actor.model.rotation.x = p.stun
          ? 1.5
          : p.action === 1
            ? -1.25
            : p.action === 3
              ? 0.35
              : 0;
        actor.model.position.y = p.action === 1 ? 0.2 : 0;
      }
      if (p.action === 0 && p.stun === 0)
        o.position.y +=
          Math.sin(performance.now() * 0.023 + i) *
          Math.min(0.07, Math.hypot(dx, dz) * 0.08);
    });
    this.pickupMeshes.forEach((slot, i) => {
      const item = s.pickups[i];
      if (slot.kind !== item.kind) {
        if (slot.mesh) this.scene.remove(slot.mesh);
        slot.mesh = this.pickupBank
          .getObjectByName("Pickup_" + item.kind)
          .clone();
        slot.kind = item.kind;
        this.scene.add(slot.mesh);
      }
      slot.mesh.visible = item.wait <= 0;
      slot.mesh.position.set(
        item.x,
        0.08 + Math.sin(performance.now() * 0.004 + i) * 0.07,
        item.z,
      );
    });
    this.goalShields.forEach((o) => {
      const end = o.position.x;
      const d = s.period === 2 ? -1 : 1;
      const defender = end * d > 0 ? 1 : 0;
      o.visible = active(s, 9, defender);
    });
    this.ball.traverse((o) => {
      if (o.isMesh && o.material.emissive) {
        o.material.emissive.setHex(b.charged ? 0x3388ff : 0x444444);
        o.material.emissiveIntensity = b.charged ? 3 : 0.15;
      }
    });
    this.ball.position.set(b.x, b.h - 0.25, b.z);
    this.ball.rotation.z += dt * 8;
    this.shadow.position.set(b.x, 0.11, b.z);
    this.shadow.scale.setScalar(1 + b.h * 0.08);
    this.shadow.material.opacity = clamp(0.65 - b.h * 0.06, 0.2, 0.65);
    const cp = s.players[s.controlled[team]];
    this.marker.position.set(cp.x, 0.12, cp.z);
    this.marker.material.color.setHex(
      cp.stun
        ? 0xff7048
        : cp.action === 1
          ? 0xffffff
          : team === 0
            ? 0x57dbff
            : 0xff854c,
    );
    this.marker.scale.setScalar(cp.action === 1 ? 1.4 : 1);
    this.aim.visible = b.owner === s.controlled[team];
    this.aim.position.set(cp.x, 0.2, cp.z);
    this.aim.setDirection(new THREE.Vector3(cp.fx, 0, cp.fz));
    this.aim.setLength(2.2 + Math.min(s.charge[team], 0.5) * 3, 0.6, 0.32);
    if (b.owner < 0 && Math.hypot(b.vx, b.vz) > 4) {
      this.trailPositions.unshift(new THREE.Vector3(b.x, b.h - 0.25, b.z));
      this.trailPositions.length = Math.min(10, this.trailPositions.length);
    } else this.trailPositions = [];
    this.trail.forEach((m, i) => {
      m.visible = !!this.trailPositions[i];
      if (m.visible) {
        m.position.copy(this.trailPositions[i]);
        m.scale.setScalar((1 - i / 12) * 0.32);
      }
    });
    this.stars.forEach((o) => {
      const m = o.name.match(/Star_(\d)_(\d)/);
      if (!m) return;
      const group = +m[1],
        lit = s.stars[group] & (1 << +m[2]),
        owner = s.period === 2 ? 1 - group : group;
      o.material.emissive.setHex(
        lit ? (owner === 0 ? 0x00ceff : 0xff4c12) : 0x14212b,
      );
      o.material.emissiveIntensity = lit ? 3 : 0.2;
      o.material.color.setHex(
        lit ? (owner === 0 ? 0x51dfff : 0xff7b4b) : 0x334955,
      );
    });
    if (s.event.id !== this.lastEvent) {
      this.lastEvent = s.event.id;
      const e = s.event;
      if ([4, 5, 8, 9, 10, 11, 12, 13, 14, 15].includes(e.kind))
        this.burst(e.x, e.z, e.h, e.kind === 4 ? 0xffbd65 : 0xa7fcff);
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      e.mesh.scale.setScalar(1 + (1 - e.life / 0.4) * 2);
      e.mesh.traverse((o) => {
        if (o.isMesh) o.material.opacity = Math.max(0, e.life / 0.4);
      });
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        e.mesh.traverse((o) => {
          if (o.isMesh) o.material.dispose();
        });
        this.effects.splice(i, 1);
      }
    }
    if (this.follow) {
      const target = new THREE.Vector3(
        clamp(b.x, -16.5, 16.5),
        0,
        clamp(b.z, -3.8, 3.8),
      );
      this.focus.lerp(target, 1 - Math.exp(-dt * 10));
      this.camera.position.set(this.focus.x - 16, 32, this.focus.z);
      this.camera.lookAt(this.focus.x, 0, this.focus.z);
    } else {
      this.camera.position.set(-30, 42, 22);
      this.camera.lookAt(0, 0, 0);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
