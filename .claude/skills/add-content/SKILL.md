---
name: add-content
description: Adds or changes game content for Vigilans Nexum - a unit sheet, a class, a weapon, an item, a deployment placement or objective, a conversation, a house, a door or chest, or a whole new scenario / map - as the JSON documents under src/assets/data, and wires them through the asset manifest, vitest.setup.ts and the scenario constants. Use whenever the user asks to add a character, enemy, boss, weapon, staff, item, map, chapter, scenario, dialogue, house, chest or door, or to move, rename or retune any of those; it knows every document's shape and the cross-references the loaders check at startup.
argument-hint: <unit | class | weapon | item | placement | conversation | house | lock | scenario> <what>
---

# Add game content

Arguments: `$ARGUMENTS` - the first word is the kind of content, the rest says what it is (a name, a place, a purpose). If the kind is missing, work it out from the request; if what is being added is unclear, ask one question and proceed.

**Content is data, never code.** Everything the game plays is a JSON document under `src/assets/data`, fetched at runtime by the `AssetLoader` from the ids in `src/asset.manifest.ts` and parsed by a loader in `src/game/<feature>/content/`. A new character, weapon or house is a document plus its wiring - no TypeScript, unless the request is really a new *mechanic* (a new item effect, a new win condition, a new behaviour), in which case say so and use the `create-game-feature` skill for that part.

## Sources of truth

Every shape below is checked against a loader that throws a `GameError` with a plain-English message when a document is wrong. Read the loader for the kind you are adding before writing the document, and read [shapes.md](shapes.md) for the field-by-field reference:

| Kind | Document | Loader | Asset id |
|---|---|---|---|
| Unit sheet | `units/<id>.unit.json` | `src/game/units/content/UnitSheets.ts` (`buildUnit`) | `unit-<id>` |
| Class / weapon / item | `catalog/{classes,weapons,items}.json` | `src/game/units/content/UnitCatalog.ts` | `catalog-classes`, `catalog-weapons`, `catalog-items` |
| Deployment (placements + objective) | `deployments/<scenario>.deployment.json` | `src/game/units/content/Deployments.ts`, `src/game/objective/content/Objectives.ts`, `src/game/ai/content/Behaviours.ts` | `deployment-<scenario>` |
| Conversations | `conversations/<scenario>.conversations.json` | `src/game/talk/content/Conversations.ts` | `conversations-<scenario>` |
| Houses | `houses/<scenario>.houses.json` | `src/game/visit/content/Houses.ts` | `houses-<scenario>` |
| Doors + chests | `locks/<scenario>.locks.json` | `src/game/locks/content/Locks.ts` | `locks-<scenario>` |
| Tile map | `maps/<name>.tilemap.json` | `src/game/map/content/TileMapFormat.ts` | `map-<name>` |

Everything a document refers to by id must exist where the loader looks it up - see *Cross-references* below. The loaders check most of these at startup; a few (a deployment naming a unit with no sheet, a reward naming no item) only fail when that unit or house is reached, so check them yourself.

## Procedure

1. **Read the loader and the shipped example.** Open the loader from the table and one existing document of the kind (`dardan.unit.json`, `skirmish.houses.json`, ...). Note every `throw new GameError` - each is a rule the document must satisfy. Copy the shipped document's key order and formatting (tabs, one field per line, `format` and `version` first).

2. **Write the document** under `src/assets/data/<kind>/`. Ids are kebab-case and unique across their kind. Text the player reads (`name`, `description`, `ability`, conversation and house `text` / `speaker`) is content and stays in the document - localised text is a `{ "de": ..., "en": ... }` object with **both** locales; interface strings (menu rows, labels) are not content and go through `i18n` instead (`i18n-sync` skill).

3. **Wire it**, according to the kind:
   - **A new file** (unit sheet, scenario document, map) needs an entry in the `BattleMap` bundle of `src/asset.manifest.ts` (`{ id, type: "json", url: "/data/<kind>/<file>" }` - the url is rooted at `src/assets`) **and** the same document imported and seeded under the same id in `vitest.setup.ts`, or the running game and the specs disagree.
   - **A catalog entry** (class, weapon, item) is a key in the existing catalog file; nothing to wire.
   - **A placement, conversation, house or lock** is an entry in the scenario's existing document; nothing to wire.
   - **A new scenario** means one document of each scenario kind (deployment, conversations, houses, locks - the latter three may hold empty lists) plus the map it names. The scenario constants are hard-coded to `skirmish` today - `DEPLOYMENT_ASSET` in `src/game/units/content/Deployments.ts`, `HOUSES_ASSET`, `LOCKS_ASSET`, `CONVERSATIONS_ASSET` in the feature flow systems, and `MAP_ASSET` in `src/game/map/states/MapState.ts`; the deployment's `map` field is not what picks the map. Switching scenarios is a code change to those constants; say so and make it only if asked. (Turning them into a chapter selection is a feature, not content.)

