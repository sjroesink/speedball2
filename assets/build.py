"""Original game meshes, authored and exported with Blender. Run with npm run assets."""
import bpy, math, os, time, json, sys, random
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
steel=mat('Graphite titanium',(.06,.075,.07),.75)
floor=mat('Arena brushed steel',(.15,.19,.175),.45)
floor.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.65
fastener=mat('Recessed steel fasteners',(.19,.23,.24),.60)
fastener.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.60
line=mat('Pitch markings',(.50,.53,.44),.1)
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
def export(name,apply_modifiers=False):
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets',name+'.blend'))
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,name+'.build.glb'),export_format='GLB',use_selection=False,export_animation_mode='NLA_TRACKS',export_apply=apply_modifiers)
 for attempt in range(30):
  try: os.replace(os.path.join(OUT,name+'.build.glb'),os.path.join(OUT,name+'.glb'));break
  except OSError:
   if attempt==29:raise
   time.sleep(.1)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def build_medics():
 before=set(bpy.context.scene.objects)
 cube('Stretcher',(0,0,.55),(1.8,.7,.12),armor,.06)
 for y in [-.38,.38]:cube('Stretcher handle',(0,y,.60),(2.3,.07,.07),steel,.02)
 parts=set(bpy.context.scene.objects)-before
 bpy.ops.object.empty_add();root=bpy.context.object;root.name='StretcherAssembly'
 for part in parts:part.parent=root
 for n in range(2):
  before=set(bpy.context.scene.objects)
  cube('Medic tunic',(0,0,.95),(.38,.43,.65),white,.08)
  sphere('Medic head',(0,0,1.46),.20,skin)
  cube('Medic cap',(0,0,1.61),(.35,.38,.10),white,.04)
  cube('Red cross horizontal',(0,0,1.68),(.26,.07,.02),orange,.005)
  cube('Red cross vertical',(0,0,1.69),(.07,.26,.02),orange,.005)
  for y in [-.13,.13]:cube('Medic boot',(0,y,.23),(.30,.18,.42),steel,.04)
  parts=set(bpy.context.scene.objects)-before
  bpy.ops.object.empty_add();root=bpy.context.object;root.name='Medic_'+str(n)
  for part in parts:part.parent=root
 export('medic')
if '--medic-only' in sys.argv:
 build_medics()
 raise SystemExit
def tapered_plate(name,loc,bottom,top,depth,height,material):
 # Author a trapezoidal armor shell directly in Blender, with machined edges.
 vertices=[(x*w/2,y*depth/2,z*height/2) for z,w in [(-1,bottom),(1,top)] for x,y in [(-1,-1),(1,-1),(1,1),(-1,1)]]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);obj.location=loc;obj.data.materials.append(material)
 bevel=obj.modifiers.new('Forged edge radius','BEVEL');bevel.width=.035;bevel.segments=3
 obj.modifiers.new('Armor face normals','WEIGHTED_NORMAL')
 return obj

def contoured_shell(name,loc,rings,material):
 # Elliptical cross-sections give protective shells a shaped, wearable silhouette.
 segments=12
 vertices=[(math.cos(i*math.tau/segments)*width/2,
            math.sin(i*math.tau/segments)*depth/2,z)
           for z,width,depth in rings for i in range(segments)]
 faces=[tuple(reversed(range(segments)))]
 for row in range(len(rings)-1):
  for i in range(segments):
   a=row*segments+i;b=row*segments+(i+1)%segments
   faces.append((a,b,b+segments,a+segments))
 faces.append(tuple((len(rings)-1)*segments+i for i in range(segments)))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 obj.location=loc;mesh.materials.append(material)
 for face in mesh.polygons: face.use_smooth=len(face.vertices)==4
 obj.modifiers.new('Shell normals','WEIGHTED_NORMAL')
 return obj

