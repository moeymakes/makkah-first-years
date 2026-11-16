// ============================================================================
// world layout + procedural content generation (load time only)
// ============================================================================
// Makkah after the conquest (630-632 CE), an artistic reconstruction. Axes: +x east, -z north, y up, metres. The
// Kaaba is at the origin; SAFA, MARWA, ZAMZAM and the valleys are in shaders.js. Every uncertain detail is an
// informed guess, recorded in NOTES.md.

// the key light from the Time preset: the sun at dawn and golden hour, the moon at night
const SUN = (() => { const a = TP.az * PI / 180, e = TP.el * PI / 180; return [sin(a) * cos(e), sin(e), -cos(a) * cos(e)]; })();
// distant houses: w, h, d, roof room
const FHOUSE = [[8, 3.3, 9, 0], [10, 3.5, 8, 1], [7, 3.1, 7, 0], [12, 3.6, 10, 1], [9, 6, 9, 0], [8.5, 6.3, 8.5, 1]];
const NSOLID = 19 + FHOUSE.length;
// the Kaaba as rebuilt by Quraysh: about 18 cubits (8.6 m) high, shortened on the Hijr side; turned so its corners
// point roughly to the compass points, the door on the north-east face, the Hijr to the north-west
const KAABA = { yaw: 3 * PI / 4, hx: 5.1, hz: 5.8, h: 8.6 };
// lanes radiate from the open space round the Kaaba (angles from +x toward +z)
const LANES = [.3, 1.1, 1.9, 2.6, 3.4, 4.2, 5.0, 5.7];
const laneDist = (x, z) => { let d = 1e9; const r = hypot(x, z); for (const a of LANES) { const c = cos(a), s = sin(a), t = x * c + z * s; if (t > 0) d = min(d, abs(-x * s + z * c) - r * .012); } return d; };
const kRot = (lx, lz) => { const a = KAABA.yaw; return [lx * cos(a) + lz * sin(a), -lx * sin(a) + lz * cos(a)]; };

// viewpoints: x, eye height above the ground (absolute when flying), z, look-at x, y, z (absolute), flying
const POSES = [
  [15, 1.7, -17, 0, 4.5, 1, 0],
  [SAFA[0] - 5, 1.7, SAFA[1] - 5, 0, 3, 0, 0],
  [104, 1.7, 76, MARWA[0], 5, MARWA[1], 0],
  [27, 1.7, 10, 6, 3, 1, 0],
  [58, 1.7, -38, 0, 4, 0, 0],
  [-210, 95, 230, 120, 0, -200, 1],
];
// 60 s scripted camera path (position + look-at, absolute heights)
const FLY = new Float32Array([
  20, 4, 26, 0, 4, 0,
  -8, 4, 30, 0, 4, 0,
  -30, 5, 4, 0, 4, 0,
  -14, 5, -26, 0, 4, 0,
  18, 5, -22, ZAMZAM[0], 1, ZAMZAM[1],
  34, 5, 8, ZAMZAM[0], 1, ZAMZAM[1],
  70, 9, 70, SAFA[0], 6, SAFA[1],
  100, 12, 70, MARWA[0], 6, MARWA[1],
  118, 10, -20, MARWA[0], 6, MARWA[1],
  135, 14, -120, MARWA[0], 4, MARWA[1],
  130, 30, -200, 0, 4, 0,
  40, 50, -200, 0, 4, 0,
  -110, 70, -110, 0, 4, 0,
  -210, 95, 230, 120, 0, -200,
]);
// ---------------------------------------------------------------- ground samplers: near 1 m, middle 2 m, far ~23 m
const FN = 1024, FC = 24000 / (FN - 1), FO = -12000, MN = 1024, MC = 2, MO = -1024;
const grid = (A, n, o, c, k = 0) => (x, z) => {
  const gx = clamp((x - o) / c, 0, n - 1.001), gz = clamp((z - o) / c, 0, n - 1.001), ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
  const i = (ix + n * iz) * 4 + k;
  return mix(mix(A[i], A[i + 4], fx), mix(A[i + n * 4], A[i + n * 4 + 4], fx), fz);
};
function groundSampler(NA, MA, FA) {
  const nh = grid(NA, NX, OX, VS), mh = grid(MA, MN, MO, MC), fh = grid(FA, FN, FO, FC);
  return (x, z) => {
    const a = max(abs(x), abs(z));
    if (a < -OX - 1.5) return nh(x, z);
    if (a < 900) return mh(x, z);
    return a > 1010 ? fh(x, z) : mix(mh(x, z), fh(x, z), (a - 900) / 110);
  };
}


