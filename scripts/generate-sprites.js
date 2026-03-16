/**
 * Speedball 2 Sprite Generator
 * Generates all PNG sprite assets in pixel-art style inspired by the Amiga original.
 * Uses pngjs to create PNG files with hand-coded pixel data.
 *
 * Usage: node scripts/generate-sprites.js
 */

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'sprites');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Helper drawing functions
// ---------------------------------------------------------------------------

function setPixel(png, x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= png.width || y < 0 || y >= png.height) return;
    const idx = (png.width * y + x) << 2;
    png.data[idx] = r;
    png.data[idx + 1] = g;
    png.data[idx + 2] = b;
    png.data[idx + 3] = a;
}

function getPixel(png, x, y) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= png.width || y < 0 || y >= png.height) return [0, 0, 0, 0];
    const idx = (png.width * y + x) << 2;
    return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

function fillRect(png, x, y, w, h, r, g, b, a = 255) {
    for (let py = y; py < y + h; py++) {
        for (let px = x; px < x + w; px++) {
            setPixel(png, px, py, r, g, b, a);
        }
    }
}

function drawRect(png, x, y, w, h, r, g, b, a = 255) {
    for (let px = x; px < x + w; px++) {
        setPixel(png, px, y, r, g, b, a);
        setPixel(png, px, y + h - 1, r, g, b, a);
    }
    for (let py = y; py < y + h; py++) {
        setPixel(png, x, py, r, g, b, a);
        setPixel(png, x + w - 1, py, r, g, b, a);
    }
}

function fillCircle(png, cx, cy, radius, r, g, b, a = 255) {
    const r2 = radius * radius;
    for (let py = Math.floor(cy - radius); py <= Math.ceil(cy + radius); py++) {
        for (let px = Math.floor(cx - radius); px <= Math.ceil(cx + radius); px++) {
            const dx = px - cx;
            const dy = py - cy;
            if (dx * dx + dy * dy <= r2) {
                setPixel(png, px, py, r, g, b, a);
            }
        }
    }
}

function drawCircle(png, cx, cy, radius, r, g, b, a = 255) {
    // Midpoint circle algorithm
    let x = radius;
    let y = 0;
    let err = 1 - radius;
    while (x >= y) {
        setPixel(png, cx + x, cy + y, r, g, b, a);
        setPixel(png, cx + y, cy + x, r, g, b, a);
        setPixel(png, cx - y, cy + x, r, g, b, a);
        setPixel(png, cx - x, cy + y, r, g, b, a);
        setPixel(png, cx - x, cy - y, r, g, b, a);
        setPixel(png, cx - y, cy - x, r, g, b, a);
        setPixel(png, cx + y, cy - x, r, g, b, a);
        setPixel(png, cx + x, cy - y, r, g, b, a);
        y++;
        if (err < 0) {
            err += 2 * y + 1;
        } else {
            x--;
            err += 2 * (y - x) + 1;
        }
    }
}

function drawLine(png, x1, y1, x2, y2, r, g, b, a = 255) {
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    x2 = Math.round(x2);
    y2 = Math.round(y2);
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    while (true) {
        setPixel(png, x1, y1, r, g, b, a);
        if (x1 === x2 && y1 === y2) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1 += sx; }
        if (e2 < dx) { err += dx; y1 += sy; }
    }
}

function fillEllipse(png, cx, cy, rx, ry, r, g, b, a = 255) {
    for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) {
        for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
            const dx = (px - cx) / rx;
            const dy = (py - cy) / ry;
            if (dx * dx + dy * dy <= 1.0) {
                setPixel(png, px, py, r, g, b, a);
            }
        }
    }
}

function savePng(png, filename) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(OUTPUT_DIR, filename);
        const stream = fs.createWriteStream(filePath);
        png.pack().pipe(stream);
        stream.on('finish', () => {
            console.log(`  Generated: ${filename}`);
            resolve();
        });
        stream.on('error', reject);
    });
}

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

const COLORS = {
    // Outlines
    outline: [20, 20, 20],
    outlineDark: [10, 10, 10],

    // Skin tones
    skin: [160, 110, 70],
    skinLight: [185, 135, 90],
    skinDark: [120, 80, 50],

    // Home team (red)
    homeMain: [200, 40, 40],
    homeLight: [240, 80, 60],
    homeDark: [140, 25, 25],
    homeAccent: [255, 200, 50],

    // Away team (blue)
    awayMain: [40, 80, 200],
    awayLight: [70, 120, 240],
    awayDark: [25, 50, 140],
    awayAccent: [50, 220, 255],

    // Helmet / visor
    helmetGrey: [140, 140, 150],
    helmetLight: [180, 180, 190],
    helmetDark: [90, 90, 100],
    visor: [60, 200, 220],
    visorDark: [30, 140, 160],

    // Boots
    bootDark: [50, 40, 35],
    bootLight: [80, 65, 55],

    // Metal/chrome
    metalLight: [210, 210, 220],
    metalMid: [160, 160, 170],
    metalDark: [100, 100, 110],

    // Arena
    floorDark: [35, 40, 55],
    floorMid: [50, 55, 70],
    floorLight: [65, 70, 85],
    floorRivet: [90, 95, 110],

    // Wall
    wallMain: [160, 40, 35],
    wallLight: [200, 70, 60],
    wallDark: [110, 30, 25],
    wallRivet: [200, 180, 160],

    // Ball
    ballLight: [230, 230, 235],
    ballMid: [180, 180, 190],
    ballDark: [120, 120, 130],
    ballLine: [100, 100, 110],

    // Dome
    domeCyan: [0, 200, 210],
    domeLight: [100, 240, 250],
    domeDark: [0, 130, 140],
    domeGlow: [0, 255, 255],

    // Star
    starDark: [160, 130, 40],
    starMid: [190, 160, 60],
    starActive: [255, 240, 80],
    starGlow: [255, 255, 160],

    // Multiplier
    multiPurple: [160, 40, 180],
    multiLight: [220, 100, 240],
    multiDark: [100, 20, 120],
    multiGlow: [240, 140, 255],

    // Warp
    warpGreen: [0, 200, 80],
    warpLight: [100, 255, 150],
    warpDark: [0, 100, 40],
    warpCenter: [10, 30, 15],

    // Goal
    goalGold: [220, 190, 50],
    goalLight: [255, 230, 100],
    goalDark: [160, 130, 30],
    goalInterior: [25, 25, 30],
    goalNet: [80, 80, 90],
};