def build_players():
 # Dedicated athlete materials leave the stadium and medical equipment intact.
 athlete_steel=mat('Satin athlete plate',(.43,.50,.52),.72)
 athlete_steel.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.52
 athlete_skin=mat('Athlete skin',(.50,.255,.125))
 athlete_skin.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.78
 for name,color in [('player-cyan',cyan),('player-orange',orange)]:
  # Compact helmet, athletic torso and separate armor plates read at court scale.
  cube('Hip belt',(0,0,.72),(.54,.38,.22),rubber,.045)
  tapered_plate('Tapered torso',(0,.015,1.10),.46,.72,.39,.68,rubber)
  tapered_plate('Breastplate',(0,-.09,1.22),.53,.75,.34,.40,athlete_steel)
  cube('Team breast stripe',(0,-.272,1.27),(.47,.025,.075),color,.01)
  tapered_plate('Upper back plate',(0,.21,1.22),.51,.68,.09,.38,athlete_steel)
  cube('Back team stripe',(0,.262,1.28),(.38,.02,.075),color,.01)
  for z,w in [(.90,.37),(1.01,.43)]:
   cube('Lumbar plate',(0,.20,z),(w,.07,.085),athlete_steel,.025)
  for z,w in [(.89,.40),(.99,.46)]:
   tapered_plate('Abdominal plate',(0,-.09,z),w-.035,w,.31,.085,athlete_steel)
  cube('Belt buckle',(0,-.215,.75),(.15,.035,.11),athlete_steel,.015)
  neck=sphere('Neck',(0,0,1.49),.125,athlete_skin);neck.scale.z=1.1
  head=sphere('Head',(0,-.045,1.66),.20,athlete_skin);head.scale=(.88,1,1.12)
  helmet=sphere('Open face helmet',(0,.018,1.77),.23,color);helmet.scale=(1,1,.70)
  cube('Helmet crown stripe',(0,.005,1.927),(.065,.25,.02),athlete_steel,.01)
  cube('Brow guard',(0,-.21,1.76),(.32,.045,.055),athlete_steel,.018)
  for side in [-1,1]:
   cube('Eye socket',(side*.075,-.227,1.698),(.072,.02,.022),rubber,.006)
   cube('Helmet temple',(side*.182,-.035,1.68),(.047,.18,.11),color,.018)
  cube('Nose',(0,-.252,1.655),(.055,.05,.07),athlete_skin,.018)
  cube('Jaw',(0,-.163,1.56),(.21,.15,.12),athlete_skin,.035)
  cube('Chin strap',(0,-.237,1.53),(.16,.018,.035),rubber,.006)
  limbs=[]
  knees=[]
  ankles=[]
  elbows=[]
  for side in [-1,1]:
   before=set(bpy.context.scene.objects)
   shoulder=contoured_shell('Silver shoulder pad',(side*.46,0,1.40),[(-.13,.30,.34),(-.07,.42,.46),(.06,.40,.43),(.13,.25,.29)],athlete_steel)
   cube('Shoulder crown inlay',(side*.46,0,1.54),(.20,.29,.025),color,.035)
   cube('Shoulder team band',(side*.5,-.235,1.40),(.27,.04,.085),color,.02)
   bicep=sphere('Bicep',(side*.49,0,1.13),.16,athlete_skin);bicep.scale.z=1.35
   forearm_start=set(bpy.context.scene.objects)
   contoured_shell('Forearm armor',(side*.49,-.06,.98),[(-.165,.18,.21),(-.10,.23,.27),(.07,.28,.30),(.165,.23,.25)],athlete_steel)
   sphere('Hand',(side*.49,-.12,.78),.13,athlete_skin)
   forearm_parts=set(bpy.context.scene.objects)-forearm_start
   bpy.ops.object.empty_add(location=(side*.49,0,1.10));elbow=bpy.context.object;elbow.name='Elbow_'+str(side)
   for part in forearm_parts: part.parent=elbow;part.matrix_parent_inverse=elbow.matrix_world.inverted()
   elbows.append((elbow,side))
   parts=set(bpy.context.scene.objects)-before
   bpy.ops.object.empty_add(location=(side*.43,0,1.42));joint=bpy.context.object;joint.name='Arm_'+str(side)
   for part in parts:
    if part.parent is None: part.parent=joint;part.matrix_parent_inverse=joint.matrix_world.inverted()
   if side==1:
    # Grip center follows the throwing hand, just beyond the closed fist.
    bpy.ops.object.empty_add(location=(side*.49,-.12,.45))
    grip=bpy.context.object;grip.name='BallGrip';grip.parent=elbow
    grip.matrix_parent_inverse=elbow.matrix_world.inverted()
   limbs.append((joint,side,True))
   before=set(bpy.context.scene.objects)
   contoured_shell('Thigh',(side*.22,0,.56),[(-.15,.22,.26),(-.06,.28,.32),(.09,.33,.36),(.165,.28,.31)],athlete_steel)
   lower_start=set(bpy.context.scene.objects)
   cube('Knee guard',(side*.22,-.15,.36),(.24,.15,.19),steel,.055)
   contoured_shell('Shin',(side*.22,-.015,.23),[(-.14,.18,.22),(-.07,.20,.25),(.07,.27,.30),(.13,.23,.25)],athlete_steel)
   foot_start=set(bpy.context.scene.objects)
   cube('Boot',(side*.22,-.12,.10),(.30,.49,.18),rubber,.035)
   cube('Steel toe',(side*.22,-.32,.14),(.28,.15,.13),athlete_steel,.025)
   foot_parts=set(bpy.context.scene.objects)-foot_start
   bpy.ops.object.empty_add(location=(side*.22,0,.10));ankle=bpy.context.object;ankle.name='Ankle_'+str(side)
   for part in foot_parts: part.parent=ankle;part.matrix_parent_inverse=ankle.matrix_world.inverted()
   ankles.append((ankle,side))
   lower_parts=set(bpy.context.scene.objects)-lower_start
   bpy.ops.object.empty_add(location=(side*.22,0,.38));knee=bpy.context.object;knee.name='Knee_'+str(side)
   for part in lower_parts:
    if part.parent is None: part.parent=knee;part.matrix_parent_inverse=knee.matrix_world.inverted()
   knees.append((knee,side))
   parts=set(bpy.context.scene.objects)-before
   bpy.ops.object.empty_add(location=(side*.22,0,.75));joint=bpy.context.object;joint.name='Leg_'+str(side)
   for part in parts:
    if part.parent is None: part.parent=joint;part.matrix_parent_inverse=joint.matrix_world.inverted()
   limbs.append((joint,side,False))
  # Lengthen the legs above the boots while keeping the upper body proportions.
  # Remap mesh vertices and joint origins together so the authored rig stays aligned.
  bpy.context.view_layer.update()
  parts=list(bpy.context.scene.objects)
  old_world={part:part.matrix_world.copy() for part in parts}
  def leg_height(z): return z+.30*max(0,min(z-.20,.55))
  new_world={part:matrix.copy() for part,matrix in old_world.items()}
  def remap_height(part,z):
   ancestor=part
   while ancestor:
    if ancestor.name.startswith('Arm_'): return z+.165
    ancestor=ancestor.parent
   return leg_height(z)
  for part,matrix in new_world.items(): matrix.translation.z=remap_height(part,matrix.translation.z)
  for part in parts:
   if part.type=='MESH':
    inverse=new_world[part].inverted()
    for vertex in part.data.vertices:
     point=old_world[part] @ vertex.co;point.z=remap_height(part,point.z)
     vertex.co=inverse @ point
   part.matrix_world=new_world[part]
  # Re-establish bind transforms after changing both parent and child origins.
  for part in parts:
   if part.parent:
    part.matrix_parent_inverse=new_world[part.parent].inverted()
    part.matrix_basis=new_world[part]
  bpy.context.view_layer.update()
  # Native Blender animation clips, played by the browser's AnimationMixer.
  parts=list(bpy.context.scene.objects)
  bpy.ops.object.empty_add(type='PLAIN_AXES');root=bpy.context.object;root.name='AthletePose'
  for part in parts:
   if part.parent is None: part.parent=root
  root.animation_data_create()
  poses={'Punch':[(1,0,0),(4,.22,0),(11,0,0)],'Catch':[(1,-.12,0),(4,-.08,0),(8,0,0)],'Run':[(1,.06,0),(7,.065,.055),(13,.06,0),(19,.065,.055),(25,.06,0)],'Slide':[(1,0,0),(4,1.3,.12),(19,1.3,.12),(24,0,0)],'Jump':[(1,0,0),(10,-.25,0),(28,.2,0),(42,0,0)],'Throw':[(1,-.1,0),(8,-.2,0),(16.5,.12,0),(24,.04,0),(32,0,0)],'Hit':[(1,0,0),(8,-1.5,.18),(65,-1.5,.18),(81,0,0)]}
  for clip,frames in poses.items():
   action=bpy.data.actions.new(clip);root.animation_data.action=action
   for frame,angle,height in frames:
    root.rotation_euler=(angle,0,0);root.location=(0,0,height)
    root.keyframe_insert(data_path='rotation_euler',frame=frame);root.keyframe_insert(data_path='location',frame=frame)
   root.animation_data.action=None
   track=root.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,action)
  for joint,side,isarm in limbs:
   joint.animation_data_create()
   for clip in ['Run','Throw','Jump','Slide','Hit','Catch','Punch']:
    action=bpy.data.actions.new(joint.name+'_'+clip);joint.animation_data.action=action
    frames=[1,7,13,19,25] if clip=='Run' else [1,6,12,20,32]
    if clip=='Throw': frames=[1,8,16.5,24,32]
    if clip=='Catch': frames=[1,4,8]
    if clip=='Punch': frames=[1,4,11]
    for k,frame in enumerate(frames):
     angle=0
     if clip=='Run': angle=math.sin((frame-1)/24*math.tau)*.65*side*(-1 if isarm else 1)
     elif clip=='Throw' and isarm: angle=([.5,.9,-1.5,-.6,0][k] if side==1 else -.2)
     elif clip=='Jump': angle=-2.5 if isarm else .4
     elif clip=='Slide': angle=-1.2 if isarm else side*.2
     elif clip=='Hit': angle=side*.55
     elif clip=='Catch' and isarm: angle=[-.9,-.65,0][k]
     elif clip=='Punch' and isarm: angle=[-.4,-1.7,0][k] if side==1 else -.3
     joint.rotation_euler.x=angle;joint.keyframe_insert(data_path='rotation_euler',frame=frame)
    joint.animation_data.action=None
    track=joint.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action)
   joint.rotation_euler=(0,0,0)
  for elbow,side in elbows:
   elbow.animation_data_create()
   for clip in poses:
    action=bpy.data.actions.new(elbow.name+'_'+clip);elbow.animation_data.action=action
    frames=[1,7,13,19,25] if clip=='Run' else [f[0] for f in poses[clip]]
    for k,frame in enumerate(frames):
     angle=0
     if clip=='Run': angle=-.65-.20*math.sin((frame-1)/24*math.tau)*side
     elif clip=='Throw': angle=[-.45,-.85,0,-.25,0][k] if side==1 else -.4
     elif clip=='Catch': angle=[-.5,-.35,0][k]
     elif clip=='Punch': angle=[-.6,0,0][k] if side==1 else -.5
     elbow.rotation_euler.x=angle;elbow.keyframe_insert(data_path='rotation_euler',frame=frame)
    elbow.animation_data.action=None
    track=elbow.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action)
   elbow.rotation_euler=(0,0,0)
  for knee,side in knees:
   knee.animation_data_create()
   for clip in poses:
    action=bpy.data.actions.new(knee.name+'_'+clip);knee.animation_data.action=action
    frames=range(1,26,3) if clip=='Run' else [1,poses[clip][-1][0]]
    for frame in frames:
     # Flex the trailing leg during swing; the planted leg stays near extension.
     phase=(frame-1)/24*math.tau
     angle=.08+.95*max(0,math.sin(phase)*side) if clip=='Run' else 0
     knee.rotation_euler.x=angle;knee.keyframe_insert(data_path='rotation_euler',frame=frame)
    knee.animation_data.action=None
    track=knee.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action)
   knee.rotation_euler=(0,0,0)
  for ankle,side in ankles:
   ankle.animation_data_create()
   for clip in poses:
    action=bpy.data.actions.new(ankle.name+'_'+clip);ankle.animation_data.action=action
    frames=range(1,26,3) if clip=='Run' else [1,poses[clip][-1][0]]
    for frame in frames:
     angle=0
     if clip=='Run':
      phase=(frame-1)/24*math.tau
      # Counter the authored hip, knee and torso pitch at each gait key.
      hip=math.sin(phase)*.65*side
      knee=.08+.95*max(0,math.sin(phase)*side)
      angle=-hip-knee-.06
     ankle.rotation_euler.x=angle;ankle.keyframe_insert(data_path='rotation_euler',frame=frame)
    ankle.animation_data.action=None
    track=ankle.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action)
   ankle.rotation_euler=(0,0,0)
  # Bake body height against the actual authored boot soles for the Run clip.
  animated=[obj for obj in bpy.context.scene.objects if obj.animation_data]
  for obj in animated:
   for track in obj.animation_data.nla_tracks: track.mute=True
   obj.animation_data.action=next(track for track in obj.animation_data.nla_tracks if track.name=='Run').strips[0].action
  boots=[obj for obj in bpy.context.scene.objects if obj.name.startswith('Boot')]
  ground_keys=[]
  for frame in range(1,26):
   bpy.context.scene.frame_set(frame);bpy.context.view_layer.update()
   depsgraph=bpy.context.evaluated_depsgraph_get()
   evaluated=[boot.evaluated_get(depsgraph) for boot in boots]
   sole=min((boot.matrix_world @ vertex.co).z for boot in evaluated for vertex in boot.data.vertices)
   ground_keys.append((frame,root.location.z+.01-sole))
  run_track=next(track for track in root.animation_data.nla_tracks if track.name=='Run')
  root.animation_data.action=run_track.strips[0].action
  for frame,height in ground_keys:
   root.location=(0,0,height);root.keyframe_insert(data_path='location',frame=frame)
  root.animation_data.action=None
  for obj in animated:
   obj.animation_data.action=None
   for track in obj.animation_data.nla_tracks: track.mute=False
  root.rotation_euler=(0,0,0);root.location=(0,0,0);bpy.context.scene.render.fps=60
  export(name,apply_modifiers=True)