// ---------------------------------------------------------------- terrain mesh from the density grid
function buildTerrain(D) {
  const sn = surfaceNets(D, NX, NY, NZ), nv = sn.nv, gp = sn.pos;
  const smp = sampler3(D, NX, NY, NZ);
  const vb = new ArrayBuffer(nv * 16), vf = new Float32Array(vb), v8 = new Int8Array(vb);
  const wp = new Float32Array(nv * 3), wn = new Float32Array(nv * 3);
  for (let k = 0; k < nv; k++) {
    const x = gp[k * 3], y = gp[k * 3 + 1], z = gp[k * 3 + 2], e = 0.8;
    let nx = smp(x - e, y, z) - smp(x + e, y, z), ny = smp(x, y - e, z) - smp(x, y + e, z), nz = smp(x, y, z - e) - smp(x, y, z + e);
    const l = hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const X = OX + x * VS, Y = OY + y * VS, Z = OZ + z * VS;
    wp[k * 3] = vf[k * 4] = X; wp[k * 3 + 1] = vf[k * 4 + 1] = Y; wp[k * 3 + 2] = vf[k * 4 + 2] = Z;
    wn[k * 3] = nx; wn[k * 3 + 1] = ny; wn[k * 3 + 2] = nz;
    v8[k * 16 + 12] = round(nx * 127); v8[k * 16 + 13] = round(ny * 127); v8[k * 16 + 14] = round(nz * 127); v8[k * 16 + 15] = 127;
  }
  const nq = sn.ni / 6, key = new Uint8Array(nq), cnt = new Uint32Array(CELLS * CELLS + 1);
  const lo = new Float32Array(CELLS * CELLS).fill(1e9), hi = new Float32Array(CELLS * CELLS).fill(-1e9);
  for (let q = 0; q < nq; q++) {
    const a = sn.idx[q * 6] * 3;
    const c = clamp(floor((wp[a] - OX) / CELLW), 0, CELLS - 1) + CELLS * clamp(floor((wp[a + 2] - OZ) / CELLW), 0, CELLS - 1);
    key[q] = c; cnt[c + 1]++;
    for (let j = 0; j < 6; j++) { const y = wp[sn.idx[q * 6 + j] * 3 + 1]; if (y < lo[c]) lo[c] = y; if (y > hi[c]) hi[c] = y; }
  }
  for (let c = 0; c < CELLS * CELLS; c++) cnt[c + 1] += cnt[c];
  const ib = new Uint32Array(sn.ni), fill = cnt.slice();
  for (let q = 0; q < nq; q++) { const o = fill[key[q]]++ * 6; for (let j = 0; j < 6; j++) ib[o + j] = sn.idx[q * 6 + j]; }
  return { vb, ib, nv, wp, wn, smp, start: cnt, lo, hi };
}

// ---------------------------------------------------------------- far landscape: polar grid out to 12 km
// starts inside the near field; there it sinks under the detailed terrain, meeting it again at the box edge
function buildFar(fh) {
  const NR = 380, NS = 1024, R0 = 165, R1 = 12000, nv = NR * NS, E = -OX;
  const vb = new ArrayBuffer(nv * 16), vf = new Float32Array(vb), v8 = new Int8Array(vb);
  const sx = SUN[0], sy = SUN[1], sz = SUN[2], sl = hypot(sx, sz), tn = sy / sl;
  for (let r = 0; r < NR; r++) {
    const rad = R0 * pow(R1 / R0, r / (NR - 1));
    for (let s = 0; s < NS; s++) {
      const a = (s + (r & 1) * .5) / NS * TAU, x = cos(a) * rad, z = sin(a) * rad, k = r * NS + s;
      let h = fh(x, z);
      const de = E - max(abs(x), abs(z));
      if (de > 4) h -= min(9, (de - 4) * .8);
      const e = max(1.2, rad * .004);
      let nx = fh(x - e, z) - fh(x + e, z), ny = 2 * e, nz = fh(x, z - e) - fh(x, z + e); const l = hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      // soft heightfield shadow: march toward the light and keep the smallest clearance over the terrain
      let sh = 1;
      for (let t = 20; t < 7000; t *= 1.07) { const c = h + 4 + t * tn - fh(x + sx / sl * t, z + sz / sl * t); if (c < 0) { sh = 0; break; } sh = min(sh, c / (t * .05 + 4)); }
      vf[k * 4] = x; vf[k * 4 + 1] = h; vf[k * 4 + 2] = z;
      v8[k * 16 + 12] = round(nx * 127); v8[k * 16 + 13] = round(ny * 127); v8[k * 16 + 14] = round(nz * 127); v8[k * 16 + 15] = round(clamp(sh, 0, 1) * 127);
    }
  }
  const ib = new Uint32Array((NR - 1) * NS * 6); let o = 0;
  for (let r = 0; r < NR - 1; r++) for (let s = 0; s < NS; s++) {
    const a = r * NS + s, b = r * NS + (s + 1) % NS, c = (r + 1) * NS + s, d = (r + 1) * NS + (s + 1) % NS;
    if (r & 1) { ib[o++] = a; ib[o++] = c; ib[o++] = b; ib[o++] = b; ib[o++] = c; ib[o++] = d; } else { ib[o++] = a; ib[o++] = c; ib[o++] = d; ib[o++] = a; ib[o++] = d; ib[o++] = b; }
  }
  return { vb, ib, nv };
}

