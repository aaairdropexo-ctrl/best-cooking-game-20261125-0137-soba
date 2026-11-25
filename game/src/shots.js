// Soba After Midnight — staged screenshots. One job: put the world in
// a fixed, readable state for each screenshot, so a screenshot is a
// render of the real game code, never a drawing made for the shot.

import { REGULARS } from './config.js';
import { resetWorld, setMessage } from './world.js';

function mkTicket(id, dish, topping, regularIdx, patience) {
  return {
    id,
    dish,
    topping,
    regular: REGULARS[regularIdx],
    patience,
    patienceMax: 45,
    mood: 'waiting',
    bornAt: 0,
  };
}

export const SHOTS = ['cover', 'pull', 'serve', 'end'];

export function applyShot(world, shot, rng) {
  resetWorld(world, rng);
  world.messageT = 99;
  if (shot === 'cover') {
    world.clock = 92;
    world.coins = 47;
    world.served = 3;
    world.combo = 2;
    world.seats = [
      mkTicket(1, 'hot', 'tempura', 0, 30),
      mkTicket(2, 'zaru', 'egg', 1, 22),
      mkTicket(3, 'hot', 'onion', 2, 38),
    ];
    world.activeSeat = 0;
    world.chef.x = 300;
    world.chef.targetX = 300;
    world.chef.hands = 'noodles';
    world.chef.pullCount = 2;
    world.boil.active = true;
    world.boil.t = 3.1;
    world.plate = { dish: 'zaru', topping: 'onion', quality: 'good' };
    setMessage(world, 'Pull the noodles — lift the pot in the green window!');
    return;
  }
  if (shot === 'pull') {
    world.clock = 104;
    world.coins = 21;
    world.served = 1;
    world.combo = 0;
    world.seats = [mkTicket(1, 'hot', 'tempura', 0, 34), mkTicket(2, 'zaru', 'egg', 1, 26), null];
    world.activeSeat = 0;
    world.chef.x = 300;
    world.chef.targetX = 300;
    world.chef.hands = 'noodles';
    world.chef.pullCount = 2;
    world.boil.active = true;
    world.boil.t = 1.2;
    setMessage(world, 'One more pull — then into the pot!');
    return;
  }
  if (shot === 'serve') {
    world.clock = 71;
    world.coins = 68;
    world.served = 4;
    world.combo = 3;
    const served = mkTicket(1, 'hot', 'tempura', 0, 30);
    served.mood = 'delighted';
    served.servedCoins = 21;
    served.servedPerfect = true;
    world.lastServed = { seat: 0, ticket: served, coins: 21, perfect: true, t: 0.4 };
    world.seats = [null, mkTicket(2, 'zaru', 'egg', 1, 28), mkTicket(3, 'hot', 'onion', 2, 40)];
    world.activeSeat = 1;
    world.chef.x = 1060;
    world.chef.targetX = 1060;
    world.chef.hands = 'topped';
    world.chef.built = { dish: 'hot', topping: 'tempura', quality: 'perfect' };
    world.popups = [{ seat: 0, text: '+$21 PERFECT!', t: 0.4 }];
    setMessage(world, 'Mara beams. Perfect serve!');
    return;
  }
  // end: the shift is won, the card over the stall.
  world.clock = 0;
  world.coins = 132;
  world.served = 10;
  world.combo = 0;
  world.bestCombo = 4;
  world.walkouts = 1;
  world.status = 'won';
  world.seats = [mkTicket(9, 'hot', 'tempura', 0, 30), mkTicket(10, 'zaru', 'egg', 1, 30), null];
  world.seats[0].mood = 'happy';
  world.seats[1].mood = 'delighted';
  world.chef.x = 640;
  world.chef.targetX = 640;
  setMessage(world, 'Target reached — shift complete!');
}