// ---------------------------------------------------------------------------
// Player sprite drawing
// ---------------------------------------------------------------------------

// Directions: 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
// Rows: 0=idle, 1-3=run, 4=tackle, 5=stunned, 6=injured, 7=shoot

/**
 * Draw one player frame at (ox, oy) within the png.
 * dir: 0-7 direction index
 * anim: 0-7 row index
 * teamColors: { main, light, dark, accent }
 */
function drawPlayerFrame(png, ox, oy, dir, anim, teamColors) {
    const OL = COLORS.outline;
    const SK = COLORS.skin;
    const SKL = COLORS.skinLight;
    const SKD = COLORS.skinDark;
    const TM = teamColors.main;
    const TL = teamColors.light;
    const TD = teamColors.dark;
    const TA = teamColors.accent;
    const HL = COLORS.helmetGrey;
    const HLL = COLORS.helmetLight;
    const HLD = COLORS.helmetDark;
    const VIS = COLORS.visor;
    const VISD = COLORS.visorDark;
    const BT = COLORS.bootDark;
    const BTL = COLORS.bootLight;

    // Frame is 48x48; player centered roughly at (24, 24)
    // We draw relative to ox,oy (top-left of frame)

    // Helper to draw within the frame
    const sp = (x, y, c) => setPixel(png, ox + x, oy + y, c[0], c[1], c[2]);
    const fr = (x, y, w, h, c) => fillRect(png, ox + x, oy + y, w, h, c[0], c[1], c[2]);
    const fc = (cx, cy, r, c) => fillCircle(png, ox + cx, oy + cy, r, c[0], c[1], c[2]);
    const fe = (cx, cy, rx, ry, c) => fillEllipse(png, ox + cx, oy + cy, rx, ry, c[0], c[1], c[2]);
    const dl = (x1, y1, x2, y2, c) => drawLine(png, ox + x1, oy + y1, ox + x2, oy + y2, c[0], c[1], c[2]);

    // Determine facing booleans
    const facingN = dir === 0 || dir === 1 || dir === 7;
    const facingS = dir === 4 || dir === 3 || dir === 5;
    const facingE = dir === 2 || dir === 1 || dir === 3;
    const facingW = dir === 6 || dir === 5 || dir === 7;
    const isSide = dir === 2 || dir === 6;
    const isDiag = dir === 1 || dir === 3 || dir === 5 || dir === 7;

    // Mirror flag: if facing west-ish, we can mirror the east drawing
    const mirror = facingW;
    const mx = (x) => mirror ? (47 - x) : x;

    // Handle special animations
    if (anim === 6) {
        // Injured: lying on ground
        drawInjuredPlayer(fr, fc, fe, sp, dl, mx, dir, teamColors);
        return;
    }
    if (anim === 5) {
        // Stunned: leaning back, arms up
        drawStunnedPlayer(fr, fc, fe, sp, dl, mx, dir, teamColors);
        return;
    }

    // --- Body position offsets based on animation ---
    let bodyY = 14; // base top of body
    let legSpread = 0; // leg animation offset
    let armExtend = 0; // arm extension for throw
    let tackleOffset = 0; // horizontal lunge for tackle

    if (anim >= 1 && anim <= 3) {
        // Run frames
        const runPhase = anim - 1; // 0,1,2
        if (runPhase === 0) legSpread = -3;
        else if (runPhase === 1) legSpread = 0;
        else legSpread = 3;
        bodyY = 13 + (runPhase === 1 ? 1 : 0); // bob
    }
    if (anim === 4) {
        // Tackle: lunge forward
        tackleOffset = 4;
        bodyY = 16;
    }
    if (anim === 7) {
        // Shoot/throw
        armExtend = 5;
    }

    // Compute horizontal offset for tackle in facing direction
    let txOff = 0, tyOff = 0;
    if (tackleOffset > 0) {
        if (facingN) tyOff = -tackleOffset;
        if (facingS) tyOff = tackleOffset;
        if (facingE) txOff = tackleOffset;
        if (facingW) txOff = -tackleOffset;
        if (isDiag) {
            txOff = Math.round(txOff * 0.7);
            tyOff = Math.round(tyOff * 0.7);
        }
    }

    const cx = 24 + txOff; // center x
    const headY = bodyY + tyOff;

    // --- Draw shadow on ground ---
    fe(24, 42, 8, 3, [20, 22, 30, 120]);

    // --- Draw legs ---
    const legTop = headY + 20;
    const legBaseX = cx;

    if (isSide || isDiag) {
        // Side/diagonal view: legs front-back
        const frontLegX = mirror ? legBaseX - 2 - legSpread : legBaseX + 2 + legSpread;
        const backLegX = mirror ? legBaseX + 2 + legSpread : legBaseX - 2 - legSpread;

        // Back leg
        fr(backLegX - 2, legTop, 4, 10, TD);
        fr(backLegX - 2, legTop, 4, 1, OL);
        // Boot
        fr(backLegX - 2, legTop + 8, 5, 3, BT);
        fr(backLegX - 2, legTop + 8, 5, 1, BTL);

        // Front leg
        fr(frontLegX - 2, legTop, 4, 10, TM);
        fr(frontLegX - 2, legTop, 4, 1, OL);
        // Boot
        fr(frontLegX - 2, legTop + 8, 5, 3, BT);
        fr(frontLegX - 2, legTop + 8, 5, 1, BTL);
    } else {
        // Front/back view: legs side by side
        // Left leg
        fr(cx - 6, legTop, 4, 10 - Math.abs(legSpread), TM);
        fr(cx - 6, legTop + 8 - Math.abs(legSpread), 5, 3, BT);
        fr(cx - 6, legTop + 8 - Math.abs(legSpread), 5, 1, BTL);

        // Right leg
        fr(cx + 2, legTop, 4, 10 + Math.abs(legSpread), TM);
        fr(cx + 2, legTop + 8 + Math.abs(legSpread), 5, 3, BT);
        fr(cx + 2, legTop + 8 + Math.abs(legSpread), 5, 1, BTL);

        // Outlines on tops
        fr(cx - 6, legTop, 4, 1, OL);
        fr(cx + 2, legTop, 4, 1, OL);
    }

    // --- Draw torso (armor) ---
    const torsoTop = headY + 6;
    const torsoW = 16;
    const torsoH = 14;
    const torsoX = cx - torsoW / 2;

    // Main torso body
    fr(torsoX, torsoTop, torsoW, torsoH, TM);
    // Highlight on left
    fr(torsoX, torsoTop, 2, torsoH, TL);
    // Shadow on right
    fr(torsoX + torsoW - 2, torsoTop, 2, torsoH, TD);
    // Outline top and bottom
    fr(torsoX, torsoTop, torsoW, 1, OL);
    fr(torsoX, torsoTop + torsoH - 1, torsoW, 1, OL);
    // Outline sides
    fr(torsoX, torsoTop, 1, torsoH, OL);
    fr(torsoX + torsoW - 1, torsoTop, 1, torsoH, OL);

    // Shoulder pads
    fr(torsoX - 3, torsoTop, 3, 5, TL);
    fr(torsoX - 3, torsoTop, 3, 1, OL);
    fr(torsoX - 3, torsoTop, 1, 5, OL);
    fr(torsoX + torsoW, torsoTop, 3, 5, TL);
    fr(torsoX + torsoW, torsoTop, 3, 1, OL);
    fr(torsoX + torsoW + 2, torsoTop, 1, 5, OL);

    // Chest stripe / number area (accent color)
    if (facingS || (!facingN && !isSide)) {
        fr(cx - 3, torsoTop + 3, 6, 4, TA);
    }

    // --- Draw arms ---
    const armTop = torsoTop + 2;

    if (anim === 7 && armExtend > 0) {
        // Throwing arm extended in facing direction
        if (facingE || (!facingW && !facingN && !facingS)) {
            // Right arm extended
            fr(torsoX + torsoW, armTop, armExtend + 3, 4, SK);
            fr(torsoX + torsoW + armExtend + 1, armTop, 3, 4, SKL);
            // Left arm normal
            fr(torsoX - 4, armTop + 2, 4, 4, SK);
        } else if (facingW) {
            // Left arm extended
            fr(torsoX - armExtend - 3, armTop, armExtend + 3, 4, SK);
            fr(torsoX - armExtend - 3, armTop, 3, 4, SKL);
            // Right arm normal
            fr(torsoX + torsoW, armTop + 2, 4, 4, SK);
        } else {
            // Facing N or S: arm extends out to side and up
            fr(torsoX + torsoW, armTop - 2, 6, 4, SK);
            fr(torsoX - 6, armTop + 2, 4, 4, SK);
        }
    } else if (anim === 4) {
        // Tackle: both arms extended forward
        if (facingE || isSide && !mirror) {
            fr(torsoX + torsoW, armTop, 7, 3, SK);
            fr(torsoX + torsoW, armTop + 1, 7, 1, SKL);
        } else if (facingW || (isSide && mirror)) {
            fr(torsoX - 7, armTop, 7, 3, SK);
            fr(torsoX - 7, armTop + 1, 7, 1, SKL);
        } else if (facingN) {
            fr(torsoX - 3, armTop - 3, 4, 5, SK);
            fr(torsoX + torsoW - 1, armTop - 3, 4, 5, SK);
        } else {
            fr(torsoX - 3, armTop, 4, 6, SK);
            fr(torsoX + torsoW - 1, armTop, 4, 6, SK);
        }
    } else {
        // Normal arms (with slight swing for run)
        const armSwing = (anim >= 1 && anim <= 3) ? (anim - 2) * 2 : 0;
        // Left arm
        fr(torsoX - 4, armTop + 1 - armSwing, 4, 8, SK);
        fr(torsoX - 4, armTop + 1 - armSwing, 4, 1, OL);
        fr(torsoX - 4, armTop + 7 - armSwing, 4, 2, SKD);
        // Right arm
        fr(torsoX + torsoW, armTop + 1 + armSwing, 4, 8, SK);
        fr(torsoX + torsoW, armTop + 1 + armSwing, 4, 1, OL);
        fr(torsoX + torsoW, armTop + 7 + armSwing, 4, 2, SKD);
    }

    // --- Draw head/helmet ---
    const headCx = cx;
    const headCy = headY + 3;

    // Helmet base
    fc(headCx, headCy, 6, HL);
    // Helmet highlight
    fc(headCx - 1, headCy - 2, 3, HLL);
    // Helmet dark side
    fc(headCx + 2, headCy + 1, 3, HLD);
    // Outline
    drawCircle(png, ox + headCx, oy + headCy, 6, OL[0], OL[1], OL[2]);

    // Helmet stripe (team color)
    fr(headCx - 1, headY - 3, 2, 3, TM);

    // Visor / face
    if (facingS) {
        // Front view: visor across eyes
        fr(headCx - 4, headCy - 1, 8, 3, VIS);
        fr(headCx - 4, headCy - 1, 8, 1, VISD);
        // Chin
        fr(headCx - 2, headCy + 3, 4, 2, SK);
    } else if (facingN) {
        // Back view: no face, just helmet back
        fr(headCx - 3, headCy, 6, 2, HLD);
    } else {
        // Side/diagonal: visor on one side
        const visorX = mirror ? headCx - 4 : headCx;
        fr(visorX, headCy - 1, 5, 3, VIS);
        fr(visorX, headCy - 1, 5, 1, VISD);
        // Chin area
        const chinX = mirror ? headCx - 3 : headCx + 1;
        fr(chinX, headCy + 3, 3, 2, SK);
    }
}

