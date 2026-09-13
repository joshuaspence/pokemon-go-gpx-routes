# CLAUDE.md

- **Give every subtask its own worktree.** A subagent takes `isolation: "worktree"`; a session enters one with
  `EnterWorktree`. Two agents in one checkout collide — they edit the same file at the same time, and a `git add --all`
  from either commits the other's half-finished work. Note that a new worktree branches from `origin/master` unless
  `worktree.baseRef` is `head`, so it will not contain unpushed commits.
- **Commit staged changes.** Staged work is finished work. Stage the paths you touched rather than the whole tree, so a
  commit carries your change and nothing else.
- **Commit to `master`.** Single maintainer, linear history, so work lands on `master` directly. Create a branch only
  when asked for one.

## Cross-checking `src/pokemon/pokedex.js` against the web

Three sources cover a variant's `released` and `shinyEligible` state. Each has a demonstrated failure mode, so take a
change only where two of the three agree. Checked September 2026.

- **pokemondb.** [`/go/pokedex`](https://pokemondb.net/go/pokedex) and
  [`/go/unavailable`](https://pokemondb.net/go/unavailable) partition the game master between them — the first lists
  what is released, the second what is in the code but not out yet — so a variant on neither is not in Pokémon GO's data
  at all. That is why `isNotReleased()` is right for Hisuian Sliggoo, Hisuian Goodra and Basculegion, which
  `/go/unavailable` structurally cannot show. Best source for `released` and for which forms exist.
  [`/go/shiny`](https://pokemondb.net/go/shiny) marks a released shiny with `*`, but that star list is maintained apart
  from the release data and lags it: it missed shiny Diancie, the Pikipek line, Dhelmise, Nickit, Thievul, Indeedee,
  Duraludon, Orthworm and Flamigo, all of which the other two list.
- **Serebii.** [`/pokemongo/shiny.shtml`](https://www.serebii.net/pokemongo/shiny.shtml) lists only released shinies,
  per form (`Rotom (Wash Rotom)`, `Tauros (Paldean Form - Combat Breed)`), so presence is the signal. It has gaps of its
  own — Centiskorch is absent though its shiny is out, seemingly filed under Gigantamax instead.
- **GO Hub.** `https://db.pokemongohub.net/pokemon/${DEX}` says either `Shiny X is available! ✨` or
  `Shiny X is not yet available`, the cleanest per-species shiny signal going. It says nothing usable about `released`:
  the surrounding prose is boilerplate, word for word the same for Maschiff as for Koraidon.

Reading them:

- **Fetch the raw HTML with `curl` and parse it.** `WebFetch` answers a prompt through a small model, which drops rows
  from the 1,195 that `/go/pokedex` carries.
- **Diff the whole table rather than spot-checking.** Copy `src/pokemon/pokemon.js`, add a getter over its private
  fields and import the copy of `pokedex.js`: `as()` has run by then, so every variant reports a name like
  `Hisuian ZORUA`.
- **Compare at dex level, with form names only as a fallback.** `/go/shiny` collapses Unown and Spinda to one card each
  yet lists Vivillon per pattern, so per-card matching reports 28 Unown forms as missing when they are not. The labels
  are the sites' own rather than ours — `Poké Ball Pattern` for `POKE_BALL`.
