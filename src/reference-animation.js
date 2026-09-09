import reference from "../docs/held-ball-reference.json" with {type:"json"};
// step_sprite_animations 0x10d12-0x10df8 reads the current word, then its successor.
// Callers perform action callbacks (including release/landing seeks) before this.
export function stepReferenceAnimation(name,index) {
 const animation=reference.animations[name];
 if(!animation)throw new RangeError("Unknown reference animation");
 const words=[...animation.frames,animation.terminator];
 if(!Number.isInteger(index)||index<0||index>=words.length-1||words[index]<0)
  throw new RangeError("Animation index must address a sprite word");
 const sprite=words[index],next=words[index+1];
 if(next>=0)return {sprite,index:index+1,control:null};
 switch(next){
  case -1:return {sprite,index:0,control:"loop"};
  case -2:return {sprite,index,control:"hold"};
  case -3:return {sprite,index:index+1,control:"finish-action"};
  case -4:return {sprite,index:0,control:"hide"};
  case -5:return {sprite,index,control:"finish-fall"};
  default:throw new RangeError("Unsupported animation control word");
 }
}
