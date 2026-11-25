// Soba After Midnight — the loop. One job: wire input to the world and
// draw it, sixty times a second. The rules live in world.js, the
// pictures in render.js; this file only connects them.

import { VIEW_W, VIEW_H, priceDish } from './config.js';
import { makeRng } from './random.js';
import {
  createWorld,
  spawnTicket,
  actAt,
  chooseTopping,
  serveSeat,
  dumpHands,
  update,
  resetWorld,
  setMessage,
} from './world.js';
import { bindInput, nearestStation } from './input.js';
import { render } from './render.js';
import { applyShot, SHOTS } from './shots.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 7);
const shot = params.get('shot');
const rng = makeRng(seed);
const world = createWorld(seed);
world.choosing = false;
spawnTicket(world, rng);
spawnTicket(world, rng);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

let pendingAction = null;
let last = performance.now();
let elapsed = 0;

function doAct(stationId) {
  const note = actAt(world, stationId);
  if (note === 'CHOOSE_TOPPING') {
    world.choosing = true;
    setMessage(world, 'Pick the topping for this dish.');
    return;
  }
  world.choosing = false;
  if (note) setMessage(world, note);
}

function walkTo(station) {
  world.chef.targetX = station.x;
  pendingAction = station.id;
}

const input = bindInput(canvas, {
  get choosing() {
    return world.choosing;
  },
  onStation(station) {
    if (world.status !== 'playing') return;
    if (Math.abs(world.chef.x - station.x) < 30) {
      doAct(station.id);
    } else {
      walkTo(station);
    }
  },
  onSeat(seat) {
    if (world.status !== 'playing') return;
    if (world.plate) {
      const note = serveSeat(world, seat, priceDish);
      setMessage(world, note);
      return;
    }
    if (world.seats[seat]) {
      world.activeSeat = seat;
      const t = world.seats[seat];
      setMessage(world, t.regular.name + ': ' + t.regular.line);
    }
  },
  onTopping(toppingId) {
    if (!world.choosing) return;
    const note = chooseTopping(world, toppingId);
    world.choosing = false;
    setMessage(world, note);
  },
  onFloor(x) {
    world.chef.targetX = Math.max(60, Math.min(1220, x));
    pendingAction = null;
  },
  onAct() {
    if (world.status !== 'playing') return;
    if (world.choosing) return;
    doAct(nearestStation(world.chef.x).id);
  },
  onDump() {
    setMessage(world, dumpHands(world));
  },
  onRestart() {
    resetWorld(world, rng);
    world.choosing = false;
    pendingAction = null;
    setMessage(world, 'New shift. The regulars are coming.');
  },
});

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  elapsed += dt;
  if (!shot) {
    // Keyboard walking overrides the click target.
    if (input.left()) {
      world.chef.targetX = Math.max(60, world.chef.x - 10);
      pendingAction = null;
    } else if (input.right()) {
      world.chef.targetX = Math.min(1220, world.chef.x + 10);
      pendingAction = null;
    }
    const chef = world.chef;
    const dx = chef.targetX - chef.x;
    if (Math.abs(dx) > 4) {
      chef.x += Math.sign(dx) * Math.min(Math.abs(dx), chef.speed * dt);
    } else if (pendingAction) {
      const stationId = pendingAction;
      pendingAction = null;
      doAct(stationId);
    }
    update(world, dt, rng);
  }
  render(ctx, world, elapsed);
  requestAnimationFrame(frame);
}

if (shot && SHOTS.indexOf(shot) !== -1) {
  applyShot(world, shot, rng);
}
requestAnimationFrame(frame);
