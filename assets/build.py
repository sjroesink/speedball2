"""Original game meshes, authored and exported with Blender. Run with npm run assets."""
import bpy, math, os, time, json, sys
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
floor=mat('Arena brushed steel',(.24,.35,.39),.35)
line=mat('Pitch markings',(.38,.56,.56),.3)
cyan=mat('Cobalt enamel',(.035,.20,.58),.45,.08)
orange=mat('Vermilion enamel',(.65,.065,.035),.45,.08)
white=mat('Chrome',(.72,.80,.84),.65,.15)
armor=mat('Brushed silver armor',(.48,.59,.62),.65)
skin=mat('Exposed face and hands',(.62,.34,.16),0)
rubber=mat('Joint rubber',(.025,.035,.04),.05)
mark=mat('Oxide red markings',(.40,.07,.035),.1)
def cube(name,loc,scale,material,bevel=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 if bevel: mod=o.modifiers.new('Machined edges','BEVEL'); mod.width=bevel; mod.segments=2; o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def sphere(name,loc,r,material):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=r,location=loc); o=bpy.context.object;o.name=name;o.data.materials.append(material);
 for face in o.data.polygons: face.use_smooth=True
 return o
def export(name):
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets',name+'.blend'))
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.build.glb'),export_format='GLB',use_selection=False,export_animation_mode='NLA_TRACKS')
 for attempt in range(30):
  try: os.replace(os.path.join(OUT,name+'.build.glb'),os.path.join(OUT,name+'.glb'));break
  except OSError:
   if attempt==29:raise
   time.sleep(.1)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Blender XY ground maps to Three.js XZ. Pitch length along X.
cube('Arena foundation',(0,0,-.42),(31,20,.8),steel,.3)
cube('Playing surface',(0,0,0),(28,17,.12),floor)
for x in [-10.5,-7,0,7,10.5]: cube('Floor panel seam',(x,0,.065),(.055,17,.012),steel,0)
for y in [-6,-3,0,3,6]: cube('Floor panel seam',(0,y,.065),(28,.045,.012),steel,0)
for x in [-10.5,-7,0,7,10.5]:
 for y in range(-8,9):
  for side in [-1,1]:
   sphere('Floor rivet',(x+side*.13,y,.073),.045,armor)
for x,label in [(-7,'25'),(0,'50'),(7,'25')]:
 for y in [-6,6]:
  bpy.ops.object.text_add(location=(x,y,.084));o=bpy.context.object;o.name='Court yard marking';o.data.body=label;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=1.05;o.rotation_euler.z=-math.pi/2;o.data.materials.append(mark)
  bpy.ops.object.convert(target='MESH')
for y in [-8.6,8.6]:
 # Leave the multiplier loop visible through a gap in the outer barrier.
 center=(-1 if y>0 else 1)*32*(22.4/576)/1.5
 lo,hi=center-1.05,center+1.05
 for start,end in [(-14.5,lo),(hi,14.5)]:
  cube('Impact barrier',((start+end)/2,y,.55),(end-start,.5,1.1),steel,.1)
  cube('Cyan rail',((start+end)/2,y,.99),(end-start,.12,.1),armor)
 for x in range(-13,14,2):
  if not lo<x<hi: cube('Barrier brace',(x,y,.5),(.22,.75,1),steel)
for x in [-14.2,14.2]:
 for y in [-5,5]: cube('End wall',(x,y,.5),(.5,7.3,1),steel)
 c=cyan if x<0 else orange
 cube('Goal floor',(x,0,.1),(1.4,2.7,.12),c)
 for y in [-1.35,1.35]: cube('Goal upright',(x,y,1.05),(.2,.2,2.1),c)
 cube('Goal crossbar',(x,0,2.05),(.2,2.9,.2),c)
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
  x=(576-((400 if group==0 else 624)+i*32))*22.4/576; y=11.2 if group==0 else -11.2
  cube('Target housing',(x,y,.6),(1.15,1.1,1.2),steel,.12)
  star('Star_%d_%d'%(group,i),x,y,cyan if group==0 else orange)
# Original bumper centers: terrain (320,320) and (320,832), radius 16 units.
for x in [-256*22.4/576,256*22.4/576]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=16*22.4/576,location=(x,0,.12));o=bpy.context.object;o.name='ScoreDome';o.scale.z=.6;o.data.materials.append(rubber)
 for face in o.data.polygons: face.use_smooth=True
 bpy.ops.mesh.primitive_torus_add(major_radius=16*22.4/576,minor_radius=.04,location=(x,0,.12));bpy.context.object.data.materials.append(armor)
