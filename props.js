// Props for the Work column: low-poly furniture and objects built from primitives, in the figures' style.
// Each kind is { keep, seats, build }: keep is its keep-out radius, seats are [x, z, lift, headingOffset]
// in local units (the prop faces +z), build returns the parts to merge. Sizes are in figure units
// (a figure is about 1.1 tall). Most kinds belong to one film; the generic ones at the end are
// the fallback for films without a set of their own.
import * as THREE from 'three';

export const PROP_COLOURS = {
  wood: '#b08a62', dark: '#3a3d46', leaf: '#7c9c66', leaf2: '#6b8c5a', bark: '#6e5a48', cream: '#efe6d6', red: '#cf6a58',
  canvas: '#e7c45e', blanket: '#c86a56', blanket2: '#5f7fa8', glass: '#ffe9b8', green: '#50695a',
  white: '#f4f1ea', yellow: '#e6c84a', orange: '#e08a3c', blue: '#4f7fc9', pink: '#e49ab0', metal: '#9aa3ad',
  black: '#23252b', brown: '#7d5a3c', straw: '#d8b86a', brick: '#b5513f', honey: '#e4a533', teal: '#4f9a9a', sky: '#9fc3e6',
};

function colouredPart(src, hex) {
  const geom = src.index ? src.toNonIndexed() : src; // merging needs every part indexed the same way; blobs are not
  const c = new THREE.Color(hex); const n = geom.attributes.position.count; const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  for (const k of Object.keys(geom.attributes)) if (!['position', 'normal', 'color'].includes(k)) geom.deleteAttribute(k);
  return geom;
}
// place a part: optional pre-offset, then rotations, then its position
const mk = (geom, hex, at = [0, 0, 0], o = {}) => {
  if (o.pre) geom.translate(...o.pre);
  if (o.rx) geom.rotateX(o.rx); if (o.ry) geom.rotateY(o.ry); if (o.rz) geom.rotateZ(o.rz);
  geom.translate(...at);
  return colouredPart(geom, PROP_COLOURS[hex] || hex);
};
const bx = (w, h, d, hex, at, o) => mk(new THREE.BoxGeometry(w, h, d), hex, at, o);
const cy = (rt, rb, h, hex, at, o = {}) => mk(new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 10), hex, at, o);
const cn = (r, h, hex, at, o = {}) => mk(new THREE.ConeGeometry(r, h, o.seg ?? 9), hex, at, o);
const sp = (r, hex, at, o) => mk(new THREE.SphereGeometry(r, 8, 6), hex, at, o);
const bl = (r, hex, at, o = {}) => { const g = new THREE.IcosahedronGeometry(r, 1); g.scale(1, o.sy ?? 0.85, 1); return mk(g, hex, at, o); };
const py = (w, h, hex, at, o = {}) => mk(new THREE.ConeGeometry(w / Math.SQRT2, h, 4), hex, at, { ...o, ry: (o.ry ?? 0) + Math.PI / 4 });
const PI = Math.PI, H = PI / 2;
const legs4 = (w, d, h, hex, t = 0.06) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => bx(t, h, t, hex, [a * (w / 2 - t), h / 2, b * (d / 2 - t)]));
const wheel = (r, hex, at) => cy(r, r, 0.06, hex, at, { rz: H, seg: 12 });
const ring = (n, r, f) => Array.from({ length: n }, (_, i) => f((i / n) * 2 * PI, i));

