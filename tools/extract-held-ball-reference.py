"""Extract numeric held-ball reference data; no original images or binaries."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / ".reference/amiga/speedball2-amiga.asm"
lines = source.read_text(encoding="utf-8").splitlines()

def pairs(start, count, stride, bits):
    found = {}
    for line in lines:
        match = re.match(r"\s*([0-9a-f]{8}) \[0\]\s+([0-9A-Fa-f]+)h,\s*([0-9A-Fa-f]+)h\s*$", line)
        if not match:
            continue
        address = int(match[1], 16)
        if start <= address < start + count * stride and (address-start) % stride == 0:
            values = [int(match[i], 16) for i in (2,3)]
            found[(address-start)//stride] = [v-(1<<bits) if v >= 1<<(bits-1) else v for v in values]
    assert len(found) == count, (hex(start), len(found), count)
    return [found[i] for i in range(count)]

animations = {}
current = None
for line in lines:
    label = re.match(r"\s+(anims?_(?:standing|move|throwing)_player_[a-z]+)\s+XREF", line)
    if label:
        current = label[1]
    elif current:
        values = re.match(r"\s*([0-9a-f]{8}) \[0\]\s+(.+)$", line)
        if values:
            words = [int(v,16) for v in re.findall(r"([0-9A-Fa-f]+)h",values[2])]
            expected = 2 if 'standing' in current else 9
            assert len(words) == expected, (current,len(words),expected)
            assert words[-1] in (0xffff,0xfffd)
            animations[current] = {"address":values[1],"frames":words[:-1],"terminator":words[-1]-65536}
            current = None
assert len(animations) == 24, len(animations)
data = {"source":"speedball2-amiga.asm", "ballOffsetsAddress":"0x3ff8", "originOffsetsAddress":"0x40e2",
        "ballOffsets":pairs(0x3ff8,117,2,8), "originOffsets":pairs(0x40e2,120,4,16), "animations":animations}
output = root / "docs/held-ball-reference.json"
output.write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
print(f"Extracted {len(data['ballOffsets'])} ball offsets, {len(data['originOffsets'])} origins, {len(animations)} complete animation sequences")
for name in ['anim_standing_player_n','anims_throwing_player_n']:
    frames=animations[name]['frames']
    print(name,[(i,[data['ballOffsets'][i][axis]+data['originOffsets'][i][axis]-8 for axis in (0,1)]) for i in frames])
