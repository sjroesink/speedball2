# Original-game comparison — 8 September 2026

Reference material inspected:
- User supplied `Speedball 2 - WIP 02.zip`: C# `Player.cs` (sub_F020 / sub_F078, action selection and tackle routines), `Match.cs` (nearest-player selection, ball speed and warp gates), `Entity.cs`, `Field.cs`, `Electrobounces.cs`.
- https://github.com/simon-frankau/speedball2-re-amiga : `throwing_action_fn` at 0x107be, low/high ball animation selection at 0x10872, direction-to-velocity tables and action symbols.
- Original Amiga visual reference: https://thekingofgrabs.com/2023/01/25/speedball-2-brutal-deluxe-amiga/speedball-2-brutal-deluxe-amiga-13/

## Findings and implementation

The throw routine waits for animation index 4 and then checks the held fire bit. Both low and high throws use velocity table 8. This remake now starts a visible wind-up on press, keeps the player planted, and launches automatically after 160 ms. Releasing during that interval produces a low throw; holding produces a lob. Both start at 24 world units/second. These world-unit values and the 160 ms duration are tuning choices, not a claim of cycle-exact emulation. A short input pulse between network ticks still produces a low throw. Eight-way human movement has equal axial and diagonal speed.

The supplied goal check accepts transverse coordinates 272–368 on a court bounded by 32–608. That is one sixth of the court width. The goal half-width is now 1.85 world units instead of 3.8; geometry and keeper positioning match it.

AI outlet passing and low-shot keeper slides reduce the previous tendency to simply carry the ball toward goal and throw into pressure. Outlet selection is a new heuristic; it is not a port of the original AI.

The visual redesign uses blue/red enamel helmets, exposed faces/hands, silver shoulder and body armor, jointed limbs, and native Blender Run/Throw/Jump/Slide/Hit animation clips. The arena has larger steel plates, rivets, oxide-red 25/50 markings and dark metallic domes. All shipped meshes remain authored in Blender; neither the ZIP's disk images nor original sprites/binaries are shipped. The ZIP and extracted research files are ignored by Git.

## Remaining differences

This is still an adaptation. Ball flight uses continuous 3D gravity instead of sprite animation tables. Detailed original attributes, tackle probability/directional defense, detailed original AI and league management are not yet reproduced. The original 2D sprites show bodies from an illustrative angle independently of the court projection; the 3D camera uses a compromise angle for readable bodies and ball tracking.

## Validation

Paired Go/JavaScript tests cover the wind-up, automatic held throw, short input pulses, eight-way movement, outlet selection and existing tackle/catch/scoring rules. Blender exports contain the five named animation clips. Production frontend build and Go vet are also checked, with browser training and two-client WebTransport checks.

## Match feature completion

Inspected the supplied C# Token.cs, Player.cs injury/medic handling, Entity.cs pickup/equipment handling and Match.cs warp checks. Implemented all twelve token effects, six-second temporary effects with global replacement, eight equipment categories, four credit pickups, health damage, three reserves per team and medical clock stoppage. Continuous-world damage amounts (base 20 per tackle), six-second medical travel, spawn placement/rotation and equipment factors are gameplay tuning choices; the original has a richer attribute system and screen-relative zap targeting. Our zap affects all available opponents and our pickups can be collected by every active player.

Warp gates preserve ball direction and work only for low balls. Electro-bounce charge comes from the scoring multiplier and is consumed on enemy hits. Shields protect against contact, zap and charged balls. All state is included in binary snapshot v3 and applied by the authoritative Go simulation, with a local JavaScript counterpart. Go-produced snapshot fixtures are decoded in a JavaScript test to catch wire-format drift.