function drawInjuredPlayer(fr, fc, fe, sp, dl, mx, dir, teamColors) {
    const TM = teamColors.main;
    const TL = teamColors.light;
    const TD = teamColors.dark;
    const OL = COLORS.outline;
    const HL = COLORS.helmetGrey;
    const HLL = COLORS.helmetLight;
    const SK = COLORS.skin;
    const BT = COLORS.bootDark;
    const VIS = COLORS.visor;

    // Player lying flat on ground, horizontal
    const y = 30; // vertical center of lying body

    // Shadow
    fe(24, 40, 16, 3, [20, 22, 30, 100]);

    // Legs (boots at one end)
    fr(30, y - 2, 10, 5, TM);
    fr(30, y - 2, 10, 1, OL);
    fr(39, y - 2, 4, 5, BT);

    // Torso
    fr(12, y - 3, 18, 7, TM);
    fr(12, y - 3, 18, 1, OL);
    fr(12, y + 3, 18, 1, OL);
    fr(12, y - 3, 2, 7, TL);
    fr(28, y - 3, 2, 7, TD);

    // Head/helmet
    fc(9, y, 5, HL);
    fc(8, y - 1, 3, HLL);
    // Visor
    fr(5, y - 1, 4, 2, VIS);

    // Arms splayed
    fr(14, y - 6, 4, 3, SK);
    fr(22, y + 4, 4, 3, SK);

    // X eyes to show injured
    dl(6, y - 2, 8, y, [255, 50, 50]);
    dl(8, y - 2, 6, y, [255, 50, 50]);
}