// the height above which each 2 m column of the near field sees the key light past the far mountains (the near
// field's own shadows come from the shadow map; this adds the long shadows of the ranges around it)
function farLit(fh) {
  const n = NX / 2, out = new Float32Array(n * n), sx = SUN[0], sz = SUN[2], sl = hypot(sx, sz), dx = sx / sl, dz = sz / sl, tn = SUN[1] / sl, E = -OX;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = OX + i * 2 + 1, z = OZ + j * 2 + 1;
    let y = -1e4;
    for (let t = 4; t < 7000; t *= 1.06) {
      const px = x + dx * t, pz = z + dz * t;
      if (max(abs(px), abs(pz)) < E) continue;
      y = max(y, fh(px, pz) - t * tn);
    }
    out[i + n * j] = y;
  }
  return out;
}


// ---------------------------------------------------------------- procedural meshes
const box = (m, x0, y0, z0, x1, y1, z1, aux = 1) => {
  const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  for (const f of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]]) { const q = f.map((i) => m.v(...v[i], aux)); m.quad(q[0], q[1], q[2], q[3]); }
};
// box turned to face (ux, uz) along its length: centre (cx, cz), half length hl, half width hw, from y0 to y1
const obox = (m, cx, cz, ux, uz, hl, hw, y0, y1, aux = 1) => {
  const vx = -uz, vz = ux, P = (i, j, k) => [cx + ux * (i ? hl : -hl) + vx * (k ? hw : -hw), j ? y1 : y0, cz + uz * (i ? hl : -hl) + vz * (k ? hw : -hw)];
  const v = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)];
  for (const f of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]]) { const q = f.map((i) => m.v(...v[i], aux)); m.quad(q[0], q[1], q[2], q[3]); }
};
// a wall along a polyline with vertical faces whatever the slope: half thickness hw, from y + lo to y + hi
function vwall(m, pts, hw, lo, hi) {
  for (let k = 0; k + 1 < pts.length; k++) {
    const a = pts[k], b = pts[k + 1], L = hypot(b[0] - a[0], b[2] - a[2]) || 1, vx = -(b[2] - a[2]) / L * hw, vz = (b[0] - a[0]) / L * hw;
    const c = (p, s, h) => [p[0] + vx * s, p[1] + h, p[2] + vz * s];
    const v = [c(a, -1, lo), c(b, -1, lo), c(b, -1, hi), c(a, -1, hi), c(a, 1, lo), c(b, 1, lo), c(b, 1, hi), c(a, 1, hi)];
    for (const f of [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]]) { const q = f.map((i) => m.v(...v[i], 1)); m.quad(q[0], q[1], q[2], q[3]); }
  }
}
// surface of revolution: prof = [[radius, height, ao]...] bottom to top, seg sides (8 = octagonal)
function lathe(m, prof, seg, cx = 0, cy = 0, cz = 0, rot = PI / seg) {
  const rings = [];
  for (const [r, h, ao = 1] of prof) { const ring = []; for (let s = 0; s < seg; s++) { const a = s / seg * TAU + rot; ring.push(m.v(cx + cos(a) * r, cy + h, cz + sin(a) * r, ao)); } rings.push(ring); }
  for (let k = 0; k < rings.length - 1; k++) for (let s = 0; s < seg; s++) { const s2 = (s + 1) % seg; m.quad(rings[k][s], rings[k + 1][s], rings[k + 1][s2], rings[k][s2]); }
}
const domeProf = (r, drum, point = 1.12) => {
  const p = [[r * 1.04, 0], [r * 1.04, drum], [r * 1.08, drum + .2], [r, drum + .35]];
  for (let i = 1; i <= 12; i++) { const a = i / 12 * PI / 2; p.push([r * cos(a), drum + .35 + r * point * pow(sin(a), .92)]); }
  return p;
};

function meshRock(sd, sub, round_) {
  if (LV > 1 && sub > 1) sub--;
  rseed(100 + sd);
  const pl = []; for (let i = 0; i < (round_ ? 0 : 8); i++) { const q = qRand(); const l = hypot(q[0], q[1], q[2]) || 1; pl.push([q[0] / l, q[1] / l, q[2] / l, rr(.5, .85)]); }
  return icosphere(sub, (x, y, z) => {
    const r = 1 + (fbm(x * 1.6 + sd, y * 1.6, z * 1.6, 2) - .5) * (round_ ? .5 : .9);
    let px = x * r, py = y * r * (round_ ? .75 : .7), pz = z * r;
    for (const p of pl) { const d = px * p[0] + py * p[1] + pz * p[2] - p[3]; if (d > 0) { px -= p[0] * d; py -= p[1] * d; pz -= p[2] * d; } }
    return [px, py, pz];
  });
}

function meshBird() {
  const m = new Mesh(), X = [.17, .1, 0, -.12, -.2], H = [.01, .045, .055, .04, .012];
  const rings = [];
  for (let i = 0; i < 5; i++) { const r = []; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; r.push(m.v(sin(a) * H[i] * .9, cos(a) * H[i], X[i], 0)); } rings.push(r); }
  for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) { const k2 = (k + 1) % 6; m.quad(rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2]); }
  for (const sx of [-1, 1]) {
    const a = m.v(sx * .03, .02, .06, 0), b = m.v(sx * .03, .02, -.06, 0), c = m.v(sx * .36, .03, -.02, sx), d = m.v(sx * .3, .03, -.12, sx);
    m.quad(a, c, d, b);
  }
  const t0 = m.v(0, .01, -.18, 0), t1 = m.v(.07, .01, -.3, 0), t2 = m.v(-.07, .01, -.3, 0); m.tri(t0, t1, t2);
  return m;
}