# Original multiplier motion is a narrow loop beside each touchline.
with open(os.path.join(ROOT,'assets','multiplier-paths.json')) as f: multiplier_paths=json.load(f)
unit=22.4/576
for side,path_index in [(0,0),(1,2)]:
 origin_x,origin_y=(0,576) if side==0 else (640,512)
 center_x=(576-origin_y-32)*unit
 center_y=-(origin_x+(32 if side==0 else -32)-320)*unit
 cube('Multiplier housing',(center_x,center_y,.16),(2.75,2.0,.26),steel,.12)
 # Groove follows the numeric path; glTF maps Blender Y to negative game Z.
 curve=bpy.data.curves.new('Multiplier loop groove','CURVE');curve.dimensions='3D';curve.bevel_depth=.075;curve.bevel_resolution=3
 spline=curve.splines.new('POLY');spline.points.add(len(multiplier_paths[path_index])-1)
 for point,(px,py) in zip(spline.points,multiplier_paths[path_index]):
  point.co=((576-origin_y-py)*unit,-(origin_x+px-320)*unit,.32,1)
 obj=bpy.data.objects.new('MultiplierLoop',curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(armor)
 bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj.select_set(False)
 for lamp in range(2): cube('Multiplier lamp',(center_x+(lamp-.5)*.5,center_y,.4),(.26,.26,.10),white,.04)
# Side portals at the two original warp latitudes, plus two electro-bounces.
for x in [-206*22.4/576,206*22.4/576]:
 for y in [-11.2,11.2]:
  cube('Warp tunnel housing',(x,y,.55),(1.3,1.1,1.1),steel,.12)
  bpy.ops.mesh.primitive_torus_add(major_radius=.40,minor_radius=.09,location=(x,y,1.5));o=bpy.context.object;o.name='WarpRing';o.data.materials.append(cyan)
  cube('Warp throat',(x,y,1.49),(.55,.55,.06),rubber,.08)
for x,y in [(304*22.4/576,-300*22.4/576),(-304*22.4/576,300*22.4/576)]:
 cube('Electro bounce',(x,y,.5),(1.25,1.0,1.0),armor,.12)
 for dx in [-.35,0,.35]: cube('Electrode',(x+dx,y,1.1),(.12,.65,.12),white,.03)
for x in [-21.1,21.1]:
 cube('GoalShield_'+str(int(x)),(x,0,1),(.16,3.7,1.9),cyan,.03)
export('arena')
if '--arena-only' in sys.argv: sys.exit(0)
for name,color in [('player-cyan',cyan),('player-orange',orange)]:
 # Broad human silhouette: silver pads, enamel helmet, face, articulated limbs.
 cube('Hip belt',(0,0,.72),(.58,.40,.24),rubber,.09)
 cube('Ribbed breastplate',(0,0,1.13),(.72,.46,.65),armor,.16)
 cube('Team breast stripe',(0,-.245,1.28),(.50,.04,.12),color,.03)
 for z in [.91,1.01]: cube('Abdominal rib',(0,-.25,z),(.48,.055,.055),steel,.02)
 sphere('Head',(0,-.035,1.65),.24,skin)
 helmet=sphere('Open face helmet',(0,.015,1.75),.275,color);helmet.scale.z=.75
 cube('Helmet crown stripe',(0,-.03,1.94),(.085,.29,.035),armor,.02)
 cube('Brow guard',(0,-.245,1.76),(.38,.08,.085),armor,.035)
 cube('Dark eye opening',(0,-.265,1.69),(.29,.04,.06),rubber,.015)
 cube('Jaw',(0,-.22,1.57),(.23,.16,.13),skin,.06)
 limbs=[]
 for side in [-1,1]:
  before=set(bpy.context.scene.objects)
  shoulder=sphere('Silver shoulder pad',(side*.48,0,1.39),.30,armor);shoulder.scale=(1,.9,.8)
  cube('Shoulder team band',(side*.5,-.235,1.40),(.27,.04,.085),color,.02)
  sphere('Bicep',(side*.49,0,1.13),.19,rubber)
  cube('Forearm armor',(side*.49,-.06,.98),(.26,.33,.34),armor,.1)
  sphere('Hand',(side*.49,-.12,.78),.14,skin)
  parts=set(bpy.context.scene.objects)-before
  bpy.ops.object.empty_add(location=(side*.43,0,1.42));joint=bpy.context.object;joint.name='Arm_'+str(side)
  for part in parts: part.parent=joint;part.matrix_parent_inverse=joint.matrix_world.inverted()
  limbs.append((joint,side,True))
  before=set(bpy.context.scene.objects)
  cube('Thigh',(side*.22,0,.54),(.31,.37,.37),armor,.10)
  sphere('Knee',(side*.22,-.17,.36),.18,steel)
  cube('Shin',(side*.22,0,.23),(.27,.31,.31),armor,.07)
  cube('Boot',(side*.22,-.12,.10),(.34,.55,.20),rubber,.06)
  cube('Steel toe',(side*.22,-.32,.14),(.32,.17,.15),armor,.04)
  parts=set(bpy.context.scene.objects)-before
  bpy.ops.object.empty_add(location=(side*.22,0,.75));joint=bpy.context.object;joint.name='Leg_'+str(side)
  for part in parts: part.parent=joint;part.matrix_parent_inverse=joint.matrix_world.inverted()
  limbs.append((joint,side,False))
 # Native Blender animation clips, played by the browser's AnimationMixer.
 parts=list(bpy.context.scene.objects)
 bpy.ops.object.empty_add(type='PLAIN_AXES');root=bpy.context.object;root.name='AthletePose'
 for part in parts:
  if part.parent is None: part.parent=root
 root.animation_data_create()
 poses={'Run':[(1,.06,0),(7,.06,.055),(13,.06,0),(19,.06,.055),(25,.06,0)],'Slide':[(1,0,0),(4,1.3,.12),(19,1.3,.12),(24,0,0)],'Jump':[(1,0,0),(10,-.25,0),(28,.2,0),(42,0,0)],'Throw':[(1,-.3,0),(6,.45,0),(20,0,0)],'Hit':[(1,0,0),(8,-1.5,.18),(65,-1.5,.18),(81,0,0)]}
 for clip,frames in poses.items():
  action=bpy.data.actions.new(clip);root.animation_data.action=action
  for frame,angle,height in frames:
   root.rotation_euler=(angle,0,0);root.location=(0,0,height)
   root.keyframe_insert(data_path='rotation_euler',frame=frame);root.keyframe_insert(data_path='location',frame=frame)
  root.animation_data.action=None
  track=root.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,action)
 for joint,side,isarm in limbs:
  joint.animation_data_create()
  for clip in ['Run','Throw','Jump','Slide','Hit']:
   action=bpy.data.actions.new(joint.name+'_'+clip);joint.animation_data.action=action
   frames=[1,7,13,19,25] if clip=='Run' else [1,6,12,20,32]
   for k,frame in enumerate(frames):
    angle=0
    if clip=='Run': angle=math.sin((frame-1)/24*math.tau)*.65*side*(-1 if isarm else 1)
    elif clip=='Throw' and isarm: angle=([-1.5,-1.0,.8,.25,0][k] if side==1 else .2)
    elif clip=='Jump': angle=-2.5 if isarm else .4
    elif clip=='Slide': angle=-1.2 if isarm else side*.2
    elif clip=='Hit': angle=side*.55
    joint.rotation_euler.x=angle;joint.keyframe_insert(data_path='rotation_euler',frame=frame)
   joint.animation_data.action=None
   track=joint.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action)
  joint.rotation_euler=(0,0,0)
 root.rotation_euler=(0,0,0);root.location=(0,0,0);bpy.context.scene.render.fps=60
 export(name)
