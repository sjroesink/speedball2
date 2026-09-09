import { readFile } from 'node:fs/promises';
import { AnimationMixer, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Measure exported Blender geometry, with the renderer's 1.2-unit run stride.
// A planted sole should remain stationary as the player's root moves forward.
for (const team of ['cyan', 'orange']) {
  const bytes = await readFile(new URL(`../public/assets/player-${team}.glb`, import.meta.url));
  const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const mixer = new AnimationMixer(model.scene);
  const clip = model.animations.find(c => c.name === 'Run');
  mixer.clipAction(clip).play();
  const boots=[];
  model.scene.traverse(o => { if(o.isMesh && o.name.startsWith('Boot')) boots.push(o); });
  const samples = 240, point = new Vector3(), previous = new Map(), slips=[];
  let minimumSole=Infinity, maximumSole=-Infinity;
  for(let frame=0;frame<=samples;frame++) {
    const time=frame/samples*clip.duration;
    mixer.setTime(time);model.scene.updateMatrixWorld(true);
    for(const boot of boots) {
      const vertices=boot.geometry.attributes.position;
      let sole=Infinity;
      for(let i=0;i<vertices.count;i++) sole=Math.min(sole,point.fromBufferAttribute(vertices,i).applyMatrix4(boot.matrixWorld).y);
      minimumSole=Math.min(minimumSole,sole);maximumSole=Math.max(maximumSole,sole);
      const position=boot.getWorldPosition(new Vector3());
      position.z+=1.2*frame/samples;
      const last=previous.get(boot);
      if(last && last.sole<=.04 && sole<=.04 && frame<samples) {
        slips.push(Math.hypot(position.x-last.x,position.z-last.z)/(clip.duration/samples));
      }
      previous.set(boot,{sole,x:position.x,z:position.z});
    }
  }
  slips.sort((a,b)=>a-b);
  if(!slips.length) throw new Error(`${team}: no grounded intervals; check exported body height`);
  console.log(JSON.stringify({team,clipSeconds:clip.duration,rootSpeed:1.2/clip.duration,
    plantedIntervals:slips.length,soleHeight:{min:minimumSole,max:maximumSole},
    plantedSlipSpeed:{median:slips[Math.floor(slips.length*.5)],p95:slips[Math.floor(slips.length*.95)],max:Math.max(...slips)},
    note:'World units/second during sole height <= 0.04; straight run without renderer blending.'},null,2));
}
