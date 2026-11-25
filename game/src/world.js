// Soba After Midnight — the world: chef, tickets, customers, the dish
// being built. One job: pure game state. No DOM, no canvas here, so the
// loop can be tested in plain Node.

import {
  REGULARS,
  DISHES,
  TOPPINGS,
  TUNING,
  SHIFT_SECONDS,
  TARGET_SERVED,
  MAX_SEATS,
} from './config.js';

export function createWorld(seed) {
  return {
    seed,
    time: 0,
    clock: SHIFT_SECONDS,
    coins: 0,
    served: 0,
    combo: 0,
    bestCombo: 0,
    status: 'playing', // playing | won | lost
    chef: { x: 640, targetX: 640, speed: 420, hands: null, pullCount: 0 },
    boil: { active: false, t: 0 },
    plate: null, // { dish, topping, quality, routeOk } once assembled
    activeSeat: 0,
    seats: [null, null, null],
    nextTicketIn: TUNING.spawnFirstDelay,
    ticketNo: 0,
    lastServed: null,
    popups: [],
    message: 'Click a station to walk there — SPACE works it.',
    messageT: 0,
    walkouts: 0,
  };
}

function pickTicket(rng, no) {
  const dish = rng.pick(['hot', 'hot', 'zaru']);
  const topping = rng.pick(Object.keys(TOPPINGS));
  const regular = REGULARS[no % REGULARS.length];
  return {
    id: no,
    dish,
    topping,
    regular,
    patience: TUNING.patienceStart,
    patienceMax: TUNING.patienceStart,
    mood: 'waiting',
    bornAt: 0,
  };
}

export function spawnTicket(world, rng) {
  const seat = world.seats.indexOf(null);
  if (seat === -1) return null;
  world.ticketNo += 1;
  const ticket = pickTicket(rng, world.ticketNo);
  ticket.bornAt = world.time;
  const elapsed = SHIFT_SECONDS - world.clock;
  const frac = Math.min(1, elapsed / SHIFT_SECONDS);
  ticket.patience = TUNING.patienceStart - frac * (TUNING.patienceStart - TUNING.patienceEnd);
  ticket.patienceMax = ticket.patience;
  world.seats[seat] = ticket;
  if (world.seats[world.activeSeat] === null) world.activeSeat = seat;
  return ticket;
}

// The dish travels through the stations in order. Every action returns
// a short note the HUD shows, so the player always knows what happened.
export function actAt(world, stationId) {
  const chef = world.chef;
  if (world.status !== 'playing') return 'The shift is over — press R.';
  switch (stationId) {
    case 'bin':
      if (chef.hands) return 'Hands full — finish this dish first.';
      chef.hands = 'noodles';
      chef.pullCount = 0;
      return 'Soba bundle in hand. To the Pull Board!';
    case 'pull': {
      if (chef.hands !== 'noodles') return 'Bring a soba bundle here first.';
      chef.pullCount += 1;
      if (chef.pullCount >= TUNING.pullPresses) {
        chef.hands = 'pulled';
        return 'Pulled thin and even. Into the Boil Pot!';
      }
      return 'Pull ' + chef.pullCount + ' of ' + TUNING.pullPresses + '…';
    }
    case 'boil': {
      if (world.boil.active) {
        return liftBoiled(world);
      }
      if (chef.hands !== 'pulled') return 'Pull the noodles first.';
      chef.hands = null;
      world.boil.active = true;
      world.boil.t = 0;
      return 'Boiling… lift it in the green window!';
    }
    case 'broth':
      if (chef.hands !== 'boiled') return 'Boil the noodles first.';
      chef.hands = 'hotBase';
      return 'Hot broth ladled over. Add the topping!';
    case 'cold':
      if (chef.hands !== 'boiled') return 'Boil the noodles first.';
      chef.hands = 'coldBase';
      return 'Rinsed cold, dip sauce ready. Add the topping!';
    case 'topping':
      if (chef.hands !== 'hotBase' && chef.hands !== 'coldBase') {
        return 'Bring a broth or zaru base here first.';
      }
      return 'CHOOSE_TOPPING';
    case 'plate': {
      if (chef.hands !== 'topped') return 'Finish the dish first.';
      const built = chef.built;
      world.plate = built;
      chef.hands = null;
      chef.built = null;
      return 'Plate ready! Serve it to its customer.';
    }
    default:
      return '';
  }
}

function liftBoiled(world) {
  const t = world.boil.t;
  world.boil.active = false;
  world.boil.t = 0;
  let quality = 'good';
  if (t >= TUNING.boilPerfectMin && t <= TUNING.boilPerfectMax) quality = 'perfect';
  else if (t > TUNING.boilSoggyAt) quality = 'soggy';
  world.chef.hands = 'boiled';
  world.chef.boilQuality = quality;
  return quality === 'perfect'
    ? 'Perfect boil! Silky, not soggy.'
    : quality === 'soggy'
      ? 'Left too long — soggy. Still servable.'
      : 'Boiled. To the broth or the cold rinse!';
}