function meshAcacia(sd) {
  rseed(340 + sd);
  const m = new Mesh(), tops = [];
  const trunk = [[0, 0, 0], [rr(-.2, .2), 1.2, rr(-.2, .2)]];
  m.tube([[0, -.2, 0], [0, .15, 0], trunk[1]], (k) => [.34, .2, .14][k], 7, false);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + rr(-.4, .4), r = rr(1.2, 2.4), h = rr(3, 4.2);
    const end = [cos(a) * r, h, sin(a) * r];
    m.tube([trunk[1], [end[0] * .4, h * .6, end[2] * .4], end], (k) => .12 - k * .035, 5, true);
    for (let j = 0; j < 5; j++) { const b = rnd() * TAU, l = rr(.9, 1.7), tip = [end[0] + cos(b) * l, end[1] + rr(-.1, .35), end[2] + sin(b) * l]; m.tube([end, tip], (k) => k ? .012 : .035, 3, false); tops.push(tip); }
  }
  m.tops = tops;
  return m;
}

const qrot3 = (q, v) => {
  const [x, y, z, w] = q, cx = y * v[2] - z * v[1] + w * v[0], cy = z * v[0] - x * v[2] + w * v[1], cz = x * v[1] - y * v[0] + w * v[2];
  return [v[0] + 2 * (y * cz - z * cy), v[1] + 2 * (z * cx - x * cz), v[2] + 2 * (x * cy - y * cx)];
};

// ---------------------------------------------------------------- the Kaaba, the Hijr wall, Zamzam
function meshKaaba() {
  const m = new Mesh(), k = KAABA;
  box(m, -k.hx, -.3, -k.hz, k.hx, k.h, k.hz);
  return m;
}
// a house: body, parapet, beam ends, door, small high windows, sometimes a roof room or a walled yard; written into
// the shared world-space meshes by material
function house(M, x, y, z, yaw, w, d, h, kind, mat, lit, lamps) {
  const ux = cos(yaw), uz = sin(yaw), vx = -uz, vz = ux, body = M[mat], hw = w / 2, hd = d / 2;
  obox(body, x, z, ux, uz, hw, hd, y - .6, y + h);
  // parapet on four sides
  for (const s of [-1, 1]) {
    obox(body, x + vx * s * (hd - .13), z + vz * s * (hd - .13), ux, uz, hw, .13, y + h, y + h + .55);
    obox(body, x + ux * s * (hw - .13), z + uz * s * (hw - .13), vx, vz, hd - .26, .13, y + h, y + h + .55);
  }
  // beam ends of the roof timbers along the front and back
  for (let t = -hw + .6; t < hw - .3; t += 1.05) for (const s of [-1, 1]) obox(M.wood, x + ux * t + vx * s * (hd + .18), z + uz * t + vz * s * (hd + .18), vx, vz, .2, .08, y + h - .42, y + h - .24);
  // the door on the front (+v) face, and two small windows high up
  const fx = x + vx * (hd + .03), fz = z + vz * (hd + .03), dx = -hw * .35;
  obox(lit ? M.open : M.wood, fx + ux * dx, fz + uz * dx, ux, uz, .5, .04, y, y + 2.05);
  obox(M.wood, fx + ux * dx + vx * .03, fz + uz * dx + vz * .03, ux, uz, .62, .06, y + 2.05, y + 2.25);
  for (const t of [hw * .2, hw * .62]) if (t < hw - .5) obox(M.open, fx + ux * t, fz + uz * t, ux, uz, .22, .03, y + h - 1.2, y + h - .75);
  if (lit) lamps.push(fx + ux * dx + vx * .4, y + 1.1, fz + uz * dx + vz * .4, rnd());
  if (kind === 1) { const rx = x - ux * (hw - 2) - vx * (hd - 2), rz = z - uz * (hw - 2) - vz * (hd - 2); obox(body, rx, rz, ux, uz, 1.7, 1.6, y + h, y + h + 2.4); obox(M.open, rx + vx * 1.63, rz + vz * 1.63, ux, uz, .4, .03, y + h, y + h + 1.8); }
  if (kind === 2) {
    const yd = 4.5, wh = 2.1, cx = x + vx * (hd + yd / 2), cz = z + vz * (hd + yd / 2);
    obox(body, cx + ux * (hw - .2), cz + uz * (hw - .2), vx, vz, yd / 2, .2, y - .4, y + wh);
    obox(body, cx - ux * (hw - .2), cz - uz * (hw - .2), vx, vz, yd / 2, .2, y - .4, y + wh);
    obox(body, cx + vx * (yd / 2 - .2) + ux * (hw * .55), cz + vz * (yd / 2 - .2) + uz * (hw * .55), ux, uz, hw * .45, .2, y - .4, y + wh);
    obox(body, cx + vx * (yd / 2 - .2) - ux * (hw * .55), cz + vz * (yd / 2 - .2) - uz * (hw * .55), ux, uz, hw * .3, .2, y - .4, y + wh);
  }
}
function meshFarHouse(w, h, d, step) {
  const m = new Mesh();
  box(m, -w / 2, -.6, -d / 2, w / 2, h, d / 2);
  box(m, -w / 2 - .1, h, -d / 2 - .1, w / 2 + .1, h + .45, d / 2 + .1);
  if (step) box(m, -w * .45, h, -d * .45, -w * .05, h + 2.4, -d * .05);
  return m;
}

