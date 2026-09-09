"""Generate matching browser/server numeric pose data from verified Amiga tables."""
import json
import struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'docs/held-ball-reference.json').read_text(encoding='utf-8'))
raw=(root/'.reference/amiga-tables.bin').read_bytes()
names={int(v['address'],16):k for k,v in data['animations'].items()}
groups={}
controls={}
for group,address in [('standing',0x75a2),('slide',0x75c2),('punch',0x75e2),('run',0x7602),('throw',0x7622),('jump',0x7642),('fall',0x7662),('catch',0x7682),('catchUp',0x76a2),('catchDown',0x76c2),('standUp',0x76e2),('runUp',0x7702),('standDown',0x7722),('runDown',0x7742)]:
 animations=[data['animations'][names[a]] for a in struct.unpack_from('>8I',raw,address-0x3ff8)]
 groups[group]=[a['frames']+[a['terminator']] for a in animations]
 controls[group]=[next(v for v in frames if v<0) for frames in groups[group]]
 groups[group]=[frames[:next((i for i,v in enumerate(frames) if v<0),len(frames))] for frames in groups[group]]
 assert all(all(0<=frame<117 for frame in frames) for frames in groups[group])
runtime={'groups':groups,'controls':controls,'origins':data['originOffsets'][:117],'offsets':[[a[0]+b[0],a[1]+b[1]] for a,b in zip(data['ballOffsets'],data['originOffsets'])]}
serialized=json.dumps(runtime,separators=(',',':'))+'\n'
for folder in ['src','server']:(root/folder/'physical-pose-data.json').write_text(serialized,encoding='utf-8')
print('Generated 14 direction groups and 117 combined offsets for browser/server')