export const PROP_KINDS = {
  // ---- The Very Small Hotel: a forecourt
  hotelSign: { keep: 0.15, seats: [], build: () => [cy(0.04, 0.05, 2.2, 'dark', [0, 1.1, 0], { seg: 6 }), bx(1.1, 0.5, 0.08, 'red', [0, 2.1, 0]), bx(1.2, 0.06, 0.14, 'glass', [0, 2.38, 0]), bx(0.9, 0.1, 0.09, 'cream', [0, 2.1, 0])] },
  luggageCart: { keep: 0.55, seats: [], build: () => [bx(0.9, 0.06, 0.5, 'dark', [0, 0.18, 0]),
    ...[[-0.38, -0.2], [0.38, -0.2], [-0.38, 0.2], [0.38, 0.2]].map(([x, z]) => wheel(0.08, 'dark', [x, 0.08, z])),
    cy(0.025, 0.025, 1.3, 'metal', [-0.42, 0.85, -0.22], { seg: 6 }), cy(0.025, 0.025, 1.3, 'metal', [0.42, 0.85, -0.22], { seg: 6 }), cy(0.025, 0.025, 0.84, 'metal', [0, 1.5, -0.22], { rz: H, seg: 6 }),
    bx(0.6, 0.3, 0.4, 'brown', [0, 0.36, 0]), bx(0.5, 0.25, 0.35, 'blue', [0.02, 0.63, 0]), bx(0.35, 0.2, 0.3, 'red', [-0.05, 0.86, 0])] },
  velvetRope: { keep: 0.5, seats: [], build: () => [cy(0.04, 0.07, 0.95, 'glass', [-0.55, 0.47, 0], { seg: 8 }), cy(0.04, 0.07, 0.95, 'glass', [0.55, 0.47, 0], { seg: 8 }), sp(0.06, 'glass', [-0.55, 0.98, 0]), sp(0.06, 'glass', [0.55, 0.98, 0]),
    cy(0.03, 0.03, 0.56, 'red', [-0.28, 0.82, 0], { rz: H + 0.25, seg: 6 }), cy(0.03, 0.03, 0.56, 'red', [0.28, 0.82, 0], { rz: H - 0.25, seg: 6 })] },

  // ---- Airbnb: somewhere to stay
  cottage: { keep: 0.9, seats: [], build: () => [bx(1.2, 0.9, 1.0, 'cream', [0, 0.45, 0]), py(1.45, 0.6, 'brick', [0, 1.2, 0]), bx(0.15, 0.4, 0.15, 'brick', [0.35, 1.3, -0.2]),
    bx(0.3, 0.5, 0.04, 'wood', [0, 0.25, 0.51]), bx(0.25, 0.25, 0.04, 'glass', [-0.35, 0.55, 0.51]), bx(0.25, 0.25, 0.04, 'glass', [0.38, 0.55, 0.51])] },
  mailbox: { keep: 0.15, seats: [], build: () => [cy(0.04, 0.04, 1.0, 'wood', [0, 0.5, 0], { seg: 6 }), bx(0.25, 0.22, 0.4, 'blue', [0, 1.1, 0]), cy(0.125, 0.125, 0.4, 'blue', [0, 1.21, 0], { rx: H, seg: 8 }), bx(0.03, 0.16, 0.08, 'red', [0.15, 1.25, 0.1])] },
  hammock: { keep: 0.5, seats: [[0, 0, 0.62, 0]], build: () => [cy(0.05, 0.08, 1.3, 'wood', [-0.95, 0.65, 0], { seg: 6 }), cy(0.05, 0.08, 1.3, 'wood', [0.95, 0.65, 0], { seg: 6 }),
    bx(0.85, 0.04, 0.6, 'blanket2', [-0.42, 0.66, 0], { rz: 0.22 }), bx(0.85, 0.04, 0.6, 'blanket2', [0.42, 0.66, 0], { rz: -0.22 })] },

  // ---- Andres Thai: a restaurant terrace
  wokStation: { keep: 0.55, seats: [], build: () => [bx(0.8, 0.7, 0.6, 'dark', [0, 0.35, 0]), cy(0.34, 0.16, 0.2, 'metal', [0, 0.8, 0], { seg: 12 }), cy(0.02, 0.02, 0.45, 'dark', [0.5, 0.86, 0], { rz: H, seg: 6 }), bx(0.3, 0.06, 0.2, 'red', [0, 0.73, 0.32])] },
  lanternPost: { keep: 0.12, seats: [], build: () => [cy(0.03, 0.04, 2.0, 'dark', [0, 1.0, 0], { seg: 6 }), cy(0.02, 0.02, 0.9, 'dark', [0.45, 1.98, 0], { rz: H, seg: 6 }),
    sp(0.14, 'red', [0.3, 1.72, 0]), sp(0.14, 'red', [0.75, 1.72, 0]), cy(0.02, 0.02, 0.1, 'yellow', [0.3, 1.52, 0], { seg: 5 }), cy(0.02, 0.02, 0.1, 'yellow', [0.75, 1.52, 0], { seg: 5 })] },
  tableStools: { keep: 0.8, seats: ring(3, 0.62, (a) => [Math.sin(a) * 0.62, Math.cos(a) * 0.62, 0.36, a + PI]), build: () => [cy(0.4, 0.4, 0.04, 'wood', [0, 0.56, 0], { seg: 12 }), cy(0.04, 0.07, 0.56, 'dark', [0, 0.28, 0], { seg: 6 }),
    ...ring(3, 0.62, (a) => cy(0.15, 0.15, 0.04, 'wood', [Math.sin(a) * 0.62, 0.36, Math.cos(a) * 0.62], { seg: 8 })), ...ring(3, 0.62, (a) => cy(0.03, 0.03, 0.36, 'dark', [Math.sin(a) * 0.62, 0.18, Math.cos(a) * 0.62], { seg: 5 }))] },

  // ---- But Wait, There's Less
  plinth: { keep: 0.45, seats: [], build: () => [bx(0.6, 0.5, 0.6, 'cream', [0, 0.25, 0]), bx(0.7, 0.06, 0.7, 'cream', [0, 0.03, 0])] },
  shrinkingBoxes: { keep: 0.7, seats: [], build: () => [bx(0.6, 0.6, 0.6, 'brown', [-0.5, 0.3, 0]), bx(0.4, 0.4, 0.4, 'brown', [0.1, 0.2, 0]), bx(0.22, 0.22, 0.22, 'brown', [0.5, 0.11, 0]), bx(0.62, 0.05, 0.62, 'straw', [-0.5, 0.6, 0])] },

  // ---- Stallion Sprint: the track
  hurdle: { keep: 0.55, seats: [], build: () => [cy(0.03, 0.03, 0.8, 'metal', [-0.5, 0.4, 0], { seg: 6 }), cy(0.03, 0.03, 0.8, 'metal', [0.5, 0.4, 0], { seg: 6 }), bx(1.1, 0.07, 0.06, 'white', [0, 0.8, 0]), bx(0.06, 0.04, 0.45, 'metal', [-0.5, 0.02, 0]), bx(0.06, 0.04, 0.45, 'metal', [0.5, 0.02, 0])] },
  startBlocks: { keep: 0.3, seats: [], build: () => [bx(0.08, 0.06, 0.75, 'metal', [0, 0.03, 0]), bx(0.26, 0.2, 0.08, 'red', [0, 0.13, 0.18], { rx: -0.6 }), bx(0.26, 0.2, 0.08, 'red', [0, 0.13, -0.14], { rx: -0.6 })] },
  finishPosts: { keep: 0.6, seats: [], build: () => [cy(0.03, 0.03, 1.3, 'metal', [-0.85, 0.65, 0], { seg: 6 }), cy(0.03, 0.03, 1.3, 'metal', [0.85, 0.65, 0], { seg: 6 }),
    ...Array.from({ length: 8 }, (_, i) => bx(0.21, 0.09, 0.02, i % 2 ? 'dark' : 'white', [-0.735 + i * 0.21, 1.15, 0]))] },

  // ---- Birra Moretti: the picnic, on time
  lawnmower: { keep: 0.45, seats: [], build: () => [bx(0.5, 0.25, 0.62, 'red', [0, 0.25, 0]), bx(0.3, 0.2, 0.3, 'dark', [0, 0.47, 0.05]), cy(0.05, 0.05, 0.12, 'metal', [0.08, 0.63, 0.05], { seg: 6 }),
    ...[[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.24], [0.28, 0.24]].map(([x, z]) => wheel(0.1, 'dark', [x, 0.1, z])),
    cy(0.02, 0.02, 0.95, 'metal', [-0.2, 0.68, -0.6], { rx: 0.65, seg: 6 }), cy(0.02, 0.02, 0.95, 'metal', [0.2, 0.68, -0.6], { rx: 0.65, seg: 6 }), cy(0.025, 0.025, 0.46, 'dark', [0, 1.05, -0.9], { rz: H, seg: 6 })] },
  picnicTable: { keep: 1.05, seats: [[-0.5, 0.55, 0.42, PI], [0, 0.55, 0.42, PI], [0.5, 0.55, 0.42, PI], [-0.5, -0.55, 0.42, 0], [0, -0.55, 0.42, 0], [0.5, -0.55, 0.42, 0]], build: () => [bx(1.6, 0.06, 0.6, 'wood', [0, 0.7, 0]),
    bx(0.06, 0.74, 0.06, 'wood', [-0.6, 0.37, 0], { rx: 0.5 }), bx(0.06, 0.74, 0.06, 'wood', [-0.6, 0.37, 0], { rx: -0.5 }), bx(0.06, 0.74, 0.06, 'wood', [0.6, 0.37, 0], { rx: 0.5 }), bx(0.06, 0.74, 0.06, 'wood', [0.6, 0.37, 0], { rx: -0.5 }),
    bx(1.6, 0.05, 0.3, 'wood', [0, 0.42, 0.55]), bx(1.6, 0.05, 0.3, 'wood', [0, 0.42, -0.55]), bx(1.3, 0.05, 1.4, 'wood', [0, 0.38, 0])] },
  beerCrate: { keep: 0.3, seats: [], build: () => [bx(0.5, 0.28, 0.36, 'green', [0, 0.14, 0]),
    ...[[-0.15, -0.09], [0, -0.09], [0.15, -0.09], [-0.15, 0.09], [0, 0.09], [0.15, 0.09]].flatMap(([x, z]) => [cy(0.04, 0.04, 0.3, 'brown', [x, 0.3, z], { seg: 6 }), cy(0.03, 0.03, 0.04, 'glass', [x, 0.47, z], { seg: 6 })])] },

  // ---- Insure and Go: the 99
  iceCreamCart: { keep: 0.7, seats: [], build: () => [bx(0.9, 0.7, 0.6, 'white', [0, 0.5, 0]), bx(0.92, 0.12, 0.62, 'blue', [0, 0.72, 0]), wheel(0.18, 'dark', [-0.5, 0.18, 0]), wheel(0.18, 'dark', [0.5, 0.18, 0]),
    cy(0.03, 0.03, 1.0, 'metal', [0, 1.25, 0], { seg: 6 }), cn(0.78, 0.32, 'red', [0, 1.85, 0], { seg: 8 }), bx(0.3, 0.2, 0.04, 'pink', [0, 0.45, 0.31])] },
  giantCone: { keep: 0.3, seats: [], build: () => [cn(0.24, 0.62, 'straw', [0, 0.31, 0], { rx: PI, seg: 8 }), sp(0.25, 'cream', [0, 0.74, 0]), sp(0.14, 'pink', [0.1, 0.95, 0.06]), bx(0.07, 0.42, 0.05, 'brown', [-0.1, 1.05, 0], { rz: 0.35 })] },
  travelCases: { keep: 0.5, seats: [], build: () => [bx(0.5, 0.7, 0.25, 'blue', [0, 0.35, 0]), bx(0.2, 0.06, 0.04, 'dark', [0, 0.75, 0]), bx(0.4, 0.55, 0.22, 'red', [0.5, 0.28, 0.06]), bx(0.16, 0.05, 0.04, 'dark', [0.5, 0.58, 0.06]), bx(0.52, 0.04, 0.27, 'dark', [0, 0.1, 0]), bx(0.52, 0.04, 0.27, 'dark', [0, 0.5, 0])] },

  // ---- Desperados: a festival in Lagos
  peacock: { keep: 0.6, seats: [], build: () => [bl(0.22, 'blue', [0, 0.36, 0.1], { sy: 0.8 }), cy(0.05, 0.06, 0.42, 'blue', [0, 0.6, 0.26], { rx: -0.3, seg: 6 }), sp(0.09, 'blue', [0, 0.84, 0.36]), cn(0.03, 0.1, 'yellow', [0, 0.84, 0.47], { rx: H, seg: 5 }),
    cy(0.02, 0.02, 0.3, 'dark', [-0.08, 0.15, 0.1], { seg: 5 }), cy(0.02, 0.02, 0.3, 'dark', [0.08, 0.15, 0.1], { seg: 5 }),
    ...Array.from({ length: 7 }, (_, i) => { const a = -0.9 + i * 0.3; return bx(0.14, 0.95, 0.03, 'green', [0, 0.4, -0.1], { pre: [0, 0.42, 0], rz: a }); }),
    ...Array.from({ length: 7 }, (_, i) => { const a = -0.9 + i * 0.3; return sp(0.06, 'teal', [-Math.sin(a) * 0.8, 0.4 + Math.cos(a) * 0.8, -0.1]); })] },
  speakerStack: { keep: 0.5, seats: [], build: () => [0, 1, 2].flatMap((i) => [bx(0.6, 0.58, 0.5, 'black', [0, 0.3 + i * 0.6, 0]), cy(0.18, 0.13, 0.05, 'metal', [0, 0.3 + i * 0.6, 0.26], { rx: H, seg: 10 })]) },
  breadStand: { keep: 0.75, seats: [], build: () => [bx(1.2, 0.06, 0.6, 'wood', [0, 0.7, 0]), ...legs4(1.2, 0.6, 0.7, 'wood'),
    ...[[-0.4, 0], [-0.1, 0.12], [0.2, -0.1], [0.45, 0.1], [0.05, -0.18]].map(([x, z]) => bl(0.13, 'straw', [x, 0.8, z], { sy: 0.6 })),
    cy(0.03, 0.03, 1.1, 'wood', [-0.6, 1.25, 0.28], { seg: 5 }), cy(0.03, 0.03, 1.1, 'wood', [0.6, 1.25, 0.28], { seg: 5 }), bx(1.35, 0.04, 0.75, 'yellow', [0, 1.72, 0.05], { rx: 0.25 })] },

  // ---- Lighthouse: the training ground
  lighthouse: { keep: 0.5, seats: [], build: () => [cy(0.28, 0.4, 1.8, 'white', [0, 0.9, 0], { seg: 10 }), cy(0.345, 0.375, 0.26, 'red', [0, 0.55, 0], { seg: 10 }), cy(0.305, 0.33, 0.26, 'red', [0, 1.2, 0], { seg: 10 }),
    cy(0.42, 0.42, 0.06, 'dark', [0, 1.83, 0], { seg: 10 }), cy(0.2, 0.2, 0.36, 'glass', [0, 2.04, 0], { seg: 8 }), cn(0.27, 0.26, 'red', [0, 2.35, 0], { seg: 8 })] },
  goal: { keep: 0.85, seats: [], build: () => [cy(0.035, 0.035, 0.9, 'white', [-0.75, 0.45, 0], { seg: 6 }), cy(0.035, 0.035, 0.9, 'white', [0.75, 0.45, 0], { seg: 6 }), bx(1.57, 0.07, 0.07, 'white', [0, 0.9, 0]),
    bx(1.5, 0.86, 0.02, 'cream', [0, 0.43, -0.38]), bx(0.02, 0.86, 0.4, 'cream', [-0.75, 0.43, -0.19]), bx(0.02, 0.86, 0.4, 'cream', [0.75, 0.43, -0.19]), bx(1.5, 0.02, 0.4, 'cream', [0, 0.86, -0.19])] },
  ballPile: { keep: 0.3, seats: [], build: () => [sp(0.14, 'white', [-0.15, 0.14, 0]), sp(0.14, 'white', [0.15, 0.14, 0.05]), sp(0.14, 'white', [0, 0.14, -0.22]), sp(0.14, 'white', [0, 0.38, -0.05]), bx(0.04, 0.3, 0.04, 'dark', [-0.1, 0.09, -0.03]), bx(0.04, 0.3, 0.04, 'dark', [0.14, 0.09, 0.02])] },

  // ---- Gren: a greener city
  turbine: { keep: 0.3, seats: [], build: () => [cy(0.05, 0.11, 2.8, 'white', [0, 1.4, 0], { seg: 8 }), bx(0.32, 0.16, 0.16, 'white', [0, 2.85, 0.06]), sp(0.06, 'dark', [0, 2.85, 0.16]),
    ...[0, 1, 2].map((i) => bx(0.07, 1.1, 0.03, 'white', [0, 2.85, 0.17], { pre: [0, 0.58, 0], rz: i * (2 * PI / 3) }))] },
  solarPanel: { keep: 0.6, seats: [], build: () => [bx(1.2, 0.05, 0.8, 'blue', [0, 0.62, 0], { rx: -0.55 }), bx(1.22, 0.02, 0.82, 'metal', [0, 0.59, 0], { rx: -0.55 }), cy(0.03, 0.03, 0.75, 'metal', [-0.45, 0.37, -0.3], { seg: 5 }), cy(0.03, 0.03, 0.75, 'metal', [0.45, 0.37, -0.3], { seg: 5 }), cy(0.03, 0.03, 0.35, 'metal', [-0.45, 0.17, 0.3], { seg: 5 }), cy(0.03, 0.03, 0.35, 'metal', [0.45, 0.17, 0.3], { seg: 5 })] },
  planter: { keep: 0.45, seats: [], build: () => [bx(0.8, 0.4, 0.45, 'wood', [0, 0.2, 0]), bl(0.2, 'leaf', [-0.22, 0.5, 0]), bl(0.17, 'leaf2', [0.1, 0.52, 0.08]), bl(0.15, 'leaf', [0.28, 0.46, -0.1]), sp(0.05, 'pink', [-0.2, 0.68, 0.05]), sp(0.05, 'yellow', [0.12, 0.7, 0.1])] },

  // ---- Nectar: honey
  beehive: { keep: 0.5, seats: [], build: () => [...[0, 1, 2, 3, 4].map((i) => cy(0.44 - i * 0.045, 0.47 - i * 0.045, 0.19, 'straw', [0, 0.095 + i * 0.185, 0], { seg: 12 })), sp(0.16, 'straw', [0, 1.0, 0]), bx(0.14, 0.08, 0.04, 'dark', [0, 0.1, 0.46])] },
  honeyPot: { keep: 0.3, seats: [], build: () => [cy(0.22, 0.18, 0.42, 'honey', [0, 0.21, 0], { seg: 10 }), cy(0.24, 0.24, 0.06, 'wood', [0, 0.45, 0], { seg: 10 }), bx(0.2, 0.14, 0.02, 'cream', [0, 0.22, 0.21]), bx(0.4, 0.03, 0.12, 'cream', [0, 0.48, 0], { ry: 0.3 })] },
  flowerBed: { keep: 0.55, seats: [], build: () => [bx(1.0, 0.12, 0.5, 'brown', [0, 0.06, 0]),
    ...[[-0.38, 0.1, 'yellow'], [-0.2, -0.12, 'pink'], [0, 0.12, 'white'], [0.18, -0.1, 'yellow'], [0.38, 0.08, 'pink'], [0.3, -0.16, 'white']].flatMap(([x, z, c]) => [cy(0.015, 0.015, 0.38, 'leaf', [x, 0.3, z], { seg: 4 }), sp(0.075, c, [x, 0.52, z])])] },
  bee: { keep: 0.0, seats: [], build: () => [bl(0.1, 'yellow', [0, 1.25, 0], { sy: 0.8 }), cy(0.1, 0.1, 0.03, 'dark', [0, 1.25, 0], { rx: H, seg: 8 }), cy(0.085, 0.085, 0.03, 'dark', [0, 1.25, 0.06], { rx: H, seg: 8 }), bx(0.14, 0.01, 0.07, 'glass', [-0.08, 1.32, 0], { rz: 0.3 }), bx(0.14, 0.01, 0.07, 'glass', [0.08, 1.32, 0], { rz: -0.3 })] },

  // ---- Orbite: the launch site
  rocket: { keep: 0.6, seats: [], build: () => [cy(0.5, 0.5, 0.1, 'metal', [0, 0.05, 0], { seg: 12 }), cy(0.12, 0.18, 0.16, 'dark', [0, 0.18, 0], { seg: 8 }), cy(0.22, 0.22, 1.6, 'white', [0, 1.05, 0], { seg: 12 }), cn(0.22, 0.5, 'red', [0, 2.1, 0], { seg: 12 }),
    bx(0.04, 0.5, 0.3, 'red', [0, 0.45, 0], { pre: [0, 0, 0.3], ry: 0 }), bx(0.04, 0.5, 0.3, 'red', [0, 0.45, 0], { pre: [0, 0, 0.3], ry: 2 * PI / 3 }), bx(0.04, 0.5, 0.3, 'red', [0, 0.45, 0], { pre: [0, 0, 0.3], ry: 4 * PI / 3 }), bx(0.12, 0.16, 0.02, 'glass', [0, 1.5, 0.22])] },
  gantry: { keep: 0.4, seats: [], build: () => [...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => cy(0.03, 0.03, 2.5, 'metal', [a * 0.22, 1.25, b * 0.22], { seg: 5 })),
    ...[0.7, 1.5, 2.3].flatMap((y) => [bx(0.5, 0.04, 0.04, 'metal', [0, y, -0.22]), bx(0.5, 0.04, 0.04, 'metal', [0, y, 0.22]), bx(0.04, 0.04, 0.5, 'metal', [-0.22, y, 0]), bx(0.04, 0.04, 0.5, 'metal', [0.22, y, 0])]), bx(0.6, 0.04, 0.2, 'red', [0.45, 2.3, 0])] },
  dish: { keep: 0.3, seats: [], build: () => [cy(0.15, 0.2, 0.3, 'metal', [0, 0.15, 0], { seg: 8 }), cy(0.03, 0.03, 0.6, 'metal', [0, 0.6, 0], { seg: 6 }), cn(0.48, 0.22, 'white', [0, 1.05, 0.05], { rx: -0.95, seg: 10 }), cy(0.015, 0.015, 0.4, 'dark', [0, 1.2, 0.25], { rx: -0.95, seg: 4 })] },

  // ---- Spudos: crisps, naked
  potatoSack: { keep: 0.45, seats: [], build: () => [bl(0.36, 'straw', [0, 0.38, 0], { sy: 1.05 }), cy(0.13, 0.2, 0.14, 'straw', [0, 0.8, 0], { seg: 8 }), cy(0.14, 0.14, 0.04, 'brown', [0, 0.75, 0], { seg: 8 }), bl(0.1, 'brown', [0.42, 0.1, 0.2], { sy: 0.8 }), bl(0.09, 'brown', [0.5, 0.09, -0.1], { sy: 0.8 }), bl(0.08, 'brown', [-0.4, 0.08, 0.25], { sy: 0.8 })] },
  sauceBottles: { keep: 0.35, seats: [], build: () => [bx(0.8, 0.03, 0.32, 'metal', [0, 0.015, 0]), ...[[-0.24, 'red'], [0, 'yellow'], [0.24, 'white']].flatMap(([x, c]) => [cy(0.08, 0.08, 0.42, c, [x, 0.24, 0], { seg: 8 }), cy(0.03, 0.045, 0.1, 'dark', [x, 0.5, 0], { seg: 6 })])] },
  crispPacket: { keep: 0.3, seats: [], build: () => [bx(0.5, 0.75, 0.18, 'yellow', [0, 0.38, 0]), bx(0.52, 0.06, 0.06, 'orange', [0, 0.78, 0]), bx(0.52, 0.22, 0.2, 'red', [0, 0.42, 0]), bx(0.3, 0.1, 0.21, 'cream', [0, 0.42, 0])] },

  // ---- Google app: a market, anywhere
  signpost: { keep: 0.15, seats: [], build: () => [cy(0.04, 0.05, 2.2, 'wood', [0, 1.1, 0], { seg: 6 }),
    ...[[1.95, 0, 'red'], [1.75, 1.4, 'blue'], [1.55, 2.6, 'yellow'], [1.35, 4.2, 'teal']].map(([y, a, c]) => bx(0.7, 0.14, 0.04, c, [0, y, 0], { pre: [0.32, 0, 0], ry: a })),
    ...[[1.95, 0], [1.75, 1.4], [1.55, 2.6], [1.35, 4.2]].map(([y, a]) => cn(0.1, 0.14, 'dark', [0, y, 0], { pre: [0, 0.74, 0], rz: -H, ry: a }))] },
  rickshaw: { keep: 0.65, seats: [[0, -0.1, 0.5, 0]], build: () => [bx(0.7, 0.45, 0.9, 'yellow', [0, 0.45, 0]), bx(0.7, 0.3, 0.3, 'dark', [0, 0.65, -0.25]), bx(0.75, 0.04, 0.95, 'green', [0, 1.05, 0]),
    ...[[-0.33, -0.42], [0.33, -0.42], [-0.33, 0.42], [0.33, 0.42]].map(([x, z]) => cy(0.02, 0.02, 0.4, 'dark', [x, 0.85, z], { seg: 4 })),
    wheel(0.17, 'dark', [-0.38, 0.17, -0.25]), wheel(0.17, 'dark', [0.38, 0.17, -0.25]), wheel(0.17, 'dark', [0, 0.17, 0.5]), bx(0.3, 0.2, 0.04, 'glass', [0, 0.55, 0.46])] },
  spiceStall: { keep: 0.7, seats: [], build: () => [bx(1.1, 0.06, 0.5, 'wood', [0, 0.6, 0]), ...legs4(1.1, 0.5, 0.6, 'wood'),
    ...[[-0.4, 0.1, 'red'], [-0.15, -0.1, 'orange'], [0.1, 0.1, 'yellow'], [0.35, -0.08, 'brown'], [0.42, 0.14, 'green']].flatMap(([x, z, c]) => [cy(0.11, 0.08, 0.1, 'cream', [x, 0.68, z], { seg: 8 }), cn(0.1, 0.14, c, [x, 0.8, z], { seg: 8 })])] },

  // ---- Moodlings: SXSW
  gumMachine: { keep: 0.35, seats: [], build: () => [bx(0.36, 0.5, 0.36, 'red', [0, 0.25, 0]), sp(0.3, 'glass', [0, 0.82, 0]), cy(0.1, 0.12, 0.1, 'red', [0, 1.14, 0], { seg: 8 }), bx(0.12, 0.08, 0.04, 'metal', [0, 0.38, 0.19]),
    ...[[-0.1, 0.72, 0.05, 'pink'], [0.1, 0.7, -0.08, 'blue'], [0, 0.88, 0.1, 'yellow'], [-0.12, 0.9, -0.1, 'teal'], [0.14, 0.9, 0.08, 'red']].map(([x, y, z, c]) => sp(0.07, c, [x, y, z]))] },
  micStand: { keep: 0.25, seats: [], build: () => [cy(0.2, 0.2, 0.04, 'dark', [0, 0.02, 0], { seg: 10 }), cy(0.02, 0.02, 1.4, 'metal', [0, 0.72, 0], { seg: 6 }), cy(0.055, 0.04, 0.22, 'dark', [0, 1.5, 0.1], { rx: 0.6, seg: 8 }), sp(0.065, 'metal', [0, 1.58, 0.16])] },
  stagePlatform: { keep: 1.0, seats: [[-0.5, 0.42, 0.26, 0], [0, 0.42, 0.26, 0], [0.5, 0.42, 0.26, 0]], build: () => [bx(1.6, 0.26, 1.0, 'black', [0, 0.13, 0]), bx(1.62, 0.04, 0.04, 'metal', [0, 0.26, 0.5]), bx(0.04, 0.04, 1.0, 'metal', [-0.81, 0.26, 0]), bx(0.04, 0.04, 1.0, 'metal', [0.81, 0.26, 0])] },

  // ---- The Three Little Pigs and the Camera Coach
  strawHouse: { keep: 0.55, seats: [], build: () => [cy(0.46, 0.5, 0.6, 'straw', [0, 0.3, 0], { seg: 8 }), cn(0.62, 0.52, 'canvas', [0, 0.86, 0], { seg: 8 }), bx(0.2, 0.3, 0.04, 'brown', [0, 0.15, 0.49])] },
  stickHouse: { keep: 0.6, seats: [], build: () => [bx(0.9, 0.7, 0.8, 'wood', [0, 0.35, 0]), ...[0.14, 0.3, 0.46, 0.62].map((y) => bx(0.95, 0.05, 0.85, 'brown', [0, y, 0])), py(1.1, 0.45, 'brown', [0, 0.92, 0]), bx(0.22, 0.32, 0.04, 'dark', [0, 0.16, 0.41])] },
  brickHouse: { keep: 0.7, seats: [], build: () => [bx(1.0, 0.9, 0.9, 'brick', [0, 0.45, 0]), py(1.2, 0.5, 'dark', [0, 1.15, 0]), bx(0.15, 0.36, 0.15, 'brick', [0.3, 1.25, -0.2]), bx(0.25, 0.45, 0.04, 'wood', [0, 0.22, 0.46]), bx(0.2, 0.2, 0.04, 'glass', [-0.3, 0.55, 0.46]), bx(0.2, 0.2, 0.04, 'glass', [0.3, 0.55, 0.46])] },
  tripodPhone: { keep: 0.3, seats: [], build: () => [...[0, 1, 2].map((i) => cy(0.02, 0.02, 1.25, 'dark', [0, 0.62, 0], { pre: [0, 0, 0.0], rx: 0.28, ry: i * 2 * PI / 3, seg: 4 })), cy(0.03, 0.03, 0.2, 'dark', [0, 1.3, 0], { seg: 6 }), bx(0.24, 0.46, 0.03, 'dark', [0, 1.5, 0]), bx(0.2, 0.42, 0.01, 'glass', [0, 1.5, 0.02])] },

  // ---- Apple, Ecosystems: one scene per episode
  deskLaptop: { keep: 0.9, seats: [[0, -0.75, 0.42, 0]], build: () => [bx(1.4, 0.05, 0.8, 'white', [0, 0.72, 0]), ...legs4(1.4, 0.8, 0.72, 'metal', 0.05),
    bx(0.9, 0.03, 0.6, 'metal', [0, 0.76, 0.05]), bx(0.9, 0.58, 0.03, 'metal', [0, 1.04, -0.26], { rx: -0.2 }), bx(0.82, 0.5, 0.01, 'glass', [0, 1.04, -0.24], { rx: -0.2 }), cy(0.08, 0.06, 0.18, 'white', [0.55, 0.84, 0.15], { seg: 8 }),
    bx(0.5, 0.05, 0.5, 'dark', [0, 0.42, -0.75]), bx(0.5, 0.45, 0.05, 'dark', [0, 0.65, -1.0]), cy(0.03, 0.03, 0.42, 'metal', [0, 0.21, -0.75], { seg: 6 }), cy(0.2, 0.2, 0.03, 'metal', [0, 0.015, -0.75], { seg: 8 })] },
  phoneStand: { keep: 0.35, seats: [], build: () => [bx(0.5, 0.06, 0.3, 'metal', [0, 0.03, 0]), bx(0.46, 0.92, 0.05, 'dark', [0, 0.5, -0.05], { rx: -0.15 }), bx(0.4, 0.84, 0.01, 'glass', [0, 0.5, -0.02], { rx: -0.15 }), bx(0.12, 0.03, 0.01, 'dark', [0, 0.9, -0.02], { rx: -0.15 })] },
  earbudsCase: { keep: 0.2, seats: [], build: () => [bx(0.32, 0.22, 0.14, 'white', [0, 0.11, 0]), bx(0.32, 0.12, 0.14, 'white', [0, 0.26, -0.06], { rx: -0.7 }), cy(0.04, 0.04, 0.12, 'white', [-0.07, 0.24, 0.02], { seg: 6 }), cy(0.04, 0.04, 0.12, 'white', [0.07, 0.24, 0.02], { seg: 6 })] },
  watchStand: { keep: 0.3, seats: [], build: () => [cy(0.22, 0.26, 0.05, 'metal', [0, 0.025, 0], { seg: 10 }), cy(0.03, 0.03, 0.9, 'metal', [0, 0.47, 0], { seg: 6 }), bx(0.42, 0.5, 0.12, 'dark', [0, 0.95, 0]), bx(0.36, 0.44, 0.01, 'glass', [0, 0.95, 0.065]), bx(0.3, 0.3, 0.1, 'blue', [0, 1.3, 0]), bx(0.3, 0.3, 0.1, 'blue', [0, 0.6, 0]), cy(0.03, 0.03, 0.06, 'metal', [0.23, 1.0, 0], { rz: H, seg: 6 })] },
  runningShoes: { keep: 0.25, seats: [], build: () => [bl(0.14, 'white', [-0.13, 0.1, 0], { sy: 0.7 }), bl(0.14, 'white', [0.13, 0.1, 0.1], { sy: 0.7 }), bx(0.2, 0.03, 0.3, 'red', [-0.13, 0.02, 0]), bx(0.2, 0.03, 0.3, 'red', [0.13, 0.02, 0.1]), bx(0.06, 0.1, 0.12, 'blue', [-0.13, 0.14, -0.1]), bx(0.06, 0.1, 0.12, 'blue', [0.13, 0.14, 0.0])] },
  tvStand: { keep: 0.7, seats: [], build: () => [bx(1.2, 0.3, 0.4, 'white', [0, 0.15, 0]), bx(1.3, 0.76, 0.05, 'dark', [0, 0.72, -0.1]), bx(1.22, 0.68, 0.01, 'glass', [0, 0.72, -0.07]), bx(0.3, 0.08, 0.08, 'black', [-0.3, 0.34, 0.05]), sp(0.05, 'metal', [0.3, 0.35, 0.05])] },
  sofa: { keep: 0.9, seats: [[-0.42, 0.05, 0.38, 0], [0.42, 0.05, 0.38, 0]], build: () => [bx(1.5, 0.36, 0.65, 'blue', [0, 0.18, 0]), bx(1.5, 0.42, 0.18, 'blue', [0, 0.57, -0.24]), bx(0.16, 0.5, 0.65, 'blue', [-0.67, 0.25, 0]), bx(0.16, 0.5, 0.65, 'blue', [0.67, 0.25, 0]), bx(0.3, 0.3, 0.12, 'yellow', [0.35, 0.5, -0.12], { ry: 0.3 }), ...legs4(1.4, 0.55, 0.08, 'wood', 0.05)] },

  // ---- generic fallbacks, for films without a set of their own (and the trees, which any set may use)
  tree: { keep: 0.45, seats: [[0.55, 0, 0, 0], [-0.55, 0, 0, PI], [0, 0.55, 0, 0], [0, -0.55, 0, PI]], build: () => [cy(0.1, 0.15, 1.1, 'bark', [0, 0.55, 0]), bl(0.95, 'leaf', [0, 1.8, 0]), bl(0.6, 'leaf2', [0.5, 1.5, 0.3]), bl(0.55, 'leaf2', [-0.45, 2.1, -0.2])] },
  conifer: { keep: 0.4, seats: [[0.5, 0, 0, 0], [-0.5, 0, 0, PI]], build: () => [cy(0.09, 0.13, 1.0, 'bark', [0, 0.5, 0]), cn(0.8, 1.3, 'leaf2', [0, 1.35, 0]), cn(0.62, 1.1, 'leaf', [0, 2.0, 0]), cn(0.42, 0.9, 'leaf2', [0, 2.6, 0])] },
  bench: { keep: 1.05, seats: [[-0.6, 0.05, 0.44, 0], [0, 0.05, 0.44, 0], [0.6, 0.05, 0.44, 0]], build: () => [bx(1.8, 0.08, 0.5, 'wood', [0, 0.42, 0]), bx(1.8, 0.4, 0.06, 'wood', [0, 0.7, -0.24]), bx(0.08, 0.42, 0.46, 'dark', [-0.75, 0.21, 0]), bx(0.08, 0.42, 0.46, 'dark', [0.75, 0.21, 0])] },
  deckchair: { keep: 0.55, seats: [[0, 0.12, 0.32, 0]], build: () => { const parts = [bx(0.04, 0.04, 0.72, 'wood', [-0.34, 0.3, 0.02]), bx(0.04, 0.04, 0.72, 'wood', [0.34, 0.3, 0.02]),
      ...[[-0.34, 0.3], [0.34, 0.3], [-0.34, -0.28], [0.34, -0.28]].map(([x, z]) => bx(0.04, 0.3, 0.04, 'wood', [x, 0.15, z]))];
    for (let i = 0; i < 5; i++) parts.push(bx(0.62, 0.03, 0.11, i % 2 ? 'cream' : 'red', [0, 0.33, 0.3 - i * 0.13]));
    for (let i = 0; i < 5; i++) { const t = i * 0.13; parts.push(bx(0.62, 0.03, 0.12, i % 2 ? 'cream' : 'red', [0, 0.36 + t * 0.9, -0.34 - t * 0.45], { rx: -1.1 })); }
    return parts; } },
  lamp: { keep: 0.25, seats: [], build: () => [cy(0.18, 0.22, 0.12, 'dark', [0, 0.06, 0]), cy(0.045, 0.07, 2.7, 'dark', [0, 1.4, 0], { seg: 8 }), bx(0.3, 0.2, 0.3, 'dark', [0, 2.85, 0]), bx(0.24, 0.16, 0.24, 'glass', [0, 2.82, 0])] },
  kiosk: { keep: 1.35, seats: [], build: () => { const parts = [bx(1.6, 1.0, 1.1, 'cream', [0, 0.5, 0]), bx(1.7, 0.08, 1.2, 'dark', [0, 1.04, 0]), bx(0.9, 0.28, 0.08, 'red', [0, 1.3, 0.56]),
      cy(0.04, 0.04, 1.3, 'dark', [-0.82, 1.65, 0.5], { seg: 6 }), cy(0.04, 0.04, 1.3, 'dark', [0.82, 1.65, 0.5], { seg: 6 }), bx(0.32, 0.4, 0.32, 'glass', [0.45, 1.28, 0.05]), bx(0.36, 0.06, 0.36, 'red', [0.45, 1.5, 0.05])];
    for (let i = 0; i < 6; i++) parts.push(bx(0.31, 0.035, 1.0, i % 2 ? 'cream' : 'red', [-0.775 + i * 0.31, 2.25, 0.55], { rx: 0.3 }));
    return parts; } },
  blanket: { keep: 0.0, seats: [[-0.35, 0.05, 0.03, 0.4], [0.25, -0.2, 0.03, -0.6]], build: () => [bx(1.5, 0.03, 1.2, 'blanket', [0, 0.015, 0]), bx(0.3, 0.24, 0.24, 'wood', [0.5, 0.13, 0.35]), bx(0.5, 0.03, 0.5, 'blanket2', [-0.2, 0.03, -0.2])] },
  parasol: { keep: 0.12, seats: [], build: () => [cy(0.03, 0.03, 1.9, 'dark', [0, 0.95, 0], { seg: 6 }), cn(0.95, 0.42, 'canvas', [0, 2.1, 0], { seg: 8 })] },
  bin: { keep: 0.3, seats: [], build: () => [cy(0.22, 0.19, 0.62, 'green', [0, 0.31, 0]), cy(0.24, 0.24, 0.05, 'dark', [0, 0.64, 0])] },
  cone: { keep: 0.22, seats: [], build: () => [bx(0.46, 0.04, 0.46, 'dark', [0, 0.02, 0]), cn(0.2, 0.58, 'red', [0, 0.31, 0], { seg: 8 }), cy(0.13, 0.15, 0.08, 'cream', [0, 0.3, 0], { seg: 8 })] },
  flag: { keep: 0.12, seats: [], build: () => [cy(0.03, 0.03, 2.5, 'dark', [0, 1.25, 0], { seg: 6 }), bx(0.75, 0.4, 0.03, 'red', [0.4, 2.2, 0]), bx(0.75, 0.1, 0.03, 'cream', [0.4, 2.1, 0])] },
};

