import test from "node:test";
import assert from "node:assert/strict";
import { Group, Mesh, SphereGeometry, MeshBasicMaterial, Box3, Vector3 } from "three";
import { centeredBall } from "./ball-model.js";
test("floor-origin Blender ball stays centered above the court throughout rotation", () => {
 const model=new Group(),mesh=new Mesh(new SphereGeometry(.25,32,16),new MeshBasicMaterial());
 mesh.position.y=.25;model.add(mesh);
 const ball=centeredBall(model);ball.position.set(2,.25,-3);
 for(let i=0;i<64;i++) {
  ball.rotation.z=i*Math.PI/32;ball.updateMatrixWorld(true);
  const center=mesh.getWorldPosition(new Vector3());
  assert.ok(center.distanceTo(ball.position)<1e-9);
  const bounds=new Box3().setFromObject(ball,true);
  assert.ok(bounds.min.y>=-1e-7);
 }
});