function drawStunnedPlayer(fr, fc, fe, sp, dl, mx, dir, teamColors) {
    const TM = teamColors.main;
    const TL = teamColors.light;
    const TD = teamColors.dark;
    const OL = COLORS.outline;
    const HL = COLORS.helmetGrey;
    const HLL = COLORS.helmetLight;
    const HLD = COLORS.helmetDark;
    const SK = COLORS.skin;
    const BT = COLORS.bootDark;
    const BTL = COLORS.bootLight;
    const VIS = COLORS.visor;
    const TA = teamColors.accent;

    // Leaning back, arms up
    const cx = 24;
    const bodyY = 16;

    // Shadow
    fe(24, 42, 8, 3, [20, 22, 30, 120]);

    // Legs (slightly spread, staggered)
    fr(cx - 7, bodyY + 20, 4, 10, TM);
    fr(cx - 7, bodyY + 28, 5, 3, BT);
    fr(cx + 3, bodyY + 20, 4, 10, TM);
    fr(cx + 3, bodyY + 28, 5, 3, BT);

    // Torso (leaned back slightly)
    fr(cx - 8, bodyY + 6, 16, 14, TM);
    fr(cx - 8, bodyY + 6, 2, 14, TL);
    fr(cx + 6, bodyY + 6, 2, 14, TD);
    fr(cx - 8, bodyY + 6, 16, 1, OL);
    fr(cx - 8, bodyY + 19, 16, 1, OL);

    // Shoulder pads
    fr(cx - 11, bodyY + 6, 3, 5, TL);
    fr(cx + 8, bodyY + 6, 3, 5, TL);

    // Arms up in the air (stunned)
    fr(cx - 12, bodyY, 4, 8, SK);
    fr(cx + 8, bodyY, 4, 8, SK);

    // Head (tilted back)
    fc(cx, bodyY + 2, 6, HL);
    fc(cx - 1, bodyY, 3, HLL);
    drawCircle({ width: 48, height: 48, data: new Buffer.alloc(0) }, cx, bodyY + 2, 6, OL[0], OL[1], OL[2]);
    // Actually draw outline on the real png
    for (let a = 0; a < 360; a += 5) {
        const rad = (a * Math.PI) / 180;
        const px = Math.round(cx + 6 * Math.cos(rad));
        const py = Math.round(bodyY + 2 + 6 * Math.sin(rad));
        sp(px, py, OL);
    }

    // Dizzy stars above head
    const starY = bodyY - 5;
    sp(cx - 5, starY, TA);
    sp(cx - 4, starY - 1, TA);
    sp(cx - 4, starY + 1, TA);
    sp(cx, starY - 2, TA);
    sp(cx + 1, starY - 1, TA);
    sp(cx - 1, starY - 1, TA);
    sp(cx + 5, starY, TA);
    sp(cx + 4, starY - 1, TA);
    sp(cx + 4, starY + 1, TA);

    // Visor
    fr(cx - 4, bodyY + 1, 8, 3, VIS);
}