// ---- Two cows roam the plane (main.js animates them: the head and each leg are separate meshes so they can dip and swing).
// Built facing +z with the origin under the chest, out of spheres and capsules so they are round where a cow is round.
// Each leg hangs from its hip at local (0, 0, 0); the head pivots at the neck (headAt in the group's space).
export function buildCowParts() {
  const cowWhite = '#f1ede4', cowBlack = '#2a2b30', cowPink = '#e2a4ac', horn = '#e8dcc4';
  const el = (rx, ry, rz, hex, at, o) => { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(rx, ry, rz); return mk(g, hex, at, o); };
  const body = [
    el(0.42, 0.4, 0.72, cowWhite, [0, 0.68, 0]),                     // barrel
    el(0.2, 0.24, 0.32, cowBlack, [0.3, 0.76, 0.18]),                // patches: one on the right shoulder
    el(0.2, 0.22, 0.28, cowBlack, [-0.3, 0.68, -0.34]),              // one on the left haunch
    el(0.26, 0.14, 0.34, cowBlack, [0.04, 1.02, -0.08]),             // one over the back
    el(0.14, 0.16, 0.2, cowBlack, [-0.33, 0.58, 0.4]),               // one low on the left shoulder
    el(0.24, 0.24, 0.3, cowWhite, [0, 0.84, 0.6]),                   // neck
    sp(0.15, cowPink, [0, 0.34, -0.3]),                              // udder
    cy(0.02, 0.028, 0.5, cowWhite, [0, 0.82, -0.74], { rx: 0.35 }),  // tail
    sp(0.065, cowBlack, [0, 0.55, -0.82]),                           // its tuft
  ];
  const head = [
    el(0.2, 0.2, 0.26, cowWhite, [0, 0, 0.14]),                      // skull
    el(0.11, 0.18, 0.16, cowBlack, [0.13, 0.04, 0.12]),              // patch over one eye
    el(0.17, 0.13, 0.15, cowPink, [0, -0.08, 0.36]),                 // muzzle
    sp(0.025, cowBlack, [-0.07, -0.09, 0.5]), sp(0.025, cowBlack, [0.07, -0.09, 0.5]),  // nostrils
    sp(0.04, cowBlack, [-0.17, 0.06, 0.2]), sp(0.04, cowBlack, [0.17, 0.06, 0.2]),      // eyes
    el(0.13, 0.03, 0.07, cowWhite, [-0.27, 0.08, 0.02], { rz: 0.3 }), el(0.13, 0.03, 0.07, cowWhite, [0.27, 0.08, 0.02], { rz: -0.3 }), // ears
    cn(0.04, 0.2, horn, [-0.14, 0.24, 0], { rz: 0.8, seg: 6 }), cn(0.04, 0.2, horn, [0.14, 0.24, 0], { rz: -0.8, seg: 6 }),           // horns
  ];
  const leg = (dark) => [mk(new THREE.CapsuleGeometry(0.085, 0.26, 3, 8), dark ? cowBlack : cowWhite, [0, -0.2, 0]), el(0.1, 0.06, 0.1, cowBlack, [0, -0.4, 0])];
  return { body, head, legs: [leg(false), leg(true), leg(false), leg(false)], headAt: [0, 0.98, 0.76], hips: [[0.24, 0.42], [-0.24, 0.42], [0.24, -0.42], [-0.24, -0.42]], hipY: 0.44 };
}