4. **Check the cross-references** yourself, in both directions:
   - A unit's `class` is in `classes.json`; its `weapon` is in `weapons.json` **and** of a `type` the class's `weaponTypes` lists (a cleric wields a `staff`, not a sword); every `inventory` id is a weapon or an item; the pack (the equipped weapon plus the inventory) holds at most 8.
   - A placement's `unit` has a sheet **and** a manifest / setup entry; its `column`, `row` lie inside the map and on a passable tile; no two placements share a tile; a `behaviour` is `charge` or `hold` (an unknown one is logged and falls back to the default: `hold` for a `boss`, `charge` otherwise).
   - The objective's `win` is `rout` or `seize`; a seize names a `column` and `row` (without them it falls back to a rout and logs why).
   - A conversation's `between` names two distinct unit ids, and each page's `speaker` is one of them; the `talk` feature only offers the row when both stand adjacent and the pair has not talked yet.
   - A house's / chest's `reward` is a weapon or item id; a house's `column`, `row` is the door tile, knocked from a tile beside it; a door's or chest's tile is the lock itself (a door is opened from beside, a chest from on top). Two houses or two locks may not share a tile.
   - `openDoor` / `openFrame` are frame indices into the `kenney-1bit` sheet (49 columns; `src/assets/tilesets/kenney-1bit-index.png` is the numbered reference) - the closed art is whatever the map layer already shows at that tile.
   - A tile map's `tileTerrain` maps every frame the terrain layer uses to a terrain; anything unmapped is `defaultTerrain`. A house, lock or objective tile should be passable (`plain`, `forest`, `mountain`, `fort`); a door tile is a `wall` until opened.

5. **Tune, not just fill.** Stats follow the Radiant Dawn formulas in `src/game/combat/rules/CombatMath.ts`: hit = weapon hit + dex×2 + luck/2 (+ triangle), avoid = attack speed×2 + luck, damage = str + might − def (+ terrain). When adding an enemy or weapon, work one matchup against the shipped units by hand and say what it comes to - an enemy that cannot hit or cannot be hurt is a content bug. Growths are percentages (0-100 per stat); caps are what a promoted unit tops out at; a base-class level is 1-20.

6. **Verify**, and fix what fails:
   - `npx vitest run test/game/units test/game/<feature of the kind>` - the shipped documents are what those specs build from, so a broken one fails here first.
   - `npx vitest run` - a new unit in the deployment changes what every flow spec sees on the map (who stands where, who the enemy phase attacks), so the whole suite is the real check.
   - `npm start` and see it in the game (`verify-in-browser` skill): the unit on its tile, the door open, the conversation offered.

7. **Report**: the files written, every id introduced, the matchup numbers from step 5, and anything left open (art frames chosen by eye, German text to check).

## Definition of done

- [ ] Document parses: `format` and `version` right, every required field present, ids unique
- [ ] Every id it names resolves (class, weapon type vs class, items, units, rewards, tiles)
- [ ] New files listed in `src/asset.manifest.ts` **and** seeded in `vitest.setup.ts` under the same id
- [ ] Localised text carries both `de` and `en`
- [ ] Full suite green against the baseline taken before the change
- [ ] Seen in the running game

## Pitfalls that have bitten

- A unit sheet may leave out `stats.movement`; the class fills it in. `growths.movement` and `maxStats.movement` are all but never written (movement does not grow). `dardan.unit.json` carries `movement: 99` as a dev convenience - do not copy it into a shipped character.
- `experience` on a sheet is 0-99; 100 is a level-up and the loader rejects it.
- A `staff` is a weapon: it lives in `weapons.json` with `type: "staff"`, `might` is the HP it restores on top of the healer's magic, and `experience` is what one use earns (0 on anything swung).
- An item has exactly one effect: `heal` (a number or `"full"`), `boost` (a partial stat record), or `unlocks` (`"door"` or `"chest"`). Do not combine them.
- Map coordinates are `column`, `row`, zero-based, row-major; the shipped map is 48×24 and the display is sized to it exactly (`game.config.ts`), so a map of another size needs a display change too.
- Placements are read at `map:ready`; edit the deployment and reload the page, no build step.
- `maps/skirmish.tilemap.json` ships but is unlisted in the manifest and unused; `map-fantasy` is the battle map.
