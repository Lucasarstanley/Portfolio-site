import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FILMS } from './films.js?v=22';
import { SITE } from './site.js?v=2';
import { PROP_SETS, SET_ORDER } from './sets.js?v=4';
import { PROP_KINDS, buildCowParts } from './props.js?v=3';
import * as opentype from 'opentype';

// ============================================================================
// CONFIG. Everything tunable lives here.
// ============================================================================
const CONFIG = {
  // (world.aboutLeft is how many screen widths to the left the About text sits; see world below)
  crowd: {
    count: 150,          // desktop
    mobileCount: 60,     // touch devices
    minCount: 40,        // floor for the automatic thinning
    scaleJitter: 0.10,   // ± per-figure size variation
    tintJitter: 0.12,    // ± per-figure brightness variation
    lieFraction: 0.35,   // share of figures that lie down (rather than sit) when cold
    lapFraction: 0.12,   // share of figures that run laps round the group when excited
  },
  view: {
    figurePx: 28,        // figure height in px on a 1080p-tall window; the view scales with window height
    phoneZoom: 1.5,      // phones (narrow windows): this much closer in, so the figures read as people and the name fills the width
    margin: 0.3,         // world units the crowd keeps from the screen edge
    anchorPull: 1.0,     // where the Work/Contact gathering points sit (1 = at the word)
    startPointer: [-0.9, 0.9], // where the pointer is assumed to be before it moves
  },
  world: {
    // The site is one plane. Home at the origin, Work down the page, Contact one screen to the right.
    workTop: 2.0,        // screen heights down from home where the Work column starts (its view centre)
    contactRight: 2.0,
    aboutLeft: 2.0,      // About is this many screen widths to the left of home   // screen widths to the right for Contact
    glide: 6,            // per second; how fast the view eases to where it is going
    wheelScale: 1.0,     // wheel pixels to page pixels
    farRespawn: 1.6,     // figures further than this many screens away get re-placed just outside the view
  },
  films: {
    narrowBelow: 700,    // px: below this width the column uses the phone arrangement
    narrowWidthFrac: 0.88, // thumbnail width on a phone, as a fraction of the screen
    narrowGap: 0.5,      // screen heights between one film's caption and the next film on a phone
    centreHover: 0.55,   // touch devices: the film whose thumbnail centre is within this many half screen heights of the middle counts as hovered
    loadWithin: 1.6,     // a poster is fetched once its film is within this many screen heights of the camera
    sectionGap: 0.55,    // extra space (in screen heights) before a film that starts a new section, e.g. Short films
    headingGap: 1.5,     // gap between a section heading and the top of its first film, in film half-heights (clear of the props)
    tint: { near: 0.55, colour: 0.5, far: 0.35, sun: 0.3 }, // how far a hovered film's poster colour pulls the haze and sun
    // Thumbnails lie on the floor but are drawn as screen-aligned trapezoids, like a title crawl:
    // top and bottom edges level with the screen, the bottom a little wider than the top.
    widthFrac: 0.40,     // top-edge width on screen as a fraction of the window width
    taper: 0.10,         // the page's perspective: how much wider things are at the bottom of the screen than the top
    squash: 0.80,        // on-screen height relative to the true aspect (1 = undistorted, lower = lying flatter)
    centreX: -0.24,      // thumbnail centre, as a fraction of half the window width (negative = left)
    firstY: 0.3,         // first thumbnail centre, in half screen heights above the Work view centre
    spacing: 1.15,       // between thumbnails, in half screen heights
    textWidth: 0.78,     // caption width as a fraction of the thumbnail width
    textGap: 2.2,        // view units between thumbnail and caption
    lightPull: 0,        // in the Work column the pool of light leans toward the thumbnails (0 = mouse only)
    lightRadius: 1.9,    // pool size there, in screen heights
    exclusion: 3.4,      // keep-out radius around the play button
    lift: 0.03,          // thumbnails sit this far above the floor
  },
  name: {
    text: 'Lucas Stanley',
    widthFrac: 0.36,     // width on screen as a fraction of the window width
    phoneWidthFrac: 0.78, // on a phone
    tapParty: 12,        // touch devices: seconds the party runs after a tap on the name (long enough for the phrase to be spelled)
    welcomeAfter: 2,     // touch devices: seconds after the placards are planted that the party plays once by itself
    height: 0.3,         // extrusion, in figure heights
    fontUrl: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.0/files/inter-latin-600-normal.woff',
    colour: '#10141e',
    pad: 0.6,            // view units of keep-out around the letters
    onShare: 0.16,       // share of the crowd that climbs on and sits when you hover the name
    edgeShare: 0.22,     // share that sits along the edge
    congaCount: 10,
    launcherCount: 3,
    waveSpeed: 1.1,      // radians per second the wave travels round the ring
    waveWidth: 0.45,     // radians of ring jumping at once
    partyRamp: 0.18,
    lookAhead: 2.6,      // units before a detour corner at which a figure starts turning for the next one     // seconds; how fast the party builds once the pointer is on the name (the crowd mood uses mood.smoothing)
    hoverEnter: 0.04,    // margin round the letters (in view half-heights) that starts the hover
    hoverLeave: 0.14,    // wider margin that ends it, so the pointer crossing a gap between letters doesn't flicker
    palette: { work: 0.55, contact: 0.45, cold: 0 },
  },
  fireworks: { everyMin: 2.2, everyMax: 4.5, sparks: 80, height: [5, 8], colours: ['#ff9a3c', '#ff5c5c', '#ff4fa3', '#5aa9ff', '#ffd13c'] },
  contact: { exclusionPad: 1.1 },
  about: { widthFrac: 0.5, exclusionPad: 1.06 },      // the about text on the floor, one screen to the left
  placards: { words: SITE.title.split(' '), height: 1.1, stick: 2.0, gap: 0.9, below: 2.8, after: 0.8 }, // carried in on arrival, planted under the name
  torch: { radius: 0.5, boost: 0.45, words: [0.12, 0.45] },
  nav: { reachNear: 30, reachFar: 220, lean: 7 }, // nav words lean toward the pointer within reachFar px, by up to lean px
  props: { mobileShare: 0.5, seatChance: 0.75, seatReach: 14, seatStay: [25, 70] }, // Work column furniture; figures at rest take a free seat within seatReach // figures inside the light pool (radius in view half-heights) perk up; words brighten within those NDC distances
  camera: { distance: 120, maxPixelRatio: 1.5, mobilePixelRatio: 2 }, // phones render at their own ratio (capped) so floor text stays sharp
  sun: {
    followsMouse: true,  // the mouse is the sun's place in the sky; off = per-mood fixed direction
    edgeElevation: 18,   // degrees above the horizon when the mouse is at the screen edge (low, so shadows rake across the floor)
    edgeAt: 0.9,         // NDC radius at which the sun reaches edgeElevation (where the nav words sit)
    centreElevation: 88, // straight overhead at the centre (kept just off 90 so the shadow camera stays sane)
    distance: 80,
    shadows: true,
    shadowMapSize: 4096,
    shadowRadius: 2.0,   // softness of the shadow edge in texels (PCF only)
  },
  moods: {
    // The floor is a white plane. The haze is a soft pool of light around the mouse on screen:
    // hazeNear tints the floor and figures close to it, hazeFar is the colour it drifts to far away,
    // hazeDark is how much darker the far floor gets, hazeRadius is the pool size in screen heights.
    work: {
      sun: '#fff1dc', sunIntensity: 2.6, elevation: 52, azimuth: -70,
      ambient: '#ffe6c8', ambientIntensity: 0.30,
      hemiSky: '#ffe9d0', hemiGround: '#8a7a68', hemiIntensity: 0.30,
      figure: '#d9c3a3', emissive: 0.0,
      ground: '#ece7de', bloom: 0.30, exposure: 1.0,
      hazeNear: '#fff0d4', hazeFar: '#6a86c4', hazeDark: 0.60, hazeRadius: 1.1, hazeColor: '#4a68a8', hazeStrength: 0.34,
    },
    contact: {
      sun: '#ffb886', sunIntensity: 2.6, elevation: 18, azimuth: 170,
      ambient: '#d8a0b0', ambientIntensity: 0.28,
      hemiSky: '#ffc0c8', hemiGround: '#6a5068', hemiIntensity: 0.30,
      figure: '#d8957c', emissive: 0.0,
      ground: '#e9dfdc', bloom: 0.25, exposure: 1.0,
      hazeNear: '#ffd2b0', hazeFar: '#8070b0', hazeDark: 0.50, hazeRadius: 1.2, hazeColor: '#5a4c90', hazeStrength: 0.34,
    },
    about: {
      sun: '#fff6e0', sunIntensity: 2.3, elevation: 40, azimuth: -150,
      ambient: '#e2ebf0', ambientIntensity: 0.30,
      hemiSky: '#d8e8f4', hemiGround: '#76867a', hemiIntensity: 0.32,
      figure: '#cfd9c6', emissive: 0.0,
      ground: '#eef0ea', bloom: 0.15, exposure: 1.02,
      hazeNear: '#fbf6e6', hazeFar: '#78aea6', hazeDark: 0.52, hazeRadius: 1.25, hazeColor: '#3d7c7e', hazeStrength: 0.34,
    },
    cold: {
      sun: '#d0dcec', sunIntensity: 1.5, elevation: 55, azimuth: 20,
      ambient: '#c0c8d8', ambientIntensity: 0.26,
      hemiSky: '#c8d2e0', hemiGround: '#50586a', hemiIntensity: 0.28,
      figure: '#6b829e', emissive: 0.0,
      ground: '#e2e3e6', bloom: 0.0, exposure: 0.95,
      hazeNear: '#e8e6e2', hazeFar: '#6c80a4', hazeDark: 0.45, hazeRadius: 1.1, hazeColor: '#4c6090', hazeStrength: 0.40,
    },
  },
  mood: {
    smoothing: 0.5,      // seconds; time constant for the crowd/light blend
    falloffPower: 1.5,   // inverse-distance weighting exponent (lower = softer blend between regions)
    coldAnchor: [-0.95, 0.95], // NDC: cold lives top left, where the mouse arrives
    cycleSeconds: 40,    // touch devices: one lap of the virtual pointer round the screen
    cycleRadius: 0.78,   // NDC radius of that lap
    touchHold: 3,        // seconds a touch keeps control after release
    workIdle: { work: 0.55, contact: 0.1, cold: 0.35 }, // in the Work column with nothing hovered: warm but not yet excited
    workHover: { work: 1, contact: 0, cold: 0 },        // hovering a film
    contactArea: { work: 0, contact: 1, cold: 0 },
    aboutArea: { work: 0, contact: 0, cold: 0, about: 1 }, // the crowd rings the about text and jumps, in the about light
  },
  bloom: { enabled: true, threshold: 0.95, radius: 0.5 },
  haze: {
    along: 2.6,          // how far the pool stretches away from the sun, as a multiple of hazeRadius, at the screen edge
    across: 1.4,         // sideways stretch at the screen edge
  },
  gather: {
    near: 0.35,          // pointer within this (NDC, aspect-corrected) of a word: everyone gathers there
    far: 0.9,            // beyond this: nobody runs to the word
    exclusion: 3.2,      // world units around the word the crowd keeps out of
    ringDepth: 8,        // how deep the crowd stands around that circle
    frontSpread: 1.5,    // radians either side of "facing the screen centre" where they stand
  },
  behaviour: {
    walkSpeed: 1.9,
    settleRate: 7,       // per second; how quickly a pinned figure eases onto its mark once it is within the arrival radius
    localRange: 9,       // how far an unexcited or locally excited figure wanders per target
    hypeSpeed: 5.5,
    turnRate: 8,
    accel: 6,
    separation: 1.0,
    restSeparation: 2.4,
    restWander: 6,       // how far a figure will walk to find a spot to sit
    clusterLoose: 12,
    clusterTight: 4.5,
    lapRadius: 3.5,      // added to the cluster radius for the lappers
    lookRadius: 6,
    stateRate: 4,        // per second; how fast walk/jump/cheer blend
    restRate: 1.4,       // per second; sitting down is slower
    restBelow: 0.40,     // personal excitement below this: sit or lie
    hypeAbove: 0.65,     // above this: bounce or cheer
    gaitStride: 1.05,    // world units per full gait cycle (shorter = busier legs)
  },
  cows: {
    count: 0,            // 0 for now; 2 brings the cows back (the full cow version is saved in OUTPUTS/Portfolio site/versions/2026-11-06 cows)
    scale: 0.9,          // a stocky cow about a person's height at the horns
    speed: 0.95,         // ambling
    trot: 7.0,           // a charge: faster than a fleeing person, so it catches someone
    graze: [2, 5],       // seconds head down between walks
    walk: [3, 7],        // seconds per wander
    wander: 7,           // how far a wander goes
    chargeEvery: [4, 10], chargeLasts: 5.5, chargeReach: 18, // how often, how long, how far it will look for someone
    pawFor: 0.9,         // seconds of pawing the ground, head down, before it goes
    chaseGiveUp: 7,      // a victim this far ahead is swapped for the nearest other person
    fearRadius: 2.6,     // people this close drop what they are doing and run (wider in front of a charge)
    fearHold: 1.6,       // seconds they keep running after the cow is behind them
    ambleFear: 0.45,     // of fearRadius: an ambling cow is not noticed until it is nearly on you
    riseDelay: 0.55,     // seconds a sitter or lier takes to get up before running, which is how an ambling cow catches one
    knockRadius: 0.8,    // run into by a moving cow this close: bowled over
    downFor: 1.5,        // seconds flat on the ground before getting up and running
    fleeDist: 4.5,
    fleeSpeed: 0.9,      // of a sprint: panic is not efficient
    bodyKeep: 0.9,       // added to every keep-out: a cow is wider than a person
    nameMargin: 1.4,     // the name and the spelling stay cow-free
    lookRadius: 7,       // a cow turns its head toward a pointer this near
  },
  perf: { thinAboveMs: 33, windowSeconds: 2, thinFactor: 0.8, warmupSeconds: 3 },
  vignettes: {
    everyMin: 22, everyMax: 40,                       // seconds between bits of business at home
    follower: { distance: 2.6 },                      // one figure keeps this close to the cursor
    queue: { count: 12, spacing: 0.9, step: 0.5, duration: 26 },
    photo: { rows: 3, perRow: 8, spacing: 1.05, rowGap: 1.15, hold: 14 },
    dominoes: { count: 16, spacing: 0.85, delay: 0.16 },
    trip: { everyMin: 18, everyMax: 32, down: 9 },    // Work: someone trips over a thumbnail edge
    huddle: { share: 0.3, coldAbove: 0.7, rotateEvery: 4, everyMin: 35, everyMax: 70, lasts: 28 }, // now that cold is the resting state, the huddle is an occasional vignette
    spell: { layouts: ["HE'S PRETTY\nGOOD", "HE'S\nPRETTY\nGOOD", "HE'S\nGOOD"], legible: 2.8, tight: 0.6, maxDist: 1.7, settle: 7, place: 4, after: 0, crossPenalty: 400, height: 7, gap: 2.5, margin: 2, widthFrac: 0.78, minDist: 1.0 }, // spelled above the name; height is the letter height in world units, shrunk to fit width, room and crowd
    applause: { radius: 16, seconds: [3.5, 5] },
    congaMax: 30,
  },
};

// ============================================================================
// Environment
// ============================================================================
const params = new URLSearchParams(location.search);
const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches || params.has('touch');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('still');
const debugEl = document.getElementById('debug');
const debug = params.has('debug');
if (debug) debugEl.hidden = false;

const useBloom = CONFIG.bloom.enabled && !isTouch && !params.has('nobloom');
const useShadows = CONFIG.sun.shadows && !isTouch && !params.has('noshadows');
const sunFollowsMouse = params.has('nofollow') ? false : CONFIG.sun.followsMouse;
let activeCount = isTouch ? CONFIG.crowd.mobileCount : CONFIG.crowd.count;
if (params.has('count')) activeCount = parseInt(params.get('count'), 10) || activeCount;
const TOTAL = activeCount;

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const aspectRatio = () => (innerWidth > 0 && innerHeight > 0 ? innerWidth / innerHeight : 16 / 9);
const isNarrow = () => innerWidth > 0 && (innerWidth < CONFIG.films.narrowBelow || aspectRatio() < 0.9); // a phone, or a portrait window: the phone arrangement
const films = FILMS.filter((f) => f.public);

// ============================================================================
// Renderer, scene, camera
// ============================================================================
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const pixelRatio = Math.min(devicePixelRatio || 1, isTouch ? CONFIG.camera.mobilePixelRatio : CONFIG.camera.maxPixelRatio);
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = useShadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 400);
const camD = CONFIG.camera.distance / Math.sqrt(3);
camera.position.set(camD, camD, camD); // true isometric: equal on all three axes
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();

// Ground (x, z) <-> view (vx, vy) is a fixed affine map for an ortho camera. View coordinates are
// absolute (the camera's own offset is `cam`); everything about the visible area goes through it.
const G2V = (() => {
  const o = new THREE.Vector3(0, 0, 0).applyMatrix4(camera.matrixWorldInverse);
  const ax = new THREE.Vector3(1, 0, 0).applyMatrix4(camera.matrixWorldInverse).sub(o);
  const az = new THREE.Vector3(0, 0, 1).applyMatrix4(camera.matrixWorldInverse).sub(o);
  const m = [ax.x, az.x, ax.y, az.y]; // [[a b][c d]] : vx = a x + b z ; vy = c x + d z
  const det = m[0] * m[3] - m[1] * m[2];
  const inv = [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
  return { m, inv };
})();
const toView = (x, z) => [G2V.m[0] * x + G2V.m[1] * z, G2V.m[2] * x + G2V.m[3] * z];
const fromView = (vx, vy) => [G2V.inv[0] * vx + G2V.inv[1] * vy, G2V.inv[2] * vx + G2V.inv[3] * vy];
const SCREEN_RIGHT = (() => { const [x, z] = fromView(1, 0); const l = Math.hypot(x, z); return [x / l, z / l]; })();
const SCREEN_UP = (() => { const [x, z] = fromView(0, 1); const l = Math.hypot(x, z); return [x / l, z / l]; })();

const view = { halfW: 1, halfH: 1, boundW: 1, boundH: 1, worldRadius: 10, pxPerUnit: 24 };
// Where the camera is looking, in view units, and where it is going
const cam = { x: 0, y: 0, tx: 0, ty: 0, wx: 0, wz: 0, area: 'home' };
const camWorld = new THREE.Vector3();

function fitCamera() {
  const aspect = aspectRatio();
  view.halfH = (540 * Math.cos(Math.atan(1 / Math.SQRT2))) / (CONFIG.view.figurePx * (isNarrow() ? CONFIG.view.phoneZoom : 1));
  view.halfW = view.halfH * aspect;
  view.boundW = view.halfW - CONFIG.view.margin;
  view.boundH = view.halfH - CONFIG.view.margin;
  view.pxPerUnit = innerHeight > 0 ? innerHeight / (2 * view.halfH) : 24;
  camera.left = -view.halfW; camera.right = view.halfW; camera.top = view.halfH; camera.bottom = -view.halfH;
  camera.updateProjectionMatrix();
  let r = 0;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) { const [x, z] = fromView(sx * view.halfW, sy * view.halfH); r = Math.max(r, Math.hypot(x, z)); }
  view.worldRadius = r + 2;
  const sc = sun.shadow.camera;
  sc.left = -view.worldRadius; sc.right = view.worldRadius; sc.top = view.worldRadius; sc.bottom = -view.worldRadius;
  sc.near = 1; sc.far = CONFIG.sun.distance + view.worldRadius * 2;
  sc.updateProjectionMatrix();
}

// Screen position (NDC) of a ground point under the current view
function groundToNdc(x, z) {
  const [vx, vy] = toView(x, z);
  return [(vx - cam.x) / view.halfW, (vy - cam.y) / view.halfH];
}
const ndcToGround = (nx, ny) => fromView(cam.x + nx * view.halfW, cam.y + ny * view.halfH);
const inBounds = (x, z) => { const [nx, ny] = groundToNdc(x, z); return Math.abs(nx) * view.halfW <= view.boundW && Math.abs(ny) * view.halfH <= view.boundH; };
function clampToBounds(a) {
  const [vx, vy] = toView(a.x, a.z);
  const dx = vx - cam.x, dy = vy - cam.y;
  if (Math.abs(dx) <= view.boundW && Math.abs(dy) <= view.boundH) return;
  const [x, z] = fromView(cam.x + clamp(dx, -view.boundW, view.boundW), cam.y + clamp(dy, -view.boundH, view.boundH));
  a.x = x; a.z = z;
}
const randomPoint = () => fromView(cam.x + rand(-view.boundW, view.boundW), cam.y + rand(-view.boundH, view.boundH));

function applyCamera() {
  const [wx, wz] = fromView(cam.x, cam.y);
  cam.wx = wx; cam.wz = wz;
  camWorld.set(wx, 0, wz);
  camera.position.set(wx + camD, camD, wz + camD);
  camera.lookAt(camWorld);
  camera.updateMatrixWorld();
  ground.position.set(wx, 0, wz);
  sun.target.position.copy(camWorld);
  cam.area = cam.x > view.halfW ? 'contact' : cam.x < -view.halfW ? 'about' : cam.y < -view.halfH ? 'work' : 'home';
}

// ============================================================================
// Haze: a pool of light around the (smoothed) pointer, stretched along the sun's direction
// ============================================================================
const hazeUniforms = {
  uHazeCentre: { value: new THREE.Vector2(0, 0) },      // NDC
  uResolution: { value: new THREE.Vector2(1, 1) },      // drawing buffer pixels
  uAspect: { value: 16 / 9 },
  uHazeNear: { value: new THREE.Color(1, 1, 1) },
  uHazeFar: { value: new THREE.Color(0.5, 0.6, 0.8) },
  uHazeDark: { value: 0.5 },
  uHazeRadius: { value: 1.3 },
  uHazeColor: { value: new THREE.Color(0.3, 0.4, 0.7) },
  uHazeStrength: { value: 0.3 },
  uHazeDir: { value: new THREE.Vector2(0, 1) },         // screen direction from centre toward the sun
  uHazeStretch: { value: 0 },                           // 0 at centre (circle), 1 at the edge (long beam)
  uHazeAlong: { value: CONFIG.haze.along },
  uHazeAcross: { value: CONFIG.haze.across },
};
const HAZE_FRAGMENT_HEAD = /* glsl */`
uniform vec2 uHazeCentre; uniform vec2 uResolution; uniform float uAspect;
uniform vec3 uHazeNear; uniform vec3 uHazeFar; uniform float uHazeDark; uniform float uHazeRadius;
uniform vec3 uHazeColor; uniform float uHazeStrength;
uniform vec2 uHazeDir; uniform float uHazeStretch; uniform float uHazeAlong; uniform float uHazeAcross;
float hazeAmount() {
  vec2 sc = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  vec2 d = sc - uHazeCentre; d.x *= uAspect;
  float along = dot(d, -uHazeDir);                       // positive = away from the sun, across the screen
  float across = abs(dot(d, vec2(-uHazeDir.y, uHazeDir.x)));
  float rAlong = uHazeRadius * mix(1.0, uHazeAlong, uHazeStretch);
  float rAcross = uHazeRadius * mix(1.0, uHazeAcross, uHazeStretch);
  float a = along > 0.0 ? along / rAlong : -along / uHazeRadius;
  float b = across / rAcross;
  return smoothstep(0.0, 1.0, sqrt(a * a + b * b));
}
`;
// One vanishing point for the page: everything lying on it narrows toward the top centre of the
// screen, like a title crawl. Applied in clip space so it holds while scrolling.
const crawlUniforms = { uCrawl: { value: CONFIG.films.taper } };
const crawlScale = (ndcY) => 1 + CONFIG.films.taper * (-ndcY) * 0.5; // x scale at a screen height
function patchCrawl(shader) {
  shader.uniforms.uCrawl = crawlUniforms.uCrawl;
  shader.vertexShader = 'uniform float uCrawl;\n' + shader.vertexShader
    .replace('#include <project_vertex>', '#include <project_vertex>\n gl_Position.x *= 1.0 + uCrawl * (-gl_Position.y / gl_Position.w) * 0.5;');
}
function patchHaze(shader, { albedo, strength }) {
  Object.assign(shader.uniforms, hazeUniforms);
  let f = HAZE_FRAGMENT_HEAD + shader.fragmentShader;
  if (albedo) f = f.replace('#include <color_fragment>', `#include <color_fragment>
    { float h = hazeAmount(); diffuseColor.rgb *= mix(uHazeNear, uHazeFar, h) * mix(1.0, uHazeDark, h); }`);
  f = f.replace('#include <opaque_fragment>', `#include <opaque_fragment>
    { float h = hazeAmount(); gl_FragColor.rgb = mix(gl_FragColor.rgb, uHazeColor, h * uHazeStrength * ${strength.toFixed(2)}); }`);
  shader.fragmentShader = f;
}