if '--players-only' in sys.argv:
 build_players()
 raise SystemExit
# Blender XY ground maps to Three.js XZ. Pitch length along X.
cube('Arena foundation',(0,0,-.42),(31,20,.8),steel,.3)
cube('Playing surface',(0,0,0),(28,17,.12),floor)
for x in [-10.5,-7,0,7,10.5]: cube('Floor panel seam',(x,0,.065),(.020,17,.012),steel,0)
for y in [-6,-3,0,3,6]: cube('Floor panel seam',(0,y,.065),(28,.020,.012),steel,0)
for x in [-10.5,-7,0,7,10.5]:
 for y in range(-8,9):
  for side in [-1,1]:
   bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.031,depth=.012,location=(x+side*.10,y,.074))
   rivet=bpy.context.object;rivet.name='Flush floor fastener';rivet.data.materials.append(fastener)
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
 cube('Goal floor',(x,0,.1),(1.4,2.7,.12),steel)
 for y in [-1.15,1.15]: cube('Goal apron stripe',(x,y,.17),(1.1,.10,.02),c,.005)
 for y in [-1.35,1.35]: cube('Goal upright',(x,y,1.05),(.2,.2,2.1),armor)
 cube('Goal crossbar',(x,0,2.05),(.2,2.9,.2),armor)
 for y in [-7,-5,5,7]: cube('End rail',(x,y,1),(.08,1.5,.06),c)
