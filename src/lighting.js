import * as THREE from "three";

// Neutral stadium light preserves steel and skin; team accents stay localized.
export function addArenaLights(scene) {
 scene.add(new THREE.HemisphereLight(0xe9eee6, 0x202522, 1.8));
 const key = new THREE.DirectionalLight(0xfff1d8, 2.8);
 key.position.set(-10,30,5);
 key.castShadow=true;
 key.shadow.mapSize.set(2048,2048);
 key.shadow.normalBias=.025;
 key.shadow.bias=-.0001;
 Object.assign(key.shadow.camera,{left:-27,right:27,top:27,bottom:-27});
 scene.add(key);
 for(const [x,color] of [[-19,0x3988cf],[19,0xce4932]]) {
  const lamp=new THREE.PointLight(color,12,9);
  lamp.position.set(x,3,0);scene.add(lamp);
 }
}
