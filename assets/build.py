"""Original game meshes, authored and exported with Blender. Run with npm run assets."""
import bpy, math, os
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public','assets')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,glow=0):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=.36
 if glow: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=glow
 return m
steel=mat('Graphite titanium',(.075,.105,.14),.8)
floor=mat('Arena brushed steel',(.10,.15,.18),.7)
line=mat('Pitch markings',(.38,.56,.56),.3)
cyan=mat('Ion cyan',(.03,.85,1),.5,2)
orange=mat('Solar orange',(1,.22,.035),.5,2)
white=mat('Ball core',(.8,1,1),.5,3)
def cube(name,loc,scale,material,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 if bevel: mod=o.modifiers.new('Machined edges','BEVEL'); mod.width=bevel; mod.segments=2; o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def sphere(name,loc,r,material):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=r,location=loc); o=bpy.context.object;o.name=name;o.data.materials.append(material);return o
def export(name):
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets',name+'.blend'))
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.glb'),export_format='GLB',use_selection=False,export_animation_mode='NLA_TRACKS')
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Blender XY ground maps to Three.js XZ. Pitch length along X.
cube('Arena foundation',(0,0,-.42),(31,20,.8),steel,.3)
cube('Playing surface',(0,0,0),(28,17,.12),floor)
for x in range(-13,14): cube('Floor panel seam',(x,0,.065),(.018,17,.006),steel,0)
for y in range(-8,9): cube('Floor panel seam',(0,y,.065),(28,.018,.006),steel,0)
for y in [-8.6,8.6]:
 cube('Impact barrier',(0,y,.55),(29,.5,1.1),steel,.1)
 cube('Cyan rail',(0,y,.99),(28.8,.08,.06),cyan)
 for x in range(-13,14,2): cube('Barrier brace',(x,y,.5),(.22,.75,1),steel)
for x in [-14.2,14.2]:
 for y in [-5.9,5.9]: cube('End wall',(x,y,.5),(.5,5.2,1),steel)
 c=cyan if x<0 else orange
 cube('Goal floor',(x,0,.1),(1.4,5.7,.12),c)
 for y in [-2.8,2.8]: cube('Goal upright',(x,y,1.05),(.2,.2,2.1),c)
 cube('Goal crossbar',(x,0,2.05),(.2,5.8,.2),c)
 for y in [-7,-5,5,7]: cube('End rail',(x,y,1),(.08,1.5,.06),c)
cube('Halfway line',(0,0,.074),(.065,16,.012),line,0)
for y in [-8,8]: cube('Touchline',(0,y,.075),(27,.05,.012),line,0)
for x in [-13.5,13.5]: cube('End line',(x,0,.075),(.05,16,.012),line,0)
bpy.ops.mesh.primitive_torus_add(major_radius=2.6,minor_radius=.032,major_segments=96,minor_segments=6,location=(0,0,.09));bpy.context.object.data.materials.append(line)
for x in [-10.5,10.5]:
 cube('Goal box',(x,0,.08),(.045,8,.012),line,0)
 for y in [-4,4]: cube('Goal box',(x+(-1.5 if x<0 else 1.5),y,.08),(3,.045,.012),line,0)
for y in [-10,10]:
 for row in range(3):
  for x in range(-14,15): cube('Grandstand',(x,y+math.copysign(row*.65,y),.2+row*.4),(.75,.5,.3),steel)
# Larger regulation-style pitch. Keep goal height and player size in metres.
for o in bpy.context.scene.objects:
 o.location.x*=1.5;o.location.y*=1.4;o.scale.x*=1.5;o.scale.y*=1.4
# Five targets on the top-left and bottom-right walls in the upfield camera.
def star(name,x,y,material):
 verts=[]
 for i in range(10):
  a=i*math.pi/5; r=.55 if i%2==0 else .25; verts.append((x+math.cos(a)*r,y+math.sin(a)*r,1.3))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[list(range(10))]);mesh.materials.append(material)
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 mod=o.modifiers.new('Raised target','SOLIDIFY');mod.thickness=.12
for group in range(2):
 for i in range(5):
  x=(5+i*2)*(1 if group==0 else -1); y=11.2 if group==0 else -11.2
  cube('Target housing',(x,y,.6),(1.5,1.1,1.2),steel,.12)
  star('Star_%d_%d'%(group,i),x,y,cyan if group==0 else orange)
for y in [-4,4]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=(0,y,.15));o=bpy.context.object;o.name='ScoreDome';o.scale.z=.6;o.data.materials.append(orange)
 bpy.ops.mesh.primitive_torus_add(major_radius=1.04,minor_radius=.07,location=(0,y,.12));bpy.context.object.data.materials.append(cyan)
for y in [-11.2,11.2]:
 ramp=cube('Multiplier ramp',(0,y,.5),(2.5,1.7,.3),steel,.1);ramp.rotation_euler.x=math.copysign(.35,y)
 for x in [-.55,.55]:cube('Multiplier lamp',(x,y,1.1),(.32,.4,.25),white)
export('arena')
for name,color in [('player-cyan',cyan),('player-orange',orange)]:
 cube('Armored torso',(0,0,.9),(.65,.4,.66),steel,.12)
 cube('Chest plate',(0,-.23,1),(.51,.08,.31),color)
 sphere('Helmet',(0,0,1.47),.27,steel)
 cube('Visor',(0,-.245,1.49),(.35,.07,.09),color)
 for side in [-1,1]:
  sphere('Shoulder',(side*.44,0,1.15),.23,color)
  cube('Gauntlet',(side*.46,-.02,.78),(.25,.32,.4),steel,.08)
  cube('Leg',(side*.2,0,.37),(.27,.3,.56),steel,.07)
  cube('Boot',(side*.2,-.09,.11),(.31,.49,.2),color,.04)
 # Native Blender animation clips, played by the browser's AnimationMixer.
 parts=list(bpy.context.scene.objects)
 bpy.ops.object.empty_add(type='PLAIN_AXES');root=bpy.context.object;root.name='AthletePose'
 for part in parts: part.parent=root
 root.animation_data_create()
 poses={'Slide':[(1,0,0),(4,1.3,.12),(19,1.3,.12),(24,0,0)],'Jump':[(1,0,0),(10,-.25,0),(28,.2,0),(42,0,0)],'Throw':[(1,-.3,0),(6,.45,0),(20,0,0)],'Hit':[(1,0,0),(8,-1.5,.18),(65,-1.5,.18),(81,0,0)]}
 for clip,frames in poses.items():
  action=bpy.data.actions.new(clip);root.animation_data.action=action
  for frame,angle,height in frames:
   root.rotation_euler=(angle,0,0);root.location=(0,0,height)
   root.keyframe_insert(data_path='rotation_euler',frame=frame);root.keyframe_insert(data_path='location',frame=frame)
  root.animation_data.action=None
  track=root.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,action)
 root.rotation_euler=(0,0,0);root.location=(0,0,0);bpy.context.scene.render.fps=60
 export(name)
sphere('Chrome speedball',(0,0,.25),.25,white)
export('ball')
for i in range(12):
 a=i*math.tau/12;o=cube('Impact spark',(math.cos(a)*.65,math.sin(a)*.65,.25),(.4,.07,.07),white,.015);o.rotation_euler.z=a
export('impact')
for name in ['arena','player-cyan','player-orange','ball']:
 bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,name+'.glb'))
 if name.startswith('player'):
  for o in bpy.context.selected_objects: o.location.x+= -6 if name=='player-cyan' else 6
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','speedball.blend'))
