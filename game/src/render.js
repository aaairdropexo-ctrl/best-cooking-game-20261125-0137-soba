// Soba After Midnight — rendering. One job: draw the stall from the
// world state, all with canvas primitives. No images, no network.

import {
  PALETTE,
  DISHES,
  TOPPINGS,
  STATIONS,
  LAYOUT,
  SHIFT_SECONDS,
  TARGET_SERVED,
  formatClock,
} from './config.js';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = (weight || 'bold') + ' ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function drawSky(ctx, time) {
  const g = ctx.createLinearGradient(0, 0, 0, 170);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(0.85, PALETTE.horizon);
  g.addColorStop(1, PALETTE.horizonGlow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 175);
  // Stars fading out near the sunset band.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 197) % 1280;
    const sy = (i * 89) % 70;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.7 + i));
    ctx.globalAlpha = tw * 0.8;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;
  // Rooftop silhouettes with lit windows — the neighbourhood at dusk.
  ctx.fillStyle = PALETTE.roof;
  let rx = 0;
  const roofs = [90, 120, 80, 130, 95, 115, 85, 125, 100, 110];
  for (let i = 0; i < roofs.length; i++) {
    const w = 128;
    ctx.fillRect(rx, 175 - roofs[i], w, roofs[i]);
    ctx.beginPath();
    ctx.moveTo(rx, 175 - roofs[i]);
    ctx.lineTo(rx + w / 2, 175 - roofs[i] - 22);
    ctx.lineTo(rx + w, 175 - roofs[i]);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.roofWindow;
    ctx.fillRect(rx + 30, 175 - roofs[i] + 26, 12, 14);
    ctx.fillRect(rx + 76, 175 - roofs[i] + 48, 12, 14);
    ctx.fillStyle = PALETTE.roof;
    rx += w;
  }
  // Paper lanterns on a string across the sky.
  ctx.strokeStyle = 'rgba(40,30,20,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.quadraticCurveTo(640, 62, 1280, 30);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const lx = 90 + i * 183;
    const ly = 30 + Math.sin((lx / 1280) * Math.PI) * 28;
    const flick = 0.85 + 0.15 * Math.sin(time * 2 + i * 1.7);
    ctx.globalAlpha = 0.35 * flick;
    ctx.fillStyle = PALETTE.lanternGlow;
    ctx.beginPath();
    ctx.arc(lx, ly + 16, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.lantern;
    ctx.beginPath();
    ctx.ellipse(lx, ly + 16, 13, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c33';
    ctx.fillRect(lx - 13, ly + 8, 26, 4);
    ctx.fillRect(lx - 13, ly + 20, 26, 4);
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(16, 12, 24, 0.72)';
  roundRect(ctx, 12, LAYOUT.hudY, 1256, LAYOUT.hudH, 12);
  ctx.fill();
  // Coins, top left.
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(40, 30, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a6d1e';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 40, 31);
  text(ctx, '$' + world.coins, 60, 30, 22, PALETTE.cream, 'left');
  // Target, top centre.
  text(ctx, 'SERVED ' + world.served + '/' + TARGET_SERVED, 640, 30, 22, PALETTE.cream, 'center');
  const tw = 150;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  roundRect(ctx, 640 - tw / 2, 46, tw, 6, 3);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  roundRect(ctx, 640 - tw / 2, 46, tw * Math.min(1, world.served / TARGET_SERVED), 6, 3);
  ctx.fill();
  // Shift clock, top right.
  const frac = Math.max(0, world.clock / SHIFT_SECONDS);
  ctx.fillStyle = frac < 0.25 ? PALETTE.red : PALETTE.cream;
  roundRect(ctx, 1080, 16, 150, 14, 7);
  ctx.fill();
  ctx.fillStyle = frac < 0.25 ? '#ff8a8a' : PALETTE.gold;
  roundRect(ctx, 1080, 16, 150 * frac, 14, 7);
  ctx.fill();
  text(ctx, formatClock(world.clock), 1155, 44, 16, PALETTE.cream, 'center');
  if (world.combo > 1) {
    text(ctx, 'COMBO x' + world.combo, 990, 30, 20, '#ffb84d', 'right');
  }
}

// The customer bar: three regulars behind the top counter, each with a
// name tag and an order bubble. A bubble is the order board.
function drawCustomer(ctx, world, seat, ticket, time, ghost) {
  const x = LAYOUT.seatX[seat];
  const cy = LAYOUT.seatPortraitY;
  const regular = ticket.regular;
  const active = world.seats[world.activeSeat] === ticket;
  // Order bubble above the head.
  const bw = 150;
  const bx = x - bw / 2;
  const by = LAYOUT.bubbleY;
  ctx.fillStyle = active ? '#fff8e0' : '#ffffff';
  ctx.strokeStyle = active ? PALETTE.gold : '#d8cbb2';
  ctx.lineWidth = active ? 3 : 2;
  roundRect(ctx, bx, by, bw, 46, 10);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 8, by + 46);
  ctx.lineTo(x + 8, by + 46);
  ctx.lineTo(x, by + 56);
  ctx.closePath();
  ctx.fillStyle = active ? '#fff8e0' : '#ffffff';
  ctx.fill();
  // Dish icon inside the bubble: a bowl for hot, a tray for zaru.
  drawMiniDish(ctx, bx + 24, by + 23, ticket.dish, 13);
  text(ctx, DISHES[ticket.dish].short, bx + 44, by + 16, 15, PALETTE.ink, 'left');
  text(ctx, TOPPINGS[ticket.topping].name, bx + 44, by + 33, 12, '#6b5a44', 'left');
  // Patience bar under the bubble text.
  const pf = Math.max(0, ticket.patience / ticket.patienceMax);
  ctx.fillStyle = '#e5dcc8';
  roundRect(ctx, bx + 10, by + 40, bw - 20, 4, 2);
  ctx.fill();
  ctx.fillStyle = pf > 0.5 ? PALETTE.green : pf > 0.25 ? PALETTE.gold : PALETTE.red;
  roundRect(ctx, bx + 10, by + 40, (bw - 20) * pf, 4, 2);
  ctx.fill();
  // Portrait: face, hair, shirt, and a mood that shows at a glance.
  // A just-served regular fades, but the hearts stay bright.
  ctx.globalAlpha = ghost ? 0.7 : 1;
  ctx.fillStyle = regular.shirt;
  roundRect(ctx, x - 34, cy + 12, 68, 34, 10);
  ctx.fill();
  ctx.fillStyle = regular.skin;
  ctx.beginPath();
  ctx.arc(x, cy, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = regular.hair;
  ctx.beginPath();
  ctx.arc(x, cy - 8, 30, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 30, cy - 10, 12, 12);
  ctx.fillRect(x + 18, cy - 10, 12, 12);
  // Eyes and mouth by mood.
  const delighted = ticket.mood === 'delighted' || ticket.mood === 'happy';
  ctx.fillStyle = '#241a12';
  if (ticket.mood === 'meh') {
    ctx.fillRect(x - 16, cy - 2, 10, 2);
    ctx.fillRect(x + 6, cy - 2, 10, 2);
  } else {
    ctx.beginPath();
    ctx.arc(x - 11, cy - 2, 3, 0, Math.PI * 2);
    ctx.arc(x + 11, cy - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#241a12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (delighted) {
    ctx.arc(x, cy + 6, 10, 0.15 * Math.PI, 0.85 * Math.PI);
  } else if (ticket.mood === 'meh') {
    ctx.arc(x, cy + 16, 8, 1.15 * Math.PI, 1.85 * Math.PI);
  } else {
    ctx.arc(x, cy + 4, 8, 0.2 * Math.PI, 0.8 * Math.PI);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (ticket.mood === 'delighted') {
    drawHeart(ctx, x + 34, cy - 26, 9, '#ff6b81');
    drawHeart(ctx, x - 36, cy - 18, 7, '#ff6b81');
  }
  // Name tag on the counter edge.
  text(ctx, regular.name + ' · ' + regular.job, x, LAYOUT.counterTopY + 26, 13, PALETTE.cream, 'center');
  if (active) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    roundRect(ctx, x - 44, cy - 40, 88, 92, 14);
    ctx.stroke();
  }
}

function drawHeart(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s);
  ctx.bezierCurveTo(x - s * 1.2, y, x - s * 0.5, y - s, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y - s, x + s * 1.2, y, x, y + s);
  ctx.fill();
}

function drawMiniDish(ctx, x, y, dish, r) {
  if (dish === 'hot') {
    ctx.fillStyle = '#7a4a2b';
    ctx.beginPath();
    ctx.arc(x, y + 3, r, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = PALETTE.broth;
    ctx.beginPath();
    ctx.ellipse(x, y + 3, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.noodle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r + 3, y + 2);
    ctx.quadraticCurveTo(x, y - 3, x + r - 3, y + 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = PALETTE.zaruTray;
    ctx.fillRect(x - r, y - 2, r * 2, 10);
    ctx.strokeStyle = PALETTE.noodle;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - r + 2, y - 4 - i * 3);
      ctx.lineTo(x + r - 2, y - 4 - i * 3);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.onion;
    ctx.fillRect(x - 4, y - 12, 8, 4);
  }
}

function drawCustomerBar(ctx, world, time) {
  // Counter the regulars sit behind.
  ctx.fillStyle = PALETTE.counterTop;
  ctx.fillRect(0, LAYOUT.counterTopY, 1280, 14);
  ctx.fillStyle = PALETTE.counterFront;
  ctx.fillRect(0, LAYOUT.counterTopY + 14, 1280, LAYOUT.counterFrontY - LAYOUT.counterTopY - 14);
  ctx.fillStyle = PALETTE.counterEdge;
  ctx.fillRect(0, LAYOUT.counterTopY + 14, 1280, 4);
  for (let i = 0; i < 3; i++) {
    const ticket = world.seats[i];
    if (ticket) {
      drawCustomer(ctx, world, i, ticket, time, false);
    } else if (world.lastServed && world.lastServed.seat === i) {
      drawCustomer(ctx, world, i, world.lastServed.ticket, time, true);
    } else {
      text(ctx, 'seat ' + (i + 1) + ' — press ' + (i + 1) + ' to serve', LAYOUT.seatX[i], 132, 13, 'rgba(255,243,214,0.45)', 'center');
    }
  }
}

// The kitchen: one long wooden counter with the stations on it, in the
// order a dish travels. Each station shows what it holds right now.
function drawKitchen(ctx, world, time) {
  ctx.fillStyle = PALETTE.counterTop;
  roundRect(ctx, 20, LAYOUT.kitchenTopY, 1240, 22, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.counterFront;
  roundRect(ctx, 20, LAYOUT.kitchenTopY + 22, 1240, 290, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = 60; x < 1280; x += 90) {
    ctx.fillRect(x, LAYOUT.kitchenTopY + 30, 3, 280);
  }
  for (const station of STATIONS) {
    drawStation(ctx, world, station, time);
  }
  drawCounterProps(ctx, world, time);
  drawToppingChooser(ctx, world);
}

// The counter front would be a dead brown band without these: a stack
// of bowls, sauce bottles and the stall's little menu board.
function drawCounterProps(ctx, world, time) {
  const y = 470;
  // Stacked bowls, left.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 ? '#7a4a2b' : '#f5efe0';
    ctx.beginPath();
    ctx.arc(90, y - i * 16, 30 - i * 3, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.broth;
  ctx.beginPath();
  ctx.ellipse(90, y - 32, 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sauce bottles.
  const bottles = ['#c94f3d', '#5da24a', '#e0a83c'];
  for (let i = 0; i < 3; i++) {
    const bx = 190 + i * 42;
    ctx.fillStyle = bottles[i];
    roundRect(ctx, bx - 11, y - 44, 22, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#2c2118';
    ctx.fillRect(bx - 6, y - 54, 12, 12);
  }
  // Chopstick holder.
  ctx.fillStyle = '#8a6d3f';
  roundRect(ctx, 330, y - 30, 26, 30, 4);
  ctx.fill();
  ctx.strokeStyle = '#e8c87e';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(334 + i * 6, y - 30);
    ctx.lineTo(332 + i * 6, y - 58);
    ctx.stroke();
  }
  // Menu board, right: what the stall sells, with prices. Hidden while
  // the topping chooser is up, so the two panels never collide.
  if (!world.choosing) {
    ctx.fillStyle = 'rgba(20, 14, 10, 0.85)';
    roundRect(ctx, 980, y - 64, 260, 116, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    roundRect(ctx, 980, y - 64, 260, 116, 10);
    ctx.stroke();
    text(ctx, '— MENU —', 1110, y - 46, 13, PALETTE.gold, 'center');
    text(ctx, 'Hot Soba ......... $12', 1000, y - 20, 14, PALETTE.cream, 'left');
    text(ctx, 'Zaru Soba ........ $14', 1000, y + 4, 14, PALETTE.cream, 'left');
    text(ctx, 'Toppings .......... +$3', 1000, y + 28, 14, PALETTE.cream, 'left');
  }
}


function drawStation(ctx, world, station, time) {
  const x = station.x;
  const y = LAYOUT.stationY;
  const w = LAYOUT.stationW;
  const h = LAYOUT.stationH;
  const near = Math.abs(world.chef.x - x) < 90;
  ctx.fillStyle = near ? '#3d2c1c' : '#33241a';
  ctx.strokeStyle = near ? PALETTE.gold : '#57402a';
  ctx.lineWidth = near ? 3 : 2;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 12);
  ctx.fill();
  ctx.stroke();
  text(ctx, station.name, x, y - h / 2 + 16, 14, station.color, 'center');
  // While the pot boils, its timer takes the verb's line.
  if (!(station.id === 'boil' && world.boil.active)) {
    text(ctx, station.verb, x, y + h / 2 - 12, 11, 'rgba(255,243,214,0.75)', 'center');
  }

  if (station.id === 'bin') {
    ctx.strokeStyle = PALETTE.noodle;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 40, y - 18 + i * 10);
      ctx.quadraticCurveTo(x, y - 26 + i * 10, x + 40, y - 18 + i * 10);
      ctx.stroke();
    }
  }
  if (station.id === 'pull') {
    const pulls = world.chef.hands === 'noodles' ? world.chef.pullCount : 0;
    const stretch = world.chef.hands === 'noodles' ? 14 + pulls * 16 : 14;
    ctx.strokeStyle = PALETTE.noodle;
    ctx.lineWidth = 4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 34, y - 6 + i * 12);
      ctx.quadraticCurveTo(x, y - 6 + i * 12 - stretch * 0.4, x + 34, y - 6 + i * 12);
      ctx.stroke();
    }
    if (world.chef.hands === 'noodles') {
      text(ctx, 'PULL ' + pulls + '/3', x, y + 22, 13, PALETTE.cream, 'center');
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      roundRect(ctx, x - 45, y + 32, 90, 7, 3);
      ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      roundRect(ctx, x - 45, y + 32, 90 * (pulls / 3), 7, 3);
      ctx.fill();
    }
  }
  if (station.id === 'boil') {
    ctx.fillStyle = PALETTE.potSteel;
    roundRect(ctx, x - 48, y - 26, 96, 52, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.potWater;
    ctx.beginPath();
    ctx.ellipse(x, y - 22, 44, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    const bub = world.boil.active ? 3 : 1;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < bub; i++) {
      const bt = (time * 1.4 + i * 0.7) % 1;
      ctx.beginPath();
      ctx.arc(x - 22 + i * 22, y - 24 - bt * 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (world.boil.active) {
      const t = world.boil.t;
      const frac = Math.min(1, t / 7);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      roundRect(ctx, x - 45, y + 32, 90, 7, 3);
      ctx.fill();
      ctx.fillStyle = t >= 2.5 && t <= 5 ? PALETTE.green : PALETTE.gold;
      roundRect(ctx, x - 45, y + 32, 90 * frac, 7, 3);
      ctx.fill();
      text(ctx, t.toFixed(1) + 's — lift in green!', x, y + h / 2 - 12, 12, PALETTE.cream, 'center');
    }
    drawSteam(ctx, x, y - 34, time);
  }
  if (station.id === 'broth') {
    ctx.fillStyle = '#7a4a2b';
    ctx.beginPath();
    ctx.arc(x, y - 4, 34, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = PALETTE.broth;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 34, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.brothLight;
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 6, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSteam(ctx, x, y - 22, time);
  }
  if (station.id === 'cold') {
    ctx.fillStyle = PALETTE.zaruTray;
    ctx.fillRect(x - 48, y - 12, 96, 26);
    ctx.strokeStyle = '#a8874f';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 48, y - 4 + i * 7);
      ctx.lineTo(x + 48, y - 4 + i * 7);
      ctx.stroke();
    }
    ctx.strokeStyle = PALETTE.noodle;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 38, y - 20 - i * 5);
      ctx.lineTo(x + 38, y - 20 - i * 5);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.onion;
    ctx.fillRect(x - 14, y - 34, 28, 6);
  }
  if (station.id === 'topping') {
    const ids = ['tempura', 'egg', 'onion'];
    for (let i = 0; i < 3; i++) {
      const tx = x - 44 + i * 44;
      ctx.fillStyle = TOPPINGS[ids[i]].color;
      ctx.beginPath();
      ctx.arc(tx, y - 8, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ids[i][0].toUpperCase(), tx, y - 7);
    }
  }
  if (station.id === 'plate') {
    drawPlate(ctx, world.plate, x, y - 6, 1);
  }
}

function drawSteam(ctx, x, y, time) {
  ctx.strokeStyle = PALETTE.steam;
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const off = (time * 0.6 + i * 0.33) % 1;
    ctx.globalAlpha = 0.55 * (1 - off);
    ctx.beginPath();
    ctx.moveTo(x - 14 + i * 14, y - off * 18);
    ctx.quadraticCurveTo(x - 18 + i * 14, y - 8 - off * 18, x - 12 + i * 14, y - 16 - off * 18);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// The assembly plate: the dish being built, component by component, so
// mid-assembly reads in one glance. Takes the dish itself, so the chef's
// hands can show the same plate while carrying it.
function drawPlate(ctx, dish, x, y, scale) {
  ctx.fillStyle = '#f5efe0';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 52 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9cfb8';
  ctx.beginPath();
  ctx.ellipse(x, y + 8, 40 * scale, 11 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!dish) {
    text(ctx, 'empty plate', x, y - 22, 12, 'rgba(255,243,214,0.6)', 'center');
    return;
  }
  if (dish.dish === 'hot') {
    ctx.fillStyle = PALETTE.broth;
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 38 * scale, 11 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = PALETTE.zaruTray;
    ctx.fillRect(x - 38 * scale, y - 4, 76 * scale, 12 * scale);
  }
  ctx.strokeStyle = PALETTE.noodle;
  ctx.lineWidth = 3 * scale;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x - 32 * scale, y - 2 - i * 4 * scale);
    ctx.quadraticCurveTo(x, y - 8 - i * 4 * scale, x + 32 * scale, y - 2 - i * 4 * scale);
    ctx.stroke();
  }
  drawToppingPiece(ctx, dish.topping, x, y - 16 * scale, scale);
  // On the station the name sits above the plate; the dish label goes
  // underneath so the two never collide. Carried, it goes to the side
  // of the plate, clear of the menu board below.
  if (scale >= 1) {
    text(ctx, DISHES[dish.dish].name + ' · ' + TOPPINGS[dish.topping].name, x, y + 34, 12, PALETTE.cream, 'center');
  } else {
    text(ctx, DISHES[dish.dish].name + ' · ' + TOPPINGS[dish.topping].name, x + 46, y, 12, PALETTE.cream, 'left');
  }
}

function drawToppingPiece(ctx, topping, x, y, scale) {
  if (topping === 'tempura') {
    ctx.fillStyle = TOPPINGS.tempura.color;
    ctx.beginPath();
    ctx.moveTo(x - 14 * scale, y + 6 * scale);
    ctx.lineTo(x, y - 12 * scale);
    ctx.lineTo(x + 14 * scale, y + 6 * scale);
    ctx.closePath();
    ctx.fill();
  } else if (topping === 'egg') {
    ctx.fillStyle = '#fff8e8';
    ctx.beginPath();
    ctx.arc(x, y, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = TOPPINGS.egg.color;
    ctx.beginPath();
    ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = TOPPINGS.onion.color;
    for (let i = -1; i <= 1; i++) {
      ctx.fillRect(x + i * 10 * scale - 4, y - 4 * scale, 8 * scale, 4 * scale);
    }
  }
}

function drawToppingChooser(ctx, world) {
  if (!world.choosing) return;
  const y = LAYOUT.toppingButtonsY;
  ctx.fillStyle = 'rgba(16, 12, 24, 0.85)';
  roundRect(ctx, 800, y - 40, 240, 80, 12);
  ctx.fill();
  text(ctx, 'Pick a topping:', 920, y - 26, 13, PALETTE.cream, 'center');
  const ids = ['tempura', 'egg', 'onion'];
  for (let i = 0; i < 3; i++) {
    const cx = 920 - 70 + i * 70;
    ctx.fillStyle = TOPPINGS[ids[i]].color;
    ctx.beginPath();
    ctx.arc(cx, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, TOPPINGS[ids[i]].name, cx, y + 32, 11, PALETTE.cream, 'center');
  }
}

function drawChef(ctx, world, time) {
  const chef = world.chef;
  const bob = Math.abs(chef.x - chef.targetX) > 4 ? Math.sin(time * 10) * 3 : 0;
  const x = chef.x;
  const y = LAYOUT.chefY + bob;
  // Apron body, head, headband.
  ctx.fillStyle = '#3a6ea5';
  roundRect(ctx, x - 22, y - 6, 44, 52, 10);
  ctx.fill();
  ctx.fillStyle = '#f5efe0';
  roundRect(ctx, x - 16, y + 2, 32, 40, 8);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(x, y - 22, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 20, y - 36, 40, 8);
  ctx.fillStyle = '#c33';
  ctx.fillRect(x - 20, y - 36, 40, 3);
  ctx.fillStyle = '#241a12';
  ctx.beginPath();
  ctx.arc(x - 7, y - 24, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 7, y - 24, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#241a12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 16, 6, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();
  // What the hands carry, held high over the head so it reads.
  const hands = chef.hands;
  if (hands === 'noodles' || hands === 'pulled') {
    ctx.strokeStyle = PALETTE.noodle;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 56 - i * 5);
      ctx.quadraticCurveTo(x, y - 64 - i * 5 - (hands === 'pulled' ? 8 : 0), x + 18, y - 56 - i * 5);
      ctx.stroke();
    }
  } else if (hands === 'boiled' || hands === 'hotBase' || hands === 'coldBase') {
    ctx.fillStyle = '#7a4a2b';
    ctx.beginPath();
    ctx.arc(x, y - 58, 18, 0, Math.PI);
    ctx.fill();
    if (hands === 'hotBase') {
      ctx.fillStyle = PALETTE.broth;
      ctx.beginPath();
      ctx.ellipse(x, y - 58, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = PALETTE.noodle;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 14, y - 60);
    ctx.quadraticCurveTo(x, y - 66, x + 14, y - 60);
    ctx.stroke();
  } else if (hands === 'topped') {
    drawPlate(ctx, world.chef.built, x, y - 78, 0.7);
  }
  // Walk target marker.
  if (Math.abs(chef.x - chef.targetX) > 4) {
    ctx.fillStyle = 'rgba(255, 207, 77, 0.8)';
    ctx.beginPath();
    ctx.moveTo(chef.targetX, y + 58);
    ctx.lineTo(chef.targetX - 7, y + 48);
    ctx.lineTo(chef.targetX + 7, y + 48);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPopups(ctx, world) {
  for (const p of world.popups) {
    const seat = p.seat;
    const x = LAYOUT.seatX[seat];
    // Float in the gap between the two counters, clear of name tags.
    const y = 232 - p.t * 30;
    ctx.globalAlpha = Math.max(0, 1 - p.t / 2.2);
    const perfect = p.text.indexOf('PERFECT') !== -1;
    text(ctx, p.text, x, y, perfect ? 26 : 20, perfect ? PALETTE.gold : PALETTE.cream, 'center');
    ctx.globalAlpha = 1;
  }
}

function drawEndCard(ctx, world) {
  ctx.fillStyle = 'rgba(10, 8, 18, 0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#241a12';
  roundRect(ctx, 340, 180, 600, 330, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  roundRect(ctx, 340, 180, 600, 330, 18);
  ctx.stroke();
  const won = world.status === 'won';
  text(ctx, won ? 'SHIFT COMPLETE!' : 'SHIFT OVER', 640, 232, 40, won ? PALETTE.gold : '#ff8a8a', 'center');
  text(ctx, won ? 'The regulars go home happy.' : 'The regulars wanted more soba.', 640, 280, 18, PALETTE.cream, 'center');
  text(ctx, 'Served ' + world.served + ' / ' + TARGET_SERVED + '   ·   Coins $' + world.coins, 640, 330, 22, PALETTE.cream, 'center');
  text(ctx, 'Best combo x' + world.bestCombo + '   ·   Walkouts ' + world.walkouts, 640, 368, 18, 'rgba(255,243,214,0.8)', 'center');
  text(ctx, 'Press R to run the stall again', 640, 440, 20, PALETTE.gold, 'center');
}

export function render(ctx, world, time) {
  drawSky(ctx, time);
  drawHud(ctx, world);
  drawCustomerBar(ctx, world, time);
  drawKitchen(ctx, world, time);
  // Floor.
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, LAYOUT.floorY, 1280, 120);
  ctx.fillStyle = PALETTE.floorBoard;
  for (let x = 0; x < 1280; x += 120) {
    ctx.fillRect(x, LAYOUT.floorY, 4, 120);
  }
  drawChef(ctx, world, time);
  drawPopups(ctx, world);
  // Message line.
  if (world.messageT > 0 || world.message) {
    ctx.fillStyle = 'rgba(16, 12, 24, 0.7)';
    const w = Math.min(1100, 20 + world.message.length * 8.5);
    roundRect(ctx, 20, LAYOUT.messageY - 18, w, 32, 10);
    ctx.fill();
    text(ctx, world.message, 34, LAYOUT.messageY - 1, 15, PALETTE.cream, 'left');
  }
  text(ctx, 'Click a station to walk · SPACE to work · 1/2/3 serve · X toss · R restart', 1260, LAYOUT.messageY - 1, 13, 'rgba(255,243,214,0.65)', 'right');
  if (world.status !== 'playing') drawEndCard(ctx, world);
}
