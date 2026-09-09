import { Box3, Group, Vector3 } from "three";
// Blender's floor-based origin must not make a spinning sphere orbit the floor.
export function centeredBall(model) {
  const center = new Box3().setFromObject(model).getCenter(new Vector3());
  model.position.sub(center);
  const pivot = new Group();
  pivot.add(model);
  return pivot;
}