// ============================================================================
// Ground: a plane big enough that its edges never show; it follows the camera
// ============================================================================
const groundMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 1.0, metalness: 0 });
groundMat.onBeforeCompile = (shader) => patchHaze(shader, { albedo: true, strength: 1.0 });
groundMat.customProgramCacheKey = () => 'groundHaze';
const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ============================================================================
// Lights
// ============================================================================
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = useShadows;
sun.shadow.mapSize.set(CONFIG.sun.shadowMapSize, CONFIG.sun.shadowMapSize);
sun.shadow.bias = -0.0002;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = CONFIG.sun.shadowRadius;
scene.add(sun, sun.target);

const ambient = new THREE.AmbientLight(0xffffff, 0.1);
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.2);
scene.add(ambient, hemi);

// ============================================================================
// Figure geometry: one continuous low-poly humanoid, built in code.
// aPart tags each vertex: 0 body, 1 left leg, 2 right leg, 3 left arm, 4 right arm.
// ============================================================================
function tagPart(geo, id) {
  const n = geo.attributes.position.count;
  geo.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(n).fill(id), 1));
  return geo;
}

function buildFigureGeometry() {
  const parts = [];
  const profile = [
    [0.00, 0.30], [0.12, 0.33], [0.17, 0.42], [0.19, 0.55], [0.17, 0.68],
    [0.12, 0.76], [0.095, 0.80], [0.13, 0.86], [0.16, 0.94], [0.14, 1.01],
    [0.07, 1.05], [0.00, 1.06],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  parts.push(tagPart(new THREE.LatheGeometry(profile, 12), 0));
  const leg = (side, id) => { const g = new THREE.CapsuleGeometry(0.085, 0.30, 3, 8); g.translate(side * 0.10, 0.30, 0); return tagPart(g, id); };
  const arm = (side, id) => { const g = new THREE.CapsuleGeometry(0.06, 0.26, 3, 7); g.translate(side * 0.25, 0.55, 0); return tagPart(g, id); };
  parts.push(leg(1, 1), leg(-1, 2), arm(1, 3), arm(-1, 4));
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// ============================================================================
// Vertex-shader animation, shared by the lit material and the shadow depth material
// ============================================================================
const figureUniforms = { uTime: { value: 0 } };

const FIGURE_VERTEX_HEAD = /* glsl */`
uniform float uTime;
attribute float aPart;
attribute float aPhase;   // personal random offset
attribute float aGait;    // accumulated gait phase, driven by distance walked
attribute vec4 aState;    // sit, walk, jump, cheer
attribute float aLie;
attribute float aArms;    // arms straight out sideways (holding hands)
const float HIP_Y = 0.52;
const float SHOULDER_Y = 0.70;
mat3 rotX(float a) { float c = cos(a); float s = sin(a); return mat3(1.0, 0.0, 0.0,  0.0, c, s,  0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a); float s = sin(a); return mat3(c, s, 0.0,  -s, c, 0.0,  0.0, 0.0, 1.0); }

void poseFigure(in vec3 p, in vec3 n, out vec3 op, out vec3 on) {
  float sit = aState.x; float walk = aState.y; float jump = aState.z; float cheer = aState.w; float lie = aLie;
  float t = uTime + aPhase * 6.2831853;
  float legL = step(0.5, aPart) * step(aPart, 1.5);
  float legR = step(1.5, aPart) * step(aPart, 2.5);
  float armL = step(2.5, aPart) * step(aPart, 3.5);
  float armR = step(3.5, aPart);
  float isLeg = legL + legR;
  float isArm = armL + armR;
  float isBody = 1.0 - isLeg - isArm;
  float side = legL + armL - legR - armR;

  float gait = sin(aGait);
  float jc = sin(t * 7.5);
  float air = max(jc, 0.0) * jump;
  float cheerBeat = sin(t * 8.0 + side * 0.9);

  vec3 q = p; vec3 m = n;
  if (isLeg > 0.5) {
    float a = gait * 0.75 * side * walk;  // swing, longer at speed
    a = mix(a, -1.5, sit);                // legs out front when sitting
    a -= air * 0.7;                       // tuck in the air
    mat3 R = rotX(a);
    vec3 pv = vec3(side * 0.10, HIP_Y, 0.0);
    q = R * (q - pv) + pv; m = R * m;
  }
  if (isArm > 0.5) {
    float ax = -gait * 0.6 * side * walk; // counter-swing
    ax -= sit * 0.5;                      // rest on the lap
    float az = side * ((2.4 + cheerBeat * 0.7) * cheer + air * 2.2 + 1.5 * aArms);
    mat3 R = rotZ(az) * rotX(ax);
    vec3 pv = vec3(side * 0.25, SHOULDER_Y, 0.0);
    q = R * (q - pv) + pv; m = R * m;
  }
  if (isBody > 0.5) {
    mat3 R = rotX(sit * 0.28 + walk * 0.08);  // slump when sitting, lean into the walk
    vec3 pv = vec3(0.0, HIP_Y, 0.0);
    q = R * (q - pv) + pv; m = R * m;
  }
  // whole body
  q.y += sin(t * 1.6) * 0.006;                       // breathing
  q.y += abs(gait) * 0.05 * walk;                    // bob
  q.y += max(cheerBeat, 0.0) * 0.16 * cheer;         // hop while cheering
  { mat3 R = rotZ(sin(t * 4.1) * 0.16 * cheer); q = R * q; m = R * m; }
  q.y -= sit * (HIP_Y - 0.10);                       // pelvis to the ground
  float st = 1.0 + jc * 0.28 * jump;                 // stretch going up, squash landing
  q.y *= st; q.xz *= inversesqrt(st);
  q.y += air * 1.2;                                  // the jump itself
  { mat3 R = rotX(-1.5); vec3 ql = R * q; ql.y += 0.19; ql.z += 0.10; q = mix(q, ql, lie); m = normalize(mix(m, R * m, lie)); }
  op = q; on = m;
}
`;

function patchFigureShader(shader) {
  shader.uniforms.uTime = figureUniforms.uTime;
  shader.vertexShader = FIGURE_VERTEX_HEAD + shader.vertexShader
    .replace('#include <beginnormal_vertex>', 'vec3 objectNormal; { vec3 _p; poseFigure(position, normal, _p, objectNormal); }')
    .replace('#include <begin_vertex>', 'vec3 transformed; { vec3 _n; poseFigure(position, normal, transformed, _n); }');
}

const figureMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, emissive: 0x000000 });
figureMat.onBeforeCompile = (shader) => { patchFigureShader(shader); patchHaze(shader, { albedo: false, strength: 0.8 }); };
figureMat.customProgramCacheKey = () => 'figure';
const figureDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
figureDepth.onBeforeCompile = patchFigureShader;
figureDepth.customProgramCacheKey = () => 'figureDepth';

// ============================================================================
// Crowd: one InstancedMesh with per-instance attributes
// ============================================================================
const figureGeo = buildFigureGeometry();
const stateArr = new Float32Array(TOTAL * 4);
const lieArr = new Float32Array(TOTAL);
const phaseArr = new Float32Array(TOTAL);
const gaitArr = new Float32Array(TOTAL);
const armsArr = new Float32Array(TOTAL);
const stateAttr = new THREE.InstancedBufferAttribute(stateArr, 4);
const lieAttr = new THREE.InstancedBufferAttribute(lieArr, 1);
const phaseAttr = new THREE.InstancedBufferAttribute(phaseArr, 1);
const gaitAttr = new THREE.InstancedBufferAttribute(gaitArr, 1);
const armsAttr = new THREE.InstancedBufferAttribute(armsArr, 1);
for (const a of [stateAttr, lieAttr, gaitAttr, armsAttr]) a.setUsage(THREE.DynamicDrawUsage);
figureGeo.setAttribute('aState', stateAttr);
figureGeo.setAttribute('aLie', lieAttr);
figureGeo.setAttribute('aPhase', phaseAttr);
figureGeo.setAttribute('aGait', gaitAttr);
figureGeo.setAttribute('aArms', armsAttr);

const crowd = new THREE.InstancedMesh(figureGeo, figureMat, TOTAL);
crowd.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
crowd.castShadow = useShadows;
crowd.receiveShadow = useShadows;
crowd.customDepthMaterial = figureDepth;
crowd.frustumCulled = false;
scene.add(crowd);

// ============================================================================
// Work column: thumbnails and text lying on the floor, a play button over each
// ============================================================================
const textureLoader = new THREE.TextureLoader();
const filmItems = []; // { film, cx, cz, W, H, mesh, textMesh, button, zMin, zMax, xMin, xMax }
const playsEl = document.getElementById('plays');

// A screen-aligned trapezoid lying on the floor. Given in absolute view units: centre, top width,
// bottom width and height. Subdivided so the texture follows the taper smoothly.
function trapezoidMesh(vcx, vcy, wTop, wBottom, h, material, lift, segX = 24, segY = 12) {
  const pos = [], uv = [], idx = [], nrm = [];
  for (let j = 0; j <= segY; j++) {
    const t = j / segY;
    const vy = vcy + h / 2 - t * h;
    const w = mix(wTop, wBottom, t);
    for (let i = 0; i <= segX; i++) {
      const sx = i / segX;
      const [x, z] = fromView(vcx - w / 2 + sx * w, vy);
      pos.push(x, lift, z); uv.push(sx, 1 - t); nrm.push(0, 1, 0);
    }
  }
  for (let j = 0; j < segY; j++) for (let i = 0; i < segX; i++) {
    const a = j * (segX + 1) + i, b = a + 1, c = a + segX + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  material.side = THREE.DoubleSide;
  return new THREE.Mesh(g, material);
}

function makeTextTexture(film, widthUnits) {
  const W = 1024;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = (px, weight) => `${weight} ${px}px Inter, "Helvetica Neue", Arial, sans-serif`;
  const wrap = (text, px, weight, maxW) => {
    ctx.font = font(px, weight);
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };
  // measure
  const pad = 8;
  const titleL = wrap(film.title, 60, 600, W - pad * 2);
  const metaL = wrap([film.client, film.year, film.status].filter(Boolean).join('  ·  '), 30, 500, W - pad * 2);
  const lineL = wrap(film.line, 40, 400, W - pad * 2);
  const noteL = wrap(film.note, 30, 400, W - pad * 2);
  const H = Math.ceil(pad + titleL.length * 70 + 10 + metaL.length * 40 + 26 + lineL.length * 52 + 18 + noteL.length * 42 + pad);
  c.width = W; c.height = H;
  ctx.clearRect(0, 0, W, H);
  let y = pad;
  const draw = (lines, px, weight, lh, color) => {
    ctx.font = font(px, weight); ctx.fillStyle = color; ctx.textBaseline = 'top';
    for (const l of lines) { ctx.fillText(l, pad, y); y += lh; }
  };
  draw(titleL, 60, 600, 70, '#10141e'); y += 10;
  draw(metaL, 30, 500, 40, 'rgba(16,20,30,0.6)'); y += 26;
  draw(lineL, 40, 400, 52, '#10141e'); y += 18;
  draw(noteL, 30, 400, 42, 'rgba(16,20,30,0.78)');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return { tex, aspect: H / W };
}

// The poster's dominant colour: a small downsample, averaged with saturated pixels counting most
const tintCanvas = document.createElement('canvas');
function posterColour(img) {
  try {
    const n = 24; tintCanvas.width = n; tintCanvas.height = n;
    const ctx = tintCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, n, n);
    const d = ctx.getImageData(0, 0, n, n).data;
    let r = 0, g = 0, b = 0, wsum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
      const w = 0.15 + (mx - mn) * 2 + mx * 0.3; // saturated and bright pixels count most
      r += R * w; g += G * w; b += B * w; wsum += w;
    }
    const c = new THREE.Color(r / wsum, g / wsum, b / wsum);
    const hsl = {}; c.getHSL(hsl);
    return c.setHSL(hsl.h, Math.min(0.75, hsl.s * 1.4 + 0.1), clamp(hsl.l, 0.45, 0.7)); // lift it towards a usable light colour
  } catch (e) { return null; }
}
// A small floor heading in the nav words' style, for a section of the column
function makeHeadingTexture(text) {
  const W = 1024, H = 110;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.font = '500 58px Inter, "Helvetica Neue", Arial, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '16px';
  ctx.fillStyle = 'rgba(16,20,30,0.7)'; ctx.textBaseline = 'top';
  ctx.fillText(text.toUpperCase(), 4, 24);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { tex, aspect: H / W };
}
const sectionMeshes = [];
const sectionY = {}; // view y to scroll to for each section heading
function buildWorkColumn() {
  for (const it of filmItems) {
    scene.remove(it.mesh); scene.remove(it.textMesh); it.mesh.geometry.dispose(); it.textMesh.geometry.dispose(); it.button.remove();
    it.mesh.material.dispose(); it.textMesh.material.map.dispose(); it.textMesh.material.dispose(); // posters stay cached; captions are redrawn
  }
  filmItems.length = 0;
  for (const m of sectionMeshes) { scene.remove(m); m.geometry.dispose(); m.material.map.dispose(); m.material.dispose(); }
  sectionMeshes.length = 0;
  const F = CONFIG.films;
  const narrow = isNarrow(); // phones: thumbnail full width, caption underneath
  const wTop = (narrow ? F.narrowWidthFrac : F.widthFrac) * 2 * view.halfW;
  const wBottom = wTop * (1 + F.taper);
  const workCentreY = -CONFIG.world.workTop * view.halfH;
  let nextY = workCentreY + F.firstY * view.halfH, section = null, lastBottom = workCentreY;
  view.narrow = narrow;
  films.forEach((film, i) => {
    const portrait = /mr-tired|piggies/.test(film.id);
    const landscapeH = wTop * (9 / 16) * F.squash;
    const h = landscapeH;                                 // every film gets the same height on screen
    const wt = portrait ? h / F.squash * (9 / 16) : wTop; // portrait films are narrower
    const wb = wt;
    const vcx = narrow ? 0 : F.centreX * view.halfW;
    if (film.section && film.section !== section) { // a new section: a wider gap and a heading over the first film
      section = film.section;
      nextY -= F.sectionGap * view.halfH;
      const hw = wTop * 0.5, { tex: htex, aspect: ha } = makeHeadingTexture(section);
      const hmat = new THREE.MeshBasicMaterial({ map: htex, transparent: true, depthWrite: false });
      hmat.onBeforeCompile = (shader) => { patchHaze(shader, { albedo: false, strength: 0.9 }); patchCrawl(shader); };
      hmat.customProgramCacheKey = () => 'floorText';
      const hh = hw * ha;
      const hmesh = trapezoidMesh(vcx - wTop / 2 + hw / 2, nextY + h / 2 + F.headingGap * (h / 2) + hh / 2, hw, hw, hh, hmat, F.lift + 0.02, 2, 2);
      scene.add(hmesh); sectionMeshes.push(hmesh);
      sectionY[section] = nextY + 0.5 * view.halfH; // the heading near the top of the screen
    }
    const vcy = nextY;
    const [cx, cz] = fromView(vcx, vcy);

    // the poster loads when the column comes near (see loadPostersNear); the material starts bare
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a9aa0, roughness: 0.9, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.0 });
    mat.onBeforeCompile = (shader) => { patchHaze(shader, { albedo: false, strength: 0.6 }); patchCrawl(shader); };
    mat.customProgramCacheKey = () => 'poster';
    const mesh = trapezoidMesh(vcx, vcy, wt, wb, h, mat, F.lift);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // caption: to the right with top edges level, or underneath on a phone
    const textW = narrow ? wt : wTop * F.textWidth;
    const { tex: ttex, aspect } = makeTextTexture(film, textW);
    const tmat = new THREE.MeshBasicMaterial({ map: ttex, transparent: true, depthWrite: false });
    tmat.onBeforeCompile = (shader) => { patchHaze(shader, { albedo: false, strength: 0.9 }); patchCrawl(shader); };
    tmat.customProgramCacheKey = () => 'floorText';
    const th = textW * aspect;
    const tvcx = narrow ? vcx : vcx + wb / 2 + F.textGap + textW / 2;
    const tvcy = narrow ? vcy - h / 2 - F.textGap * 0.5 - th / 2 : vcy + h / 2 - th / 2;
    lastBottom = Math.min(vcy - h / 2, tvcy - th / 2);
    nextY -= narrow ? (h + F.textGap * 0.5 + th + F.narrowGap * view.halfH) : F.spacing * view.halfH;
    const textMesh = trapezoidMesh(tvcx, tvcy, textW, textW, th, tmat, F.lift + 0.02, 2, 2);
    scene.add(textMesh);

    const button = document.createElement('button');
    button.className = 'play';
    button.type = 'button';
    button.setAttribute('aria-label', `Play ${film.title}`);
    button.hidden = true;
    button.addEventListener('click', () => openPlayer(film));
    button.addEventListener('pointerenter', () => { hoverFilm = film; });
    button.addEventListener('pointerleave', () => { if (hoverFilm === film) hoverFilm = null; });
    playsEl.appendChild(button);

    const [tcx, tcz] = fromView(tvcx, tvcy); // on a phone the caption gets a keep-out circle of its own, covering its corners (the view squashes world y)
    filmItems.push({ film, cx, cz, mesh, textMesh, button, vcx, vcy, halfW: wb / 2, halfH: h / 2, captionBottom: (tvcy - th / 2 - vcy) / (h / 2), posterLoaded: false, tcx, tcz, tkeep: narrow ? Math.hypot(textW / 2, (th / 2) / Math.cos(Math.atan(1 / Math.SQRT2))) + 0.3 : 0, keep: narrow ? Math.max(F.exclusion, wt / 2 + 0.5) : F.exclusion }); // on a phone the keep-out covers the full-width poster
    if (posterTextures.has(film.id)) applyPoster(filmItems[filmItems.length - 1]);
  });
  cam.minY = Math.min(workCentreY, filmItems.length ? lastBottom + 0.85 * view.halfH : workCentreY); // the last caption's bottom clears the screen edge
  buildProps();
}

