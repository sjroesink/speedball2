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
# A headless Ghidra export supplies complete arrays truncated in the text listing.
memory_path = root / ".reference/amiga-tables.bin"
if memory_path.exists():
    import struct
    memory = memory_path.read_bytes()
    base = 0x3ff8
    for address,key,bits in [(0x3ff8,"ballOffsets",8),(0x40e2,"originOffsets",16)]:
        fmt = ">bb" if bits == 8 else ">hh"
        for i,pair in enumerate(data[key]):
            assert list(struct.unpack_from(fmt,memory,address-base+i*(bits//4))) == pair
    current = None
    complete = {}
    for line in lines:
        label = re.match(r"\s+(anims?_[a-z0-9_]+)\s+XREF",line)
        if label:
            current=label[1]
        elif current:
            array=re.match(r"\s*([0-9a-f]{8})\s+[0-9a-f]+\s+dw\[(\d+)\]",line)
            if array:
                address,count=int(array[1],16),int(array[2])
                if 0x6c32 <= address < 0x75a2:
                    words=list(struct.unpack_from(">"+"h"*count,memory,address-base))
                    assert words[-1] in (-1,-2,-3,-4,-5),(current,words[-1])
                    complete[current]={"address":array[1],"frames":words[:-1],"terminator":words[-1]}
                current=None
    for name,animation in animations.items():
        assert complete[name] == animation,name
    data["animations"]=complete
    data["completeMemoryExport"]=True
    print(f"Verified text data against memory; recovered {len(complete)} complete animation arrays")
else:
    raise FileNotFoundError("Export .reference/amiga-tables.bin with tools/ExportBallTables.java before regenerating complete data")
output = root / "docs/held-ball-reference.json"
output.write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
print(f"Extracted {len(data['ballOffsets'])} ball offsets, {len(data['originOffsets'])} origins, {len(data['animations'])} complete animation sequences")
for name in ['anim_standing_player_n','anims_throwing_player_n']:
    frames=animations[name]['frames']
    print(name,[(i,[data['ballOffsets'][i][axis]+data['originOffsets'][i][axis]-8 for axis in (0,1)]) for i in frames])