cube('Halfway line',(0,0,.074),(.065,16,.012),line,0)
for y in [-8,8]: cube('Touchline',(0,y,.075),(27,.05,.012),line,0)
for x in [-13.5,13.5]: cube('End line',(x,0,.075),(.05,16,.012),line,0)
bpy.ops.mesh.primitive_torus_add(major_radius=2.6,minor_radius=.032,major_segments=96,minor_segments=6,location=(0,0,.09));bpy.context.object.data.materials.append(line)
# Large painted star echoes the classic court emblem; it is not a score target.
emblem=mat('Worn plum court stencil',(.23,.115,.15),.05)
emblem.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.82
verts=[]
for radius_scale in [1,.88]:
 for i in range(10):
  angle=i*math.pi/5;radius=(2.25 if i%2==0 else 1.0)*radius_scale
  verts.append((math.cos(angle)*radius,math.sin(angle)*radius,.086))
faces=[(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)]
mesh=bpy.data.meshes.new('Center star stencil');mesh.from_pydata(verts,[],faces);mesh.materials.append(emblem)
obj=bpy.data.objects.new('Center star stencil',mesh);bpy.context.collection.objects.link(obj)

for x in [-10.5,10.5]:
 cube('Goal box',(x,0,.08),(.045,8,.012),line,0)
 for y in [-4,4]: cube('Goal box',(x+(-1.5 if x<0 else 1.5),y,.08),(3,.045,.012),line,0)