// Posters: fetched once, kept across rebuilds, and only when a film is within reach of the camera
const posterTextures = new Map();
function applyPoster(it) {
  const tex = posterTextures.get(it.film.id);
  it.mesh.material.map = tex; it.mesh.material.emissiveMap = tex; it.mesh.material.emissiveIntensity = 0.35;
  it.mesh.material.color.set(0xffffff); it.mesh.material.needsUpdate = true; it.posterLoaded = true;
}
function loadPostersNear() {
  for (const it of filmItems) {
    if (it.posterLoaded || Math.abs(it.vcy - cam.y) > CONFIG.films.loadWithin * view.halfH) continue;
    it.posterLoaded = true; // claimed; applied when the image arrives
    if (posterTextures.has(it.film.id)) { applyPoster(it); continue; }
    const tex = textureLoader.load(it.film.poster, (t) => { it.film.tint = posterColour(t.image); posterTextures.set(it.film.id, t); const cur = filmItems.find((f) => f.film === it.film); if (cur) applyPoster(cur); });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
}

// Which film's thumbnail is under a view-space point
function filmUnderView(vx, vy) {
  for (const it of filmItems) if (Math.abs(vx - it.vcx) <= it.halfW && Math.abs(vy - it.vcy) <= it.halfH) return it.film;
  return null;
}
// Touch devices have no hover: the film whose thumbnail is nearest the middle of the screen is the one being looked at
function filmNearCentre() {
  let best = null, bd = CONFIG.films.centreHover * view.halfH;
  for (const it of filmItems) { const d = Math.abs(it.vcy - cam.y); if (d < bd) { bd = d; best = it.film; } }
  return best;
}
// The film under a point on the screen (NDC), if any
function filmAtNdc(px, py) {
  return cam.area === 'work' ? filmUnderView(cam.x + (px / crawlScale(py)) * view.halfW, cam.y + py * view.halfH) : null;
}

function placePlays() {
  for (const it of filmItems) {
    const [nx, ny] = groundToNdc(it.cx, it.cz);
    const visible = Math.abs(nx) < 1.2 && Math.abs(ny) < 1.2;
    it.button.hidden = !visible;
    if (visible) { // left/top, not transform: transform carries the hover scale and a transition, which would make the position trail the film
      it.button.style.left = `${((nx * crawlScale(ny) + 1) / 2) * innerWidth}px`;
      it.button.style.top = `${((1 - ny) / 2) * innerHeight}px`;
    }
  }
}

// ============================================================================
// Props along the Work column: low-poly furniture built from primitives, one InstancedMesh per kind,
// vertex-coloured, casting shadows. Each kind has a keep-out radius and seats the crowd can take.
// ============================================================================
// The catalogue of kinds lives in props.js
const propMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
propMat.onBeforeCompile = (shader) => patchHaze(shader, { albedo: true, strength: 0.9 });
propMat.customProgramCacheKey = () => 'prop';
const propGeos = {};
for (const [k, def] of Object.entries(PROP_KINDS)) propGeos[k] = mergeGeometries(def.build(), false);
const propMeshes = {};          // kind -> InstancedMesh
const propKeepOuts = [];        // [x, z, r, propIndex]
const seats = [];               // { x, z, heading, lift, taken, prop }
const propDummy = new THREE.Object3D();
function buildProps() {
  for (const m of Object.values(propMeshes)) { scene.remove(m); m.dispose(); }
  for (const k of Object.keys(propMeshes)) delete propMeshes[k];
  propKeepOuts.length = 0; seats.length = 0;
  const placements = []; // { k, x, z, heading, s }
  let serial = 0;
  filmItems.forEach((it, i) => {
    const set = PROP_SETS[it.film.set] || PROP_SETS[it.film.id] || PROP_SETS[SET_ORDER[i % SET_ORDER.length]];
    const jitter = (n) => { const v = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return (v - Math.floor(v)) - 0.5; }; // deterministic per film
    set.forEach((p, j) => {
      if (isTouch && (j % 2 === 1) && CONFIG.props.mobileShare <= 0.5) return;
      if (view.narrow && p.x > 1.2) return; // the under-description pocket is off-screen when captions sit below
      const vx = it.vcx + (p.x + jitter(j) * 0.06) * it.halfW;
      const py = p.x > 1.2 ? Math.min(p.y, it.captionBottom - 0.45) : p.y; // under the description means under all of it
      const vy = it.vcy + (py + jitter(j + 7) * 0.06) * it.halfH;
      const face = ((p.face ?? -90) + jitter(j + 13) * 16) * DEG;
      const [x, z] = fromView(vx, vy);
      const heading = headingAlongView(Math.cos(face), Math.sin(face));
      placements.push({ k: p.k, x, z, heading, s: p.s ?? 1, index: serial++ });
    });
  });
  const byKind = {};
  for (const pl of placements) (byKind[pl.k] ||= []).push(pl);
  for (const [k, list] of Object.entries(byKind)) {
    const def = PROP_KINDS[k];
    const mesh = new THREE.InstancedMesh(propGeos[k], propMat, list.length);
    mesh.castShadow = mesh.receiveShadow = true;
    list.forEach((pl, n) => {
      propDummy.position.set(pl.x, 0, pl.z); propDummy.rotation.set(0, pl.heading, 0); propDummy.scale.setScalar(pl.s); propDummy.updateMatrix();
      mesh.setMatrixAt(n, propDummy.matrix);
      if (def.keep > 0) propKeepOuts.push([pl.x, pl.z, def.keep * pl.s, pl.index]);
      const sh = Math.sin(pl.heading), ch = Math.cos(pl.heading);
      for (const [sx, sz, lift, dh] of def.seats) {
        // local (sx, sz) with the prop facing +z: world = rotate by heading
        const lx = sx * pl.s, lz = sz * pl.s;
        seats.push({ x: pl.x + lx * ch + lz * sh, z: pl.z - lx * sh + lz * ch, heading: pl.heading + dh, lift: lift * pl.s, taken: null, prop: pl.index });
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
    propMeshes[k] = mesh;
  }
}
// a figure at rest in the Work column takes a free seat nearby, if there is one
function takeSeat(a) {
  if (cam.area !== 'work' || Math.random() > CONFIG.props.seatChance) return false;
  let best = null, bestD = CONFIG.props.seatReach ** 2;
  for (const st of seats) { if (st.taken) continue; const d = (st.x - a.x) ** 2 + (st.z - a.z) ** 2; if (d < bestD) { bestD = d; best = st; } }
  if (!best) return false;
  best.taken = a;
  const [s0, s1] = CONFIG.props.seatStay;
  assign(a, { kind: 'go', x: best.x, z: best.z, pose: { sit: 1, lift: best.lift }, walkPose: {}, speed: B.walkSpeed * 0.85, face: best.heading, arrive: 0.22, until: clock + rand(s0, s1), seat: best, ignoreProp: best.prop });
  return true;
}

// ============================================================================
// Placards: what Lucas does, carried in by four figures on arrival and planted in a row under the name
// ============================================================================
const PLACARD_WORDS = CONFIG.placards.words;
const placards = []; // { mesh, w, planted, x, z, carrier }
const march = { started: false, done: false };
function makePlacardTexture(word) {
  const Hc = 160, pad = 44;
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  const font = '600 92px Inter, "Helvetica Neue", Arial, sans-serif';
  ctx.font = font; if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  const tw = ctx.measureText(word.toUpperCase()).width;
  c.width = Math.ceil(tw + pad * 2); c.height = Hc;
  ctx.fillStyle = '#efe6d6'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = 'rgba(16,20,30,0.25)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, c.width - 6, c.height - 6);
  ctx.font = font; if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
  ctx.fillStyle = '#10141e'; ctx.textBaseline = 'middle'; ctx.fillText(word.toUpperCase(), pad, Hc / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return { tex, aspect: c.width / c.height };
}
const placardStickMat = new THREE.MeshStandardMaterial({ color: '#7d5a3c', roughness: 0.9 });
placardStickMat.onBeforeCompile = (shader) => patchHaze(shader, { albedo: true, strength: 0.9 });
placardStickMat.customProgramCacheKey = () => 'prop';
function buildPlacards() {
  const P = CONFIG.placards;
  for (const word of PLACARD_WORDS) {
    const { tex, aspect } = makePlacardTexture(word);
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide });
    mat.onBeforeCompile = (shader) => patchHaze(shader, { albedo: false, strength: 0.6 });
    mat.customProgramCacheKey = () => 'placard';
    const w = P.height * aspect;
    const g = new THREE.Group();
    const stickH = P.stick - P.height + 0.12; // the pole stops just inside the bottom edge of the board
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, stickH, 6), placardStickMat);
    stick.position.y = stickH / 2; stick.castShadow = true; g.add(stick);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(w, P.height), mat);
    board.position.y = P.stick - P.height / 2 + 0.05; board.castShadow = false; g.add(board); // the boards' shadows would lie across the name in low light
    g.visible = false; scene.add(g);
    placards.push({ mesh: g, w, planted: false, x: 0, z: 0, carrier: null });
  }
}
function placardRow() { // target spots in a row under the name, in world space
  const P = CONFIG.placards;
  const total = placards.reduce((a, p) => a + p.w, 0) + P.gap * (placards.length - 1);
  let x = nameLabel.vcx - total / 2;
  const y = nameLabel.vcy - nameLabel.halfH - P.below;
  return placards.map((p) => { const cx = x + p.w / 2; x += p.w + P.gap; return fromView(cx, y); });
}
function startMarch(instant = false) {
  if (march.started) return;
  march.started = true;
  const spots = placardRow();
  placards.forEach((p, i) => { p.x = spots[i][0]; p.z = spots[i][1]; }); // the spots are kept clear from now on
  if (instant) { placards.forEach((p, i) => plantPlacard(p, spots[i][0], spots[i][1])); march.done = true; return; }
  const pool = freeAgents((a) => !a.partying);
  if (pool.length < placards.length) { march.started = false; return; }
  const rowY = nameLabel.vcy - nameLabel.halfH - CONFIG.placards.below;
  placards.forEach((p, i) => {
    // enter from the left edge, in file, already holding the sign
    const a = pool[i];
    [a.x, a.z] = fromView(cam.x - view.halfW - 1 - i * 2.4, rowY + (i % 2 ? 0.4 : -0.4));
    a.heading = headingAlongView(1, 0); a.speed = B.hypeSpeed; a.arms = 1;
    p.carrier = a; p.mesh.visible = true;
    assign(a, { kind: 'go', x: spots[i][0], z: spots[i][1], speed: B.hypeSpeed * 1.15, walkPose: { arms: 1 }, pose: { arms: 1 }, face: headingToCamera, arrive: 0.6, carry: p, ignoreProp: 'placard' + i, allowName: false });
  });
}
function plantPlacard(p, x, z) {
  p.planted = true; p.carrier = null; p.x = x; p.z = z;
  p.mesh.visible = true; p.mesh.position.set(x, 0, z);
  p.mesh.rotation.set(0, headingToCamera, (Math.random() - 0.5) * 0.12);
}
function updatePlacards() {
  for (const p of placards) {
    if (p.planted || !p.carrier) continue;
    const a = p.carrier;
    p.mesh.position.set(a.x, 0.35, a.z);
    p.mesh.rotation.set(0, a.taskArrived ? headingToCamera : a.heading + Math.PI, Math.sin(a.gait) * 0.05);
  }
  if (!march.done && march.started && placards.every((p) => p.planted)) march.done = true;
}

// Overlay player
const playerEl = document.getElementById('player');
const playerVideo = playerEl.querySelector('video');
const episodesEl = document.getElementById('player-episodes');
function openPlayer(film, episode = 0) { // an entry with `episodes` opens its first and offers the rest along the bottom
  const wasHidden = playerEl.hidden;
  playingFilm = film;
  const ep = film.episodes ? film.episodes[episode] : null;
  playerVideo.src = ep ? ep.video : film.video;
  playerVideo.poster = ep ? ep.poster : film.poster;
  if (episodesEl) {
    episodesEl.hidden = !film.episodes;
    episodesEl.innerHTML = film.episodes ? film.episodes.map((e, i) => `<button type="button" data-episode="${i}"${i === episode ? ' aria-current="true"' : ''}>${e.label}</button>`).join('') : '';
  }
  playerEl.hidden = false;
  if (wasHidden) { playerReturnFocus = document.activeElement; playerEl.querySelector('.player-close').focus(); }
  playerVideo.play().catch(() => {});
}
if (episodesEl) episodesEl.addEventListener('click', (e) => { const b = e.target.closest('[data-episode]'); if (b && playingFilm) openPlayer(playingFilm, +b.dataset.episode); });
let playerReturnFocus = null;
function closePlayer() {
  if (playingFilm && (playerVideo.ended || playerVideo.currentTime > 5)) applaud(playingFilm);
  playingFilm = null;
  playerVideo.pause();
  playerVideo.removeAttribute('src');
  playerVideo.load();
  playerEl.hidden = true;
  if (playerReturnFocus && playerReturnFocus.isConnected) playerReturnFocus.focus();
  playerReturnFocus = null;
}
playerEl.querySelector('.player-close').addEventListener('click', closePlayer);
playerEl.addEventListener('click', (e) => { if (e.target === playerEl) closePlayer(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !playerEl.hidden) closePlayer(); });

// ============================================================================
// The name, lying on the plane in the middle of the home screen
// ============================================================================
const nameLabel = {
  mesh: null, flat: null, vcx: 0, vcy: 0, halfW: 1, halfH: 1, // view-space rect of the letters
  wTop: 1, h: 1, height: CONFIG.name.height,
  // a raster of the letters for placing figures on them
  mask: null, maskW: 0, maskH: 0, bbox: null,
};
let nameFont = null;
fetch(CONFIG.name.fontUrl).then((r) => r.arrayBuffer()).then((buf) => { nameFont = opentype.parse(buf); buildNameLabel(); }).catch((e) => console.warn('name font failed, keeping the flat label', e));


