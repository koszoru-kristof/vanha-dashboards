import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import plan from '../data/floorplan.json';
import { buildFlat, polygonCentroid, makeLabel } from './build-flat.js';
import { buildDevices, DEVICE_KINDS } from './devices.js';
import { createBus } from './state.js';
import { startMock } from './adapters/mock.js';
import { installAutomations } from './automations.js';
import { mountPanel, makeHover } from './ui.js';

const CENTRE = new THREE.Vector3(
  plan.dims.interiorWidth / 2, 0, plan.dims.interiorDepth / 2,
);

/* ------------------------------------------------------------------ setup */

const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
container.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11151a);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 200);
camera.position.set(CENTRE.x + 5.5, 9.5, CENTRE.z + 10.5);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.copy(CENTRE);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.maxPolarAngle = Math.PI / 2 - 0.02;
orbit.update();


/* ------------------------------------------------------------ environment */

scene.add(new THREE.HemisphereLight(0xcfe3f7, 0x6a5f52, 1.35));
scene.add(new THREE.AmbientLight(0xffffff, 0.22));

// The plan is drawn south-up, so -Z is south: that is where the windows,
// the balcony and therefore the sun are.
const sun = new THREE.DirectionalLight(0xfff0dc, 2.3);
sun.position.set(CENTRE.x + 4, 11, CENTRE.z - 12);
sun.target.position.copy(CENTRE);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -10; sun.shadow.camera.right = 10;
sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -8;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);

// Fill from the opposite side so the north half of the flat is not a hole.
const fill = new THREE.DirectionalLight(0xdfe9f5, 0.5);
fill.position.set(CENTRE.x - 6, 7, CENTRE.z + 10);
fill.target.position.copy(CENTRE);
scene.add(fill, fill.target);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(90, 90),
  new THREE.MeshStandardMaterial({ color: 0x1b2026, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(CENTRE.x, -0.24, CENTRE.z);
ground.receiveShadow = true;
scene.add(ground);

/* ------------------------------------------------------------------- flat */

const CUT0 = 1.35;
const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT0);
const flat = buildFlat(plan, { clippingPlanes: [cutPlane] });
flat.setCut(CUT0);
scene.add(flat.group);

// Room labels, floating above the section cut.
const gLabels = new THREE.Group();
for (const room of plan.rooms) {
  const [x, z] = polygonCentroid(room.polygon);
  const spr = makeLabel(room.name, `${room.areaM2} m²`);
  spr.position.set(x, 0, z);
  gLabels.add(spr);
}
scene.add(gLabels);

// Labels ride just above the section so they stay legible at any cut height.
const placeLabels = (cut) => {
  for (const s of gLabels.children) s.position.y = Math.min(cut + 0.35, 2.45);
};
placeLabels(CUT0);

/* ---------------------------------------------------------------- devices */

const devices = buildDevices(plan);
const bus = createBus(devices);

const gMarkers = new THREE.Group();
scene.add(gMarkers);

const markerGeo = new THREE.SphereGeometry(0.06, 16, 12);
const visuals = new Map();   // deviceId -> { marker, light }

for (const d of devices) {
  const colour = new THREE.Color(DEVICE_KINDS[d.kind]?.marker ?? 0xffffff);
  const marker = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: colour }));
  marker.position.fromArray(d.pos);
  marker.userData = { kind: 'device', device: d.id };
  gMarkers.add(marker);

  let light = null;
  if (d.kind === 'light') {
    light = new THREE.PointLight(0xffd7a8, 0, 9, 2);
    light.position.fromArray(d.pos).y -= 0.1;
    scene.add(light);
  }
  visuals.set(d.id, { marker, light, base: colour });
}

/* --------------------------------------------------- state -> scene sync */

const doorTargets = new Map();   // openingId -> target angle in radians
for (const [id, { pivot }] of flat.doors) { doorTargets.set(id, 0); pivot.rotation.y = 0; }