# Continuous terraces support the seats instead of isolated floating blocks.
for y in [-10,10]:
 for row in range(3):
  tier_y=y+math.copysign(row*.65,y)
  cube('Terrace riser',(0,tier_y,-.12+row*.2),(29,.65,.50+row*.4),steel,.025)
  for x in range(-14,15):
   cube('Grandstand seat',(x,tier_y,.20+row*.4),(.75,.46,.12),rubber,.025)
   cube('Grandstand seat back',(x,tier_y+math.copysign(.20,y),.37+row*.4),(.75,.10,.31),steel,.025)
# Larger regulation-style pitch. Keep goal height and player size in metres.
for o in bpy.context.scene.objects:
 o.location.x*=1.5;o.location.y*=1.4;o.scale.x*=1.5;o.scale.y*=1.4
# Align visible contact faces with the original terrain bounds after scaling.
terrain_unit=22.4/576
pitch_end=544*terrain_unit
goal_half_width=48*terrain_unit
bpy.context.view_layer.update()
for o in bpy.context.scene.objects:
 if o.name.startswith('Playing surface'): o.dimensions.x=2*pitch_end
 elif o.name.startswith('Touchline'): o.dimensions.x=2*pitch_end
 elif o.name.startswith('End line'): o.location.x=math.copysign(pitch_end,o.location.x)
 elif o.name.startswith('Goal floor'):
  o.location.x=math.copysign(pitch_end,o.location.x)
  o.dimensions.y=2*goal_half_width+.56
 elif o.name.startswith('Goal upright'):
  o.location.x=math.copysign(pitch_end,o.location.x)
  o.location.y=math.copysign(goal_half_width+o.dimensions.y/2,o.location.y)
 elif o.name.startswith('Goal crossbar'):
  o.location.x=math.copysign(pitch_end,o.location.x)
  o.dimensions.y=2*goal_half_width+.56
 elif o.name.startswith('End wall'):
  o.location.x=math.copysign(pitch_end+o.dimensions.x/2,o.location.x)
  inner=goal_half_width+.28
  outer=11.9
  o.location.y=math.copysign((inner+outer)/2,o.location.y)
  o.dimensions.y=outer-inner
 elif o.name.startswith('End rail'): o.location.x=math.copysign(pitch_end,o.location.x)
 elif o.name.startswith('Impact barrier') or o.name.startswith('Barrier brace'):
  o.location.y=math.copysign(11.2+o.dimensions.y/2,o.location.y)
 elif o.name.startswith('Cyan rail'): o.location.y=math.copysign(11.55,o.location.y)