function buildNameLabel() {
  const N = CONFIG.name;
  const wTop = (isNarrow() ? N.phoneWidthFrac : N.widthFrac) * 2 * view.halfW;
  if (nameLabel.mesh) { scene.remove(nameLabel.mesh); nameLabel.mesh.geometry.dispose(); nameLabel.mesh = null; }
  if (nameLabel.flat) { scene.remove(nameLabel.flat); nameLabel.flat.geometry.dispose(); nameLabel.flat = null; }
  nameLabel.vcx = 0; nameLabel.vcy = 0; nameLabel.wTop = wTop;

  if (!nameFont) {
    // flat canvas label until the font outlines arrive
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const W = 2048;
    ctx.font = '600 300px Inter, "Helvetica Neue", Arial, sans-serif';
    const tw = ctx.measureText(N.text).width;
    const px = Math.floor(300 * ((W - 80) / tw));
    c.width = W; c.height = Math.ceil(px * 1.25);
    ctx.font = `600 ${px}px Inter, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = N.colour; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(N.text, W / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    mat.onBeforeCompile = (shader) => { patchHaze(shader, { albedo: false, strength: 0.9 }); patchCrawl(shader); };
    mat.customProgramCacheKey = () => 'floorText';
    const h = wTop * (c.height / W);
    nameLabel.flat = trapezoidMesh(0, 0, wTop, wTop, h, mat, CONFIG.films.lift + 0.02, 2, 2);
    scene.add(nameLabel.flat);
    nameLabel.h = h * 0.55;
    nameLabel.halfW = (wTop / 2) * 0.92 + N.pad;
    nameLabel.halfH = nameLabel.h / 2 + N.pad;
    nameLabel.mask = null;
    return;
  }

  // Outlines -> shapes
  const path = nameFont.getPath(N.text, 0, 0, 100);
  const bb = path.getBoundingBox();
  const textW = bb.x2 - bb.x1, textH = bb.y2 - bb.y1;
  const sc = wTop / textW;                                  // font units -> view units
  const sp = new THREE.ShapePath();
  const X = (x) => (x - (bb.x1 + bb.x2) / 2) * sc;
  const Y = (y) => -(y - (bb.y1 + bb.y2) / 2) * sc;          // flip to y-up, centre
  for (const c of path.commands) {
    if (c.type === 'M') sp.moveTo(X(c.x), Y(c.y));
    else if (c.type === 'L') sp.lineTo(X(c.x), Y(c.y));
    else if (c.type === 'Q') sp.quadraticCurveTo(X(c.x1), Y(c.y1), X(c.x), Y(c.y));
    else if (c.type === 'C') sp.bezierCurveTo(X(c.x1), Y(c.y1), X(c.x2), Y(c.y2), X(c.x), Y(c.y));
    else if (c.type === 'Z') sp.currentPath.closePath();
  }
  const shapes = sp.toShapes(false);
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: N.height, bevelEnabled: false, curveSegments: 5 });
  // Shear each vertex: taper like the films, then view -> ground, extrusion -> up
  const h = textH * sc;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getY(i), e = pos.getZ(i);
    const [x, z] = fromView(u, v);
    pos.setXYZ(i, x, e + CONFIG.films.lift, z);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: N.colour, roughness: 0.55, metalness: 0 });
  mat.onBeforeCompile = (shader) => { patchHaze(shader, { albedo: false, strength: 0.5 }); patchCrawl(shader); };
  mat.customProgramCacheKey = () => 'nameSolid';
  nameLabel.mesh = new THREE.Mesh(geo, mat);
  nameLabel.mesh.castShadow = true;
  nameLabel.mesh.receiveShadow = true;
  scene.add(nameLabel.mesh);
  nameLabel.h = h;
  nameLabel.halfW = wTop / 2 + N.pad;
  nameLabel.halfH = h / 2 + N.pad;

  // Raster of the same outlines, for placing figures on the letters
  const mw = 1024, mh = Math.ceil(mw * (textH / textW));
  const c = document.createElement('canvas'); c.width = mw; c.height = mh;
  const ctx = c.getContext('2d');
  const k = mw / textW;
  ctx.beginPath();
  for (const cmd of path.commands) {
    const px = (x) => (x - bb.x1) * k, py = (y) => (y - bb.y1) * k;
    if (cmd.type === 'M') ctx.moveTo(px(cmd.x), py(cmd.y));
    else if (cmd.type === 'L') ctx.lineTo(px(cmd.x), py(cmd.y));
    else if (cmd.type === 'Q') ctx.quadraticCurveTo(px(cmd.x1), py(cmd.y1), px(cmd.x), py(cmd.y));
    else if (cmd.type === 'C') ctx.bezierCurveTo(px(cmd.x1), py(cmd.y1), px(cmd.x2), py(cmd.y2), px(cmd.x), py(cmd.y));
    else if (cmd.type === 'Z') ctx.closePath();
  }
  ctx.fillStyle = '#000'; ctx.fill('nonzero');
  nameLabel.mask = ctx.getImageData(0, 0, mw, mh).data;
  nameLabel.maskW = mw; nameLabel.maskH = mh;
}
const onLetterPx = (px, py) => {
  const L = nameLabel; if (!L.mask || px < 0 || py < 0 || px >= L.maskW || py >= L.maskH) return false;
  return L.mask[((py | 0) * L.maskW + (px | 0)) * 4 + 3] > 0;
};
// Mask pixel -> ground, with the same taper as the geometry
function letterPxToGround(px, py) {
  const L = nameLabel;
  const u = (px / L.maskW - 0.5) * L.wTop;
  const vNorm = 1 - py / L.maskH;
  const v = (vNorm - 0.5) * L.h;
  return fromView(L.vcx + u, L.vcy + v);
}
// A random spot on the letters, or null if the mask is not ready
function sampleOnLetters() {
  const L = nameLabel; if (!L.mask) return null;
  for (let t = 0; t < 60; t++) {
    const px = Math.random() * L.maskW, py = Math.random() * L.maskH;
    if (onLetterPx(px, py)) return letterPxToGround(px, py);
  }
  return null;
}
// A spot just inside a letter's edge, with the outward direction in ground space
function sampleLetterEdge() {
  const L = nameLabel; if (!L.mask) return null;
  const r = L.maskW * 0.012;
  for (let t = 0; t < 80; t++) {
    const px = Math.random() * L.maskW, py = Math.random() * L.maskH;
    if (!onLetterPx(px, py)) continue;
    const dirs = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; if (!onLetterPx(px + Math.cos(a) * r, py + Math.sin(a) * r)) dirs.push(a); }
    if (dirs.length === 0 || dirs.length > 5) continue;
    const a = dirs[Math.floor(Math.random() * dirs.length)];
    const here = letterPxToGround(px, py);
    const out = letterPxToGround(px + Math.cos(a) * r, py + Math.sin(a) * r);
    return { x: here[0], z: here[1], heading: Math.atan2(out[0] - here[0], out[1] - here[1]) };
  }
  return null;
}

// Push an agent out of the name's rectangle (in view space)
function keepOutName(a, margin = 0, px0 = null, pz0 = null) {
  const hw = nameLabel.halfW + margin, hh = nameLabel.halfH + margin;
  const [vx, vy] = toView(a.x, a.z);
  const dx = vx - nameLabel.vcx, dy = vy - nameLabel.vcy;
  if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) return;
  // already inside before this step (a sitter getting up off the letters): walk out, don't snap to the edge
  // (with a tolerance: a figure snapped to the edge last frame round-trips as a hair inside, and must be snapped again)
  if (px0 != null) { const [ux, uy] = toView(px0, pz0); if (Math.abs(ux - nameLabel.vcx) < hw - 0.08 && Math.abs(uy - nameLabel.vcy) < hh - 0.08) return; }
  const ox = hw - Math.abs(dx), oy = hh - Math.abs(dy);
  let nx = vx, ny = vy;
  if (ox < oy) nx = nameLabel.vcx + Math.sign(dx || 1) * hw; else ny = nameLabel.vcy + Math.sign(dy || 1) * hh;
  [a.x, a.z] = fromView(nx, ny);
}
// Does the segment a-b cross the rectangle? (Liang-Barsky)
function segmentHitsRect(ax, ay, bx, by, x0, y0, x1, y1) {
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  const edges = [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]];
  for (const [p, q] of edges) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
// Where to head right now: the target, or round the name corner by corner if the straight line crosses it.
// The way round (clockwise or not) is chosen once per target and kept, so nobody dithers between corners.
function steerAround(a, tx, tz) {
  const L = nameLabel;
  const [ax, ay] = toView(a.x, a.z);
  const [bx, by] = toView(tx, tz);
  const cx = L.vcx, cy = L.vcy;
  const mo = 1.6, hw = L.halfW + mo, hh = L.halfH + mo;
  const x0 = cx - hw, y0 = cy - hh, x1 = cx + hw, y1 = cy + hh;
  const dx = ax - cx, dy = ay - cy;
  if (Math.abs(dx) < L.halfW && Math.abs(dy) < L.halfH) {
    // inside the letters' box: walk straight out through the nearest side
    const dTop = L.halfH - dy, dBottom = L.halfH + dy, dLeft = L.halfW + dx, dRight = L.halfW - dx;
    const m = Math.min(dTop, dBottom, dLeft, dRight);
    return fromView(m === dLeft ? x0 : m === dRight ? x1 : ax, m === dTop ? y1 : m === dBottom ? y0 : ay);
  }
  const mi = 0.25;
  if (!segmentHitsRect(ax, ay, bx, by, cx - L.halfW - mi, cy - L.halfH - mi, cx + L.halfW + mi, cy + L.halfH + mi)) { a.detourDir = 0; return [tx, tz]; }
  if (!a.detourDir || Math.hypot(tx - a.detourTx, tz - a.detourTz) > 0.5) {
    const angA = Math.atan2(dy, dx), angB = Math.atan2(by - cy, bx - cx);
    let d = angB - angA; d = Math.atan2(Math.sin(d), Math.cos(d));
    a.detourDir = d >= 0 ? 1 : -1; a.detourTx = tx; a.detourTz = tz;
  }
  // corners in clockwise order on screen: TL, TR, BR, BL. Which region of the box are we in?
  const ring = [[x0, y1], [x1, y1], [x1, y0], [x0, y0]];
  const cw = a.detourDir === -1;
  let k;
  if (Math.abs(dx) <= L.halfW) k = dy > 0 ? (cw ? 1 : 0) : (cw ? 3 : 2);          // above or below: head to the corner ahead
  else if (Math.abs(dy) <= L.halfH) k = dx > 0 ? (cw ? 2 : 1) : (cw ? 0 : 3);     // beside: likewise
  else { k = dy > 0 ? (dx < 0 ? 0 : 1) : (dx < 0 ? 3 : 2); k = (k + (cw ? 1 : 3)) % 4; } // past a corner: straight on to the next one
  // look ahead: once the next corner is close, aim past it at the one after, so the turn starts early and reads as a curve
  if (Math.hypot(ax - ring[k][0], ay - ring[k][1]) < CONFIG.name.lookAhead) k = (k + (cw ? 1 : 3)) % 4;
  return fromView(ring[k][0], ring[k][1]);
}
const pointOnNameEdge = (u) => {
  // u in [0,1) round the rectangle, starting top-left going clockwise
  const w = nameLabel.halfW * 2, h = nameLabel.halfH * 2, P = 2 * (w + h);
  let d = u * P, vx, vy;
  const l = nameLabel.vcx - nameLabel.halfW, t = nameLabel.vcy + nameLabel.halfH;
  if (d < w) { vx = l + d; vy = t; }
  else if ((d -= w) < h) { vx = l + w; vy = t - d; }
  else if ((d -= h) < w) { vx = l + w - d; vy = t - h; }
  else { d -= w; vx = l; vy = t - h + d; }
  return fromView(vx, vy);
};

// Fireworks: one Points cloud, animated on the GPU from launch time, velocity and gravity
const FW = CONFIG.fireworks;
const FW_MAX = 12 * (FW.sparks + 1);
const fw = {
  start: new Float32Array(FW_MAX * 3), vel: new Float32Array(FW_MAX * 3), birth: new Float32Array(FW_MAX).fill(-1e9),
  life: new Float32Array(FW_MAX), color: new Float32Array(FW_MAX * 3), size: new Float32Array(FW_MAX), head: 0, pending: [],
};
const fwGeo = new THREE.BufferGeometry();
fwGeo.setAttribute('position', new THREE.BufferAttribute(fw.start, 3));
fwGeo.setAttribute('aVel', new THREE.BufferAttribute(fw.vel, 3));
fwGeo.setAttribute('aBirth', new THREE.BufferAttribute(fw.birth, 1));
fwGeo.setAttribute('aLife', new THREE.BufferAttribute(fw.life, 1));
fwGeo.setAttribute('aColor', new THREE.BufferAttribute(fw.color, 3));
fwGeo.setAttribute('aSize', new THREE.BufferAttribute(fw.size, 1));
fwGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
const fwMat = new THREE.ShaderMaterial({
  uniforms: { uTime: figureUniforms.uTime, uPx: { value: 24 } },
  transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  vertexShader: /* glsl */`
    attribute vec3 aVel; attribute float aBirth; attribute float aLife; attribute vec3 aColor; attribute float aSize;
    uniform float uTime; uniform float uPx;
    varying vec3 vColor; varying float vFade;
    void main() {
      float t = uTime - aBirth;
      float alive = step(0.0, t) * step(t, aLife);
      vec3 p = position + aVel * t + vec3(0.0, -4.5, 0.0) * t * t * 0.5;
      p.y = max(p.y, 0.05);
      vFade = alive * (1.0 - smoothstep(aLife * 0.6, aLife, t));
      vColor = aColor;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = alive * aSize * uPx * (0.6 + 0.4 * vFade);
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vColor; varying float vFade;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      float a = smoothstep(1.0, 0.2, d) * vFade;
      if (a < 0.01) discard;
      float core = smoothstep(0.55, 0.0, d);
      gl_FragColor = vec4(mix(vColor * 1.4, vec3(1.6), core * 0.6), a);
    }`,
});
const fireworks = new THREE.Points(fwGeo, fwMat);
fireworks.frustumCulled = false;
scene.add(fireworks);
const fwColor = new THREE.Color();
function fwEmit(x, y, z, vx, vy, vz, life, colour, size) {
  const i = fw.head; fw.head = (fw.head + 1) % FW_MAX;
  fw.start.set([x, y, z], i * 3); fw.vel.set([vx, vy, vz], i * 3);
  fw.birth[i] = clock; fw.life[i] = life; fw.size[i] = size;
  fwColor.set(colour); fw.color.set([fwColor.r, fwColor.g, fwColor.b], i * 3);
}
function launchFirework(x, z) {
  const h = rand(FW.height[0], FW.height[1]);
  const up = Math.sqrt(2 * 4.5 * h);           // reaches height h under the shader's gravity
  const tApex = up / 4.5;
  const colour = FW.colours[Math.floor(Math.random() * FW.colours.length)];
  fwEmit(x, 0.6, z, rand(-0.3, 0.3), up, rand(-0.3, 0.3), tApex, '#ffe9c0', 0.5);
  fw.pending.push({ at: clock + tApex, x, y: h + 0.6, z, colour });
}
function updateFireworks() {
  for (let i = fw.pending.length - 1; i >= 0; i--) {
    const b = fw.pending[i]; if (b.at > clock) continue;
    fw.pending.splice(i, 1);
    for (let k = 0; k < FW.sparks; k++) {
      const th = rand(0, TAU), ph = Math.acos(rand(-1, 1)), v = rand(2.5, 5.5);
      fwEmit(b.x, b.y, b.z, Math.sin(ph) * Math.cos(th) * v, Math.cos(ph) * v + 1.0, Math.sin(ph) * Math.sin(th) * v, rand(1.1, 2.0), Math.random() < 0.85 ? b.colour : '#ffffff', rand(0.3, 0.5));
    }
  }
  for (const key of ['position', 'aVel', 'aBirth', 'aLife', 'aColor', 'aSize']) fwGeo.attributes[key].needsUpdate = true;
}

// ============================================================================
// Contact: a form in the middle of the area one screen to the right
// ============================================================================
// ============================================================================
// About: a short text lying on the floor one screen to the left, ringed by the crowd
// ============================================================================
const titleInProse = SITE.title.split(' ').map((w) => (w === w.toUpperCase() ? w : w.toLowerCase())).join(' '); // 'Creative lead' reads as 'creative lead'; an initialism keeps its capitals
const ABOUT_TEXT = [
  `I'm ${/^[aeiou]/i.test(titleInProse) ? 'an' : 'a'} ${titleInProse} and film director. I work at ${SITE.company} where I lead the development and deployment of our creative AI talent and workflows.`,
  'I have spent my life making: from wooden spoons, robots, music, short films, to a jerry-rigged home irrigation system. I am never more alive than when I am creating.',
];
const aboutPoint = { x: 0, z: 0, r: 10, vcx: 0 };
let aboutMesh = null;
// on a phone the text is an HTML block in the contact form's style (floor text would never be sharp at that width), placed each frame like the form
const aboutText = { el: document.getElementById('about-text') };
if (aboutText.el) for (const t of ABOUT_TEXT) { const p = document.createElement('p'); p.textContent = t; aboutText.el.appendChild(p); }
function placeAboutText() {
  const el = aboutText.el; if (!el) return;
  if (!isNarrow()) { el.hidden = true; return; }
  const [nx, ny] = groundToNdc(aboutPoint.x, aboutPoint.z);
  const visible = Math.abs(nx) < 1.6 && Math.abs(ny) < 1.6;
  el.hidden = !visible;
  if (!visible) return;
  el.style.left = `${((nx + 1) / 2) * innerWidth}px`; el.style.top = `${((1 - ny) / 2) * innerHeight}px`;
  const r = el.getBoundingClientRect();
  const halfWUnits = (Math.max(r.width, 200) / 2) / view.pxPerUnit;
  const halfHUnits = (Math.max(r.height, 200) / 2) / view.pxPerUnit / Math.cos(Math.atan(1 / Math.SQRT2));
  aboutPoint.r = Math.max(halfWUnits, halfHUnits) * CONFIG.about.exclusionPad;
  aboutStart.vcx = aboutPoint.vcx; aboutStart.vcy = -(r.height / 2) / view.pxPerUnit - 1.1; // the 'Start with' line just under the block
}
function makeAboutTexture() {
  const W = 2048, pad = 10; // twice the caption canvas at the same font sizes: the text reads at half size
  const c = document.createElement('canvas'); const ctx = c.getContext('2d');
  const font = (px, weight) => `${weight} ${px}px Inter, "Helvetica Neue", Arial, sans-serif`;
  const wrap = (text, px, weight, maxW) => {
    ctx.font = font(px, weight);
    const words = text.split(' '); const lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line);
    return lines;
  };
  const paras = ABOUT_TEXT.map((t) => wrap(t, 36, 400, W - pad * 2));
  const H = Math.ceil(pad + 56 + paras.reduce((a, l) => a + l.length * 48 + 24, 0) + pad);
  c.width = W; c.height = H; ctx.clearRect(0, 0, W, H);
  ctx.font = font(26, 500); if ('letterSpacing' in ctx) ctx.letterSpacing = '7px';
  ctx.fillStyle = 'rgba(16,20,30,0.62)'; ctx.textBaseline = 'top'; ctx.fillText('ABOUT', pad, pad + 6);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  let y = pad + 56;
  ctx.font = font(36, 400); ctx.fillStyle = '#10141e';
  for (const lines of paras) { for (const l of lines) { ctx.fillText(l, pad, y); y += 48; } y += 24; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return { tex, aspect: H / W };
}
function buildAbout() {
  if (aboutMesh) { scene.remove(aboutMesh); aboutMesh.geometry.dispose(); aboutMesh = null; }
  const vcx = -CONFIG.world.aboutLeft * view.halfW, vcy = 0;
  aboutPoint.vcx = vcx;
  if (isNarrow()) { // phones: the HTML block instead of floor text; the 'Start with' line waits under where the block will be until it is measured
    [aboutPoint.x, aboutPoint.z] = fromView(vcx, vcy); aboutStart.vcx = vcx; aboutStart.vcy = vcy - 0.25 * view.halfH; placeAboutText(); return;
  }
  const w = CONFIG.about.widthFrac * 2 * view.halfW;
  const { tex, aspect } = makeAboutTexture();
  const h = w * aspect;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  mat.onBeforeCompile = (shader) => { patchHaze(shader, { albedo: false, strength: 0.9 }); patchCrawl(shader); };
  mat.customProgramCacheKey = () => 'floorText';
  aboutMesh = trapezoidMesh(vcx, vcy, w, w, h, mat, CONFIG.films.lift + 0.02, 2, 2);
  scene.add(aboutMesh);
  const [x, z] = fromView(vcx, vcy);
  aboutPoint.x = x; aboutPoint.z = z;
  // the keep-out circle covers the text block's corners (the view squashes world y, so the block's height counts for more)
  aboutPoint.r = Math.hypot(w / 2, (h / 2) / Math.cos(Math.atan(1 / Math.SQRT2))) * CONFIG.about.exclusionPad;
  aboutStart.vcx = vcx; aboutStart.vcy = vcy - h / 2 - 1.1; // the 'Start with' line sits just under the text block
}
// 'Start with Nectar, Airbnb or Gren': an HTML line under the About text, placed each frame like the contact form; each name opens that film
const aboutStart = { el: document.getElementById('about-start'), vcx: 0, vcy: 0 };
for (const a of aboutStart.el ? aboutStart.el.querySelectorAll('[data-film]') : []) {
  a.addEventListener('click', (e) => { e.preventDefault(); const f = films.find((x) => x.id === a.dataset.film); if (f) openPlayer(f); });
}
function placeAboutStart() {
  const el = aboutStart.el; if (!el) return;
  const [x, z] = fromView(aboutStart.vcx, aboutStart.vcy);
  const [nx, ny] = groundToNdc(x, z);
  const visible = Math.abs(nx) < 1.2 && Math.abs(ny) < 1.2;
  el.hidden = !visible;
  if (visible) { el.style.left = `${((nx + 1) / 2) * innerWidth}px`; el.style.top = `${((1 - ny) / 2) * innerHeight}px`; }
}

const formEl = document.getElementById('contact-form');
const contactPoint = { x: 0, z: 0, r: 10 };
function placeContact() {
  const [x, z] = fromView(CONFIG.world.contactRight * view.halfW, 0);
  contactPoint.x = x; contactPoint.z = z;
  const r = formEl.getBoundingClientRect();
  const halfWUnits = (Math.max(r.width, 300) / 2) / view.pxPerUnit;
  const halfHUnits = (Math.max(r.height, 300) / 2) / view.pxPerUnit / Math.cos(Math.atan(1 / Math.SQRT2));
  contactPoint.r = Math.max(halfWUnits, halfHUnits) * CONFIG.contact.exclusionPad;
  const [nx, ny] = groundToNdc(x, z);
  const visible = Math.abs(nx) < 1.6 && Math.abs(ny) < 1.6;
  formEl.hidden = !visible;
  if (visible) formEl.style.left = `${((nx + 1) / 2) * innerWidth}px`, formEl.style.top = `${((1 - ny) / 2) * innerHeight}px`;
}
formEl.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(formEl);
  const subject = encodeURIComponent(`Hello from ${data.get('name') || 'the site'}`);
  const body = encodeURIComponent(`${data.get('message') || ''}\n\n${data.get('name') || ''}\n${data.get('email') || ''}`);
  location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`;
});
{ // the ask and the details come from site.js; empty values leave their line out
  const ask = document.getElementById('contact-ask'), det = document.getElementById('contact-details');
  if (ask) { ask.textContent = SITE.ask || ''; ask.hidden = !SITE.ask; }
  if (det) {
    const parts = [];
    if (SITE.city) parts.push(`<span>${SITE.city}</span>`);
    if (SITE.email) parts.push(`<a href="mailto:${SITE.email}">${SITE.email}</a>`);
    if (SITE.linkedin) parts.push(`<a href="${SITE.linkedin}" target="_blank" rel="noopener">LinkedIn</a>`);
    det.innerHTML = parts.join('<i>·</i>'); det.hidden = !parts.length;
  }
  const send = formEl.querySelector('button[type=submit]');
  if (send && !SITE.email) { send.disabled = true; send.title = 'No address set yet (site.js)'; }
}

// ============================================================================
// Agents (CPU side: positions, headings, state targets)
// ============================================================================
const B = CONFIG.behaviour;
const agents = [];
const sepX = new Float32Array(TOTAL);
const sepZ = new Float32Array(TOTAL);

function makeAgent(i) {
  const lo = rand(0.1, 0.4);
  const a = {
    x: 0, z: 0, heading: rand(0, TAU), speed: 0, gait: rand(0, TAU),
    tx: 0, tz: 0, retarget: rand(0, 3), pause: 0,
    lo, hi: lo + rand(0.35, 0.55),          // personal sensitivity window
    lies: Math.random() < CONFIG.crowd.lieFraction,
    laps: Math.random() < CONFIG.crowd.lapFraction,
    lapAngle: rand(0, TAU),
    pref: Math.random(),                     // cheer vs bounce preference
    gatherThresh: rand(0.1, 0.7),            // how near the pointer must be to a word before this one runs to it
    gathering: false, party: 'jump', quirk: 'none', outside: false,
    nameRole: 'audience', baseRole: 'audience', partying: false, edgeU: 0, edgeHeading: null, lift: 0, stuckT: 0,
    arms: 0, task: null, taskArrived: false, follower: false, huddler: Math.random() < CONFIG.vignettes.huddle.share,
    detourDir: 0, detourTx: 0, detourTz: 0, ringAngle: rand(0, TAU), ringR: rand(0, 1), congaIndex: -1, launchAt: 0, px: 0, pz: 0,
    gaitScale: rand(0.7, 1.3),
    scale: 1 + rand(-1, 1) * CONFIG.crowd.scaleJitter,
    tint: 1 + rand(-1, 1) * CONFIG.crowd.tintJitter,
    mode: 'mill', e: 0.5, fearT: 0, fearFrom: null, downT: 0, flingX: 0, flingZ: 0, riseT: 0,
    sit: 0, walk: 0, jump: 0, cheer: 0, lie: 0,
  };
  phaseArr[i] = Math.random();
  return a;
}
for (let i = 0; i < TOTAL; i++) agents.push(makeAgent(i));
// Roles for the party at the name
{
  const N = CONFIG.name;
  const order = agents.map((a, i) => i).filter((i) => i !== 0).sort(() => Math.random() - 0.5); // agent 0 is the follower
  let k = 0;
  for (let c = 0; c < N.launcherCount && k < order.length; c++, k++) { agents[order[k]].nameRole = 'launcher'; agents[order[k]].congaIndex = c; }
  for (let c = 0; c < N.congaCount && k < order.length; c++, k++) { agents[order[k]].nameRole = 'conga'; agents[order[k]].congaIndex = c; }
  const nOn = Math.round(N.onShare * TOTAL), nEdge = Math.round(N.edgeShare * TOTAL);
  for (let c = 0; c < nOn && k < order.length; c++, k++) agents[order[k]].nameRole = 'on';
  for (let c = 0; c < nEdge && k < order.length; c++, k++) { agents[order[k]].nameRole = 'edge'; agents[order[k]].edgeU = (c + 0.5) / nEdge; }
}
for (const a of agents) a.baseRole = a.nameRole;
const congaMembers = () => agents.filter((a) => a.nameRole === 'conga').sort((a, b) => a.congaIndex - b.congaIndex);
const CONGA = congaMembers();
const CONGA_BASE = CONGA.slice();
agents[0].follower = true; agents[0].nameRole = agents[0].baseRole = 'audience';
const LAUNCHERS = agents.filter((a) => a.nameRole === 'launcher');
const party = { g: 0, target: 0, wave: 0, since: 0, was: false, until: 0, welcomeAt: 0, welcomed: false }; // until/welcome: touch devices, see updateMood


function pickRandom(a) { [a.tx, a.tz] = randomPoint(); }
function pickNear(a, r) {
  const ang = rand(0, TAU), rr = Math.sqrt(Math.random()) * r;
  a.tx = a.x + Math.cos(ang) * rr; a.tz = a.z + Math.sin(ang) * rr;
  clampTarget(a);
}
function pickSpread(a) {
  // settle close by: the best of a few nearby spots, judged by distance from everyone else's spot
  let best = null, bestD = -1;
  for (let k = 0; k < 6; k++) {
    const ang = rand(0, TAU), rr = Math.sqrt(Math.random()) * B.restWander;
    const c = { x: a.x + Math.cos(ang) * rr, z: a.z + Math.sin(ang) * rr };
    clampToBounds(c);
    const x = c.x, z = c.z;
    let dmin = Infinity;
    for (let j = 0; j < activeCount; j++) {
      const o = agents[j]; if (o === a) continue;
      const d = (o.tx - x) ** 2 + (o.tz - z) ** 2;
      if (d < dmin) dmin = d;
    }
    if (dmin > bestD) { bestD = dmin; best = [x, z]; }
  }
  a.tx = best[0]; a.tz = best[1];
}
// A spot on the ring around a gathering point, on the side facing the view centre
// A target adjusted to go round a keep-out circle rather than into its edge: aim at the tangent point on the
// target's side, or, when already against the circle, slide along it the shorter way round
// o, when given, is the mover: it remembers which way round it chose, so a target almost straight through the circle doesn't flip it every frame
function steerAroundCircle(ax, az, tx, tz, cx, cz, r, o = null) {
  const R = r + 0.3;
  const dx = tx - ax, dz = tz - az; const L2 = dx * dx + dz * dz || 1e-6;
  const vx = ax - cx, vz = az - cz; const d = Math.hypot(vx, vz) || 1e-6;
  if (d <= R + 0.05 && dx * vx + dz * vz > 0) return [tx, tz]; // against it but the target is outward: the straight line only gets further from it (a sitter's spot just outside the edge, say)
  const t = clamp(((cx - ax) * dx + (cz - az) * dz) / L2, 0, 1);
  if (Math.hypot(ax + dx * t - cx, az + dz * t - cz) >= R) return [tx, tz]; // the straight line clears it
  const cross = vx * (tz - cz) - vz * (tx - cx);
  let side = cross >= 0 ? 1 : -1;                                        // which way round is shorter
  if (o) { if (o.steerSide && Math.abs(cross) < 0.2 * d * Math.hypot(tx - cx, tz - cz)) side = o.steerSide; o.steerSide = side; }
  if (d <= R + 0.05) return [ax + (-vz / d * side + vx / d) * 2, az + (vx / d * side + vz / d) * 2]; // against it: slide, and out
  const ang = Math.acos(Math.min(1, R / d)), base = Math.atan2(vz, vx);
  const a1 = base + side * ang;
  return [cx + Math.cos(a1) * R, cz + Math.sin(a1) * R];
}
function pickRing(a, cx, cz, ex) {
  const facing = Math.atan2(cam.wz - cz, cam.wx - cx);
  const spread = gatherAt.full ? Math.PI : CONFIG.gather.frontSpread; // all the way round the About text; the front only at an edge word
  const ang = facing + rand(-1, 1) * spread;
  const r = ex + 0.4 + Math.sqrt(Math.random()) * CONFIG.gather.ringDepth;
  a.tx = cx + Math.cos(ang) * r; a.tz = cz + Math.sin(ang) * r;
  clampTarget(a);
}
function pickLap(a, cx, cz, r) {
  a.lapAngle += rand(0.9, 1.4);
  a.tx = cx + Math.cos(a.lapAngle) * r; a.tz = cz + Math.sin(a.lapAngle) * r;
  clampTarget(a);
}
function clampTarget(a) { const t = { x: a.tx, z: a.tz }; clampToBounds(t); a.tx = t.x; a.tz = t.z; }
function turnToward(a, target, dt, rate) {
  let d = target - a.heading;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  a.heading += d * Math.min(1, dt * rate);
}
function approach(v, target, dt, rate) { return v + (target - v) * Math.min(1, dt * rate); }
// A figure that is trying to move but going nowhere for a while gets a new target and a turn
function noteStuck(a, px0, pz0, dt) {
  const moved = Math.hypot(a.x - px0, a.z - pz0);
  if (a.speed > 0.6 && moved < a.speed * dt * 0.3) a.stuckT += dt; else a.stuckT = 0;
  if (a.stuckT > 1.2) { a.stuckT = 0; a.retarget = 0; a.pause = 0; a.heading += rand(1.5, 3.5); }
}
function keepOut(o, cx, cz, r) {
  const dx = o.x - cx, dz = o.z - cz;
  const d = Math.hypot(dx, dz);
  if (d < r && d > 1e-4) { o.x = cx + (dx / d) * r; o.z = cz + (dz / d) * r; }
}
// A target inside a keep-out circle can never be reached: the figure walks into the edge and is pushed back every
// frame until its next retarget, which reads as pressing against the word. Move the target to the edge, with a
// little room, and again if that lands it in a neighbour (the two words at the bottom overlap). False if it would not come out.
function keepTargetOut(t, pad = 0.6) {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const [kx, kz, kr] of keepOuts) {
      const d = Math.hypot(t.x - kx, t.z - kz);
      if (d < kr + pad) { if (d < 1e-4) t.x += 0.01; keepOut(t, kx, kz, kr + pad); moved = true; }
    }
    if (!moved) return true;
  }
  return false;
}
// Figures that are a long way from the view get re-placed just outside its nearest edge
function respawnIfFar(a) {
  const [vx, vy] = toView(a.x, a.z);
  const dx = vx - cam.x, dy = vy - cam.y;
  const limit = CONFIG.world.farRespawn;
  if (Math.abs(dx) < limit * 2 * view.halfW && Math.abs(dy) < limit * 2 * view.halfH) return;
  const edge = Math.abs(dx) / view.halfW > Math.abs(dy) / view.halfH ? 'x' : 'y';
  let nx, ny;
  if (edge === 'x') { nx = cam.x + Math.sign(dx) * (view.halfW + rand(1, 4)); ny = cam.y + rand(-view.halfH, view.halfH); }
  else { ny = cam.y + Math.sign(dy) * (view.halfH + rand(1, 4)); nx = cam.x + rand(-view.halfW, view.halfW); }
  [a.x, a.z] = fromView(nx, ny);
  a.retarget = 0;
  if (a.task?.seat) release(a); // re-placed by the view: drop a seat that is now a screen away
}

const cursor = { ndcX: CONFIG.view.startPointer[0], ndcY: CONFIG.view.startPointer[1], has: false, gx: 0, gz: 0, onStage: false };
let hoverFilm = null;       // film whose play button is hovered
let playingFilm = null;
let groundFilm = null;      // film whose thumbnail the cursor is over
const keepOuts = [];        // [x, z, r] circles the crowd stays out of
const gatherAt = { x: 0, z: 0, r: 3, g: 0, full: false };

function updateAgents(dt) {
  const E = mood.w.work + mood.w.contact + mood.w.about;
  const g = gatherAt.g;
  const torch = cam.area === 'home' && cursor.onStage ? CONFIG.torch.boost * (1 - E) : 0; // the pool matters when nothing else does
  const torchR = CONFIG.torch.radius * view.halfH;
  const [tvx, tvy] = toView(cursor.gx, cursor.gz);

  // separation
  sepX.fill(0); sepZ.fill(0);
  for (let i = 0; i < activeCount; i++) {
    const a = agents[i];
    for (let j = i + 1; j < activeCount; j++) {
      const b = agents[j];
      const r = (a.mode === 'rest' || b.mode === 'rest') ? B.restSeparation : B.separation;
      const dx = a.x - b.x, dz = a.z - b.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = (r - d) / r / d;
        sepX[i] += dx * push; sepZ[i] += dz * push;
        sepX[j] -= dx * push; sepZ[j] -= dz * push;
      }
    }
  }

  for (let i = 0; i < activeCount; i++) {
    const a = agents[i];
    respawnIfFar(a);
    let lit = 0;
    if (torch > 0) { const [vx, vy] = toView(a.x, a.z); lit = 1 - smoothstep(torchR * 0.5, torchR, Math.hypot(vx - tvx, vy - tvy)); }
    const e = smoothstep(a.lo, a.hi, E + torch * lit);
    a.e = e;
    const mode = e < B.restBelow ? 'rest' : e > B.hypeAbove ? 'hype' : 'mill';
    const gathering = mode === 'hype' && g > a.gatherThresh;
    if (mode !== a.mode || gathering !== a.gathering) { a.mode = mode; a.gathering = gathering; a.retarget = rand(0, 0.6); a.pause = 0; a.quirk = 'none'; }

    // outside the view: run in
    const outside = !inBounds(a.x, a.z);
    if (outside && !a.outside) a.retarget = 0;
    a.outside = outside;

    // a cow nearby: anyone not busy with a bit of business drops what they are doing and runs, arms in the air
    if (cows.length) {
      let near = cows[0], nd = Infinity;
      for (const c of cows) { const d = Math.hypot(a.x - c.x, a.z - c.z); if (d < nd) { nd = d; near = c; } }
      const K = CONFIG.cows;
      const R = K.fearRadius * (near.state === 'trot' ? 1.4 : near.state === 'paw' ? 1.2 : K.ambleFear);
      const scarable = !outside && (!a.task || a.task.seat);
      if (scarable && nd < R) {
        if (a.task) release(a);
        if (a.fearT <= 0 && a.sit + a.lie > 0.4) a.riseT = K.riseDelay; // caught sitting: a moment to get up first
        a.fearT = Math.max(a.fearT, K.fearHold); a.fearFrom = near;
      }
      // run into by a cow on the move: bowled over, flung along the cow's line (harder the faster it was going), flat for a moment, then up and away
      if (scarable && nd < K.knockRadius && a.downT <= 0 && near.speed > 0.4) {
        if (a.task) release(a);
        a.downT = K.downFor; a.fearT = K.fearHold; a.fearFrom = near;
        const f = 1.2 + near.speed * 0.4;
        a.flingX = Math.sin(near.heading) * f + (a.x - near.x) * 2; a.flingZ = Math.cos(near.heading) * f + (a.z - near.z) * 2;
        a.heading = rand(0, TAU); a.speed = 0;
      }
      if (a.downT > 0 && !a.task) { a.downT -= dt; knockedDown(a, i, dt); continue; }
      if (a.fearT > 0 && !a.task) {
        a.fearT -= dt;
        fleeCow(a, i, dt, a.fearFrom);
        if (a.fearT <= 0) { a.retarget = 0; a.pause = 0; a.quirk = 'none'; }
        continue;
      }
    }

    // scripted business takes precedence
    if (a.task) { updateTaskAgent(a, i, dt); continue; }

    // the party at the name
    const partying = cam.area === 'home' && party.g > a.gatherThresh && !outside && !a.follower;
    if (partying !== a.partying) { a.partying = partying; a.retarget = 0; a.pause = 0; a.launchAt = clock + rand(0, 0.25); }
    if (partying) { updatePartyAgent(a, i, dt); continue; }

    a.retarget -= dt;
    const ddx = a.tx - a.x, ddz = a.tz - a.z;
    const dist = Math.hypot(ddx, ddz);
    const arrived = dist < 0.5 || (a.settled && dist < 1.2); // with some give once there: a nudge from a neighbour would otherwise flip it between standing and setting off, a shuffle on the spot
    a.settled = arrived;
    if (arrived) a.pause -= dt;
    if (a.retarget <= 0 || (arrived && a.pause <= 0)) {
      if (outside) { pickRandom(a); a.retarget = rand(3, 6); a.pause = rand(0.3, 1.5); }
      else if (mode === 'rest') { if (takeSeat(a)) { updateTaskAgent(a, i, dt); continue; } pickSpread(a); a.retarget = rand(40, 80); a.pause = 1e9; }
      else if (gathering) {
        if (a.laps) { pickLap(a, gatherAt.x, gatherAt.z, gatherAt.r + B.lapRadius); a.retarget = rand(1, 2); a.pause = 0; }
        else { pickRing(a, gatherAt.x, gatherAt.z, gatherAt.r); if (gatherAt.full) { a.retarget = 1e9; a.pause = 1e9; } else { a.retarget = rand(8, 16); a.pause = rand(6, 14); } } // round the About text they take a spot and keep it
      }
      else if (mode === 'hype') {
        if (Math.random() < 0.2) pickRandom(a); else pickNear(a, B.localRange);
        a.retarget = rand(1, 3); a.pause = rand(0.3, 1.8);
        a.party = Math.random() < 0.55 ? 'jump' : 'cheer';
      }
      else {
        if (Math.random() < 0.3) pickRandom(a); else pickNear(a, B.localRange);
        a.retarget = rand(8, 16);
        const roll = Math.random();
        if (roll < 0.25) { if (takeSeat(a)) { updateTaskAgent(a, i, dt); continue; } a.quirk = 'sit'; a.pause = rand(4, 12); }
        else if (roll < 0.38) { a.quirk = 'cheer'; a.pause = rand(0.8, 2); }
        else if (roll < 0.48) { a.quirk = 'jump'; a.pause = rand(0.8, 2); }
        else { a.quirk = 'none'; a.pause = rand(0.5, 5); }
      }
      // never aim inside a word's circle, a placard, a film or a prop, nor at the name itself (a sitter getting up after the party would otherwise settle where it sits)
      { const t = { x: a.tx, z: a.tz }; if (!keepTargetOut(t)) [t.x, t.z] = randomPoint(); if (cam.area === 'home') keepOutName(t, 0.8); a.tx = t.x; a.tz = t.z; }
      a.settled = false;
    }

    // movement
    let want = 0;
    if (!arrived) {
      if (outside) want = dist > 4 ? B.hypeSpeed : B.walkSpeed * 1.3;
      else want = mode === 'hype' ? mix(B.walkSpeed, B.hypeSpeed, e) * (a.laps ? 1.15 : 1) : mode === 'rest' ? B.walkSpeed * 0.7 : B.walkSpeed * a.gaitScale;
    }
    a.speed = approach(a.speed, want, dt, B.accel);
    const moving = a.speed > 0.15;
    if (moving && dist > 1e-3) {
      let [sx, sz] = steerAround(a, a.tx, a.tz);
      [sx, sz] = steerAroundKeepOuts(a, sx, sz); // round the words (the two at the bottom as one), placards, films and props, not into their edge
      turnToward(a, Math.atan2(sx - a.x, sz - a.z), dt, B.turnRate);
    }
    const sepScale = 1 - 0.9 * Math.max(a.sit, a.lie);
    const px0 = a.x, pz0 = a.z;
    a.x += (Math.sin(a.heading) * a.speed + sepX[i] * sepScale) * dt;
    a.z += (Math.cos(a.heading) * a.speed + sepZ[i] * sepScale) * dt;
    for (const [kx, kz, kr] of keepOuts) keepOut(a, kx, kz, kr);
    keepOutName(a, 0, px0, pz0);
    noteStuck(a, px0, pz0, dt);
    a.gait += (a.speed / B.gaitStride) * TAU * dt;

    // where to look when standing still
    if (!moving) {
      if (gathering && !a.laps) turnToward(a, Math.atan2(gatherAt.x - a.x, gatherAt.z - a.z), dt, 5);
      else if (cursor.onStage) {
        const cx = cursor.gx - a.x, cz = cursor.gz - a.z;
        if (cx * cx + cz * cz < B.lookRadius * B.lookRadius) turnToward(a, Math.atan2(cx, cz), dt, 4);
      }
    }

    // state targets
    const resting = (mode === 'rest' || (mode === 'mill' && a.quirk === 'sit' && arrived)) && !moving && !outside;
    const amp = smoothstep(B.hypeAbove - 0.05, 0.95, e);
    const tSit = resting && !a.lies ? 1 : 0;
    const tLie = resting && a.lies && mode === 'rest' ? 1 : 0;
    let tJump = 0, tCheer = 0;
    if (outside) { tJump = 0; tCheer = 0; }
    else if (gathering && !a.laps) { const on = arrived ? 1 : 0.35; tJump = on; tCheer = on * 0.7; }
    else if (mode === 'hype') { const on = moving ? 0.35 : 1; tJump = amp * on * (a.party === 'jump' ? 1 : 0); tCheer = amp * on * (a.party === 'cheer' ? 1 : 0); }
    else if (mode === 'mill' && arrived) { tJump = a.quirk === 'jump' ? 0.7 : 0; tCheer = a.quirk === 'cheer' ? 0.8 : 0; }
    a.walk = approach(a.walk, moving ? clamp(a.speed / B.walkSpeed, 0.6, 1.4) : 0, dt, B.stateRate);
    a.jump = approach(a.jump, tJump, dt, B.stateRate);
    a.cheer = approach(a.cheer, tCheer, dt, B.stateRate);
    a.sit = approach(a.sit, tSit && !tLie ? 1 : 0, dt, tSit ? B.restRate : B.stateRate);
    a.lie = approach(a.lie, tLie, dt, tLie ? B.restRate : B.stateRate);
    a.lift = approach(a.lift, 0, dt, 5);
    a.arms = approach(a.arms, 0, dt, B.stateRate);
  }
}

function updatePartyAgent(a, i, dt) {
  const N = CONFIG.name;
  const role = a.nameRole;
  // where to be
  if (a.retarget <= 0) {
    if (role === 'on') { const p = sampleOnLetters(); if (p) [a.tx, a.tz] = p; else [a.tx, a.tz] = fromView(nameLabel.vcx + rand(-0.8, 0.8) * (nameLabel.halfW - N.pad), nameLabel.vcy + rand(-0.7, 0.7) * (nameLabel.halfH - N.pad)); a.retarget = 1e9; }
    else if (role === 'edge') { const p = sampleLetterEdge(); if (p) { a.tx = p.x; a.tz = p.z; a.edgeHeading = p.heading; } else { [a.tx, a.tz] = pointOnNameEdge(a.edgeU); a.edgeHeading = null; } a.retarget = 1e9; }
    else if (role === 'launcher') {
      const slots = [[-nameLabel.halfW - 2.5, nameLabel.halfH + 1.5], [nameLabel.halfW + 2.5, nameLabel.halfH + 1.5], [0, -nameLabel.halfH - 3]];
      const sl = slots[a.congaIndex % slots.length];
      [a.tx, a.tz] = fromView(nameLabel.vcx + sl[0], nameLabel.vcy + sl[1]); a.retarget = 1e9;
    }
    else if (role === 'audience') {
      const rx = nameLabel.halfW + 3 + a.ringR * 5, ry = nameLabel.halfH + 2.5 + a.ringR * 3.5;
      [a.tx, a.tz] = fromView(nameLabel.vcx + Math.cos(a.ringAngle) * rx, nameLabel.vcy + Math.sin(a.ringAngle) * ry); a.retarget = 1e9;
    }
  }
  if (role === 'conga') {
    if (a.congaIndex === 0) {
      // the leader walks a loop between the name and the ring
      const rx = nameLabel.halfW + 1.6, ry = nameLabel.halfH + 1.2;
      a.ringAngle += dt * (B.walkSpeed * 1.1) / ((rx + ry) / 2);
      [a.tx, a.tz] = fromView(nameLabel.vcx + Math.cos(a.ringAngle) * rx, nameLabel.vcy + Math.sin(a.ringAngle) * ry);
    } else {
      const ahead = CONGA[a.congaIndex - 1];
      a.tx = ahead.x; a.tz = ahead.z;
    }
  }
  a.retarget -= dt;
  const ddx = a.tx - a.x, ddz = a.tz - a.z;
  const dist = Math.hypot(ddx, ddz);
  const follow = role === 'conga' && a.congaIndex > 0;
  const arrived = dist < (follow ? 1.1 : 0.4);
  let want = 0;
  if (!arrived) want = role === 'conga' ? B.walkSpeed * 1.1 : Math.min(B.hypeSpeed, B.walkSpeed * 0.6 + dist * 1.6); // fast from afar, braking into the spot
  a.speed = approach(a.speed, want, dt, B.accel);
  const moving = a.speed > 0.15;
  const climbs = role === 'on' || role === 'edge';
  if (moving && dist > 1e-3) { const [sx, sz] = climbs ? [a.tx, a.tz] : steerAround(a, a.tx, a.tz); turnToward(a, Math.atan2(sx - a.x, sz - a.z), dt, B.turnRate); }
  const sepScale = climbs ? 0.15 : 0.6;
  const px0 = a.x, pz0 = a.z;
  a.x += (Math.sin(a.heading) * a.speed + sepX[i] * sepScale) * dt;
  a.z += (Math.cos(a.heading) * a.speed + sepZ[i] * sepScale) * dt;
  if (!climbs) keepOutName(a, 0, px0, pz0);
  noteStuck(a, px0, pz0, dt);
  a.gait += (a.speed / B.gaitStride) * TAU * dt;

  // facing and states
  const [nx, nz] = fromView(nameLabel.vcx, nameLabel.vcy);
  let tSit = 0, tJump = 0, tCheer = 0;
  let tLift = 0;
  if (role === 'edge' && arrived) {
    tSit = 1; tLift = nameLabel.mask ? nameLabel.height : 0;
    if (a.edgeHeading != null) turnToward(a, a.edgeHeading, dt, 3);
    else { const [ox, oz] = fromView(nameLabel.vcx + (toView(a.x, a.z)[0] - nameLabel.vcx) * 2, nameLabel.vcy + (toView(a.x, a.z)[1] - nameLabel.vcy) * 2); turnToward(a, Math.atan2(ox - a.x, oz - a.z), dt, 3); }
  }
  else if (role === 'on' && arrived) { tSit = 1; tLift = nameLabel.mask ? nameLabel.height : 0; }
  else if (role === 'audience' && arrived) {
    turnToward(a, Math.atan2(nx - a.x, nz - a.z), dt, 4);
    let d = a.ringAngle - party.wave; d = Math.atan2(Math.sin(d), Math.cos(d));
    tJump = Math.abs(d) < N.waveWidth ? 1 : 0;
    tCheer = tJump * 0.6;
  }
  else if (role === 'launcher') { // fires on the way to its spot as well as from it
    turnToward(a, Math.atan2(nx - a.x, nz - a.z), dt, 4);
    if (clock >= a.launchAt) { launchFirework(a.x, a.z); a.launchAt = clock + rand(FW.everyMin, FW.everyMax); a.pause = 0.7; }
    a.pause -= dt;
    tCheer = a.pause > 0 ? 1 : 0;
  }
  else if (role === 'conga') { tCheer = 0.35; }
  a.walk = approach(a.walk, moving ? clamp(a.speed / B.walkSpeed, 0.6, 1.4) : 0, dt, B.stateRate);
  a.jump = approach(a.jump, tJump, dt, B.stateRate * 1.5);
  a.cheer = approach(a.cheer, tCheer, dt, B.stateRate);
  a.sit = approach(a.sit, tSit, dt, tSit ? B.restRate * 1.6 : B.stateRate);
  a.lie = approach(a.lie, 0, dt, B.stateRate);
  a.lift = approach(a.lift, tLift, dt, 5);
  a.arms = approach(a.arms, 0, dt, B.stateRate);
  // the conga picks up anyone it brushes past
  if (role === 'conga' && a.congaIndex === CONGA.length - 1 && CONGA.length < CONFIG.vignettes.congaMax) {
    for (let j = 0; j < activeCount; j++) {
      const o = agents[j];
      if (o.nameRole !== 'audience' || o.task || o.follower || !o.partying) continue;
      if ((o.x - a.x) ** 2 + (o.z - a.z) ** 2 < 1.3 * 1.3) { o.nameRole = 'conga'; o.congaIndex = CONGA.length; CONGA.push(o); o.retarget = 0; break; }
    }
  }
}

// ============================================================================
// Scripted business: tasks that borrow a few figures and hand them back
// ============================================================================
const V = CONFIG.vignettes;
const headingToCamera = Math.atan2(-SCREEN_UP[0], -SCREEN_UP[1]);
function freeAgents(filter) { const out = []; for (let i = 0; i < activeCount; i++) { const a = agents[i]; if (!a.task && !a.follower && (!filter || filter(a))) out.push(a); } return out; }
function nearestFree(x, z, n, filter) {
  return freeAgents(filter).map((a) => [a, (a.x - x) ** 2 + (a.z - z) ** 2]).sort((p, q) => p[1] - q[1]).slice(0, n).map((p) => p[0]);
}
function assign(a, task) { a.task = task; a.taskArrived = false; a.retarget = 0; a.stuckT = 0; a.settled = false; }
function release(a) { if (a.task?.seat) a.task.seat.taken = null; a.task = null; a.taskArrived = false; a.retarget = 0; a.pause = 0; a.stuckT = 0; a.settled = false; }
function moveAgent(a, i, dt, tx, tz, speed, arrive = 0.4, allowName = false) {
  const ddx = tx - a.x, ddz = tz - a.z;
  const dist = Math.hypot(ddx, ddz);
  const t = a.task;
  const arrived = dist < arrive || (!t?.pin && a.settled && dist < arrive + 0.7); // the same give as a free figure's, except on a mark
  a.settled = arrived;
  if (arrived && t?.pin) { // ease the last few centimetres onto the mark, then hold it
    const k = Math.min(1, dt * B.settleRate);
    a.x += (tx - a.x) * k; a.z += (tz - a.z) * k;
    a.speed = approach(a.speed, 0, dt, B.accel); a.stuckT = 0;
    a.gait += (a.speed / B.gaitStride) * TAU * dt;
    return { arrived: true, moving: a.speed > 0.15 };
  }
  // brake on approach: a sprinter aimed at a small target would otherwise overshoot and circle it
  a.speed = approach(a.speed, arrived ? 0 : Math.min(speed, B.walkSpeed * 0.6 + dist * 1.6), dt, B.accel);
  const moving = a.speed > 0.15;
  if (moving && dist > 1e-3) {
    let [sx, sz] = allowName ? [tx, tz] : steerAround(a, tx, tz);
    if (!t?.ignoreProp) [sx, sz] = steerAroundKeepOuts(a, sx, sz); // a seat or a placard spot sits inside its own circle, so those two walk straight in
    turnToward(a, Math.atan2(sx - a.x, sz - a.z), dt, B.turnRate);
  }
  const px0 = a.x, pz0 = a.z;
  const sep = t?.noSep ? 0 : 0.5;
  a.x += (Math.sin(a.heading) * a.speed + sepX[i] * sep) * dt;
  a.z += (Math.cos(a.heading) * a.speed + sepZ[i] * sep) * dt;
  const skip = t?.ignoreProp;
  for (const [kx, kz, kr, id] of keepOuts) if (id == null || id !== skip) keepOut(a, kx, kz, kr);
  if (!allowName) keepOutName(a, 0, px0, pz0);
  if (!t?.pin) noteStuck(a, px0, pz0, dt); else if (a.speed > 0.6 && Math.hypot(a.x - px0, a.z - pz0) < a.speed * dt * 0.3) a.stuckT += dt; else a.stuckT = 0;
  a.gait += (a.speed / B.gaitStride) * TAU * dt;
  return { arrived, moving };
}
function setPose(a, dt, pose, moving) {
  const { sit = 0, lie = 0, jump = 0, cheer = 0, arms = 0, lift = 0 } = pose || {};
  a.walk = approach(a.walk, moving ? clamp(a.speed / B.walkSpeed, 0.6, 1.4) : 0, dt, B.stateRate);
  a.jump = approach(a.jump, jump, dt, B.stateRate);
  a.cheer = approach(a.cheer, cheer, dt, B.stateRate);
  a.sit = approach(a.sit, sit, dt, sit ? B.restRate : B.stateRate);
  a.lie = approach(a.lie, lie, dt, B.stateRate);
  a.arms = approach(a.arms, arms, dt, B.stateRate);
  a.lift = approach(a.lift, lift, dt, 5);
}
function updateTaskAgent(a, i, dt) {
  const t = a.task;
  if (t.until != null && clock > t.until) { release(a); return; }
  if (t.kind === 'follow') {
    if (!cursor.onStage) { a.speed = approach(a.speed, 0, dt, B.accel); setPose(a, dt, {}, false); return; }
    const dx = cursor.gx - a.x, dz = cursor.gz - a.z;
    const d = Math.hypot(dx, dz) || 1e-4;
    const keep = V.follower.distance;
    let tx = a.x, tz = a.z;
    if (d > keep + 0.6) { tx = cursor.gx - (dx / d) * keep; tz = cursor.gz - (dz / d) * keep; }
    else if (d < keep - 1.0) { tx = cursor.gx - (dx / d) * (keep + 1.2); tz = cursor.gz - (dz / d) * (keep + 1.2); }
    // never aim inside the name or a word's circle: stand at the edge instead
    { const t = { x: tx, z: tz }; keepOutName(t, 0.8); keepTargetOut(t, 0.3); tx = t.x; tz = t.z; }
    const speed = d > keep + 3 ? B.hypeSpeed * 0.9 : B.walkSpeed * 1.35;
    const { moving } = moveAgent(a, i, dt, tx, tz, speed, 0.3);
    if (!moving) turnToward(a, Math.atan2(dx, dz), dt, 5);
    setPose(a, dt, {}, moving);
    return;
  }
  // 'go': walk somewhere, then hold a pose
  if (t.seat && !t.arrived && !inBounds(t.x, t.z)) { release(a); return; } // the seat scrolled away before they got there
  const { arrived, moving } = moveAgent(a, i, dt, t.x, t.z, t.speed ?? B.walkSpeed, t.arrive ?? 0.4, !!t.allowName);
  if (arrived && t.face != null) turnToward(a, t.face, dt, 4);
  if (arrived && t.faceAt) turnToward(a, Math.atan2(t.faceAt[0] - a.x, t.faceAt[1] - a.z), dt, 4);
  setPose(a, dt, arrived ? t.pose : t.walkPose, moving);
  a.taskArrived = arrived;
  if (t.carry && arrived) { t.plantT = (t.plantT ?? 0) + dt; if (t.plantT > 0.9) { plantPlacard(t.carry, t.x, t.z); release(a); } }
}
// view-space helpers
const viewPoint = (vx, vy) => fromView(cam.x + vx, cam.y + vy);
const headingAlongView = (dx, dy) => { const [ax, az] = fromView(0, 0), [bx, bz] = fromView(dx, dy); return Math.atan2(bx - ax, bz - az); };
function nameClear(vx0, vy0, vx1, vy1) {
  const L = nameLabel, m = 1.5;
  return cam.area !== 'home' || !segmentHitsRect(cam.x + vx0, cam.y + vy0, cam.x + vx1, cam.y + vy1, L.vcx - L.halfW - m, L.vcy - L.halfH - m, L.vcx + L.halfW + m, L.vcy + L.halfH + m);
}

// --- home vignettes: one at a time
const vignette = { current: null, members: [], next: rand(10, 18) };
function endVignette() { for (const a of vignette.members) release(a); vignette.members = []; vignette.current = null; vignette.next = rand(V.everyMin, V.everyMax); }
function updateVignettes(dt) {
  const busy = cam.area !== 'home' || party.g > 0.15 || gatherAt.g > 0.15 || mood.hover;
  if (vignette.current) {
    if (busy) { endVignette(); return; }
    vignette.current.t += dt;
    vignette.current.update(dt);
    if (vignette.current.done) endVignette();
    return;
  }
  if (busy) return;
  vignette.next -= dt;
  if (vignette.next > 0) return;
  const starters = [startQueue, startPhoto, startDominoes];
  starters[Math.floor(Math.random() * starters.length)]();
  if (!vignette.current) vignette.next = 6;
}

function startQueue() {
  if (vignette.current) endVignette();
  const Q = V.queue;
  for (let tries = 0; tries < 8; tries++) {
    const hx = rand(-0.5, 0.5) * view.boundW, hy = rand(-0.5, 0.5) * view.boundH;
    const ang = rand(0, TAU), dx = Math.cos(ang), dy = Math.sin(ang);
    const len = Q.count * Q.spacing;
    if (Math.abs(hx + dx * len) > view.boundW || Math.abs(hy + dy * len) > view.boundH) continue;
    if (!nameClear(hx - dx * 3, hy - dy * 3, hx + dx * len, hy + dy * len)) continue;
    const [wx, wz] = viewPoint(hx, hy);
    const members = nearestFree(wx, wz, Q.count);
    if (members.length < Q.count) return;
    const toHead = headingAlongView(-dx, -dy), toBack = headingAlongView(dx, dy);
    members.forEach((a) => assign(a, { kind: 'go', x: a.x, z: a.z, pose: {}, walkPose: {}, speed: B.walkSpeed, face: toHead }));
    vignette.members = members;
    let head = 0, shuffleT = 3, lookT = 4, looking = false;
    const place = () => members.forEach((a, k) => { [a.task.x, a.task.z] = viewPoint(hx - dx * head + dx * k * Q.spacing, hy - dy * head + dy * k * Q.spacing); });
    place();
    vignette.current = {
      t: 0, done: false,
      update(dt) {
        if (this.t > Q.duration) { this.done = true; return; }
        shuffleT -= dt;
        if (shuffleT <= 0) { head += Q.step; shuffleT = rand(2.5, 4.5); place(); }
        lookT -= dt;
        if (lookT <= 0) { looking = !looking; lookT = looking ? rand(1, 2) : rand(2.5, 5); members[0].task.face = looking ? toBack : toHead; }
      },
    };
    return;
  }
}

function startPhoto() {
  if (vignette.current) endVignette();
  const P = V.photo;
  const n = P.rows * P.perRow;
  for (let tries = 0; tries < 8; tries++) {
    const cx = rand(-0.35, 0.35) * view.boundW;
    const cy = (Math.random() < 0.5 ? -1 : 1) * rand(0.45, 0.7) * view.boundH;
    const halfSpan = ((P.perRow - 1) / 2) * P.spacing + 1;
    if (!nameClear(cx - halfSpan, cy - P.rowGap - 3, cx + halfSpan, cy - P.rowGap - 3) || !nameClear(cx - halfSpan, cy + P.rowGap, cx + halfSpan, cy + P.rowGap)) continue;
    const [wx, wz] = viewPoint(cx, cy);
    const members = nearestFree(wx, wz, n + 1);
    if (members.length < n + 1) return;
    const late = members.pop();
    members.forEach((a, k) => {
      const r = Math.floor(k / P.perRow), c = k % P.perRow;
      const [x, z] = viewPoint(cx + (c - (P.perRow - 1) / 2) * P.spacing, cy + (r - 1) * P.rowGap);
      assign(a, { kind: 'go', x, z, pose: {}, walkPose: {}, speed: B.walkSpeed * 1.1, face: headingToCamera, row: r });
    });
    // the latecomer starts a way off and runs round the front at the last second
    const [lx, lz] = viewPoint(cx + (Math.random() < 0.5 ? -1 : 1) * (halfSpan + 6), cy - P.rowGap - 4);
    assign(late, { kind: 'go', x: lx, z: lz, pose: {}, walkPose: {}, speed: B.walkSpeed });
    vignette.members = [...members, late];
    let pulse = 0, lateSent = false;
    vignette.current = {
      t: 0, done: false,
      update(dt) {
        if (this.t > P.hold) { this.done = true; return; }
        pulse += dt;
        const jumping = this.t > 4 && (pulse % 1.6) < 0.8;
        for (const a of members) if (a.task.row === 2) a.task.pose = jumping ? { jump: 1 } : {};
        if (this.t > 6.5 && !lateSent) {
          lateSent = true;
          const [x, z] = viewPoint(cx + ((P.perRow - 1) / 2 + 1) * P.spacing * (lx < wx ? -1 : 1), cy - P.rowGap);
          Object.assign(late.task, { x, z, speed: B.hypeSpeed, face: headingToCamera, walkPose: { cheer: 0.4 } });
        }
      },
    };
    return;
  }
}

function startDominoes() {
  if (vignette.current) endVignette();
  const D = V.dominoes;
  for (let tries = 0; tries < 8; tries++) {
    const len = D.count * D.spacing;
    const ang = rand(0, TAU), dx = Math.cos(ang), dy = Math.sin(ang);
    const sx = rand(-0.6, 0.6) * view.boundW, sy = rand(-0.6, 0.6) * view.boundH;
    const ex = sx + dx * len, ey = sy + dy * len;
    if (Math.abs(ex) > view.boundW || Math.abs(ey) > view.boundH) continue;
    if (!nameClear(sx, sy, ex, ey)) continue;
    const [wx, wz] = viewPoint(sx, sy);
    const members = nearestFree(wx, wz, D.count);
    if (members.length < D.count) return;
    const facing = headingAlongView(-dx, -dy); // back to the line's direction, so they fall along it
    members.forEach((a, k) => { const [x, z] = viewPoint(sx + dx * k * D.spacing, sy + dy * k * D.spacing); assign(a, { kind: 'go', x, z, pose: {}, walkPose: {}, speed: B.walkSpeed * 1.1, face: facing, arrive: 0.25 }); });
    vignette.members = members;
    let fallAt = null;
    vignette.current = {
      t: 0, done: false,
      update() {
        if (fallAt == null && (members.every((a) => a.taskArrived) || this.t > 12)) fallAt = this.t + 1.2;
        if (fallAt == null) return;
        const since = this.t - fallAt;
        members.forEach((a, k) => { a.task.pose = since > k * D.delay && since < D.count * D.delay + 5 ? { lie: 1 } : {}; });
        if (since > D.count * D.delay + 7) this.done = true;
      },
    };
    return;
  }
}

// --- cold huddle (home, when it is properly cold)
const huddle = { active: false, members: [], rotateT: 0, cx: 0, cz: 0, nextAt: 0, until: 0 };
huddle.nextAt = CONFIG.vignettes.huddle.everyMin; // not straight away on load
function updateHuddle(dt) {
  const H = V.huddle;
  const cold = cam.area === 'home' && mood.w.cold > H.coldAbove && party.g < 0.1 && gatherAt.g < 0.1 && !vignette.current;
  const want = cold && clock >= huddle.nextAt;
  if (huddle.active && (clock >= huddle.until || (mood.w.cold < H.coldAbove - 0.12 || cam.area !== 'home' || party.g > 0.1 || gatherAt.g > 0.1))) {
    for (const a of huddle.members) release(a);
    huddle.members = []; huddle.active = false; huddle.nextAt = clock + rand(H.everyMin, H.everyMax); return;
  }
  if (!huddle.active) {
    if (!want) return;
    huddle.until = clock + H.lasts;
    const members = freeAgents((a) => a.huddler);
    if (members.length < 8) return;
    let mx = 0, mz = 0; for (const a of members) { mx += a.x; mz += a.z; }
    const c = { x: mx / members.length, z: mz / members.length }; clampToBounds(c);
    huddle.cx = c.x; huddle.cz = c.z; huddle.members = members; huddle.active = true; huddle.rotateT = H.rotateEvery;
    // rings: 6 inside, 13 next, the rest outside
    const rings = [[1.1, 6], [2.3, 13], [3.5, 40]];
    let k = 0;
    for (const [r, cap] of rings) for (let j = 0; j < cap && k < members.length; j++, k++) {
      const ang = (j / Math.min(cap, members.length - (k - j))) * TAU + r;
      assign(members[k], { kind: 'go', x: c.x + Math.cos(ang) * r, z: c.z + Math.sin(ang) * r, pose: {}, walkPose: {}, speed: B.walkSpeed * 0.8, faceAt: [c.x, c.z], ring: r });
    }
    return;
  }
  huddle.rotateT -= dt;
  if (huddle.rotateT <= 0) {
    huddle.rotateT = H.rotateEvery;
    const outer = huddle.members.filter((a) => a.task && a.task.ring > 3), inner = huddle.members.filter((a) => a.task && a.task.ring < 2);
    if (outer.length && inner.length) {
      const o = outer[Math.floor(Math.random() * outer.length)], n = inner[Math.floor(Math.random() * inner.length)];
      const ox = o.task.x, oz = o.task.z, orr = o.task.ring;
      o.task.x = n.task.x; o.task.z = n.task.z; o.task.ring = n.task.ring;
      n.task.x = ox; n.task.z = oz; n.task.ring = orr;
      o.taskArrived = n.taskArrived = false;
    }
  }
}

// --- the fall: in Work, someone walks across a thumbnail, trips on its edge and lies there
const trip = { next: 14, current: null, members: [] };
function endTrip() { for (const a of trip.members) release(a); trip.members = []; trip.current = null; trip.next = rand(V.trip.everyMin, V.trip.everyMax); }
function updateTrip(dt) {
  if (cam.area !== 'work') { if (trip.current) endTrip(); return; }
  if (trip.current) { trip.current.t += dt; trip.current.update(dt); if (trip.current.done) endTrip(); return; }
  trip.next -= dt;
  if (trip.next > 0) return;
  const hovered = hoverFilm || groundFilm;
  const it = filmItems.find((f) => { const [nx, ny] = groundToNdc(f.cx, f.cz); return Math.abs(nx) < 0.7 && Math.abs(ny) < 0.55 && f.film !== hovered; });
  if (!it) { trip.next = 4; return; }
  const vy = it.vcy + it.halfH * 0.7;
  const [sx, sz] = fromView(it.vcx - it.halfW - 1.5, vy);
  const [ex, ez] = fromView(it.vcx + it.halfW + 0.4, vy);
  const walker = nearestFree(sx, sz, 1)[0];
  if (!walker) { trip.next = 4; return; }
  assign(walker, { kind: 'go', x: sx, z: sz, pose: {}, walkPose: {}, speed: B.walkSpeed * 1.2, arrive: 0.5 });
  const helpers = nearestFree(ex, ez, 2);
  helpers.forEach((h) => assign(h, { kind: 'go', x: h.x, z: h.z, pose: {}, walkPose: {}, speed: B.walkSpeed }));
  trip.members = [walker, ...helpers];
  let stage = 'toStart', downAt = null;
  trip.current = {
    t: 0, done: false,
    update() {
      if (stage === 'toStart' && (walker.taskArrived || this.t > 8)) { stage = 'cross'; Object.assign(walker.task, { x: ex, z: ez, speed: B.walkSpeed * 1.25, arrive: 0.3 }); }
      else if (stage === 'cross' && (walker.taskArrived || this.t > 18)) {
        stage = 'down'; downAt = this.t;
        walker.task.pose = { lie: 1 }; walker.task.face = walker.heading + Math.PI; // face down the way he was going
        helpers.forEach((h, k) => { const [x, z] = fromView(it.vcx + it.halfW + 0.4 + (k === 0 ? -1.1 : 1.1), vy + 0.9); Object.assign(h.task, { x, z, faceAt: [ex, ez], speed: B.walkSpeed * 1.3, pose: {} }); });
      }
      else if (stage === 'down' && this.t > downAt + V.trip.down) { stage = 'up'; walker.task.pose = {}; walker.task.face = null; }
      else if (stage === 'up' && this.t > downAt + V.trip.down + 2) this.done = true;
    },
  };
}

// --- applause when a film has been watched
function applaud(film) {
  const it = filmItems.find((f) => f.film === film); if (!it) return;
  const [lo, hi] = V.applause.seconds;
  for (const a of nearestFree(it.cx, it.cz, 60)) {
    if (Math.hypot(a.x - it.cx, a.z - it.cz) > V.applause.radius) continue;
    assign(a, { kind: 'go', x: a.x, z: a.z, pose: { cheer: 0.55 }, walkPose: {}, faceAt: [it.cx, it.cz], until: clock + rand(lo, hi) });
  }
}

// --- HIRE ME: after a while at the name, the ring walks into letters and holds hands
let spellCache = null; // { points: [[vx, vy] relative to the formation centre], width, height }
// Single-stroke capitals in a unit box (x right, y up), as polylines; w is the letter's width
const STROKE_LETTERS = {
  H: { w: 0.7, lines: [[[0, 0], [0, 1]], [[0.7, 0], [0.7, 1]], [[0, 0.5], [0.7, 0.5]]] },
  I: { w: 0.0, lines: [[[0, 0], [0, 1]]] },
  R: { w: 0.7, lines: [[[0, 0], [0, 1], [0.5, 1], [0.7, 0.85], [0.7, 0.65], [0.5, 0.5], [0, 0.5]], [[0.35, 0.5], [0.7, 0]]] },
  E: { w: 0.65, lines: [[[0.65, 0], [0, 0], [0, 1], [0.65, 1]], [[0, 0.5], [0.5, 0.5]]] },
  M: { w: 0.9, lines: [[[0, 0], [0, 1], [0.45, 0.4], [0.9, 1], [0.9, 0]]] },
  P: { w: 0.65, lines: [[[0, 0], [0, 1], [0.45, 1], [0.65, 0.85], [0.65, 0.65], [0.45, 0.5], [0, 0.5]]] },
  T: { w: 0.7, lines: [[[0, 1], [0.7, 1]], [[0.35, 1], [0.35, 0]]] },
  Y: { w: 0.7, lines: [[[0, 1], [0.35, 0.5]], [[0.7, 1], [0.35, 0.5], [0.35, 0]]] },
  G: { w: 0.7, lines: [[[0.7, 0.85], [0.55, 1], [0.15, 1], [0, 0.85], [0, 0.15], [0.15, 0], [0.55, 0], [0.7, 0.15], [0.7, 0.45], [0.4, 0.45]]] },
  O: { w: 0.7, lines: [[[0.15, 0], [0, 0.15], [0, 0.85], [0.15, 1], [0.55, 1], [0.7, 0.85], [0.7, 0.15], [0.55, 0], [0.15, 0]]] },
  D: { w: 0.65, lines: [[[0, 0], [0, 1], [0.4, 1], [0.65, 0.8], [0.65, 0.2], [0.4, 0], [0, 0]]] },
  S: { w: 0.65, lines: [[[0.65, 0.85], [0.5, 1], [0.15, 1], [0, 0.85], [0, 0.65], [0.15, 0.5], [0.5, 0.5], [0.65, 0.35], [0.65, 0.15], [0.5, 0], [0, 0]]] },
  "'": { w: 0.12, lines: [[[0.06, 1], [0.06, 0.8]]] }, // one figure, up high
  ' ': { w: 0.35, lines: [] },
};
const LINE_GAP = 0.45; // between lines of the spelled phrase, in letter heights
function strokeWidth(line) { // width of one line in letter heights
  const gap = 0.4; let x = 0;
  for (const ch of line.toUpperCase()) { const g = STROKE_LETTERS[ch]; if (g) x += g.w + (g.lines.length ? gap : 0); }
  return x - gap;
}
function strokePoints(text, heightUnits, minDist) {
  // figure positions along single-stroke capitals; lines separated by \n, each centred; y up, origin at the block's centre
  const gap = 0.4; // between letters, in letter heights
  const lines = text.split('\n');
  const points = [];
  // each point carries its stroke's direction, so the figure can turn its arms along the line
  const push = (px, py, ux, uy) => { for (const q of points) if (Math.hypot(q[0] - px, q[1] - py) < minDist * 0.6) return; points.push([px, py, ux, uy]); };
  const total = lines.length + (lines.length - 1) * LINE_GAP; // in letter heights
  lines.forEach((line, li) => {
    const w = strokeWidth(line);
    let x = -w / 2;
    const base = total / 2 - (li + 1) * 1 - li * LINE_GAP; // bottom of this line, in letter heights, from the block centre
    for (const ch of line.toUpperCase()) {
      const g = STROKE_LETTERS[ch]; if (!g) continue;
      for (const stroke of g.lines) {
        for (let i = 0; i + 1 < stroke.length; i++) {
          const [x0, y0] = stroke[i], [x1, y1] = stroke[i + 1];
          const len = Math.hypot(x1 - x0, y1 - y0) * heightUnits;
          const ux = (x1 - x0) / (len / heightUnits || 1), uy = (y1 - y0) / (len / heightUnits || 1);
          const n = Math.max(1, Math.round(len / minDist));
          for (let k = 0; k <= n; k++) { const t = k / n; push((x + x0 + (x1 - x0) * t) * heightUnits, (base + y0 + (y1 - y0) * t) * heightUnits, ux, uy); }
        }
      }
      x += g.w + (g.lines.length ? gap : 0);
    }
  });
  const width = Math.max(...lines.map(strokeWidth)) * heightUnits;
  return { points, width, height: total * heightUnits, lines: lines.length };
}
const spell = { active: false, members: [], points: [], since: 0 };
const spellTask = (p) => ({ kind: 'go', x: p.x, z: p.z, pose: { arms: 1 }, walkPose: {}, speed: B.hypeSpeed, face: p.face, arrive: 0.35, pin: true, noSep: true, spellPt: true });
function updateSpell(dt) {
  const S = V.spell;
  const want = cam.area === 'home' && party.target === 1 && clock - party.since > S.after;
  if (spell.active && !want) { for (const a of spell.members) release(a); spell.members = []; spell.points = []; spell.active = false; return; }
  if (spell.active) {
    // failsafe: a point whose figure lost its task gets it back; a figure still on its way late in the day is let straight
    // through everything, and after that simply placed, so the phrase always completes
    const late = clock - spell.since > S.settle, veryLate = clock - spell.since > S.settle + S.place;
    spell.members.forEach((a, i) => {
      if (!a) return;
      const p = spell.points[i];
      if (!a.task || !a.task.spellPt) { assign(a, spellTask(p)); return; }
      if (late && !a.taskArrived) { a.task.allowName = true; a.task.speed = B.hypeSpeed * 1.5; }
      if (veryLate && !a.taskArrived) { const k = Math.min(1, dt * 3); a.x += (p.x - a.x) * k; a.z += (p.z - a.z) * k; } // glide in rather than appear
    });
    return;
  }
  if (!want) return;
  const free = (a) => !a.task && !a.follower; // off-screen figures count: they run in
  let pool = agents.slice(0, activeCount).filter((a) => (a.nameRole === 'audience' || a.nameRole === 'edge') && free(a));
  // which layout: two lines where there is width, three on a narrower window, a shorter phrase on a phone;
  // the first whose letters come out at least `legible` figure heights tall, else the last
  let text = S.layouts[S.layouts.length - 1], hMax = 0, gap = S.gap;
  for (const t of S.layouts) {
    const probe = strokePoints(t, 1, 1e9);              // width and height per unit of letter height
    const tight = probe.lines >= 3 ? S.tight : 1;        // three lines sit closer to the name and the top edge
    const room = view.halfH - nameLabel.halfH - S.gap * tight - S.margin * tight; // above the name, up to the top of the screen
    const h = Math.min(S.height, (S.widthFrac * 2 * view.halfW) / probe.width, room / probe.height);
    if (h >= S.legible || t === text) { text = t; hMax = h; gap = S.gap * tight; break; }
  }
  if (!spellCache || spellCache.h !== hMax || spellCache.text !== text) { spellCache = strokePoints(text, hMax, S.minDist); spellCache.h = hMax; spellCache.text = text; }
  // every point must get a figure or the phrase is garbled: short of figures, borrow the sitters, then shrink the letters
  if (spellCache.points.length > pool.length) pool = pool.concat(agents.slice(0, activeCount).filter((a) => a.nameRole === 'on' && free(a)));
  let fit = spellCache, h = hMax, md = S.minDist;
  while (fit.points.length > pool.length && (h > 2.5 || md < S.maxDist)) { if (h > 2.5) h *= 0.92; else md *= 1.1; fit = strokePoints(text, h, md); } // shrink, then space the figures out
  const pts = fit.points;
  if (pts.length > pool.length) return; // still short (the crowd is busy elsewhere): wait for the next frame
  const cx = nameLabel.vcx, cy = nameLabel.vcy + nameLabel.halfH + gap + fit.height / 2; // above the name
  const n = pts.length;
  // greedy: each point takes the nearest unclaimed figure
  const taken = new Set();
  for (let k = 0; k < n; k++) {
    const [x, z] = fromView(cx + pts[k][0], cy + pts[k][1]);
    let best = null, bestD = Infinity;
    for (const a of pool) {
      if (taken.has(a)) continue;
      const [ax, ay] = toView(a.x, a.z);
      const crosses = segmentHitsRect(ax, ay, cx + pts[k][0], cy + pts[k][1], nameLabel.vcx - nameLabel.halfW, nameLabel.vcy - nameLabel.halfH, nameLabel.vcx + nameLabel.halfW, nameLabel.vcy + nameLabel.halfH);
      const d = (a.x - x) ** 2 + (a.z - z) ** 2 + (crosses ? S.crossPenalty : 0);
      if (d < bestD) { bestD = d; best = a; }
    }
    taken.add(best);
    // arms go along the stroke: the figure's arms lie 90° from its heading, so face across the line, on the side nearer the camera
    const along = headingAlongView(pts[k][2], pts[k][3]);
    const diff = (h) => Math.abs(Math.atan2(Math.sin(h - headingToCamera), Math.cos(h - headingToCamera)));
    const face = diff(along - Math.PI / 2) <= diff(along + Math.PI / 2) ? along - Math.PI / 2 : along + Math.PI / 2;
    const p = { x, z, face };
    assign(best, spellTask(p));
    spell.members.push(best); spell.points.push(p);
  }
  spell.active = true; spell.since = clock;
}
function restoreConga() {
  for (const a of CONGA) if (a.baseRole !== 'conga') { a.nameRole = a.baseRole; }
  CONGA.length = 0; CONGA.push(...CONGA_BASE);
}

// ============================================================================
// Cows: two of them wander the plane, graze, and now and then make a run at a knot of people, who scatter
// ============================================================================
const cows = [];
const COW_PARTS = buildCowParts();
function makeCow() {
  const C = CONFIG.cows;
  const g = new THREE.Group();
  const mesh = (geos) => { const m = new THREE.Mesh(mergeGeometries(geos, false), propMat); m.castShadow = m.receiveShadow = useShadows; return m; };
  g.add(mesh(COW_PARTS.body));
  const head = mesh(COW_PARTS.head); head.position.set(...COW_PARTS.headAt); g.add(head);
  const hips = COW_PARTS.hips;
  const legs = COW_PARTS.legs.map((geos, k) => { const m = mesh(geos); m.position.set(hips[k][0], COW_PARTS.hipY, hips[k][1]); g.add(m); return m; });
  g.scale.setScalar(C.scale);
  scene.add(g);
  const c = { x: 0, z: 0, tx: 0, tz: 0, heading: rand(0, TAU), speed: 0, gait: 0, state: 'graze', t: rand(1, 4), graze: 0, headYaw: 0, detourDir: 0, detourTx: 0, detourTz: 0, nextCharge: clock + rand(6, 14), phase: rand(0, TAU), group: g, head, legs };
  [c.x, c.z] = randomPoint(); keepOutName(c, C.nameMargin); for (const [kx, kz, kr] of keepOuts) keepOut(c, kx, kz, kr + C.bodyKeep);
  c.tx = c.x; c.tz = c.z;
  return c;
}
// a view-space rectangle, pushed out of the way the name is
function keepOutRect(o, vcx, vcy, hw, hh) {
  const [vx, vy] = toView(o.x, o.z);
  const dx = vx - vcx, dy = vy - vcy;
  if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) return;
  const ox = hw - Math.abs(dx), oy = hh - Math.abs(dy);
  let nx = vx, ny = vy;
  if (ox < oy) nx = vcx + Math.sign(dx || 1) * hw; else ny = vcy + Math.sign(dy || 1) * hh;
  [o.x, o.z] = fromView(nx, ny);
}
function keepOutSpell(o) {
  if (!spell.active || !spell.points.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of spell.points) { const [vx, vy] = toView(p.x, p.z); x0 = Math.min(x0, vx); y0 = Math.min(y0, vy); x1 = Math.max(x1, vx); y1 = Math.max(y1, vy); }
  const m = CONFIG.cows.nameMargin;
  keepOutRect(o, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + m, (y1 - y0) / 2 + m);
}
// Round the nearest keep-out circle that the straight line to (sx, sz) would cross, if any; pad widens every circle.
// Circles that overlap (the two nav words at the bottom, the placards in their row) are taken as one enclosing circle,
// since a tangent point on one of them would otherwise sit inside its neighbour and the mover would be wedged between the two.
function steerAroundKeepOuts(o, sx, sz, pad = 0) {
  let hit = null, bestD = Infinity;
  for (const k of keepOuts) {
    const d = (k[0] - o.x) ** 2 + (k[1] - o.z) ** 2;
    if (d >= bestD) continue;
    const r = steerAroundCircle(o.x, o.z, sx, sz, k[0], k[1], k[2] + pad);
    if (r[0] !== sx || r[1] !== sz) { bestD = d; hit = k; }
  }
  if (!hit) return [sx, sz];
  let cx = hit[0], cz = hit[1], cr = hit[2] + pad;
  const used = new Set([hit]);
  for (let pass = 0; pass < 6; pass++) {
    let grew = false;
    for (const k of keepOuts) {
      if (used.has(k)) continue;
      const kr = k[2] + pad, d = Math.hypot(k[0] - cx, k[1] - cz);
      if (d >= cr + kr) continue;                       // apart
      used.add(k); grew = true;
      if (d + kr <= cr) continue;                       // already inside
      if (d + cr <= kr) { cx = k[0]; cz = k[1]; cr = kr; continue; } // it swallows ours
      const R = (d + cr + kr) / 2, t = (R - cr) / d;    // the circle enclosing both
      cx += (k[0] - cx) * t; cz += (k[1] - cz) * t; cr = R;
    }
    if (!grew) break;
  }
  // A target in the valley between two circles of the group (allowed: it is outside both) lies inside the enclosing circle, and
  // steering round that would never get there (a mover already in the valley would be steered out of it and jog on the spot).
  // Such a target is reached through the mouth of the valley: round the enclosing circle to the point on its edge nearest the
  // target, then straight in; a mover already inside goes round the one circle in its way, if any.
  if (used.size > 1) {
    const td = Math.hypot(sx - cx, sz - cz);
    if (td > 1e-6 && td < cr + 0.35) {
      const mx = cx + ((sx - cx) / td) * (cr + 0.6), mz = cz + ((sz - cz) / td) * (cr + 0.6);
      if (Math.hypot(o.x - cx, o.z - cz) < cr + 0.35) return steerAroundCircle(o.x, o.z, sx, sz, hit[0], hit[1], hit[2] + pad, o);
      if (Math.hypot(o.x - mx, o.z - mz) < 1.0) return [sx, sz];
      return steerAroundCircle(o.x, o.z, mx, mz, cx, cz, cr, o);
    }
  }
  return steerAroundCircle(o.x, o.z, sx, sz, cx, cz, cr, o);
}
function pickCowTarget(c) {
  const C = CONFIG.cows;
  const ang = rand(0, TAU), r = rand(2, C.wander);
  const t = { x: c.x + Math.cos(ang) * r, z: c.z + Math.sin(ang) * r };
  if (Math.random() < 0.5) { // half the time: amble over to somebody sitting about within range
    const near = []; for (let i = 0; i < activeCount; i++) { const a = agents[i]; if (!a.task && !a.outside && a.sit + a.lie > 0.5 && (a.x - c.x) ** 2 + (a.z - c.z) ** 2 < C.wander * C.wander * 1.5) near.push(a); }
    if (near.length) { const a = near[Math.floor(Math.random() * near.length)]; t.x = a.x; t.z = a.z; }
  }
  if (!inBounds(c.x, c.z)) [t.x, t.z] = randomPoint(); // from outside the view, anywhere inside it
  clampToBounds(t);
  if (cam.area === 'home') keepOutName(t, C.nameMargin + 1);
  for (const [kx, kz, kr] of keepOuts) keepOut(t, kx, kz, kr + C.bodyKeep + 0.5);
  c.tx = t.x; c.tz = t.z; c.bestD = null; c.stuckT = 0;
}
// Can a cow stand there? Not inside a keep-out widened by its body, nor the name's box with its margin
function cowCanReach(x, z) {
  const C = CONFIG.cows;
  for (const k of keepOuts) if ((k[0] - x) ** 2 + (k[1] - z) ** 2 < (k[2] + C.bodyKeep) ** 2) return false;
  if (cam.area === 'home') { const [vx, vy] = toView(x, z); if (Math.abs(vx - nameLabel.vcx) < nameLabel.halfW + C.nameMargin && Math.abs(vy - nameLabel.vcy) < nameLabel.halfH + C.nameMargin) return false; }
  return true;
}
// the free figure with the most company within arm's reach, if any is within range
function crowdKnot(c) {
  const C = CONFIG.cows;
  let best = null, bestN = 1;
  for (let i = 0; i < activeCount; i++) {
    const a = agents[i];
    if (a.task || a.outside || (a.x - c.x) ** 2 + (a.z - c.z) ** 2 > C.chargeReach * C.chargeReach || !cowCanReach(a.x, a.z)) continue;
    let n = 0;
    for (let j = 0; j < activeCount; j++) { const o = agents[j]; if (o !== a && !o.task && (o.x - a.x) ** 2 + (o.z - a.z) ** 2 < 2.5 * 2.5) n++; }
    if (n > bestN) { bestN = n; best = a; }
  }
  return best;
}
// the nearest free figure within range, or null
function nearestVictim(c) {
  const C = CONFIG.cows;
  let best = null, bestD = C.chargeReach * C.chargeReach;
  for (let i = 0; i < activeCount; i++) {
    const a = agents[i];
    if (a.task || a.outside || a.downT > 0) continue;
    const d = (a.x - c.x) ** 2 + (a.z - c.z) ** 2;
    if (d < bestD && cowCanReach(a.x, a.z)) { bestD = d; best = a; }
  }
  return best;
}
function updateCows(dt) {
  const C = CONFIG.cows;
  if (!cows.length) for (let i = 0; i < C.count; i++) cows.push(makeCow());
  for (const c of cows) {
    // a long way from the view (after a scroll or a page change): come back in from the nearest edge
    { const [vx, vy] = toView(c.x, c.z); const dx = vx - cam.x, dy = vy - cam.y;
      if (Math.abs(dx) > 1.5 * view.halfW || Math.abs(dy) > 1.5 * view.halfH) {
        if (Math.abs(dx) / view.halfW > Math.abs(dy) / view.halfH) [c.x, c.z] = fromView(cam.x + Math.sign(dx) * (view.halfW + 2), cam.y + rand(-0.8, 0.8) * view.halfH);
        else [c.x, c.z] = fromView(cam.x + rand(-0.8, 0.8) * view.halfW, cam.y + Math.sign(dy) * (view.halfH + 2));
        pickCowTarget(c); c.state = 'walk'; c.t = rand(...C.walk); c.victim = null;
      } }
    c.t -= dt;
    if (c.state === 'graze' && !inBounds(c.x, c.z)) c.t = 0; // off the edge of the view: no grazing out there, come in
    if (c.state === 'graze') { if (c.t <= 0) { c.state = 'walk'; pickCowTarget(c); c.t = rand(...C.walk); } }
    else if (c.state === 'walk') { if (Math.hypot(c.tx - c.x, c.tz - c.z) < 0.5 || c.t <= 0) { c.state = 'graze'; c.t = rand(...C.graze); } else if (!cowCanReach(c.tx, c.tz)) pickCowTarget(c); }
    else if (c.state === 'paw') { if (c.t <= 0) { c.state = 'trot'; c.t = C.chargeLasts; } }
    else if (c.state === 'trot') {
      // chase: swap a victim who has got away for whoever is nearest; give up when there is nobody or the time is up
      const v = c.victim;
      if (!v || v.task || v.outside || v.downT > 0 || Math.hypot(v.x - c.x, v.z - c.z) > C.chaseGiveUp || !cowCanReach(v.x, v.z)) { c.victim = nearestVictim(c); c.bestD = null; c.stuckT = 0; }
      if (c.t <= 0 || !c.victim) { c.state = 'graze'; c.t = rand(2, 4); c.victim = null; c.toss = 1; }
    }
    if ((c.state === 'graze' || c.state === 'walk') && clock >= c.nextCharge) {
      const knot = crowdKnot(c);
      if (knot) { c.state = 'paw'; c.victim = knot; c.t = C.pawFor; c.bestD = null; c.stuckT = 0; }
      c.nextCharge = clock + rand(...C.chargeEvery);
    }
    // where to: a wander target, or the victim, aimed a little ahead of them
    if (c.state === 'trot' && c.victim) { const v = c.victim; c.tx = v.x + Math.sin(v.heading) * v.speed * 0.25; c.tz = v.z + Math.cos(v.heading) * v.speed * 0.25; }
    const ddx = c.tx - c.x, ddz = c.tz - c.z, dist = Math.hypot(ddx, ddz);
    const want = c.state === 'walk' ? (dist < 0.3 ? 0 : C.speed) : c.state === 'trot' ? C.trot : 0;
    c.speed = approach(c.speed, want, dt, c.state === 'trot' ? 5 : 2);
    if (c.state === 'paw' && c.victim) turnToward(c, Math.atan2(c.victim.x - c.x, c.victim.z - c.z), dt, 4);
    else if (c.speed > 0.05 && dist > 1e-3) {
      let [sx, sz] = cam.area === 'home' ? steerAround(c, c.tx, c.tz) : [c.tx, c.tz];
      [sx, sz] = steerAroundKeepOuts(c, sx, sz, C.bodyKeep); // round the nav words, placards, props and films rather than into their edge
      turnToward(c, Math.atan2(sx - c.x, sz - c.z), dt, c.state === 'trot' ? 6 : 2);
    }
    const px0 = c.x, pz0 = c.z;
    c.x += Math.sin(c.heading) * c.speed * dt; c.z += Math.cos(c.heading) * c.speed * dt;
    for (const [kx, kz, kr] of keepOuts) keepOut(c, kx, kz, kr + C.bodyKeep);
    keepOutName(c, C.nameMargin, px0, pz0);
    keepOutSpell(c);
    // no progress toward the target for a while (stopped against something, or sliding along it): give the charge up, or think of somewhere else to go
    { const d = Math.hypot(c.tx - c.x, c.tz - c.z);
      if (c.bestD == null || d < c.bestD - 0.25) { c.bestD = d; c.stuckT = 0; } else if (c.speed > 0.3) c.stuckT = (c.stuckT ?? 0) + dt; }
    if (c.stuckT > 1.4) {
      c.stuckT = 0;
      if (c.state === 'trot') { c.state = 'graze'; c.t = 1.5; c.victim = null; c.toss = 1; }
      else { c.heading += rand(1.5, 3.5); pickCowTarget(c); c.state = 'walk'; c.t = rand(...C.walk); }
    }
    c.gait += (c.speed / 1.4) * TAU * dt;
    // the head dips to graze, drops and shakes while pawing, goes down horns first in a charge, tosses after one,
    // and otherwise turns toward a pointer nearby
    const grazing = c.state === 'graze' && c.speed < 0.1;
    c.graze = approach(c.graze, grazing ? 1 : 0, dt, 1.4);
    const pawing = c.state === 'paw', charging = c.state === 'trot';
    c.rage = approach(c.rage ?? 0, pawing || charging ? 1 : 0, dt, pawing ? 6 : 3);
    c.toss = Math.max(0, (c.toss ?? 0) - dt * 1.3);
    let yaw = 0;
    if (cursor.onStage && !grazing && !pawing && !charging) {
      const dx = cursor.gx - c.x, dz = cursor.gz - c.z;
      if (dx * dx + dz * dz < C.lookRadius * C.lookRadius) { let d = Math.atan2(dx, dz) - c.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw = clamp(d, -0.9, 0.9); }
    }
    if (pawing) yaw = Math.sin(clock * 11 + c.phase) * 0.3;
    c.headYaw = approach(c.headYaw, yaw, dt, pawing ? 12 : 3);
    const chew = c.graze > 0.3 ? Math.sin(clock * 5 + c.phase) * 0.05 * c.graze : 0;
    const tossPitch = Math.sin(clock * 15) * 0.3 * c.toss;
    const pitch = c.graze * 1.1 + chew + c.rage * (pawing ? 0.7 : 0.55) + tossPitch - c.toss * 0.25;
    c.head.rotation.set(pitch, c.headYaw * (1 - c.graze), 0);
    const [hx, hy, hz] = COW_PARTS.headAt;
    c.head.position.set(hx, hy - c.graze * 0.3 - c.rage * 0.08, hz + c.graze * 0.1 + c.rage * 0.06);
    // legs swing in diagonal pairs; pawing scrapes a front hoof
    const sw = Math.sin(c.gait) * 0.5 * clamp(c.speed / C.speed, 0, 1.4);
    c.legs[0].rotation.x = sw; c.legs[3].rotation.x = sw; c.legs[1].rotation.x = -sw; c.legs[2].rotation.x = -sw;
    if (pawing) c.legs[0].rotation.x = -0.75 * Math.max(0, Math.sin(clock * 9 + c.phase)) * c.rage;
    const bob = Math.abs(Math.sin(c.gait)) * (0.04 + 0.05 * c.rage) * clamp(c.speed / C.speed, 0, 1.4);
    c.group.position.set(c.x, bob, c.z);
    c.group.rotation.set(c.rage * 0.07 * (charging ? 1 : 0.4), c.heading, Math.sin(clock * 1.3 + c.phase) * 0.01 + (pawing ? Math.sin(clock * 23) * 0.015 : 0));
  }
}
// flat on the ground after a charge went through: a short fling, then lie still until downT runs out
function knockedDown(a, i, dt) {
  const K = CONFIG.cows;
  const u = 1 - a.downT / K.downFor; // 0 at impact, 1 getting up
  const fling = Math.max(0, 1 - u * 4); // the first quarter of the time on the ground
  a.x += a.flingX * fling * dt; a.z += a.flingZ * fling * dt;
  for (const [kx, kz, kr] of keepOuts) keepOut(a, kx, kz, kr);
  keepOutName(a, 0);
  a.lift = u < 0.25 ? 0.45 * Math.sin(Math.PI * u / 0.25) : 0;
  a.speed = 0;
  a.heading += dt * 9 * fling; // tumbling
  a.lie = approach(a.lie, 1, dt, 14);
  a.sit = approach(a.sit, 0, dt, 14);
  a.walk = approach(a.walk, 0, dt, 14);
  a.cheer = approach(a.cheer, 0, dt, 8);
  a.jump = approach(a.jump, 0, dt, 8);
  a.arms = approach(a.arms, u < 0.5 ? 1 : 0, dt, 10); // arms out, sprawled
}
function fleeCow(a, i, dt, c) {
  const C = CONFIG.cows;
  const dx = a.x - c.x, dz = a.z - c.z; const d = Math.hypot(dx, dz) || 1e-4;
  if (a.riseT > 0) { // getting up: on the spot, facing the cow, before the run
    a.riseT -= dt; a.speed = 0;
    turnToward(a, Math.atan2(-dx, -dz), dt, 6);
    a.sit = approach(a.sit, 0, dt, 6); a.lie = approach(a.lie, 0, dt, 6); a.walk = approach(a.walk, 0, dt, B.stateRate);
    a.cheer = approach(a.cheer, 0.9, dt, B.stateRate * 2); a.lift = approach(a.lift, 0, dt, 5); a.arms = approach(a.arms, 0, dt, B.stateRate);
    return;
  }
  // straight away from it, bending round the name and whatever else is in the way
  const ux = dx / d, uz = dz / d;
  const t = { x: a.x + ux * C.fleeDist, z: a.z + uz * C.fleeDist };
  if (!inBounds(t.x, t.z)) { // the edge of the view is that way: run along it instead, whichever way keeps more screen ahead
    const p1 = { x: a.x - uz * C.fleeDist, z: a.z + ux * C.fleeDist }, p2 = { x: a.x + uz * C.fleeDist, z: a.z - ux * C.fleeDist };
    const edge = (p) => { const [nx, ny] = groundToNdc(p.x, p.z); return Math.max(Math.abs(nx), Math.abs(ny)); };
    const pick = edge(p1) < edge(p2) ? p1 : p2; t.x = pick.x; t.z = pick.z;
  }
  clampToBounds(t); if (cam.area === 'home') keepOutName(t, 0.8);
  a.tx = t.x; a.tz = t.z;
  a.speed = approach(a.speed, B.hypeSpeed * C.fleeSpeed, dt, B.accel * 1.5);
  let [sx, sz] = steerAround(a, t.x, t.z);
  [sx, sz] = steerAroundKeepOuts(a, sx, sz); // and round the nav words and the rest, not into their edge
  turnToward(a, Math.atan2(sx - a.x, sz - a.z), dt, B.turnRate * 1.5);
  const px0 = a.x, pz0 = a.z;
  a.x += (Math.sin(a.heading) * a.speed + sepX[i] * 0.6) * dt;
  a.z += (Math.cos(a.heading) * a.speed + sepZ[i] * 0.6) * dt;
  for (const [kx, kz, kr] of keepOuts) keepOut(a, kx, kz, kr);
  keepOutName(a, 0, px0, pz0);
  a.gait += (a.speed / B.gaitStride) * TAU * dt;
  a.walk = approach(a.walk, clamp(a.speed / B.walkSpeed, 0.6, 1.4), dt, B.stateRate * 2);
  a.cheer = approach(a.cheer, 0.9, dt, B.stateRate * 2);   // arms in the air
  a.jump = approach(a.jump, 0, dt, B.stateRate);
  a.sit = approach(a.sit, 0, dt, B.stateRate * 2);
  a.lie = approach(a.lie, 0, dt, B.stateRate * 2);
  a.lift = approach(a.lift, 0, dt, 5);
  a.arms = approach(a.arms, 0, dt, B.stateRate);
}

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();
function updateInstances() {
  for (let i = 0; i < activeCount; i++) {
    const a = agents[i];
    dummy.position.set(a.x, a.lift, a.z);
    dummy.rotation.set(0, a.heading, 0);
    dummy.scale.setScalar(a.scale);
    dummy.updateMatrix();
    crowd.setMatrixAt(i, dummy.matrix);
    stateArr[i * 4] = a.sit; stateArr[i * 4 + 1] = a.walk; stateArr[i * 4 + 2] = a.jump; stateArr[i * 4 + 3] = a.cheer;
    lieArr[i] = a.lie;
    gaitArr[i] = a.gait;
    armsArr[i] = a.arms;
    tmpColor.copy(blended.figure).multiplyScalar(a.tint);
    crowd.setColorAt(i, tmpColor);
  }
  crowd.count = activeCount;
  crowd.instanceMatrix.needsUpdate = true;
  crowd.instanceColor.needsUpdate = true;
  stateAttr.needsUpdate = true;
  lieAttr.needsUpdate = true;
  gaitAttr.needsUpdate = true;
  armsAttr.needsUpdate = true;
}

// ============================================================================
// Mood: three anchors blended by inverse distance from the pointer (home), or set by the area.
// Sun: the pointer's offset from the screen centre is the sun's place in the sky.
// ============================================================================
const MOOD_KEYS = ['work', 'contact', 'cold', 'about'];
const anchors = {
  work: { ndc: [-0.9, 0.9], world: [0, 0] },
  shorts: { ndc: [0.3, -0.9], world: [0, 0] }, // the Short films word, next to Work; it shares the work palette
  about: { ndc: [-0.85, 0.9], world: [0, 0] },  // the About word, top left
  home: { ndc: [-0.85, 0.9], world: [0, 0] },   // the name, in the same slot, away from home
  contact: { ndc: [0.9, 0.9], world: [0, 0] },
  cold: { ndc: CONFIG.mood.coldAnchor, world: [0, 0] },
};
const WORD_KEYS = ['work', 'shorts', 'contact', 'about', 'home'];
const wordsShown = () => (cam.area === 'home' ? ['about', 'work', 'shorts', 'contact'] : ['home', 'work', 'shorts', 'contact']); // the nav words the crowd gathers at
const mood = {
  w: { work: 0.34, contact: 0.33, cold: 0.33, about: 0 },
  target: { work: 0.34, contact: 0.33, cold: 0.33, about: 0 },
  hover: null, hoverAnchor: null, // the palette being hovered, and which word (work and shorts share a palette)
  touchUntil: -1,
  sunDir: new THREE.Vector3(0, 1, 0),
  sunTarget: new THREE.Vector3(0, 1, 0),
  hazeX: 0, hazeY: 0,
  tint: new THREE.Color(1, 1, 1), tintW: 0, // a hovered film's poster colour, and how much of it shows
  gather: { work: 0, contact: 0 },
  gatherTarget: { work: 0, contact: 0 },
};

function placeAnchors() {
  const toNdc = (el, fallback) => {
    if (!(innerWidth > 0 && innerHeight > 0)) return fallback;
    const r = el.getBoundingClientRect();
    return [((r.left + r.right) / 2 / innerWidth) * 2 - 1, -(((r.top + r.bottom) / 2 / innerHeight) * 2 - 1)];
  };
  anchors.work.ndc = toNdc(document.getElementById('nav-work'), [-0.9, 0.9]);
  anchors.shorts.ndc = toNdc(document.getElementById('nav-shorts'), [0.3, -0.9]);
  anchors.contact.ndc = toNdc(document.getElementById('nav-contact'), [0.9, 0.9]);
  anchors.about.ndc = toNdc(document.getElementById('nav-about'), [-0.85, 0.9]);
  anchors.home.ndc = toNdc(document.getElementById('nav-home'), [-0.85, 0.9]);
  anchors.cold.ndc = CONFIG.mood.coldAnchor;
}
function updateAnchorWorld() {
  for (const k of Object.keys(anchors)) {
    const [nx, ny] = anchors[k].ndc;
    anchors[k].world = ndcToGround(nx * CONFIG.view.anchorPull, ny * CONFIG.view.anchorPull);
  }
}

function sunFromPointer(ndcX, ndcY, out) {
  const aspect = aspectRatio();
  const r = Math.min(1, Math.hypot(ndcX, ndcY) / CONFIG.sun.edgeAt); // lowest by the time the pointer reaches the words
  const el = mix(CONFIG.sun.centreElevation, CONFIG.sun.edgeElevation, r) * DEG;
  let sx = ndcX * aspect, sy = ndcY;
  const len = Math.hypot(sx, sy);
  if (len < 1e-4) { sx = 0; sy = 1; } else { sx /= len; sy /= len; }
  const gx = sx * SCREEN_RIGHT[0] + sy * SCREEN_UP[0];
  const gz = sx * SCREEN_RIGHT[1] + sy * SCREEN_UP[1];
  out.set(gx * Math.cos(el), Math.sin(el), gz * Math.cos(el));
}

function cyclePointer(t) {
  const aspect = aspectRatio();
  const ang = (3 * Math.PI) / 4 - (t / CONFIG.mood.cycleSeconds) * TAU;
  return [(Math.cos(ang) * CONFIG.mood.cycleRadius) / aspect, Math.sin(ang) * CONFIG.mood.cycleRadius];
}

function updateMood(dt, t) {
  const T = mood.target;
  let px = cursor.ndcX, py = cursor.ndcY;
  if (isTouch) {
    const [vx, vy] = cyclePointer(t);
    const hold = cursor.has ? clamp((mood.touchUntil - t) / CONFIG.mood.touchHold, 0, 1) : 0;
    px = mix(vx, cursor.ndcX, hold); py = mix(vy, cursor.ndcY, hold);
  }
  updateAnchorWorld();
  const [gx, gz] = ndcToGround(px, py);
  cursor.gx = gx; cursor.gz = gz;
  cursor.onStage = cursor.has || isTouch;
  groundFilm = cam.area !== 'work' || !cursor.onStage ? null : isTouch ? filmNearCentre() : filmUnderView(cam.x + (px / crawlScale(py)) * view.halfW, cam.y + py * view.halfH);
  const film = hoverFilm || groundFilm;
  const namePad = (party.was ? CONFIG.name.hoverLeave : CONFIG.name.hoverEnter) * view.halfH;
  // touch devices have no hover, so the party runs on a timer: once by itself soon after the placards are planted, and after any tap on the name
  if (isTouch && !party.welcomed && cam.area === 'home' && march.done) {
    if (!party.welcomeAt) party.welcomeAt = clock + CONFIG.name.welcomeAfter;
    else if (clock >= party.welcomeAt) { party.welcomed = true; party.until = clock + CONFIG.name.tapParty; }
  }
  const overName = cam.area === 'home' && cursor.onStage && !mood.hover
    && ((isTouch && clock < party.until)
      || (Math.abs(px * view.halfW - nameLabel.vcx) <= nameLabel.halfW + namePad
        && Math.abs(py * view.halfH - nameLabel.vcy) <= nameLabel.halfH + namePad));
  party.target = overName ? 1 : 0;
  if (overName && !party.was) party.since = clock;
  party.was = overName;
  party.wave += dt * CONFIG.name.waveSpeed;

  // mood weights and where to gather, by area
  T.about = 0;
  let gTarget = 0, gx2 = 0, gz2 = 0, gr = CONFIG.gather.exclusion;
  if (cam.area === 'work') {
    Object.assign(T, film ? CONFIG.mood.workHover : CONFIG.mood.workIdle);
    if (film) { const it = filmItems.find((f) => f.film === film); gTarget = 1; gx2 = it.cx; gz2 = it.cz; gr = it.keep; }
  } else if (cam.area === 'about' || cam.area === 'contact') {
    Object.assign(T, cam.area === 'about' ? CONFIG.mood.aboutArea : CONFIG.mood.contactArea);
    if (mood.hover && mood.hover !== 'home') for (const k of MOOD_KEYS) T[k] = k === mood.hover ? 1 : 0; // a hovered word brings its own light
    if (mood.hoverAnchor) { gTarget = 1; [gx2, gz2] = anchors[mood.hoverAnchor].world; gr = CONFIG.gather.exclusion; } // and the crowd runs to it
    else if (cam.area === 'about') { gTarget = 1; gx2 = aboutPoint.x; gz2 = aboutPoint.z; gr = aboutPoint.r; }
    else { gTarget = 0.85; gx2 = contactPoint.x; gz2 = contactPoint.z; gr = contactPoint.r; }
  } else {
    // home: the crowd only wakes up for the three words themselves; the torch light moving over them is the rest
    if (mood.hover) { for (const k of MOOD_KEYS) T[k] = k === mood.hover ? 1 : 0; [px, py] = anchors[mood.hoverAnchor || mood.hover].ndc; }
    else if (overName) Object.assign(T, CONFIG.name.palette);
    else { T.work = 0; T.contact = 0; T.cold = 1; }
    if (mood.hover) { gTarget = 1; [gx2, gz2] = anchors[mood.hoverAnchor || mood.hover].world; }
  }
  const k = 1 - Math.exp(-dt / CONFIG.mood.smoothing);
  for (const key of MOOD_KEYS) mood.w[key] += (T[key] - mood.w[key]) * k;
  const tinted = cam.area === 'work' && film && film.tint;
  if (tinted) mood.tint.copy(film.tint); // keep the last colour while it fades out
  mood.tintW += ((tinted ? 1 : 0) - mood.tintW) * k;
  gatherAt.g += ((overName ? 0 : gTarget) - gatherAt.g) * k;
  party.g += (party.target - party.g) * (1 - Math.exp(-dt / CONFIG.name.partyRamp));
  if (party.g < 0.05 && CONGA.length !== CONGA_BASE.length) restoreConga();
  if (gTarget > 0.01) { gatherAt.x = gx2; gatherAt.z = gz2; gatherAt.r = gr; gatherAt.full = cam.area === 'about' && !mood.hoverAnchor; }

  // keep-out circles: the words (at home), every play button, the form
  keepOuts.length = 0;
  if (cam.area !== 'work') for (const key of wordsShown()) keepOuts.push([anchors[key].world[0], anchors[key].world[1], CONFIG.gather.exclusion]);
  if (cam.area === 'home' && march.started) placards.forEach((p, i) => keepOuts.push([p.x, p.z, 0.7, 'placard' + i]));
  for (const it of filmItems) { keepOuts.push([it.cx, it.cz, it.keep]); if (it.tkeep) keepOuts.push([it.tcx, it.tcz, it.tkeep]); } // on a phone the caption under the poster is kept clear too
  keepOuts.push([contactPoint.x, contactPoint.z, contactPoint.r]);
  keepOuts.push([aboutPoint.x, aboutPoint.z, aboutPoint.r]);
  if (cam.area === 'work') for (const k of propKeepOuts) keepOuts.push(k);

  if (sunFollowsMouse) sunFromPointer(px, py, mood.sunTarget);
  else { mood.sunTarget.set(0, 0, 0); for (const key of MOOD_KEYS) mood.sunTarget.addScaledVector(moodDefs[key].dir, mood.w[key]); mood.sunTarget.normalize(); }
  mood.sunDir.lerp(mood.sunTarget, k).normalize();
  let hx = px, hy = py;
  if (cam.area === 'work') { hx = mix(px, CONFIG.films.centreX, CONFIG.films.lightPull); hy = mix(py, 0, CONFIG.films.lightPull); }
  mood.hazeX += (hx - mood.hazeX) * k; mood.hazeY += (hy - mood.hazeY) * k;
}

// Blended light/colour parameters
const moodDefs = {};
for (const k of MOOD_KEYS) {
  const m = CONFIG.moods[k];
  const el = m.elevation * DEG, az = m.azimuth * DEG;
  moodDefs[k] = {
    sun: new THREE.Color(m.sun), ambient: new THREE.Color(m.ambient), hemiSky: new THREE.Color(m.hemiSky),
    hemiGround: new THREE.Color(m.hemiGround), figure: new THREE.Color(m.figure), ground: new THREE.Color(m.ground),
    dir: new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)),
    sunIntensity: m.sunIntensity, ambientIntensity: m.ambientIntensity, hemiIntensity: m.hemiIntensity,
    emissive: m.emissive, bloom: m.bloom, exposure: m.exposure,
    hazeNear: new THREE.Color(m.hazeNear), hazeFar: new THREE.Color(m.hazeFar), hazeColor: new THREE.Color(m.hazeColor),
    hazeDark: m.hazeDark, hazeRadius: m.hazeRadius, hazeStrength: m.hazeStrength,
  };
}
const blended = {
  sun: new THREE.Color(), ambient: new THREE.Color(), hemiSky: new THREE.Color(), hemiGround: new THREE.Color(),
  figure: new THREE.Color(), ground: new THREE.Color(),
  hazeNear: new THREE.Color(), hazeFar: new THREE.Color(), hazeColor: new THREE.Color(),
  sunIntensity: 0, ambientIntensity: 0, hemiIntensity: 0, emissive: 0, bloom: 0, exposure: 1,
  hazeDark: 0, hazeRadius: 0, hazeStrength: 0,
};
const COLOR_KEYS = ['sun', 'ambient', 'hemiSky', 'hemiGround', 'figure', 'ground', 'hazeNear', 'hazeFar', 'hazeColor'];
const SCALAR_KEYS = ['sunIntensity', 'ambientIntensity', 'hemiIntensity', 'emissive', 'bloom', 'exposure', 'hazeDark', 'hazeRadius', 'hazeStrength'];

function applyMood() {
  for (const c of COLOR_KEYS) blended[c].setRGB(0, 0, 0);
  for (const s of SCALAR_KEYS) blended[s] = 0;
  for (const k of MOOD_KEYS) {
    const w = mood.w[k], d = moodDefs[k];
    for (const c of COLOR_KEYS) { blended[c].r += d[c].r * w; blended[c].g += d[c].g * w; blended[c].b += d[c].b * w; }
    for (const s of SCALAR_KEYS) blended[s] += d[s] * w;
  }
  if (mood.tintW > 0.001) { const T = CONFIG.films.tint, w = mood.tintW; blended.hazeNear.lerp(mood.tint, T.near * w); blended.hazeColor.lerp(mood.tint, T.colour * w); blended.hazeFar.lerp(mood.tint, T.far * w); blended.sun.lerp(mood.tint, T.sun * w); }
  sun.color.copy(blended.sun);
  sun.intensity = blended.sunIntensity;
  sun.position.copy(mood.sunDir).multiplyScalar(CONFIG.sun.distance).add(camWorld);
  ambient.color.copy(blended.ambient); ambient.intensity = blended.ambientIntensity;
  hemi.color.copy(blended.hemiSky); hemi.groundColor.copy(blended.hemiGround); hemi.intensity = blended.hemiIntensity;
  groundMat.color.copy(blended.ground);
  figureMat.emissive.copy(blended.figure).multiplyScalar(blended.emissive);
  renderer.toneMappingExposure = blended.exposure;
  if (bloomPass) bloomPass.strength = blended.bloom;
  hazeUniforms.uHazeCentre.value.set(mood.hazeX, mood.hazeY);
  hazeUniforms.uAspect.value = aspectRatio();
  {
    const dx = mood.hazeX * aspectRatio(), dy = mood.hazeY;
    const len = Math.hypot(dx, dy);
    if (len > 1e-3) hazeUniforms.uHazeDir.value.set(dx / len, dy / len);
    hazeUniforms.uHazeStretch.value = Math.min(1, Math.hypot(mood.hazeX, mood.hazeY));
  }
  hazeUniforms.uHazeNear.value.copy(blended.hazeNear);
  hazeUniforms.uHazeFar.value.copy(blended.hazeFar);
  hazeUniforms.uHazeColor.value.copy(blended.hazeColor);
  hazeUniforms.uHazeDark.value = blended.hazeDark;
  hazeUniforms.uHazeRadius.value = cam.area === 'work' ? Math.max(blended.hazeRadius, CONFIG.films.lightRadius) : blended.hazeRadius;
  hazeUniforms.uHazeStrength.value = blended.hazeStrength;
}

// ============================================================================
// Post-processing
// ============================================================================
let composer = null, bloomPass = null;
if (useBloom) {
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0, CONFIG.bloom.radius, CONFIG.bloom.threshold);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());
}

function snapshot(quality = 0.9) { render(); return renderer.domElement.toDataURL('image/jpeg', quality); } // the current frame as a JPEG data URL (og.jpg is made this way under ?debug)
function render() {
  if (composer) composer.render(); else renderer.render(scene, camera);
}

function resize() {
  if (innerWidth > 0 && innerHeight > 0) {
    renderer.setSize(innerWidth, innerHeight, false);
    if (composer) { composer.setPixelRatio(pixelRatio); composer.setSize(innerWidth, innerHeight); }
    hazeUniforms.uResolution.value.set(innerWidth * pixelRatio, innerHeight * pixelRatio);
  }
  fitCamera();
  placeAnchors();
  buildWorkColumn();
  buildAbout();
  buildNameLabel();
  spellCache = null;
  fwMat.uniforms.uPx.value = view.pxPerUnit * pixelRatio;
  goTo(cam.area, true);
  applyCamera();
  placeContact(); placeAboutText(); placeAboutStart();
}

// ============================================================================
// Navigation over the plane
// ============================================================================
function goTo(area, instant = false, fromHistory = false) {
  if (area === 'work') { cam.tx = 0; cam.ty = -CONFIG.world.workTop * view.halfH; }
  else if (area === 'shorts') { cam.tx = 0; cam.ty = Math.max(cam.minY ?? -1e9, sectionY['Short films'] ?? -CONFIG.world.workTop * view.halfH); }
  else if (area === 'contact') { cam.tx = CONFIG.world.contactRight * view.halfW; cam.ty = 0; }
  else if (area === 'about') { cam.tx = -CONFIG.world.aboutLeft * view.halfW; cam.ty = 0; }
  else { cam.tx = 0; cam.ty = 0; }
  if (instant) { cam.x = cam.tx; cam.y = cam.ty; }
  const target = area === 'home' ? location.pathname : `#${area}`;
  if (!fromHistory && location.hash !== (area === 'home' ? '' : `#${area}`)) (instant ? history.replaceState : history.pushState).call(history, null, '', target);
}
function scrollBy(pixels) {
  if (cam.tx !== 0) return; // only the home/work column scrolls
  const units = (pixels * CONFIG.world.wheelScale) * (2 * view.halfH / innerHeight);
  cam.ty = clamp(cam.ty - units, cam.minY ?? -1e9, 0);
}
function updateCamera(dt) {
  const k = 1 - Math.exp(-dt * CONFIG.world.glide);
  cam.x += (cam.tx - cam.x) * k;
  cam.y += (cam.ty - cam.y) * k;
  applyCamera();
}

