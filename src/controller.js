import { ArenaAudio } from "./audio.js";
import { powerNames } from "./features.js";
import { initial, step, direction, clamp } from "./game.js";
import { decodeSnapshot } from "./wire.js";
import { ArenaRenderer } from "./renderer.js";

export async function start() {
  const $ = (id) => document.getElementById(id);
  const view = new ArenaRenderer($("viewport"));
  const audio = new ArenaAudio();
  let state = initial(),
    playing = false,
    inGame = false,
    menu = false,
    online = false,
    team = 0,
    transport = null,
    writer = null,
    attempt = 0,
    seq = 0,
    lastTick = -1,
    previous = performance.now(),
    acc = 0,
    lastEvent = 0,
    eventLife = 0;
  $("viewport").insertAdjacentHTML(
    "beforeend",
    `<div class="game-toolbar"><button id="gameMenu">☰ MENU</button><span id="matchRoom">TRAINING</span><button id="gameSound" aria-pressed="false">SOUND OFF</button><button id="gameFullscreen">⛶ FULL SCREEN</button></div><div class="game-feedback"><strong id="actionLabel">READY</strong><div class="charge-meter"><i id="chargeFill"></i></div><small id="actionHint">SPACE: ACTION · E: LOB · SHIFT: TACKLE</small></div><div class="power-hud"><strong id="powerStatus">NO POWER-UP</strong><span id="healthStatus"></span><span id="gearStatus"></span></div><div class="bonus-hud"><span id="bonus0">☆☆☆☆☆ · ×1</span><b>SCORE TARGETS</b><span id="bonus1">☆☆☆☆☆ · ×1</span></div><div id="eventToast" class="event-toast hidden" role="status"></div><div class="game-instructions">WASD / ARROWS <b>MOVE & AIM</b> &nbsp; SPACE <b>TAP: LOW · HOLD: HIGH</b></div><div id="pauseMenu" class="pause-menu hidden"><h2>TIME OUT</h2><p id="pauseText">Training is paused.</p><button id="resume" class="primary">RESUME →</button><button id="leave">BACK TO LOBBY</button></div>`,
  );
  const keys = new Set();
  let fire = 0,
    tackleId = 0,
    lobId = 0;
  function input() {
    return {
      fire,
      tackleId,
      lobId,
      x:
        (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
        (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0),
      z:
        (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
        (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
      shoot: keys.has("Space"),
      tackle: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      lob: keys.has("KeyE"),
    };
  }
  function send() {
    if (writer)
      writer
        .write(
          new TextEncoder().encode(JSON.stringify({ ...input(), seq: seq++ })),
        )
        .catch(() => {});
  }
  addEventListener("keydown", (e) => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    if (e.code === "Escape" && inGame) {
      e.preventDefault();
      toggleMenu();
      return;
    }
    if (!inGame || menu) return;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    keys.add(e.code);
    if (!e.repeat) {
      if (e.code === "Space") fire++;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") tackleId++;
      if (e.code === "KeyE") lobId++;
    }
    if (!e.repeat) send();
  });
  addEventListener("keyup", (e) => {
    keys.delete(e.code);
    send();
  });
  addEventListener("blur", () => {
    keys.clear();
    send();
  });
  setInterval(send, 33);
  function fullscreen() {
    if (!document.fullscreenElement)
      $("viewport")
        .requestFullscreen?.()
        .catch(() => {});
  }
  function enter() {
    inGame = true;
    menu = false;
    document.body.classList.add("in-game");
    $("pauseMenu").classList.add("hidden");
    view.setFollow(true);
    document.activeElement.blur();
    fullscreen();
  }
  function toggleMenu() {
    menu = !menu;
    keys.clear();
    send();
    $("pauseMenu").classList.toggle("hidden", !menu);
    $("pauseText").textContent = online
      ? "The online match continues."
      : "Training is paused.";
  }
  function disconnect() {
    audio.reset();
    fire = tackleId = lobId = 0;
    attempt++;
    const old = transport;
    transport = null;
    writer = null;
    online = false;
    playing = false;
    if (old) old.close();
    keys.clear();
  }
  function leave() {
    disconnect();
    inGame = false;
    menu = false;
    document.body.classList.remove("in-game");
    $("pauseMenu").classList.add("hidden");
    $("result").classList.add("hidden");
    view.setFollow(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    $("mode").textContent = "ARENA PREVIEW";
    $("connection").textContent = "LOCAL PREVIEW";
    $("status").textContent = "READY FOR KICKOFF";
    $("roomShare").classList.add("hidden");
    state = initial();
  }
  function practice() {
    disconnect();
    state = initial();
    team = 0;
    playing = true;
    lastEvent = 0;
    $("result").classList.add("hidden");
    $("mode").textContent = "TRAINING";
    $("connection").textContent = "LOCAL TRAINING";
    $("homeName").textContent = "YOU";
    $("awayName").textContent = "AI";
    $("matchRoom").textContent = "TRAINING / 9 VS 9";
    $("practiceTab").classList.add("selected");
    $("onlineTab").classList.remove("selected");
    enter();
  }
  async function connect(room) {
    disconnect();
    const id = attempt;
    let session, timer;
    if (!("WebTransport" in window)) {
      $("notice").textContent =
        "Use a WebTransport browser such as Chrome or Edge.";
      return;
    }
    $("notice").textContent = "Connecting…";
    enter();
    $("matchRoom").textContent = "CONNECTING…";
    try {
      const response = await fetch("/connection.json", { cache: "no-store" });
      if (!response.ok) throw Error("Start the Go server with npm run server.");
      const cfg = await response.json();
      if (id !== attempt) return;
      const url = new URL(cfg.url);
      url.searchParams.set("room", room);
      url.searchParams.set("name", $("name").value || "Challenger");
      session = new WebTransport(
        url,
        cfg.hash
          ? {
              serverCertificateHashes: [
                { algorithm: "sha-256", value: Uint8Array.from(cfg.hash) },
              ],
            }
          : {},
      );
      session.closed.catch(() => {});
      transport = session;
      await Promise.race([
        session.ready,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(Error("Cannot connect to the game server.")),
            8000,
          );
        }),
      ]);
      clearTimeout(timer);
      if (id !== attempt) {
        session.close();
        return;
      }
      writer = session.datagrams.writable.getWriter();
      online = true;
      lastTick = -1;
      lastEvent = 0;
      state = initial();
      $("result").classList.add("hidden");
      $("connection").textContent = "WEBTRANSPORT CONNECTED";
      $("onlineTab").classList.add("selected");
      $("practiceTab").classList.remove("selected");
      session.closed
        .then((info) => {
          if (id === attempt) lost(info.reason || "Connection closed.");
        })
        .catch(() => {
          if (id === attempt) lost("Connection lost. Create a new arena.");
        });
      const reader = session.datagrams.readable.getReader();
      while (transport === session) {
        const { value, done } = await reader.read();
        if (done) break;
        const msg = decodeSnapshot(value);
        if (msg.state.tick <= lastTick) continue;
        lastTick = msg.state.tick;
        state = msg.state;
        team = msg.team;
        playing = msg.started && !state.over;
        audio.observe(state, playing);
        $("homeName").textContent = msg.names[0];
        $("awayName").textContent = msg.names[1];
        $("roomShare").classList.remove("hidden");
        $("roomShare").textContent = `ROOM CODE: ${msg.room}`;
        $("matchRoom").textContent =
          `ARENA ${msg.room} / ${msg.started ? "LIVE" : "WAITING FOR OPPONENT"}`;
        $("mode").textContent = msg.started ? "ONLINE / LIVE" : "WAITING ROOM";
        $("notice").textContent = msg.started
          ? "Match is live."
          : `Share room code ${msg.room}.`;
      }
    } catch (e) {
      if (id === attempt) lost(e.message);
    } finally {
      clearTimeout(timer);
    }
  }
  function lost(message) {
    disconnect();
    $("notice").textContent = message;
    $("connection").textContent = "DISCONNECTED";
    $("matchRoom").textContent = message;
    $("status").textContent = message;
    if (inGame) {
      menu = true;
      $("pauseMenu").classList.remove("hidden");
      $("pauseText").textContent = message;
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    audio.setActive(inGame && !menu && !document.hidden);
    if (playing && !online && !menu) {
      acc += dt;
      while (acc >= 1 / 60) {
        step(state, 1 / 60, input());
        audio.observe(state, true);
        acc -= 1 / 60;
      }
    }
    audio.observe(state, playing);
    view.draw(state, dt, team);
    const p = state.players[state.controlled[team]],
      owned = state.ball.owner === state.controlled[team];
    $("score0").textContent = String(state.score[0]).padStart(2, "0");
    $("score1").textContent = String(state.score[1]).padStart(2, "0");
    const seconds = Math.ceil(state.time);
    $("timer").textContent =
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    $("period").textContent = `HALF ${state.period} / 2`;
    $("status").textContent = state.over
      ? "FULL TIME"
      : `${team === 0 ? "IRON VIPERS" : "STEEL JACKALS"} ${direction(state, team) > 0 ? "↑" : "↓"} / ${p.stun > 0 ? "KNOCKED DOWN" : owned ? "BALL POSSESSION" : "GET THE BALL"}`;
    $("actionLabel").textContent =
      p.stun > 0
        ? "KNOCKED DOWN"
        : p.action === 1
          ? "SLIDING!"
          : p.action === 2
            ? "JUMP!"
            : state.charge[team] >= 0.12
              ? "RELEASING"
              : state.charge[team] > 0
                ? "WINDING UP"
                : p.cooldown > 0.01
                  ? "RECOVERING"
                  : owned
                    ? "THROW WHERE YOU FACE"
                    : "READY TO TACKLE";
    $("actionLabel").dataset.action = String(p.action);
    $("chargeFill").style.width =
      `${clamp(state.charge[team] / 0.16, 0, 1) * 100}%`;
    for (let t = 0; t < 2; t++) {
      const group = state.period === 2 ? 1 - t : t,
        mask = state.stars[group],
        mult =
          (t === 0 && state.multiplier > 0) || (t === 1 && state.multiplier < 0)
            ? 1 + Math.abs(state.multiplier) * 0.5
            : 1;
      $(`bonus${t}`).textContent =
        Array.from({ length: 5 }, (_, i) => (mask & (1 << i) ? "★" : "☆")).join(
          "",
        ) + ` · ×${mult}`;
    }
    const medical = state.players.find((q) => q.injury > 0);
    $("powerStatus").textContent = medical
      ? `MEDICS · ${Math.ceil(medical.injury)}s · CLOCK STOPPED`
      : state.effect.time > 0
        ? `${state.effect.team === team ? "YOUR TEAM" : "OPPONENT"}: ${powerNames[state.effect.kind]} · ${Math.ceil(state.effect.time)}s`
        : state.ball.electric > 0
          ? `ELECTROBALL · ${state.ball.electric} HITS`
          : "NO ACTIVE POWER-UP";
    $("healthStatus").textContent =
      `ENERGY ${Math.ceil(p.health)}% · RESERVES ${state.reserves[team]} · CREDITS ${state.credits[team]}`;
    $("gearStatus").textContent = p.gear
      ? `EQUIPMENT: ${powerNames[p.gear]}`
      : "RUN OVER A PICKUP TO COLLECT IT";
    if (state.event.id !== lastEvent) {
      lastEvent = state.event.id;
      const e = state.event;
      const featureText =
        e.kind === 11
          ? powerNames[e.target]
          : e.kind === 12
            ? "WARP-GATE"
            : e.kind === 13
              ? "BALL CHARGED"
              : e.kind === 14
                ? "INJURY · OPPONENT SCORES"
                : e.kind === 15
                  ? "SUBSTITUTE ENTERS THE COURT"
                  : "";
      const text =
        featureText ||
        (e.kind === 4
          ? "HARD HIT"
          : e.kind === 5
            ? "WALL REBOUND"
            : e.kind === 6
              ? "HALFTIME · SWITCH ENDS"
              : e.kind === 7
                ? `GOAL! +${10 * ((e.actor === 0 && state.multiplier > 0) || (e.actor === 1 && state.multiplier < 0) ? 1 + Math.abs(state.multiplier) * 0.5 : 1)}`
                : e.kind === 8
                  ? `BONUS +${e.target}`
                  : e.kind === 9
                    ? "MULTIPLIER CHANGED"
                    : e.kind === 10
                      ? `STAR EXTINGUISHED −${e.target}`
                      : "");
      if (text) {
        $("eventToast").textContent = text;
        $("eventToast").classList.remove("hidden");
        eventLife = e.kind === 6 ? 3 : e.kind === 7 ? 1.4 : 0.7;
      }
    }
    eventLife -= dt;
    if (eventLife <= 0) $("eventToast").classList.add("hidden");
    if (state.over) {
      playing = false;
      $("result").classList.remove("hidden");
      $("result").textContent =
        state.score[0] === state.score[1]
          ? "DRAW"
          : `${state.score[0] > state.score[1] ? "IRON VIPERS" : "STEEL JACKALS"} WIN`;
    }
  }
  requestAnimationFrame(frame);
  $("practice").onclick = practice;
  $("practiceTab").onclick = practice;
  $("onlineTab").onclick = () => {
    $("onlineTab").classList.add("selected");
    $("practiceTab").classList.remove("selected");
  };
  $("create").onclick = () => connect("");
  $("join").onclick = () => {
    const code = $("room").value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      $("notice").textContent = "Enter a six-character room code.";
      return;
    }
    connect(code);
  };
  $("room").onkeydown = (e) => {
    if (e.key === "Enter") $("join").click();
  };
  $("gameMenu").onclick = toggleMenu;
  $("resume").onclick = () => {
    menu = false;
    $("pauseMenu").classList.add("hidden");
    document.activeElement.blur();
  };
  $("leave").onclick = leave;
  $("gameFullscreen").onclick = fullscreen;
  $("fullscreen").onclick = fullscreen;
  async function toggleSound() {
    if (inGame) document.activeElement.blur();
    const enabled = await audio.enable(!audio.enabled);
    for (const id of ["sound", "gameSound"]) {
      $(id).textContent = enabled ? "SOUND ON" : "SOUND OFF";
      $(id).setAttribute("aria-pressed", String(enabled));
    }
  }
  $("sound").setAttribute("aria-pressed", "false");
  $("sound").onclick = toggleSound;
  $("gameSound").onclick = toggleSound;
  document.addEventListener("visibilitychange", () => {
    audio.setActive(inGame && !menu && !document.hidden);
  });
  document.querySelectorAll("[data-page]").forEach(
    (b) =>
      (b.onclick = () => {
        $("rules").classList.toggle("hidden", b.dataset.page !== "how");
        document
          .querySelectorAll("[data-page]")
          .forEach((n) => n.classList.toggle("active", n === b));
        if (b.dataset.page === "how")
          $("rules").scrollIntoView({ behavior: "smooth" });
      }),
  );
  try {
    await view.load();
    $("loading").classList.add("hidden");
  } catch (e) {
    $("loading").textContent =
      "Arena could not load. Rebuild assets with npm run assets.";
    console.error(e);
  }
}
