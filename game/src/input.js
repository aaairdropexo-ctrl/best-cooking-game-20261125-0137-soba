// Soba After Midnight — input: keyboard and mouse. One job: turn a
// key press or a click into a game intent, and nothing else.

import { STATIONS, LAYOUT } from './config.js';

export function stationAt(x, y) {
  if (y < LAYOUT.kitchenTopY - 10 || y > LAYOUT.stationY + LAYOUT.stationH) return null;
  let best = null;
  let bestD = Infinity;
  for (const s of STATIONS) {
    const d = Math.abs(x - s.x);
    if (d < LAYOUT.stationW / 2 + 20 && d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

export function seatAt(x, y) {
  if (y < LAYOUT.bubbleY || y > LAYOUT.counterFrontY + 10) return -1;
  for (let i = 0; i < LAYOUT.seatX.length; i++) {
    if (Math.abs(x - LAYOUT.seatX[i]) < 120) return i;
  }
  return -1;
}

export function toppingAt(x, y) {
  if (y < LAYOUT.toppingButtonsY - 26 || y > LAYOUT.toppingButtonsY + 26) return null;
  const ids = ['tempura', 'egg', 'onion'];
  for (let i = 0; i < 3; i++) {
    const cx = 920 - 70 + i * 70;
    if (Math.abs(x - cx) < 34) return ids[i];
  }
  return null;
}

export function nearestStation(x) {
  let best = STATIONS[0];
  for (const s of STATIONS) {
    if (Math.abs(x - s.x) < Math.abs(x - best.x)) best = s;
  }
  return best;
}

// Bind the canvas and the keyboard. Callbacks keep this file free of
// game rules: it reports intents, main.js decides what they do.
export function bindInput(canvas, hooks) {
  const keys = new Set();
  const toLocal = (ev) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * 1280,
      y: ((ev.clientY - r.top) / r.height) * 720,
    };
  };

  canvas.addEventListener('pointerdown', (ev) => {
    const p = toLocal(ev);
    const topping = hooks.choosing ? toppingAt(p.x, p.y) : null;
    if (topping) {
      hooks.onTopping(topping);
      return;
    }
    const seat = seatAt(p.x, p.y);
    if (seat !== -1) {
      hooks.onSeat(seat);
      return;
    }
    const station = stationAt(p.x, p.y);
    if (station) {
      hooks.onStation(station);
      return;
    }
    hooks.onFloor(p.x);
  });

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    keys.add(ev.key.toLowerCase());
    if (ev.key === ' ' || ev.key.toLowerCase() === 'e') {
      ev.preventDefault();
      hooks.onAct();
    } else if (ev.key.toLowerCase() === 'r') {
      hooks.onRestart();
    } else if (ev.key.toLowerCase() === 'x') {
      hooks.onDump();
    } else if (ev.key === '1' || ev.key === '2' || ev.key === '3') {
      hooks.onSeat(Number(ev.key) - 1);
    }
  });
  window.addEventListener('keyup', (ev) => keys.delete(ev.key.toLowerCase()));

  return {
    left() {
      return keys.has('a') || keys.has('arrowleft');
    },
    right() {
      return keys.has('d') || keys.has('arrowright');
    },
  };
}