for (const el of document.querySelectorAll('[data-go]')) {
  el.addEventListener('click', (e) => { e.preventDefault(); goTo(el.dataset.go); mood.hover = null; mood.hoverAnchor = null; });
}
window.addEventListener('wheel', (e) => { if (playerEl.hidden) scrollBy(e.deltaY); }, { passive: true });
const areaFromHash = () => (['work', 'contact', 'shorts', 'about'].includes(location.hash.replace('#', '')) ? location.hash.replace('#', '') : 'home');
window.addEventListener('popstate', () => { goTo(areaFromHash(), false, true); mood.hover = null; mood.hoverAnchor = null; });
window.addEventListener('keydown', (e) => {
  if (!playerEl.hidden) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown') scrollBy(e.key === 'PageDown' ? innerHeight * 0.8 : 80);
  if (e.key === 'ArrowUp' || e.key === 'PageUp') scrollBy(-(e.key === 'PageUp' ? innerHeight * 0.8 : 80));
});
let touchY = null;
window.addEventListener('touchstart', (e) => { touchY = e.touches[0]?.clientY ?? null; }, { passive: true });
window.addEventListener('touchmove', (e) => {
  const y = e.touches[0]?.clientY; if (y == null || touchY == null) return;
  scrollBy((touchY - y) * 1.5); touchY = y;
}, { passive: true });
window.addEventListener('hashchange', () => goTo(location.hash.replace('#', '') || 'home'));