function generatePlayerSheet(filename, teamColors) {
    const png = new PNG({ width: 384, height: 384, filterType: -1 });

    // Initialize to transparent
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 0;
        png.data[i + 1] = 0;
        png.data[i + 2] = 0;
        png.data[i + 3] = 0;
    }

    // 8 columns (directions), 8 rows (animations)
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const ox = col * 48;
            const oy = row * 48;
            drawPlayerFrame(png, ox, oy, col, row, teamColors);
        }
    }

    return savePng(png, filename);
}

// ---------------------------------------------------------------------------
// Ball sprite
// ---------------------------------------------------------------------------

function generateBall() {
    const png = new PNG({ width: 24, height: 24, filterType: -1 });
    // Transparent background
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 0;
    }

    const cx = 12, cy = 12, r = 10;

    // Main sphere
    for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 24; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= r) {
                // Shading: light from top-left
                const nx = dx / r;
                const ny = dy / r;
                const light = Math.max(0, -nx * 0.5 - ny * 0.7 + 0.3);
                const base = 140;
                const range = 90;
                const val = Math.min(255, Math.round(base + range * light));
                setPixel(png, x, y, val, val, Math.min(255, val + 10));
            }
        }
    }

    // Panel lines (cross pattern like original Speedball ball)
    // Horizontal line
    for (let x = cx - 7; x <= cx + 7; x++) {
        const dx = x - cx;
        const maxY = Math.sqrt(Math.max(0, r * r - dx * dx));
        if (Math.abs(0) < maxY) {
            const p = getPixel(png, x, cy);
            if (p[3] > 0) {
                setPixel(png, x, cy, COLORS.ballLine[0], COLORS.ballLine[1], COLORS.ballLine[2]);
            }
        }
    }
    // Vertical line
    for (let y = cy - 7; y <= cy + 7; y++) {
        const dy = y - cy;
        const maxX = Math.sqrt(Math.max(0, r * r - dy * dy));
        if (Math.abs(0) < maxX) {
            const p = getPixel(png, cx, y);
            if (p[3] > 0) {
                setPixel(png, cx, y, COLORS.ballLine[0], COLORS.ballLine[1], COLORS.ballLine[2]);
            }
        }
    }

    // Specular highlight
    fillCircle(png, cx - 3, cy - 3, 3, 240, 240, 245);
    fillCircle(png, cx - 3, cy - 4, 2, 255, 255, 255);

    // Dark edge outline
    for (let a = 0; a < 360; a++) {
        const rad = (a * Math.PI) / 180;
        const px = Math.round(cx + r * Math.cos(rad));
        const py = Math.round(cy + r * Math.sin(rad));
        setPixel(png, px, py, 60, 60, 70);
    }

    return savePng(png, 'ball.png');
}

// ---------------------------------------------------------------------------
// Floor tile
// ---------------------------------------------------------------------------

function generateFloorTile() {
    const png = new PNG({ width: 48, height: 48, filterType: -1 });

    const FD = COLORS.floorDark;
    const FM = COLORS.floorMid;
    const FL = COLORS.floorLight;
    const FR = COLORS.floorRivet;

    // Base fill
    fillRect(png, 0, 0, 48, 48, FD[0], FD[1], FD[2]);

    // Subtle panel lines (grid)
    for (let x = 0; x < 48; x++) {
        setPixel(png, x, 0, FM[0], FM[1], FM[2]);
        setPixel(png, x, 47, COLORS.outlineDark[0], COLORS.outlineDark[1], COLORS.outlineDark[2]);
        setPixel(png, x, 23, FM[0] - 5, FM[1] - 5, FM[2] - 5);
    }
    for (let y = 0; y < 48; y++) {
        setPixel(png, 0, y, FM[0], FM[1], FM[2]);
        setPixel(png, 47, y, COLORS.outlineDark[0], COLORS.outlineDark[1], COLORS.outlineDark[2]);
        setPixel(png, 23, y, FM[0] - 5, FM[1] - 5, FM[2] - 5);
    }

    // Top edge highlight
    fillRect(png, 1, 1, 46, 1, FL[0], FL[1], FL[2]);
    // Left edge highlight
    fillRect(png, 1, 1, 1, 46, FL[0], FL[1], FL[2]);

    // Rivets in corners
    const rivetPositions = [[4, 4], [43, 4], [4, 43], [43, 43]];
    for (const [rx, ry] of rivetPositions) {
        fillCircle(png, rx, ry, 2, FR[0], FR[1], FR[2]);
        setPixel(png, rx - 1, ry - 1, FL[0], FL[1], FL[2]);
        setPixel(png, rx + 1, ry + 1, FD[0] - 10, FD[1] - 10, FD[2] - 10);
    }

    // Subtle texture noise
    for (let y = 2; y < 46; y += 4) {
        for (let x = 2; x < 46; x += 4) {
            const v = Math.random() * 8 - 4;
            setPixel(png, x, y, FD[0] + v, FD[1] + v, FD[2] + v);
        }
    }

    return savePng(png, 'floor_tile.png');
}

