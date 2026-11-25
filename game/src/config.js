// Soba After Midnight — tuning, dishes, regulars and the midnight palette.
// One job: every number and name the game uses, so the rest of the code
// never hard-codes a price, a time or a colour.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SHIFT_SECONDS = 120;
export const TARGET_SERVED = 10;
export const MAX_SEATS = 3;

// Midnight stall at dusk: deep indigo sky, a warm sunset band on the
// horizon, paper lanterns. Nothing here copies another game's look.
export const PALETTE = {
  skyTop: '#141b33',
  skyMid: '#2c2350',
  horizon: '#e07840',
  horizonGlow: '#f2a65a',
  roof: '#12172a',
  roofWindow: '#ffd27a',
  lantern: '#ffb84d',
  lanternGlow: 'rgba(255, 184, 77, 0.35)',
  stringLight: '#ffe9a8',
  counterTop: '#9c6b3f',
  counterFront: '#6f4526',
  counterEdge: '#c08d55',
  floor: '#241a12',
  floorBoard: '#2e2115',
  cream: '#fff3d6',
  ink: '#241a12',
  noodle: '#f2d8a0',
  noodleDark: '#d9b878',
  broth: '#c97b2e',
  brothLight: '#e09a4a',
  zaruTray: '#c9a86a',
  onion: '#5da24a',
  egg: '#f7d774',
  tempura: '#e0a83c',
  potSteel: '#9aa5b1',
  potWater: '#6fa8c9',
  steam: 'rgba(255, 255, 255, 0.55)',
  gold: '#ffcf4d',
  red: '#e05252',
  green: '#7fc97f',
};

// The two dishes. Hot soba goes through the broth pot, zaru soba through
// the cold rinse — two different routes through the same kitchen.
export const DISHES = {
  hot: {
    id: 'hot',
    name: 'Hot Soba',
    short: 'HOT',
    base: 12,
    broth: 'Steaming broth',
    blurb: 'Noodles in hot broth',
  },
  zaru: {
    id: 'zaru',
    name: 'Zaru Soba',
    short: 'ZARU',
    base: 14,
    broth: 'Cold dip',
    blurb: 'Cold noodles, dip sauce',
  },
};

export const TOPPINGS = {
  tempura: { id: 'tempura', name: 'Tempura', color: '#e0a83c', price: 3 },
  egg: { id: 'egg', name: 'Soft Egg', color: '#f7d774', price: 3 },
  onion: { id: 'onion', name: 'Green Onion', color: '#5da24a', price: 3 },
};

// Night-shift regulars. Each one has a name, a look and one short line,
// so an order is a person, not a timer.
export const REGULARS = [
  {
    id: 'mara',
    name: 'Mara',
    job: 'Night Nurse',
    line: 'Long shift. Extra broth, please.',
    skin: '#f2c9a0',
    hair: '#3a2a1e',
    shirt: '#2e7f8a',
    accent: '#7fd4d4',
  },
  {
    id: 'kenji',
    name: 'Kenji',
    job: 'Taxi Driver',
    line: 'One zaru. Quick — meter is running.',
    skin: '#e8b88a',
    hair: '#1e1e1e',
    shirt: '#8a6d2e',
    accent: '#ffd27a',
  },
  {
    id: 'lulu',
    name: 'Lulu',
    job: 'Dawn Baker',
    line: 'First soba before the ovens.',
    skin: '#f7d3b0',
    hair: '#6e3b1e',
    shirt: '#a4556e',
    accent: '#ffb3c2',
  },
];

// Tuning: how the pressure grows across one shift.
export const TUNING = {
  pullPresses: 3,
  boilPerfectMin: 2.5,
  boilPerfectMax: 5.0,
  boilGoodMax: 6.0,
  boilSoggyAt: 6.0,
  patienceStart: 45,
  patienceEnd: 30,
  spawnFirstDelay: 2,
  spawnIntervalStart: 13,
  spawnIntervalEnd: 8,
  walkoutPenalty: 0,
  perfectBonus: 4,
  comboStep: 2,
  comboCap: 8,
  wrongToppingPenalty: 3,
  mismatchPenalty: 2,
  soggyPenalty: 4,
};

// Stations along the lower counter, left to right in the order a dish
// travels: take noodles, pull them, boil them, pick hot or cold,
// add the topping, set the plate down.
export const STATIONS = [
  { id: 'bin', name: 'Noodle Bin', verb: 'Take noodles', x: 120, color: '#e8c87e' },
  { id: 'pull', name: 'Pull Board', verb: 'Pull! Pull! Pull!', x: 300, color: '#d98a4a' },
  { id: 'boil', name: 'Boil Pot', verb: 'Drop in — lift in time', x: 480, color: '#7fb3d5' },
  { id: 'broth', name: 'Broth Pot', verb: 'Hot broth', x: 620, color: '#c97b2e' },
  { id: 'cold', name: 'Cold Rinse', verb: 'Cold zaru dip', x: 760, color: '#7fb069' },
  { id: 'topping', name: 'Toppings', verb: 'Pick the topping', x: 920, color: '#e0a83c' },
  { id: 'plate', name: 'Assembly Plate', verb: 'Set the plate down', x: 1100, color: '#f5efe0' },
];

export function stationById(id) {
  return STATIONS.find((s) => s.id === id) || null;
}

// Price a finished dish. Quality comes from the boil and from matching
// the ticket: the right topping, the right hot/cold route.
export function priceDish(dish, toppingId, quality, toppingOk, routeOk, combo) {
  let coins = DISHES[dish].base + TOPPINGS[toppingId].price;
  if (quality === 'perfect') coins += TUNING.perfectBonus;
  if (quality === 'soggy') coins -= TUNING.soggyPenalty;
  if (!toppingOk) coins -= TUNING.wrongToppingPenalty;
  if (!routeOk) coins -= TUNING.mismatchPenalty;
  coins += Math.min(combo * TUNING.comboStep, TUNING.comboCap);
  return Math.max(4, coins);
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? '0' + m : '' + m) + ':' + (r < 10 ? '0' + r : '' + r);
}

// Screen layout, shared by input and render so a click always lands
// where the drawing says it does. Canvas is 1280x720.
export const LAYOUT = {
  hudY: 8,
  hudH: 44,
  seatX: [320, 640, 960],
  seatPortraitY: 132,
  bubbleY: 52,
  counterTopY: 168,
  counterFrontY: 210,
  kitchenTopY: 250,
  stationY: 330,
  stationW: 150,
  stationH: 118,
  floorY: 600,
  chefY: 632,
  toppingButtonsY: 440,
  messageY: 704,
};