// ============================================================================
// Input
// ============================================================================
let pressAt = null;
canvas.addEventListener('pointerdown', (e) => { pressAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!pressAt) return;
  const moved = Math.hypot(e.clientX - pressAt[0], e.clientY - pressAt[1]);
  pressAt = null;
  if (moved >= 6) return;
  const px = (e.clientX / innerWidth) * 2 - 1, py = -((e.clientY / innerHeight) * 2 - 1);
  const film = filmAtNdc(px, py);
  if (film) openPlayer(film);
  else if (isTouch && cam.area === 'home' && Math.abs(px * view.halfW - nameLabel.vcx) <= nameLabel.halfW + CONFIG.name.hoverLeave * view.halfH
    && Math.abs(py * view.halfH - nameLabel.vcy) <= nameLabel.halfH + CONFIG.name.hoverLeave * view.halfH) party.until = clock + CONFIG.name.tapParty; // a tap on the name
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || !(innerWidth > 0 && innerHeight > 0)) return;
  cursor.ndcX = (e.clientX / innerWidth) * 2 - 1;
  cursor.ndcY = -((e.clientY / innerHeight) * 2 - 1);
  cursor.has = true;
});
const touchPoint = (e) => {
  const t = e.touches[0]; if (!t) return;
  cursor.ndcX = (t.clientX / innerWidth) * 2 - 1;
  cursor.ndcY = -((t.clientY / innerHeight) * 2 - 1);
  cursor.has = true;
  mood.touchUntil = Infinity;
};
window.addEventListener('touchstart', touchPoint, { passive: true });
window.addEventListener('touchmove', touchPoint, { passive: true });
window.addEventListener('touchend', () => { mood.touchUntil = clock + CONFIG.mood.touchHold; }, { passive: true });