sphere('Chrome speedball',(0,0,.25),.25,white)
export('ball')
for i in range(12):
 a=i*math.tau/12;o=cube('Impact spark',(math.cos(a)*.65,math.sin(a)*.65,.25),(.4,.07,.07),white,.015);o.rotation_euler.z=a
export('impact')
# All pickup icons are Blender geometry, including raised lettering.
labels=['ICE','REV','DOWN','UP','ALL','SLOW','BALL','PASS','LOCK','SAFE','HP','ZAP','$','AGR','ATT','DEF','SPD','THR','POW','STA','INT']
for k,label in enumerate(labels,1):
 before=set(bpy.context.scene.objects)
 tint=mat('Pickup color '+str(k),(.08,.60,.85) if k<7 else ((.14,.65,.3) if k<=12 else (.85,.52,.05)),.35,.25)
 cube('Token body',(0,0,.30),(.9,.9,.18),tint,.14)
 cube('Token inset',(0,0,.40),(.72,.72,.05),steel,.09)
 bpy.ops.object.text_add(location=(0,0,.44));o=bpy.context.object;o.name='Embossed symbol';o.data.body=label;o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=.23 if len(label)>3 else .31;o.data.extrude=.018;o.data.materials.append(white);bpy.ops.object.convert(target='MESH')
 parts=set(bpy.context.scene.objects)-before
 bpy.ops.object.empty_add();root=bpy.context.object;root.name='Pickup_'+str(k)
 for part in parts:part.parent=root
export('pickups')
cube('Stretcher',(0,0,.55),(1.8,.7,.12),armor,.06)
for y in [-.38,.38]:cube('Stretcher handle',(0,y,.60),(2.3,.07,.07),steel,.02)
for x in [-1.1,1.1]:
 cube('Medic tunic',(x,0,.95),(.38,.43,.65),white,.08)
 sphere('Medic head',(x,0,1.46),.20,skin)
 cube('Medic cap',(x,0,1.61),(.35,.38,.10),white,.04)
 cube('Red cross horizontal',(x,0,1.68),(.26,.07,.02),orange,.005)
 cube('Red cross vertical',(x,0,1.69),(.07,.26,.02),orange,.005)
 for y in [-.13,.13]:cube('Medic boot',(x,y,.23),(.30,.18,.42),steel,.04)
export('medic')
for name in ['arena','player-cyan','player-orange','ball']:
 bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,name+'.glb'))
 if name.startswith('player'):
  for o in bpy.context.selected_objects: o.location.x+= -6 if name=='player-cyan' else 6
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','speedball.blend'))