bpy.context.view_layer.update()
print('CONTACT GEOMETRY: end=%.6f, goal half-width=%.6f, side=11.200000' % (pitch_end,goal_half_width))
# Wall service cassettes use world coordinates after court alignment.
wall_plate=mat('Barrier service plate',(.18,.21,.19),.65)
wall_plate.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.6
for side in [-1,1]:
 for x in [-19.6,-16.8,-14,-11.2,-8.4,-5.6,-2.8,0,2.8,5.6,8.4,11.2,14,16.8,19.6]:
  if abs(x+side*32*terrain_unit)<1.7 or abs(abs(x)-206*terrain_unit)<1.15: continue
  if side==1 and 1.3<x<7.5 or side==-1 and -7.5<x<-1.3: continue
  y=side*11.57
  cube('Wall service cassette',(x,y,1.10),(2.45,.62,.08),wall_plate,.025)
  for dx in [-.42,-.21,0,.21,.42]:
   cube('Recessed vent slot',(x+dx,y,1.147),(.075,.36,.012),rubber,.006)
  for dx in [-1.05,1.05]:
   for dy in [-.20,.20]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.04,depth=.015,location=(x+dx,y+dy,1.15))
    o=bpy.context.object;o.name='Cassette bolt';o.data.materials.append(fastener)

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
for x in [-pitch_end,pitch_end]:
 cube('GoalShield_'+str(int(x)),(x,0,1),(.16,2*goal_half_width,1.9),cyan,.03)
