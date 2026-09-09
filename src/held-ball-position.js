import reference from "../docs/held-ball-reference.json" with {type:"json"};
const unit = 22.4/576;
// step_match 0xd00e-0xd03e: sprite-relative terrain displacement, then world axes.
// The caller must supply the actual displayed player and held-ball sprite indices.
export function heldBallOffset(playerSprite, ballSprite) {
  if (!Number.isInteger(playerSprite) || !reference.ballOffsets[playerSprite])
    throw new RangeError("Unknown player sprite for held-ball offset");
  if (!Number.isInteger(ballSprite) || ballSprite < 0)
    throw new RangeError("A held-ball sprite index is required");
  const offset=reference.ballOffsets[playerSprite],origin=reference.originOffsets[playerSprite];
  const correction=ballSprite===0?12:8;
  return {x:-(offset[1]+origin[1]-correction)*unit,
    z:(offset[0]+origin[0]-correction)*unit};
}