// ---------------------------------------------------------------------------
// Dome bumper
// ---------------------------------------------------------------------------

function generateDome() {
    const png = new PNG({ width: 48, height: 48, filterType: -1 });
    // Transparent
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 0;
    }

    const cx = 24, cy = 24, r = 18;

    // Glowing ring around base
    for (let a = 0; a < 360; a++) {
        const rad = (a * Math.PI) / 180;
        for (let dr = r; dr <= r + 3; dr++) {
            const px = Math.round(cx + dr * Math.cos(rad));
            const py = Math.round(cy + dr * Math.sin(rad));
            const brightness = dr === r ? 200 : (dr === r + 1 ? 150 : 80);
            setPixel(png, px, py, 0, brightness, brightness + 20, 200);
        }
    }

    // Dome body with shading
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= r) {
                const nx = dx / r;
                const ny = dy / r;
                const light = Math.max(0, -nx * 0.4 - ny * 0.6 + 0.4);
                const baseR = COLORS.domeDark[0];
                const baseG = COLORS.domeDark[1];
                const baseB = COLORS.domeDark[2];
                const rangeR = COLORS.domeLight[0] - baseR;
                const rangeG = COLORS.domeLight[1] - baseG;
                const rangeB = COLORS.domeLight[2] - baseB;
                setPixel(png, x, y,
                    Math.round(baseR + rangeR * light),
                    Math.round(baseG + rangeG * light),
                    Math.round(baseB + rangeB * light));
            }
        }
    }

    // Specular highlight
    fillCircle(png, cx - 5, cy - 6, 5, COLORS.domeLight[0], COLORS.domeLight[1], COLORS.domeLight[2]);
    fillCircle(png, cx - 4, cy - 7, 3, 200, 255, 255);
    fillCircle(png, cx - 3, cy - 8, 1, 255, 255, 255);

    // Outline
    for (let a = 0; a < 360; a++) {
        const rad = (a * Math.PI) / 180;
        const px = Math.round(cx + r * Math.cos(rad));
        const py = Math.round(cy + r * Math.sin(rad));
        setPixel(png, px, py, 0, 80, 90);
    }

    return savePng(png, 'dome.png');
}

// ---------------------------------------------------------------------------
// Star sprites
// ---------------------------------------------------------------------------

function drawStar(png, cx, cy, outerR, innerR, r, g, b) {
    // 5-pointed star
    const points = [];
    for (let i = 0; i < 10; i++) {
        const angle = (i * 36 - 90) * Math.PI / 180;
        const radius = i % 2 === 0 ? outerR : innerR;
        points.push({
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle)
        });
    }

    // Fill using scanline
    const minY = Math.floor(cy - outerR);
    const maxY = Math.ceil(cy + outerR);
    for (let y = minY; y <= maxY; y++) {
        const intersections = [];
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            const p1 = points[i], p2 = points[j];
            if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
                const t = (y - p1.y) / (p2.y - p1.y);
                intersections.push(p1.x + t * (p2.x - p1.x));
            }
        }
        intersections.sort((a, b) => a - b);
        for (let i = 0; i < intersections.length - 1; i += 2) {
            const x1 = Math.ceil(intersections[i]);
            const x2 = Math.floor(intersections[i + 1]);
            for (let x = x1; x <= x2; x++) {
                setPixel(png, x, y, r, g, b);
            }
        }
    }

    // Draw outline
    for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        drawLine(png,
            Math.round(points[i].x), Math.round(points[i].y),
            Math.round(points[j].x), Math.round(points[j].y),
            Math.max(0, r - 60), Math.max(0, g - 60), Math.max(0, b - 40));
    }
}

function generateStar(active) {
    const png = new PNG({ width: 24, height: 24, filterType: -1 });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 0;
    }

    if (active) {
        // Glow aura
        for (let y = 0; y < 24; y++) {
            for (let x = 0; x < 24; x++) {
                const dx = x - 12, dy = y - 12;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 12 && dist > 8) {
                    const alpha = Math.round(60 * (1 - (dist - 8) / 4));
                    setPixel(png, x, y, 255, 255, 160, alpha);
                }
            }
        }
        drawStar(png, 12, 12, 10, 4, COLORS.starActive[0], COLORS.starActive[1], COLORS.starActive[2]);
        // Bright center
        fillCircle(png, 12, 12, 2, COLORS.starGlow[0], COLORS.starGlow[1], COLORS.starGlow[2]);
    } else {
        drawStar(png, 12, 12, 10, 4, COLORS.starDark[0], COLORS.starDark[1], COLORS.starDark[2]);
        // Subtle highlight
        fillCircle(png, 11, 10, 2, COLORS.starMid[0], COLORS.starMid[1], COLORS.starMid[2]);
    }

    return savePng(png, active ? 'star_active.png' : 'star.png');
}

// ---------------------------------------------------------------------------
// Multiplier pad
// ---------------------------------------------------------------------------