export function chooseTopping(world, toppingId) {
  const chef = world.chef;
  if (chef.hands !== 'hotBase' && chef.hands !== 'coldBase') return 'No base to top.';
  const dish = chef.hands === 'hotBase' ? 'hot' : 'zaru';
  // The dish itself carries only facts; whether it matches a ticket is
  // judged at serve time, against the customer it goes to.
  chef.built = { dish, topping: toppingId, quality: chef.boilQuality || 'good' };
  chef.hands = 'topped';
  chef.boilQuality = null;
  return 'Topped with ' + TOPPINGS[toppingId].name + '. To the plate!';
}

export function activeTicket(world) {
  return world.seats[world.activeSeat] || world.seats.find((s) => s) || null;
}

// Serving judges the plate against the ticket of the seat it goes to.
// A perfect match pays full price and grows the combo; a wrong dish
// still feeds the customer, but for less and the combo breaks.
export function serveSeat(world, seat, priceFn) {
  if (world.status !== 'playing') return 'The shift is over — press R.';
  if (!world.plate) return 'No plate ready — build a dish first.';
  const ticket = world.seats[seat];
  if (!ticket) return 'Nobody is sitting there.';
  const dish = world.plate;
  const toppingOk = ticket.topping === dish.topping;
  const routeOk = ticket.dish === dish.dish;
  const perfect = dish.quality === 'perfect' && toppingOk && routeOk;
  const coins = priceFn(dish.dish, dish.topping, dish.quality, toppingOk, routeOk, world.combo);
  world.coins += coins;
  world.served += 1;
  if (perfect) {
    world.combo += 1;
    world.bestCombo = Math.max(world.bestCombo, world.combo);
  } else {
    world.combo = 0;
  }
  ticket.mood = perfect ? 'delighted' : routeOk && toppingOk ? 'happy' : 'meh';
  ticket.servedCoins = coins;
  ticket.servedPerfect = perfect;
  // Keep the customer on screen for a beat so the reaction is visible.
  world.lastServed = { seat, ticket, coins, perfect, t: 0 };
  world.seats[seat] = null;
  world.plate = null;
  addPopup(world, seat, perfect ? '+$' + coins + ' PERFECT!' : '+$' + coins);
  if (world.seats[world.activeSeat] === null) {
    const next = world.seats.findIndex((s) => s);
    world.activeSeat = next === -1 ? 0 : next;
  }
  if (world.served >= TARGET_SERVED) {
    world.status = 'won';
    return 'Target reached — shift complete!';
  }
  return perfect
    ? ticket.regular.name + ' beams. Perfect serve!'
    : ticket.regular.name + ' eats. ' + (toppingOk && routeOk ? 'Good.' : 'Not quite their order.');
}

export function dumpHands(world) {
  const chef = world.chef;
  if (!chef.hands && !world.plate) return 'Nothing to toss.';
  chef.hands = null;
  chef.built = null;
  chef.pullCount = 0;
  world.plate = null;
  return 'Tossed. Start fresh.';
}

export function addPopup(world, seat, text) {
  world.popups.push({ seat, text, t: 0 });
}

// One tick of the clock: patience drains, the boil runs, the shift ends.
export function update(world, dt, rng) {
  if (world.lastServed) {
    world.lastServed.t += dt;
    if (world.lastServed.t > 2.5) world.lastServed = null;
  }
  if (world.status !== 'playing') {
    for (const p of world.popups) p.t += dt;
    world.popups = world.popups.filter((p) => p.t < 2.2);
    return;
  }
  world.time += dt;
  world.clock -= dt;
  if (world.messageT > 0) world.messageT -= dt;
  if (world.boil.active) {
    world.boil.t += dt;
    if (world.boil.t > TUNING.boilSoggyAt + 1.5) {
      world.boil.active = false;
      world.boil.t = TUNING.boilSoggyAt + 1.5;
      world.chef.hands = 'boiled';
      world.chef.boilQuality = 'soggy';
      setMessage(world, 'Left too long — soggy. Still servable.');
    }
  }
  for (let i = 0; i < world.seats.length; i++) {
    const ticket = world.seats[i];
    if (!ticket) continue;
    ticket.patience -= dt;
    if (ticket.patience <= 0) {
      world.seats[i] = null;
      world.walkouts += 1;
      world.combo = 0;
      setMessage(world, ticket.regular.name + ' walked out. The combo is gone.');
      addPopup(world, i, 'WALKED OUT');
    }
  }
  world.nextTicketIn -= dt;
  if (world.nextTicketIn <= 0) {
    spawnTicket(world, rng);
    const elapsed = SHIFT_SECONDS - world.clock;
    const frac = Math.min(1, elapsed / SHIFT_SECONDS);
    world.nextTicketIn =
      TUNING.spawnIntervalStart - frac * (TUNING.spawnIntervalStart - TUNING.spawnIntervalEnd);
  }
  for (const p of world.popups) p.t += dt;
  world.popups = world.popups.filter((p) => p.t < 2.2);
  if (world.clock <= 0) {
    world.clock = 0;
    world.status = world.served >= TARGET_SERVED ? 'won' : 'lost';
  }
}

export function setMessage(world, text) {
  world.message = text;
  world.messageT = 4;
}

export function resetWorld(world, rng) {
  const fresh = createWorld(world.seed);
  Object.keys(fresh).forEach((k) => {
    world[k] = fresh[k];
  });
  spawnTicket(world, rng);
  spawnTicket(world, rng);
}

export { DISHES, TOPPINGS };