// ---------------------------------------------------------------- instance stores
function makeWorld(D, T, NEAR, MID, FAR, flyPts, fh) {
  const NA = NEAR.A, NB = NEAR.B;
  const gi = (x, y, z) => x + NX * (y + NY * z);
  const nCells = CELLS * CELLS;
  const cellOf = (x, z) => clamp(floor((x - OX) / CELLW), 0, CELLS - 1) + CELLS * clamp(floor((z - OZ) / CELLW), 0, CELLS - 1);
  const small = Array.from({ length: nCells }, () => []);
  let nth = 0;
  const leaf = (L, x, y, z, len, yaw, tilt, wid, hA, type, s1, s2, bend) => { L[cellOf(x, z)].push(x, y, z, len, yaw, tilt, wid, hA, type, s1, s2, bend); };
  const grass = (x, y, z, len, yaw, tilt, wid, hA, s1, s2, bend) => { if (!(nth++ % THIN)) leaf(small, x, y, z, len, yaw, tilt, wid * (1 + LV / 2), hA, 3, s1, s2, bend); };
  const cells = Array.from({ length: 8 }, () => Array.from({ length: nCells }, () => []));
  const solids = [];
  const solid = (mesh, x, y, z, sc, q, mat, seed, far = 0, ex = 0) => {
    if (mesh < 8) cells[mesh][cellOf(x, z)].push(x, y, z, sc, q[0], q[1], q[2], q[3], mat, seed, far, ex);
    else (solids[mesh] ||= []).push(x, y, z, sc, q[0], q[1], q[2], q[3], mat, seed, far, ex);
  };
  const Q0 = [0, 0, 0, 1], yawQ = (a) => qAxis(0, 1, 0, a);
  const lsl = hypot(SUN[0], SUN[2]), ldx = SUN[0] / lsl, ldz = SUN[2] / lsl, ltn = SUN[1] / lsl;
  const litC = (x, z) => { let y = -1e4; for (let t = 25; t < 7000; t *= 1.07) y = max(y, fh(x + ldx * t, z + ldz * t) - t * ltn); return -(y + 2000); };
  const mB = grid(MID.B, MN, MO, MC), fB = grid(FAR.B, FN, FO, FC);
  const townAt = (x, z) => (max(abs(x), abs(z)) < 1000 ? mB(x, z) : fB(x, z));
  const nearX = (A, x, z, c) => { const ix = clamp(round(x - OX), 0, NX - 1), iz = clamp(round(z - OZ), 0, NZ - 1); return A[(ix + NX * iz) * 4 + c]; };

  const fl = [];
  const floorsAt = (x, z) => {
    const ix = clamp(round((x - OX) / VS), 1, NX - 2), iz = clamp(round((z - OZ) / VS), 1, NZ - 2);
    fl.length = 0; let ceil = OY + NY;
    for (let gy = NY - 2; gy >= 0; gy--) {
      const d = D[gi(ix, gy, iz)], da = D[gi(ix, gy + 1, iz)];
      if (da <= 0 && d > 0) { const y = OY + (gy + d / (d - da)) * VS; fl.push(y, ceil - y); } else if (da > 0 && d <= 0) ceil = OY + (gy + 0.5) * VS;
    }
    return fl;
  };
  const gy = (x, z) => { if (max(abs(x), abs(z)) > -OX - 4) return fh(x, z); const f = floorsAt(x, z); return f.length ? f[0] : fh(x, z); };
  const pickV = () => ((rnd() * T.nv) | 0) * 3;
  const nearFly = (x, y, z, r) => { for (const p of flyPts) if (hypot(x - p[0], y - p[1], z - p[2]) < r) return true; return false; };
  const nearPose = (x, z, r = 3) => { for (const p of POSES) if (!p[6] && hypot(x - p[0], z - p[2]) < r) return true; return false; };
  const lamps = [];

  // --- the Kaaba, its door and water spout, the low wall of the Hijr, the well of Zamzam
  const M = { 6: new Mesh(), 5: new Mesh(), 7: new Mesh(), wood: new Mesh(), open: new Mesh(), well: new Mesh() };
  const ky = 0;
  solid(13, 0, ky, 0, 1, yawQ(KAABA.yaw), 13, .3, 0, 0);
  {
    const k = KAABA, [ux, uz] = kRot(1, 0), [vx, vz] = kRot(0, 1);
    const [dx, dz] = kRot(-2.3, k.hz + .06);
    obox(M.open, dx + vx * .02, dz + vz * .02, ux, uz, .95, .03, ky + 2.0, ky + 5.0);
    obox(M.wood, dx + vx * .05, dz + vz * .05, ux, uz, .75, .05, ky + 2.1, ky + 4.85);
    obox(M.wood, dx + vx * .1, dz + vz * .1, ux, uz, 1.05, .12, ky + 1.85, ky + 2.05);
    const [sx, sz] = kRot(k.hx + .6, 0);
    obox(M.wood, sx, sz, ux, uz, .75, .12, ky + k.h - .45, ky + k.h - .25);
    // the Hijr: a low curved wall on the north-west side (its line and height are guesses)
    const pts = [];
    for (let i = 0; i <= 18; i++) { const a = -1.32 + i / 18 * 2.64, [px, pz] = kRot(k.hx + .2 + cos(a) * 8.2, sin(a) * 7.6); pts.push([px, ky, pz]); }
    vwall(M[6], pts, .45, -.3, 1.15);
  }
  {
    const [x, z] = ZAMZAM, y = fh(x, z);
    lathe(M.well, [[1.25, -.3], [1.25, .9], [1.1, 1.0], [.85, 1.0], [.85, .35]], 16, x, y, z);
    const c0 = M.open.v(x, y + .35, z, 0);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, b = (i + 1) / 12 * TAU; M.open.tri(c0, M.open.v(x + cos(b) * .86, y + .35, z + sin(b) * .86, 0), M.open.v(x + cos(a) * .86, y + .35, z + sin(a) * .86, 0)); }
    obox(M.well, x + 2.3, z + .2, 0, 1, 1.3, .35, y - .6, y + .5);
    obox(M.open, x + 2.3, z + .2, 0, 1, 1.1, .2, y + .2, y + .51);
    obox(M.wood, x - 1.0, z, 1, 0, .06, .06, y + .9, y + 2.6); obox(M.wood, x + 1.0, z, 1, 0, .06, .06, y + .9, y + 2.6);
    obox(M.wood, x, z, 1, 0, 1.15, .07, y + 2.5, y + 2.64);
    lathe(M.wood, [[.02, 2.5], [.14, 2.45], [.14, 2.3], [.02, 2.25]], 10, x, y, z);
    M.wood.tube([[x + .14, y + 2.37, z], [x + .14, y + 1.3, z]], .012, 4, false, () => 1);
    lathe(M.wood, [[.0, 0], [.16, .02], [.2, .3], [.21, .32]], 10, x + 1.5, y + .5, z + .25);
  }

  // --- houses round the open space, along lanes radiating from it, thinning up the slopes
  rseed(5);
  for (let gz = OZ + 6; gz < -OZ - 6; gz += 10.5) for (let gx = OX + 6; gx < -OX - 6; gx += 10.5) {
    const x = gx + rr(-2.5, 2.5), z = gz + rr(-2.5, 2.5), r = hypot(x, z), t = nearX(NB, x, z, 0) * (1 - sstep(30, 18, hypot(x - SAFA[0], z - SAFA[1])));
    if (t < .25 || rnd() > t * 1.3 || r < 38 || laneDist(x, z) < 3.2 + r * .01 || nearPose(x, z, 7) || nearFly(x, gy(x, z) + 3, z, 7)) continue;
    const wob = 4 * sin(atan2(z, x) * 5);
    if (abs(r - 64 - wob) < 3 || abs(r - 128 + wob) < 3.5) continue;
    const w = rr(6.5, 11), d = rr(6, 9.5), two = rnd() < (r < 90 ? .45 : .2), h = two ? rr(5.6, 6.4) : rr(3, 3.6);
    const yaw = atan2(z, x) + PI / 2 + rr(-.08, .08) + (rnd() < .3 ? PI / 2 : 0);
    const ys = [[0, 0], [w / 2, d / 2], [-w / 2, d / 2], [w / 2, -d / 2], [-w / 2, -d / 2]].map(([a, b]) => gy(x + cos(yaw) * a - sin(yaw) * b, z + sin(yaw) * a + cos(yaw) * b));
    if (max(...ys) - min(...ys) > 3.5) continue;
    const mat = rnd() < .55 ? 6 : rnd() < .5 ? 5 : 7, kind = rnd() < .25 ? 1 : rnd() < .2 ? 2 : 0;
    house(M, x, min(...ys), z, yaw + (rnd() < .5 ? 0 : PI), w, d, h, kind, mat, rnd() < .13, lamps);
  }
  solid(8, 0, 0, 0, 1, Q0, 6, .1, 0, 0); solid(9, 0, 0, 0, 1, Q0, 5, .2, 0, 0); solid(10, 0, 0, 0, 1, Q0, 7, .3, 0, 0);
  solid(11, 0, 0, 0, 1, Q0, 9, .4, 0, 0); solid(12, 0, 0, 0, 1, Q0, 14, .5, 0, 0); solid(14, 0, 0, 0, 1, Q0, 12, .6, 0, 0);

  // --- granite boulders, rubble and gravel on the slopes and on Safa and Marwa, kept off the open ground
  rseed(12);
  for (let i = 0; i < 70000; i++) {
    const k = pickV(), x = T.wp[k], y = T.wp[k + 1], z = T.wp[k + 2], ny = T.wn[k + 1];
    if (max(abs(x), abs(z)) > -OX - 6 || nearPose(x, z, 5) || hypot(x, z) < 40) continue;
    const rock = nearX(NA, x, z, 1), t = nearX(NB, x, z, 0), op = nearX(NB, x, z, 1);
    if (op > .3 || (t > .4 && rnd() < .85)) continue;
    const q = qRand(), r = rnd();
    if (rock > .3 && r < .2 * rock && ny > .35) {
      const big = rnd() < .15, sc = big ? rr(1.4, 3.2) : rr(.4, 1.4);
      if (nearFly(x, y, z, sc + 3)) continue;
      solid(big ? 2 : (rnd() < .5 ? 0 : 1), x - T.wn[k] * sc * .35, y - ny * sc * .4, z - T.wn[k + 2] * sc * .35, sc, q, rnd() < .65 ? 2 : 3, rnd(), 0, 0);
    } else if (ny > .5 && r < .35) {
      const sc = .06 + .3 * pow(rnd(), 2);
      if (!(nth++ % THIN)) solid(rnd() < .5 ? 7 : 5, x, y - sc * .2, z, sc, q, 4, rnd(), 45, 0);
    }
  }

  // --- a few acacias (talh) at the edges of the town and on the slopes, dry shrubs
  rseed(7);
  const acacias = [meshAcacia(0), meshAcacia(1), meshAcacia(2)];
  for (let i = 0, n = 0; i < 400 && n < 22; i++) {
    const x = rr(-180, 180), z = rr(-180, 180), r = hypot(x, z);
    if (r < 45 || nearX(NB, x, z, 1) > .2 || nearX(NB, x, z, 0) > .5 || nearPose(x, z, 6) || laneDist(x, z) < 4) continue;
    const y = gy(x, z); if (nearFly(x, y + 3, z, 8)) continue;
    const k = (rnd() * 3) | 0, s = rr(1, 1.5), q = yawQ(rnd() * TAU);
    solid(16 + k, x, y - .1, z, s, q, 9, rnd(), 0, 0); n++;
    for (const tp of acacias[k].tops) {
      const w = qrot3(q, tp.map((v) => v * s));
      for (let j = 0; j < 60; j++) { const a = rnd() * TAU, rd = sqrt(rnd()) * 1.1 * s; grass(x + w[0] + cos(a) * rd, y + w[1] + rr(-.15, .2), z + w[2] + sin(a) * rd, rr(.25, .4), rnd() * TAU, rr(1.1, 1.8), .06, 4, rnd(), rnd(), .3); }
    }
  }
  rseed(9);
  for (let i = 0; i < 1800; i++) {
    const k = pickV(), x = T.wp[k], y = T.wp[k + 1], z = T.wp[k + 2];
    if (T.wn[k + 1] < .75 || max(abs(x), abs(z)) > -OX - 6 || nearPose(x, z, 2) || nearX(NB, x, z, 1) > .2 || nearX(NB, x, z, 0) > .3 || rnd() > .15 + .4 * nearX(NA, x, z, 1)) continue;
    const yw = rnd() * TAU, s = rr(.5, 1.1);
    for (let j = 0; j < 9; j++) grass(x + rr(-.2, .2), y - .05, z + rr(-.2, .2), rr(.25, .7) * s, yw + j * 2.4, rr(.3, 1.2), rr(.02, .04), 0, rnd(), rnd(), rr(.3, .7));
  }

  // --- the rest of the town over the valley floors, thinning out; Jabal al-Nour stands far to the north-east
  rseed(6);
  for (let gz = -1800; gz < 1800; gz += 12) for (let gx = -1800; gx < 1800; gx += 12) {
    if (gx % 84 === 0 || gz % 96 === 0) continue;
    const x = gx + rr(-1.5, 1.5), z = gz + rr(-1.5, 1.5);
    if (max(abs(x), abs(z)) < -OX + 6) continue;
    const t = townAt(x, z); if (t < .2 || rnd() > t * .8) continue;
    const k = (rnd() * FHOUSE.length) | 0, y = min(fh(x - 5, z - 5), fh(x + 5, z - 5), fh(x - 5, z + 5), fh(x + 5, z + 5)) - .3;
    solid(19 + k, x, y, z, rr(.85, 1.1), yawQ((rnd() < .5 ? 0 : PI / 2) + rr(-.06, .06)), 17, rnd(), litC(x, z), 0);
    if (rnd() < .06) lamps.push(x + rr(-4, 4), y + 1.2, z + rr(-4, 4), rnd());
  }

  // --- life: doves wheeling over the open space and the town (not at night)
  rseed(13);
  const birds = [];
  if (!NIGHT) for (const f of [[0, 26, 0, 24, 12, 1], [60, 30, -60, 40, 7, -1], [-50, 28, 70, 35, 6, 1]]) {
    const ss_ = rnd();
    for (let i = 0; i < f[4]; i++) birds.push(f[0], f[1], f[2], f[3], ss_ + rnd() * .2, f[5] * rr(.9, 1.1) * 7 / f[3], rr(1.8, 2.3), rnd());
  }
  const motes = new Float32Array(3000 * 4);
  for (let i = 0; i < motes.length; i++) motes[i] = rnd();

  const pack = (L) => {
    let n = 0; const start = new Uint32Array(nCells + 1);
    for (let c = 0; c < nCells; c++) { start[c] = n; n += L[c].length / 12; }
    start[nCells] = n;
    const buf = new ArrayBuffer(max(36, n * 36)), f = new Float32Array(buf), u8 = new Uint8Array(buf), lo = new Float32Array(nCells).fill(1e9), hi = new Float32Array(nCells).fill(-1e9);
    let k = 0;
    for (let c = 0; c < nCells; c++) { const a = L[c]; for (let i = 0; i < a.length; i += 12, k++) {
      for (let j = 0; j < 8; j++) f[k * 9 + j] = a[i + j];
      u8[k * 36 + 32] = a[i + 8]; u8[k * 36 + 33] = a[i + 9] * 255; u8[k * 36 + 34] = a[i + 10] * 255; u8[k * 36 + 35] = a[i + 11] * 255;
      const y = a[i + 1], l = a[i + 3]; if (y - l < lo[c]) lo[c] = y - l; if (y + l > hi[c]) hi[c] = y + l;
    } }
    return { buf, n, start, lo, hi };
  };
  const packC = (L) => {
    let n = 0; const start = new Uint32Array(nCells + 1);
    for (let c = 0; c < nCells; c++) { start[c] = n; n += L[c].length / 12; }
    start[nCells] = n;
    const data = new Float32Array(max(12, n * 12)), lo = new Float32Array(nCells).fill(1e9), hi = new Float32Array(nCells).fill(-1e9);
    let k = 0;
    for (let c = 0; c < nCells; c++) { const a = L[c]; for (let i = 0; i < a.length; i += 12) { for (let j = 0; j < 12; j++) data[k++] = a[i + j]; lo[c] = min(lo[c], a[i + 1] - 5); hi[c] = max(hi[c], a[i + 1] + 5); } }
    return { data, n, start, lo, hi };
  };

  // --- half-res volume: r = openness, g = skylight
  const hx = NX / 2, hy2 = NY / 2, hz = NZ / 2, volD = new Uint8Array(hx * hy2 * hz * 2);
  let Lp = new Float32Array(hx * hz).fill(1), Ln = new Float32Array(hx * hz), tmp = new Float32Array(hx * hz);
  for (let y = hy2 - 1; y >= 0; y--) {
    for (let z = 0; z < hz; z++) for (let x = 0; x < hx; x++) { const i = x + hx * z; tmp[i] = (Lp[x > 0 ? i - 1 : i] + 2 * Lp[i] + Lp[x < hx - 1 ? i + 1 : i]) * 0.25; }
    for (let z = 0; z < hz; z++) for (let x = 0; x < hx; x++) {
      const i = x + hx * z, b = (tmp[z > 0 ? i - hx : i] + 2 * tmp[i] + tmp[z < hz - 1 ? i + hx : i]) * 0.25;
      const g0 = gi(x * 2, y * 2, z * 2);
      const d = (D[g0] + D[g0 + 1] + D[g0 + NX] + D[g0 + NX + 1] + D[g0 + NX * NY] + D[g0 + NX * NY + 1] + D[g0 + NX * NY + NX] + D[g0 + NX * NY + NX + 1]) * 0.125;
      const o = x + hx * (y + hy2 * z);
      Ln[i] = b * clamp(0.5 - d / 1.5, 0, 1);
      volD[o * 2] = clamp(0.5 - d / 10, 0, 1) * 255; volD[o * 2 + 1] = min(1, b) * 255;
    }
    const t = Lp; Lp = Ln; Ln = t;
  }

  // --- maps: near (1 m): sand, rock, open ground, town · far (~23 m): rock, sand, town, open ground
  const nm = new Uint8Array(NX * NZ * 4);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const o = (i + NX * j) * 4; nm[o] = NA[o + 2] * 255; nm[o + 1] = NA[o + 1] * 255; nm[o + 2] = NB[o + 1] * 255; nm[o + 3] = NB[o] * 255; }
  const fmap = new Uint8Array(FN * FN * 4);
  for (let k = 0; k < FN * FN; k++) { fmap[k * 4] = FAR.A[k * 4 + 1] * 255; fmap[k * 4 + 1] = FAR.A[k * 4 + 2] * 255; fmap[k * 4 + 2] = FAR.B[k * 4] * 255; fmap[k * 4 + 3] = FAR.B[k * 4 + 1] * 255; }

  const sol = { data: [], ranges: [] }; let si = 0;
  for (let m = 0; m < NSOLID; m++) { const a = solids[m] || []; sol.ranges.push([si, a.length / 12]); si += a.length / 12; for (let i = 0; i < a.length; i++) sol.data.push(a[i]); }
  return { gy, M, acacias, cells: cells.map(packC), small: pack(small),
    solids: { data: new Float32Array(sol.data), ranges: sol.ranges }, birds: new Float32Array(birds.length ? birds : [0, -1e4, 0, 1, 0, 0, 0, 0]), nBirds: birds.length / 8,
    motes, lamps: new Float32Array(lamps.length ? lamps : [0, -1e4, 0, 0]), volD, nm, fmap };
}