for (const el of document.querySelectorAll('[data-mood]')) {
  const on = () => { if (cam.area !== 'work') { mood.hover = el.dataset.mood; mood.hoverAnchor = el.dataset.anchor; } };
  const off = () => { if (mood.hoverAnchor === el.dataset.anchor) { mood.hover = null; mood.hoverAnchor = null; } };
  el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off);
  el.addEventListener('focus', on); el.addEventListener('blur', off);
}
let resizeT = 0;
window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { resize(); if (reducedMotion) stillFrame(); }, 150); });

// ============================================================================
// Loop, with a frame-time governor that thins the crowd
// ============================================================================
let clock = 0, last = performance.now();
let perfAcc = 0, perfFrames = 0, warm = 0;
const fpsSamples = [];
let cpuMs = 0, drawMs = 0;

function tick(dt) {
  updateCamera(dt);
  updateMood(dt, clock);
  if (!agents[0].task) assign(agents[0], { kind: 'follow' });
  updateVignettes(dt);
  updateHuddle(dt);
  updateTrip(dt);
  updateSpell(dt);
  updateCows(dt);
  updateAgents(dt);
  applyMood();
  updateInstances();
  updatePlacards();
  loadPostersNear();
  if (!march.started && clock > CONFIG.placards.after) startMarch(cam.area !== 'home');
  placePlays();
  placeContact(); placeAboutText(); placeAboutStart();
  updateFireworks();
  updateNavState();
  figureUniforms.uTime.value = clock;
}