function applyDevice(d) {
  const s = bus.get(d.id);
  const v = visuals.get(d.id);
  if (!v) return;

  switch (d.kind) {
    case 'light': {
      const lit = s.on ? s.brightness / 100 : 0;
      if (v.light) v.light.intensity = lit * d.watts * 12;
      v.marker.material.color.copy(v.base).multiplyScalar(0.25 + 0.75 * lit);
      break;
    }
    case 'blind': {
      const mesh = flat.blinds.get(d.opening);
      if (mesh) mesh.scale.y = Math.max(0.001, s.position / 100);
      v.marker.material.color.copy(v.base).multiplyScalar(0.3 + 0.007 * s.position);
      break;
    }
    case 'contact': {
      if (flat.doors.has(d.opening)) {
        doorTargets.set(d.opening, s.open ? flat.doors.get(d.opening).angle : 0);
      }
      v.marker.material.color.copy(v.base).multiplyScalar(s.open ? 1 : 0.3);
      break;
    }
    case 'leak':
      v.marker.material.color.set(s.wet ? 0xff5c3a : 0x2c4a5e);
      break;
    case 'smoke':
      v.marker.material.color.set(s.alarm ? 0xff3a3a : 0x5e3030);
      break;
    case 'motion':
      v.marker.material.color.copy(v.base).multiplyScalar(s.detected ? 1 : 0.3);
      break;
    case 'appliance':
      v.marker.material.color.copy(v.base).multiplyScalar(s.running ? 1 : 0.32);
      break;
    case 'heater':
      v.marker.material.color.copy(v.base).multiplyScalar(s.on ? 1 : 0.32);
      break;
    default:
      v.marker.material.color.copy(v.base).multiplyScalar(0.65);
  }
}

for (const d of devices) applyDevice(d);
bus.subscribe(({ id }) => {
  const d = bus.byId.get(id);
  if (d) applyDevice(d);
});

installAutomations(bus);
const stopMock = startMock(bus);
window.addEventListener('beforeunload', stopMock);

/* ------------------------------------------------------------------ view */

const view = {
  cut: CUT0,
  labels: true,
  markers: true,
  fixtures: true,
  set(key, value) {
    this[key] = value;
    if (key === 'cut') { cutPlane.constant = value; flat.setCut(value); placeLabels(value); }
    if (key === 'labels') gLabels.visible = value;
    if (key === 'markers') gMarkers.visible = value;
    if (key === 'fixtures') flat.gFixtures.visible = value;
  },
};

mountPanel({
  bus, plan, view,
  onFocus(d) {
    focusTarget = new THREE.Vector3().fromArray(d.pos);
  },
});
const hover = makeHover();

/* ------------------------------------------------------------ interaction */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerPx = { x: 0, y: 0 };
let pointerLive = false;
let focusTarget = null;
let dragged = false;

renderer.domElement.addEventListener('pointerdown', () => (dragged = false));
renderer.domElement.addEventListener('pointerleave', () => { pointerLive = false; hover.hide(); });
renderer.domElement.addEventListener('pointermove', (e) => {
  dragged = true;
  pointerLive = true;
  pointerPx = { x: e.clientX, y: e.clientY };
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
});

function pick() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([gMarkers, flat.gFixtures, flat.gFloors], true);
  return hits.find((h) => h.object.userData?.kind)?.object ?? null;
}

renderer.domElement.addEventListener('click', (e) => {
  if (dragged) return;
  const obj = pick();
  if (obj?.userData.kind !== 'device') return;
  const d = bus.byId.get(obj.userData.device);
  const t = d.controls.find((c) => c.kind === 'toggle');
  if (t) bus.toggle(d.id, t.key, 'scene');
  e.stopPropagation();
});

/* ------------------------------------------------------------------ loop */

const timer = new THREE.Timer();

function frame() {
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.1);

  // doors ease toward their target angle
  for (const [id, { pivot }] of flat.doors) {
    const target = doorTargets.get(id) ?? 0;
    pivot.rotation.y += (target - pivot.rotation.y) * Math.min(1, dt * 7);
  }

  if (focusTarget) {
    orbit.target.lerp(focusTarget, Math.min(1, dt * 4));
    if (orbit.target.distanceTo(focusTarget) < 0.02) focusTarget = null;
  }
  orbit.update();

  const obj = pointerLive ? pick() : null;
  if (obj?.userData.kind === 'device') {
    const d = bus.byId.get(obj.userData.device);
    const s = bus.get(d.id);
    const detail = Object.entries(s)
      .map(([k, v]) => `${k}: ${typeof v === 'number' ? Math.round(v * 10) / 10 : v}`)
      .join('  ·  ');
    hover.show(`${d.name} — ${detail}`, pointerPx.x, pointerPx.y);
  } else if (obj?.userData.kind === 'fixture') {
    hover.show(obj.userData.label, pointerPx.x, pointerPx.y);
  } else if (obj?.userData.kind === 'room') {
    const r = plan.rooms.find((x) => x.id === obj.userData.room);
    hover.show(`${r.name} · ${r.areaM2} m²`, pointerPx.x, pointerPx.y);
  } else {
    hover.hide();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

document.getElementById('loading')?.remove();
frame();

// handy for poking at things from the devtools console
Object.assign(window, { plan, bus, scene, camera, renderer, orbit, flat, view, THREE });