# Individual replacement plates vary gently in finish, within the existing seams.
# Packed linear roughness/metalness map authored in Blender, shared by all plates.
brush_size=256
brush_rng=random.Random(2091)
brush=bpy.data.images.new('Court brushed metal roughness',width=brush_size,height=brush_size,alpha=True)
brush.colorspace_settings.name='Non-Color'
brush_pixels=[]
brush_lines=[brush_rng.uniform(-.055,.055) for _ in range(brush_size)]
for y in range(brush_size):
 for x in range(brush_size):
  grain=brush_lines[y]+brush_rng.uniform(-.012,.012)
  roughness=max(.40,min(.80,.65+grain))
  brush_pixels.extend((1,roughness,.45,1))
# Short scuff strokes are smoother than the surrounding brushed finish.
for stroke in range(90):
 y=brush_rng.randrange(brush_size);start=brush_rng.randrange(brush_size)
 for step in range(brush_rng.randrange(3,28)):
  x=(start+step)%brush_size
  brush_pixels[(y*brush_size+x)*4+1]=.42
brush.pixels.foreach_set(brush_pixels);brush.pack()
plate_finishes=[]
for tone in range(5):
 shift=(tone-2)*.006
 finish=mat('Court plate finish '+str(tone),(.15+shift,.19+shift,.175+shift),.45)
 nodes=finish.node_tree.nodes;links=finish.node_tree.links
 texture=nodes.new('ShaderNodeTexImage');texture.image=brush
 channels=nodes.new('ShaderNodeSeparateColor');links.new(texture.outputs['Color'],channels.inputs['Color'])
 shader=nodes.get('Principled BSDF')
 links.new(channels.outputs['Green'],shader.inputs['Roughness'])
 links.new(channels.outputs['Blue'],shader.inputs['Metallic'])
 plate_finishes.append(finish)
x_edges=[-pitch_end,-15.75,-10.5,0,10.5,15.75,pitch_end]
y_edges=[-11.9,-8.4,-4.2,0,4.2,8.4,11.9]
for col,(left,right) in enumerate(zip(x_edges,x_edges[1:])):
 for row,(bottom,top) in enumerate(zip(y_edges,y_edges[1:])):
  finish=plate_finishes[(col*7+row*3+col*row)%len(plate_finishes)]
  cube('Court replacement plate',((left+right)/2,(bottom+top)/2,.062),
       (right-left-.035,top-bottom-.030,.002),finish,0)
# Batch only static decoration; animated score targets retain separate names.
for prefixes,label in [(['Court replacement plate'],'Court plate finishes'),(['Wall service cassette'],'Wall service panels'),(['Recessed vent slot'],'Wall ventilation'),(['Cassette bolt'],'Wall fasteners'),(['Terrace riser','Grandstand seat back'],'Terrace steelwork'),(['Grandstand seat'],'Terrace seating')]:
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(o.name.startswith(p) for p in prefixes)]
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:
  bpy.context.view_layer.objects.active=o
  for modifier in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=modifier.name)
  o.select_set(True)
 if objects:
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=label
export('arena')
if '--arena-only' in sys.argv: sys.exit(0)
build_players()
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
build_medics()
for name in ['arena','player-cyan','player-orange','ball']:
 bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,name+'.glb'))
 if name.startswith('player'):
  for o in bpy.context.selected_objects: o.location.x+= -6 if name=='player-cyan' else 6
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'assets','speedball.blend'))