const navHome = document.getElementById('nav-home');
const navWork = document.getElementById('nav-work');
const navContact = document.getElementById('nav-contact');
const navShorts = document.getElementById('nav-shorts');
const navAbout = document.getElementById('nav-about');
const scrollMark = document.getElementById('scrollmark');
function updateNavState() {
  const asp = aspectRatio(), [w0, w1] = CONFIG.torch.words;
  const N = CONFIG.nav, shown = wordsShown();
  const pxX = (cursor.ndcX + 1) / 2 * innerWidth, pxY = (1 - cursor.ndcY) / 2 * innerHeight;
  for (const [el, key] of [[navWork, 'work'], [navShorts, 'shorts'], [navContact, 'contact'], [navAbout, 'about'], [navHome, 'home']]) {
    const [ax, ay] = anchors[key].ndc;
    const lit = cam.area === 'home' && cursor.onStage && key !== 'home' ? 1 - smoothstep(w0, w1, Math.hypot((mood.hazeX - ax) * asp, mood.hazeY - ay)) : 0;
    // inline colour rather than a custom property: hover, focus and active keep their own colour via the stylesheet
    const own = mood.hoverAnchor === key || el.matches(':hover, :focus-visible') || el.classList.contains('active');
    el.style.color = lit > 0.005 && !own && key !== 'home' ? `rgba(20, 24, 36, ${(0.84 + 0.16 * lit).toFixed(3)})` : '';
    // the word leans a few pixels toward a nearby pointer and its halo brightens: a quiet invitation to click
    let near = 0, dx = 0, dy = 0;
    if (cursor.has && !isTouch && shown.includes(key) && !el.classList.contains('active')) {
      const [cx, cy] = [(ax + 1) / 2 * innerWidth, (1 - ay) / 2 * innerHeight];
      dx = pxX - cx; dy = pxY - cy;
      const d = Math.hypot(dx, dy);
      near = 1 - smoothstep(N.reachNear, N.reachFar, d);
      if (d > 1) { dx /= d; dy /= d; }
    }
    el.style.transform = near > 0.01 ? `translate(${(dx * near * N.lean).toFixed(1)}px, ${(dy * near * N.lean).toFixed(1)}px)` : '';
    el.style.textShadow = near > 0.01 ? `0 0 ${(10 + 10 * near).toFixed(0)}px rgba(255,255,255,${(0.55 + 0.45 * near).toFixed(2)}), 0 0 2px rgba(255,255,255,${(0.35 + 0.4 * near).toFixed(2)})` : '';
  }
  navHome.classList.toggle('show', cam.area !== 'home');
  // which section of the column the camera is in: the last heading at or above the screen's upper third
  let current = null; for (const [name, y] of Object.entries(sectionY).sort((a, b) => b[1] - a[1])) if (cam.y <= y + 0.35 * view.halfH) current = name;
  const inShorts = cam.area === 'work' && current === 'Short films';
  navWork.classList.toggle('active', cam.area === 'work' && !inShorts);
  navShorts.classList.toggle('active', inShorts);
  navAbout.classList.toggle('show', cam.area === 'home'); // the slot top left: About at home, the name elsewhere
  document.body.classList.toggle('home', cam.area === 'home');
  navContact.classList.toggle('active', cam.area === 'contact');
  document.body.classList.toggle('over-film', !!groundFilm);
  const inWork = cam.area === 'work' && cam.minY < 0;
  scrollMark.hidden = !inWork;
  if (inWork) {
    const total = -cam.minY, pos = clamp(-cam.y / total, 0, 1);
    const frac = clamp((2 * view.halfH) / (total + 2 * view.halfH), 0.06, 1);
    scrollMark.firstElementChild.style.height = `${frac * 100}%`;
    scrollMark.firstElementChild.style.top = `${pos * (1 - frac) * 100}%`;
  }
}

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now; clock += dt;

  const t0 = debug ? performance.now() : 0;
  tick(dt);
  const t1 = debug ? performance.now() : 0;
  render();
  if (debug) { cpuMs = cpuMs * 0.9 + (t1 - t0) * 0.1; drawMs = drawMs * 0.9 + (performance.now() - t1) * 0.1; }

  warm += dt;
  if (warm > CONFIG.perf.warmupSeconds && dt < 0.049) { // clamped frames are stalls (tab hidden, screenshots), not render cost
    perfAcc += dt; perfFrames++;
    if (perfAcc >= CONFIG.perf.windowSeconds) {
      const avg = (perfAcc / perfFrames) * 1000;
      if (avg > CONFIG.perf.thinAboveMs && activeCount > CONFIG.crowd.minCount) {
        activeCount = Math.max(CONFIG.crowd.minCount, Math.floor(activeCount * CONFIG.perf.thinFactor));
        if (debug) console.log(`[perf] ${avg.toFixed(1)}ms/frame, crowd thinned to ${activeCount}`);
      }
      perfAcc = 0; perfFrames = 0;
    }
  }
  if (debug) {
    fpsSamples.push(dt); if (fpsSamples.length > 30) fpsSamples.shift();
    const fps = fpsSamples.length / fpsSamples.reduce((a, b) => a + b, 0);
    const w = mood.w, d = mood.sunDir;
    const el = (Math.asin(d.y) / DEG).toFixed(0);
    debugEl.textContent = `fps ${fps.toFixed(0)}  crowd ${activeCount}  sim ${cpuMs.toFixed(2)}ms  draw ${drawMs.toFixed(2)}ms\nwork ${w.work.toFixed(2)}  contact ${w.contact.toFixed(2)}  cold ${w.cold.toFixed(2)}  gather ${gatherAt.g.toFixed(2)}  party ${party.g.toFixed(2)}\nsun ${el}°  area ${cam.area}  cam ${cam.x.toFixed(1)},${cam.y.toFixed(1)}  film ${(hoverFilm || groundFilm)?.id || '-'}`;
  }
  requestAnimationFrame(frame);
}

function stillFrame() {
  // prefers-reduced-motion: one still frame of the warm state
  mood.hover = 'work';
  cursor.has = true;
  for (const k of MOOD_KEYS) mood.w[k] = k === 'work' ? 1 : 0;
  for (let i = 0; i < 480; i++) tick(1 / 60);
  figureUniforms.uTime.value = 1.3;
  render();
}

if (debug) {
  const step = (seconds, dt = 1 / 60) => {
    for (let t = 0; t < seconds; t += dt) { clock += dt; tick(dt); }
    render();
    return mood.w;
  };
  window.__stage = { CONFIG, mood, agents, cursor, blended, anchors, view, cam, filmItems, gatherAt, party, nameLabel, goTo, step, groundToNdc, toView, scrollBy, seats, propKeepOuts, propMeshes, placards, march, startMarch, aboutPoint, launchFirework, vignette, huddle, trip, spell, startQueue, startPhoto, startDominoes, applaud, CONGA, cows, snapshot, fromView, keepOuts, get groundFilm() { return groundFilm; }, isNarrow };
}

const startArea = areaFromHash();
cam.area = startArea === 'shorts' ? 'work' : startArea;
resize();
buildPlacards();
goTo(startArea, true);
applyCamera();
applyCamera();
for (const a of agents) { [a.x, a.z] = randomPoint(); a.tx = a.x; a.tz = a.z; }
if (reducedMotion) stillFrame();
else requestAnimationFrame((now) => { last = now; frame(now); });
window.__siteReady = true;
// Redraw the floor text once the web font is in
if (document.fonts?.ready) document.fonts.ready.then(() => { buildWorkColumn(); buildNameLabel(); if (reducedMotion) stillFrame(); });