function generateMultiplier() {
    const png = new PNG({ width: 48, height: 48, filterType: -1 });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 0;
    }

    const cx = 24, cy = 24;

    // Outer glow
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 22 && dist > 16) {
                const alpha = Math.round(100 * (1 - (dist - 16) / 6));
                setPixel(png, x, y, COLORS.multiGlow[0], COLORS.multiGlow[1], COLORS.multiGlow[2], alpha);
            }
        }
    }

    // Main pad (rounded rectangle look via ellipse)
    fillEllipse(png, cx, cy, 16, 16, COLORS.multiDark[0], COLORS.multiDark[1], COLORS.multiDark[2]);
    fillEllipse(png, cx, cy, 14, 14, COLORS.multiPurple[0], COLORS.multiPurple[1], COLORS.multiPurple[2]);

    // Highlight
    fillEllipse(png, cx - 2, cy - 3, 10, 8, COLORS.multiLight[0], COLORS.multiLight[1], COLORS.multiLight[2]);

    // "x2" text drawn in pixels
    // x character (5x5)
    const tx = 15, ty = 19;
    // x
    drawLine(png, tx, ty, tx + 4, ty + 5, 255, 255, 255);
    drawLine(png, tx + 4, ty, tx, ty + 5, 255, 255, 255);
    drawLine(png, tx + 1, ty, tx + 5, ty + 5, 255, 255, 255);
    drawLine(png, tx + 5, ty, tx + 1, ty + 5, 255, 255, 255);

    // 2 character
    const tx2 = 23, ty2 = 19;
    // Top horizontal
    fillRect(png, tx2, ty2, 6, 1, 255, 255, 255);
    // Right vertical top half
    fillRect(png, tx2 + 5, ty2, 1, 3, 255, 255, 255);
    // Middle horizontal
    fillRect(png, tx2, ty2 + 3, 6, 1, 255, 255, 255);
    // Left vertical bottom half
    fillRect(png, tx2, ty2 + 3, 1, 3, 255, 255, 255);
    // Bottom horizontal
    fillRect(png, tx2, ty2 + 6, 6, 1, 255, 255, 255);

    // Outline ring
    for (let a = 0; a < 360; a++) {
        const rad = (a * Math.PI) / 180;
        const px = Math.round(cx + 16 * Math.cos(rad));
        const py = Math.round(cy + 16 * Math.sin(rad));
        setPixel(png, px, py, COLORS.multiGlow[0], COLORS.multiGlow[1], COLORS.multiGlow[2]);
    }

    return savePng(png, 'multiplier.png');
}

// ---------------------------------------------------------------------------
// Warp portal
// ---------------------------------------------------------------------------

function generateWarp() {
    const png = new PNG({ width: 48, height: 48, filterType: -1 });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 0;
    }

    const cx = 24, cy = 24;

    // Dark center
    fillCircle(png, cx, cy, 20, COLORS.warpCenter[0], COLORS.warpCenter[1], COLORS.warpCenter[2]);

    // Concentric rings
    const ringRadii = [18, 14, 10, 6, 3];
    for (let ri = 0; ri < ringRadii.length; ri++) {
        const rad = ringRadii[ri];
        const brightness = ri % 2 === 0 ? 1.0 : 0.5;
        const col = ri % 2 === 0 ? COLORS.warpLight : COLORS.warpGreen;

        for (let a = 0; a < 360; a++) {
            const arad = (a * Math.PI) / 180;
            for (let dr = 0; dr < 2; dr++) {
                const px = Math.round(cx + (rad + dr) * Math.cos(arad));
                const py = Math.round(cy + (rad + dr) * Math.sin(arad));
                setPixel(png, px, py,
                    Math.round(col[0] * brightness),
                    Math.round(col[1] * brightness),
                    Math.round(col[2] * brightness));
            }
        }
    }

    // Inner glow
    for (let y = 0; y < 48; y++) {
        for (let x = 0; x < 48; x++) {
            const dx = x - cx, dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 4) {
                const alpha = Math.round(180 * (1 - dist / 4));
                const p = getPixel(png, x, y);
                const blend = (orig, add, a) => Math.min(255, Math.round(orig + add * a / 255));
                setPixel(png, x, y,
                    blend(p[0], COLORS.warpLight[0], alpha),
                    blend(p[1], COLORS.warpLight[1], alpha),
                    blend(p[2], COLORS.warpLight[2], alpha));
            }
        }
    }

    // Outer glow ring
    for (let a = 0; a < 360; a++) {
        const arad = (a * Math.PI) / 180;
        const px = Math.round(cx + 20 * Math.cos(arad));
        const py = Math.round(cy + 20 * Math.sin(arad));
        setPixel(png, px, py, COLORS.warpGreen[0], COLORS.warpGreen[1], COLORS.warpGreen[2]);
    }

    return savePng(png, 'warp.png');
}

// ---------------------------------------------------------------------------
// Goal mouth
// ---------------------------------------------------------------------------

