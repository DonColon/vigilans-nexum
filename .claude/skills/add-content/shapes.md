# Content document shapes

Field-by-field, as the loaders in `src/game/<feature>/content/` read them. "Required" means the loader throws without it. Where this file and a loader disagree, the loader is right - read it and fix this file.

## Unit sheet - `units/<id>.unit.json`

Loader: `UnitSheets.ts` → `buildUnit(document)`. One file per character, asset id `unit-<id>`.

| Field | Required | Rule |
|---|---|---|
| `format` | yes | `"vigilans-unit"` |
| `version` | yes | `1` |
| `id` | yes | kebab-case, matches the file name and the asset id |
| `name` | yes | display name, shown as written (not localised) |
| `faction` | yes | `"player"` or `"enemy"` |
| `class` | yes | key in `classes.json` |
| `level` | yes | positive integer |
| `weapon` | yes | key in `weapons.json`; its `type` must be in the class's `weaponTypes` |
| `inventory` | no | weapon / item ids in pack order; the equipped `weapon` is put first if not listed; at most 8 entries in total. Omitted: just the weapon |
| `experience` | no | 0-99 towards the next level |
| `commander` | no | `true` on the army's leader - the cursor starts there; a seize is won by this unit; their fall is a defeat |
| `boss` | no | `true` on the chapter boss - worth more experience, defaults to `hold` behaviour |
| `stats` | yes | `hp mp strength magic dexterity speed luck defense resistance`, all finite numbers; `movement` optional (class fills it), integer ≥ 1 |
| `growths` | yes | same keys, 0-100 percent per level; `movement` optional, ≥ 0 |
| `maxStats` | yes | same keys, the caps; `movement` optional, defaults to 15 |

```json
{
	"format": "vigilans-unit",
	"version": 1,
	"id": "arber",
	"name": "Arbër Krasniqi",
	"faction": "enemy",
	"class": "axe-fighter",
	"level": 3,
	"weapon": "iron-axe",
	"inventory": ["iron-axe", "vulnerary"],
	"boss": true,
	"stats": { "hp": 28, "mp": 0, "strength": 10, "magic": 0, "dexterity": 6, "speed": 6, "luck": 3, "defense": 7, "resistance": 1 },
	"growths": { "hp": 70, "mp": 0, "strength": 50, "magic": 5, "dexterity": 35, "speed": 30, "luck": 20, "defense": 35, "resistance": 15 },
	"maxStats": { "hp": 60, "mp": 20, "strength": 27, "magic": 15, "dexterity": 25, "speed": 25, "luck": 30, "defense": 26, "resistance": 20 }
}
```

## Classes - `catalog/classes.json`

Loader: `UnitCatalog.ts`. A map of id → class under `"classes"`.

| Field | Rule |
|---|---|
| `name` | display name |
| `tier` | `"base"`, `"second"` or `"third"` |
| `weaponTypes` | list of `sword lance axe bow knife gauntlet staff` (`WeaponType` in `UnitCatalog.ts`) |
| `movement` | tiles per turn a sheet inherits when it names none |
| `ability` | free text shown on the sheet |
| `promotesTo` | class ids (may not exist yet - promotion is not implemented) |

## Weapons - `catalog/weapons.json`

Loader: `UnitCatalog.ts`. A map of id → weapon under `"weapons"`. A staff is a weapon of `type: "staff"`.

| Field | Rule |
|---|---|
| `name` | display name |
| `type` | one of `WeaponType` |
| `rank` | `E`-`S` letter (ranks are not enforced yet) |
| `might` | added to strength on a hit (to magic once a type is in `MAGIC_WEAPON_TYPES` - empty today, there are no tomes); for a staff, the HP restored on top of the healer's magic |
| `hit` | base hit percent |
| `critical` | base crit percent |
| `weight` | attack speed loses `weight − strength` when positive |
| `minRange`, `maxRange` | Manhattan tile distance the weapon reaches; `1, 1` for melee, `2, 2` for a bow |
| `uses` | durability |
| `experience` | staff only: experience one use earns; omit (→ 0) on anything swung |

## Items - `catalog/items.json`

Loader: `UnitCatalog.ts`. A map of id → item under `"items"`. Exactly one effect key.

| Field | Rule |
|---|---|
| `name` | display name |
| `uses` | how many times before it is spent |
| `heal` | a number, or `"full"` |
| `boost` | partial record of `hp mp strength magic dexterity speed luck defense resistance movement` → permanent gain |
| `unlocks` | `"door"` or `"chest"` |
| `description` | one line shown in the item menu |

