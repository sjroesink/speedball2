export function decodeSnapshot(bytes) {
  const d = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let o = 0;
  const u8 = () => d.getUint8(o++),
    i8 = () => d.getInt8(o++),
    u16 = () => {
      const n = d.getUint16(o, true);
      o += 2;
      return n;
    },
    i16 = () => {
      const n = d.getInt16(o, true);
      o += 2;
      return n;
    },
    u32 = () => {
      const n = d.getUint32(o, true);
      o += 4;
      return n;
    },
    f = () => {
      const n = d.getFloat32(o, true);
      o += 4;
      return n;
    },
    q = () => i16() / 1000;
  if (u8() !== 83 || u8() !== 66 || u8() !== 50 || u8() !== 2)
    throw new Error("Serverversie verschilt. Herstart de gameserver.");
  const s = { tick: u32(), time: f(), period: u8() },
    flags = u8(),
    team = u8();
  s.over = !!(flags & 1);
  s.controlled = [u8(), u8()];
  s.score = [u16(), u16()];
  s.charge = [q(), q()];
  s.pause = q();
  s.stars = [u8(), u8()];
  s.multiplier = i8();
  s.ball = {
    x: f(),
    z: f(),
    h: f(),
    vx: f(),
    vz: f(),
    vh: f(),
    owner: i8(),
    lastTouch: i8(),
  };
  s.event = {
    id: u32(),
    kind: u8(),
    actor: i8(),
    target: i8(),
    x: f(),
    z: f(),
    h: f(),
  };
  s.players = Array.from({ length: 18 }, (_, i) => ({
    x: i16() / 100,
    z: i16() / 100,
    fx: q(),
    fz: q(),
    stun: q(),
    action: u8(),
    actionTime: q(),
    cooldown: q(),
    team: Math.floor(i / 9),
  }));
  const str = () => {
    const n = u8(),
      v = new TextDecoder().decode(bytes.subarray(o, o + n));
    o += n;
    return v;
  };
  return {
    state: s,
    started: !!(flags & 2),
    team,
    room: str(),
    names: [str(), str()],
  };
}
