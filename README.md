# Soba After Midnight

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/aaairdropexo-ctrl/best-cooking-game-20261125-0137-soba/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/aaairdropexo-ctrl/best-cooking-game-20261125-0137-soba/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

A midnight soba stall game, built for the
[best cooking game bounty](https://make.fun/c/best-cooking-game-20261125-0137)
on make.fun. You pull, boil and assemble soba to order while night-shift
regulars — a nurse, a taxi driver, a dawn baker — tell you their stories
and the clock runs down.

## How to play

- **Click a station** to walk there, or move with **A / D** or the arrow keys.
- **SPACE / E** works the station you stand at: take noodles, pull them
  three times, drop them in the boil pot and lift in the green window,
  ladle hot broth or rinse cold for zaru, pick the topping, set the plate.
- **Click a customer** (or press **1 / 2 / 3**) to serve the ready plate.
  A perfect boil, the right topping and the right hot/cold route pay more
  and grow the combo. **X** tosses what you hold. **R** restarts the shift.
- Serve **10 orders** before the 2-minute shift ends to win. Orders that
  wait too long walk out — and take your combo with them.

## Run it

```sh
node serve.ts 8080
# open http://localhost:8080/ in desktop Chrome
```

Screenshots are staged with `?shot=cover|pull|serve|end&seed=7`, as listed
in `shots.json`. The entrypoint `main.ts` (Node 22) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json`.

## Why soba

Every rush kitchen plays the same loop — tap, wait, serve. This stall
slows one step down on purpose: the pull is tactile, the boil is a timing
call, and hot soba and cold zaru take different routes through the same
counter. The regulars are the point: an order is a person with a name and
one line about their night, and serving them right shows on their face.