## Deployment - `deployments/<scenario>.deployment.json`

Loaders: `Deployments.ts` (shape), `Objectives.ts` (`objective`), `Behaviours.ts` (`behaviour`). Asset id `deployment-<scenario>`, named by `DEPLOYMENT_ASSET`.

| Field | Required | Rule |
|---|---|---|
| `format` | yes | `"vigilans-deployment"` |
| `version` | yes | `1` |
| `map` | yes | map name, informational - `MapState` loads `MAP_ASSET` regardless |
| `units[]` | yes | `{ unit, column, row, behaviour? }`; `unit` resolves as asset `unit-<id>`; integers; `behaviour` is `"charge"` (default) or `"hold"` (default for a boss) - enemies only |
| `objective` | no | `{ win: "rout" }` or `{ win: "seize", column, row }`; missing → rout |

## Conversations - `conversations/<scenario>.conversations.json`

Loader: `Conversations.ts`. Asset id `conversations-<scenario>`, named by `CONVERSATIONS_ASSET` in `TalkFlowSystem.ts`.

| Field | Rule |
|---|---|
| `conversations[].id` | unique |
| `between` | exactly two distinct unit ids; either may start it when adjacent to the other; plays once per battle |
| `pages[]` | `{ speaker, text }` - `speaker` is one of the two unit ids (the textbox shows that unit's name), `text` is `{ de, en }` |

## Houses - `houses/<scenario>.houses.json`

Loader: `Houses.ts`. Asset id `houses-<scenario>`, named by `HOUSES_ASSET` in `VisitFlowSystem.ts`.

| Field | Required | Rule |
|---|---|---|
| `houses[].id` | yes | unique |
| `column`, `row` | yes | the door tile; unique among houses; a unit visits from an adjacent tile |
| `openDoor` | yes | tileset frame drawn on the door tile while unvisited (≥ 0) |
| `reward` | no | weapon or item id handed to the visitor (to the convoy when their pack is full) |
| `pages[]` | yes, ≥ 1 | `{ speaker: { de, en }, text: { de, en } }` - the speaker is a villager, so it is localised text, not a unit id |

## Locks - `locks/<scenario>.locks.json`

Loader: `Locks.ts`. Asset id `locks-<scenario>`, named by `LOCKS_ASSET` in `LocksFlowSystem.ts`. Both lists are required, either may be empty.

| Field | Rule |
|---|---|
| `doors[]` | `{ id, column, row, openFrame }` - opened from an adjacent tile by a unit carrying a `door-key`-kind item (`unlocks: "door"`); the tile is a wall until then |
| `chests[]` | `{ id, column, row, openFrame, reward? }` - opened by a unit standing on it with a `chest`-kind key |

Ids are unique across doors and chests together; no two locks share a tile.

## Tile map - `maps/<name>.tilemap.json`

Loader: `TileMapFormat.ts` → `parseTileMapDocument`. Asset id `map-<name>`; `MapState` loads `MAP_ASSET` (`map-fantasy`).

| Field | Required | Rule |
|---|---|---|
| `format` | yes | `"vigilans-tilemap"` |
| `version` | yes | `1` |
| `columns`, `rows` | yes | positive integers; the display in `game.config.ts` is sized to 48×24 at 32 px |
| `tileWidth`, `tileHeight` | yes | 16 for `kenney-1bit` |
| `tileset` | yes | spritesheet asset id (`kenney-1bit`) |
| `background` | no | hex colour behind transparent tiles |
| `layers[]` | yes, ≥ 1 | `{ name, tiles[], flips?[] }`; `tiles` is `columns × rows` frame indices, row-major; `flips` same length, bitmask 1 horizontal / 2 vertical / 4 diagonal |
| `tileTerrain` | no | frame index (as a string key) → `plain forest mountain water wall fort` |
| `defaultTerrain` | no | terrain of any frame not in `tileTerrain` |

Terrain properties (`Terrain.ts`): plain 1 move; forest 2 move, +1 def, +20 avoid; mountain 3 move, +2 def, +30 avoid; fort 2 move, +2 def, +20 avoid; water and wall impassable.

## Test sketches (not content)

Specs build their maps from a sketch of symbols (`parseTileMap` in `TileMaps.ts`): `.` plain, `F` forest, `M` mountain, `~` water, `#` wall, `O` fort. Sketches never ship; they exist so a spec can spell out terrain inline.