function generateGoal() {
    const png = new PNG({ width: 288, height: 48, filterType: -1 });
    for (let i = 0; i < png.data.length; i += 4) {
        png.data[i] = 0; png.data[i + 1] = 0; png.data[i + 2] = 0; png.data[i + 3] = 0;
    }

    const GG = COLORS.goalGold;
    const GL = COLORS.goalLight;
    const GD = COLORS.goalDark;
    const GI = COLORS.goalInterior;
    const GN = COLORS.goalNet;

    // Frame outer
    fillRect(png, 0, 0, 288, 48, GG[0], GG[1], GG[2]);

    // Interior
    fillRect(png, 6, 6, 276, 36, GI[0], GI[1], GI[2]);

    // Net pattern inside
    for (let x = 6; x < 282; x += 8) {
        drawLine(png, x, 6, x, 41, GN[0], GN[1], GN[2]);
    }
    for (let y = 6; y < 42; y += 6) {
        drawLine(png, 6, y, 281, y, GN[0], GN[1], GN[2]);
    }

    // Frame highlights (top edge bright)
    fillRect(png, 0, 0, 288, 2, GL[0], GL[1], GL[2]);
    // Frame shadow (bottom edge dark)
    fillRect(png, 0, 46, 288, 2, GD[0], GD[1], GD[2]);
    // Left post highlight
    fillRect(png, 0, 0, 2, 48, GL[0], GL[1], GL[2]);
    // Right post shadow
    fillRect(png, 286, 0, 2, 48, GD[0], GD[1], GD[2]);

    // Post caps (bright circles at corners)
    fillCircle(png, 3, 3, 3, GL[0], GL[1], GL[2]);
    fillCircle(png, 284, 3, 3, GL[0], GL[1], GL[2]);
    fillCircle(png, 3, 44, 3, GL[0], GL[1], GL[2]);
    fillCircle(png, 284, 44, 3, GL[0], GL[1], GL[2]);

    // Inner frame outline
    drawRect(png, 5, 5, 278, 38, GD[0], GD[1], GD[2]);

    return savePng(png, 'goal.png');
}

// ---------------------------------------------------------------------------
// Wall tile
// ---------------------------------------------------------------------------

function generateWallTile() {
    const png = new PNG({ width: 48, height: 48, filterType: -1 });

    const WM = COLORS.wallMain;
    const WL = COLORS.wallLight;
    const WD = COLORS.wallDark;
    const WR = COLORS.wallRivet;

    // Base fill
    fillRect(png, 0, 0, 48, 48, WM[0], WM[1], WM[2]);

    // Top highlight edge
    fillRect(png, 0, 0, 48, 3, WL[0], WL[1], WL[2]);

    // Bottom shadow edge
    fillRect(png, 0, 45, 48, 3, WD[0], WD[1], WD[2]);

    // Vertical panel lines
    for (let y = 0; y < 48; y++) {
        setPixel(png, 0, y, WD[0], WD[1], WD[2]);
        setPixel(png, 47, y, WD[0], WD[1], WD[2]);
        setPixel(png, 1, y, WL[0] - 20, WL[1] - 20, WL[2] - 20);
        setPixel(png, 24, y, WD[0] + 10, WD[1] + 10, WD[2] + 10);
    }

    // Horizontal panel line in middle
    fillRect(png, 0, 23, 48, 1, WD[0], WD[1], WD[2]);
    fillRect(png, 0, 24, 48, 1, WL[0] - 30, WL[1] - 30, WL[2] - 30);

    // Rivets
    const rivetPositions = [
        [6, 6], [42, 6], [6, 42], [42, 42],
        [6, 18], [42, 18], [6, 30], [42, 30],
        [24, 6], [24, 42]
    ];
    for (const [rx, ry] of rivetPositions) {
        fillCircle(png, rx, ry, 2, WR[0], WR[1], WR[2]);
        setPixel(png, rx - 1, ry - 1, 240, 230, 210); // highlight
        setPixel(png, rx + 1, ry + 1, WD[0], WD[1], WD[2]); // shadow
    }

    // Subtle texture scratches
    for (let i = 0; i < 8; i++) {
        const sx = Math.floor(Math.random() * 40) + 4;
        const sy = Math.floor(Math.random() * 40) + 4;
        const len = Math.floor(Math.random() * 6) + 2;
        for (let d = 0; d < len; d++) {
            setPixel(png, sx + d, sy, WL[0] - 10, WL[1] - 10, WL[2] - 10, 100);
        }
    }

    return savePng(png, 'wall_tile.png');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log('Speedball 2 Sprite Generator');
    console.log('============================');
    console.log(`Output directory: ${OUTPUT_DIR}\n`);

    console.log('Generating player_home.png (384x384)...');
    await generatePlayerSheet('player_home.png', {
        main: COLORS.homeMain,
        light: COLORS.homeLight,
        dark: COLORS.homeDark,
        accent: COLORS.homeAccent,
    });

    console.log('Generating player_away.png (384x384)...');
    await generatePlayerSheet('player_away.png', {
        main: COLORS.awayMain,
        light: COLORS.awayLight,
        dark: COLORS.awayDark,
        accent: COLORS.awayAccent,
    });

    console.log('Generating ball.png (24x24)...');
    await generateBall();

    console.log('Generating floor_tile.png (48x48)...');
    await generateFloorTile();

    console.log('Generating dome.png (48x48)...');
    await generateDome();

    console.log('Generating star.png (24x24)...');
    await generateStar(false);

    console.log('Generating star_active.png (24x24)...');
    await generateStar(true);

    console.log('Generating multiplier.png (48x48)...');
    await generateMultiplier();

    console.log('Generating warp.png (48x48)...');
    await generateWarp();

    console.log('Generating goal.png (288x48)...');
    await generateGoal();

    console.log('Generating wall_tile.png (48x48)...');
    await generateWallTile();

    console.log('\nAll sprites generated successfully!');
}

main().catch(err => {
    console.error('Error generating sprites:', err);
    process.exit(1);
});
