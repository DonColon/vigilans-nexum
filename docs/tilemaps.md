# Spritesheets and tile maps

This is the authoring reference for the two things the battle map is built from:
a **spritesheet** asset (the tileset art) and a **tile map** document (which frame
sits in which cell, and what each tile means for gameplay).

---

## 1. Loading a spritesheet

A spritesheet is an `image` asset with `subtype: "spritesheet"` and a `layout`
that says how the frames are cut out. It goes in an asset bundle in
`src/asset.manifest.ts` like any other asset and is loaded by `AssetLoader`.

Once loaded it lives in `AssetStorage` as a `Spritesheet`
(`assetStorage.getSpritesheet(id)`), and a single frame is drawn with
`graphics.drawTile(sheetId, frame, x, y, scale?, flip?)`. Frames are addressed by
a zero-based index, or - for atlas sheets - by name. `flip` is a bit mask (1 =
mirror horizontally, 2 = vertically, 4 = along the main diagonal); the three
together cover every 90 degree rotation.

### Grid layout

For an exported tilesheet where every frame is the same size on a regular grid
(Kenney packs, most tile editors):

```ts
{
    id: "kenney-1bit",
    type: "image",
    subtype: "spritesheet",
    url: "/tilesets/kenney-1bit-packed.png",
    layout: {
        type: "grid",
        tileWidth: 16,      // frame size in pixels
        tileHeight: 16,
        columns: 49,        // how many frames across
        rows: 22,           // how many frames down
        margin: 0,          // optional: transparent border around the whole sheet
        spacing: 0          // optional: transparent gutter between frames
    }
}
```

Frame `index = row * columns + column`, counted from the top-left, starting at 0.

The source rectangle of a frame is:

```
x = margin + column * (tileWidth + spacing)
y = margin + row    * (tileHeight + spacing)
```

`fromGrid` throws if the configured grid is larger than the image (once the image
has loaded and its real size is known).

**Worked examples - Kenney 1-bit tilesheets:**

| ships as                          | source                           | size      | tile | columns × rows | margin | spacing |
| --------------------------------- | -------------------------------- | --------- | ---- | -------------- | ------ | ------- |
| `tilesets/kenney-1bit-packed.png` | `colored-transparent_packed.png` | 784 × 352 | 16   | 49 × 22        | 0      | 0       |
| (unused)                          | `colored-transparent.png`        | 832 × 373 | 16   | 49 × 22        | 0      | 1       |

Both shipped maps use the packed sheet. Its art sits on transparency, so a map
that leans on it declares a `background` colour (see the format below) painted
under the layers where a cell is empty or only see-through.

`docs/kenney-1bit-index.png` is a scaled-up copy of the packed sheet with every
cell's frame index printed on it - handy for picking a tile by number. Regenerate
it by rendering `/tilesets/kenney-1bit-packed.png` at `row * 49 + column` per cell.

### Atlas layout

For a sheet whose frames are irregular and named - a TexturePacker
**"JSON (Hash)"** export:

```ts
// the atlas json, loaded as a normal json asset
{ id: "units-atlas", type: "json", url: "/atlases/units.json" }

// the spritesheet, depending on it so the loader has the json first
{
    id: "units",
    type: "image",
    subtype: "spritesheet",
    url: "/atlases/units.png",
    dependencies: ["units-atlas"],
    layout: { type: "atlas", atlas: "units-atlas" }
}
```

The atlas file looks like this (only `frame` is read - export without rotation
and without trimming):

```json
{
	"frames": {
		"knight-idle": { "frame": { "x": 0, "y": 0, "w": 16, "h": 24 } },
		"knight-walk": { "frame": { "x": 16, "y": 0, "w": 16, "h": 24 } }
	}
}
```

Frames keep the order they appear in the file, so `"knight-idle"` is also index 0.

---

## 2. The tile map format

A tile map is a JSON document authored as a `*.tilemap.json` file. It is parsed
and validated by `parseTileMapDocument` (`src/game/map/model/TileMapFormat.ts`),
which turns it into visual layers for the renderer plus a derived **terrain grid**
for movement and the rest of the gameplay.

```jsonc
{
	"format": "vigilans-tilemap",
	"version": 1,

	"columns": 20,
	"rows": 15,

	"tileWidth": 16, // source tile size in the tileset
	"tileHeight": 16,

	"tileset": "kenney-1bit", // asset id of the spritesheet the frames index into

	"background": "#472d3c", // optional: painted under the layers (the tileset's
	//                          art is on transparency, so empty / see-through
	//                          cells need a ground colour). #rgb / #rrggbb / #rrggbbaa

	"layers": [
		// Bottom first, drawn in order. Each `tiles` array is columns*rows frame
		// indices in row-major order; -1 means "no tile here". An optional
		// `flips` array of the same length carries per-cell orientation
		// (1 = flip X, 2 = flip Y, 4 = flip diagonal); leave it out for upright.
		{ "name": "ground", "tiles": [0, 0, 0 /* ... */] },
		{ "name": "features", "tiles": [-1, 54, -1 /* ... */], "flips": [0, 5, 0 /* ... */] }
	],

	// Which frames count as which terrain for gameplay. Keys are frame indices
	// (as strings, because JSON object keys are strings).
	"tileTerrain": {
		"54": "forest",
		"103": "mountain",
		"253": "water",
		"60": "wall",
		"112": "fort"
	},

	// Terrain for any cell no mapped tile covers. Defaults to "plain".
	"defaultTerrain": "plain"
}
```

### Field reference

| field              | required | meaning                                                                |
| ------------------ | -------- | ---------------------------------------------------------------------- |
| `format`           | yes      | must be the literal `"vigilans-tilemap"`                               |
| `version`          | yes      | must be `1`                                                            |
| `columns`, `rows`  | yes      | map size in tiles, positive integers                                   |
| `tileWidth/Height` | yes      | source tile size, must match the tileset's grid                        |
| `tileset`          | yes      | spritesheet asset id                                                   |
| `background`       | no       | hex colour painted under all layers                                    |
| `layers`           | yes      | at least one; each `tiles` array must be exactly `columns * rows` long |
| `layers[].flips`   | no       | per-cell orientation mask, same length as `tiles` (0-7)                |
| `tileTerrain`      | no       | frame index (string) → terrain name                                    |
| `defaultTerrain`   | no       | terrain name, defaults to `"plain"`                                    |

Terrain names are the values of `Terrain` in
`src/game/map/model/Terrain.ts`: `plain`, `forest`, `mountain`, `water`, `wall`,
`fort`. Each carries movement cost, defense and avoid in `terrainProperties`.

### How terrain is derived

For every cell the parser walks the layers **top to bottom** and takes the first
tile whose frame is listed in `tileTerrain`. A forest tile drawn on top of a
grass tile makes the cell `forest`; a cell with nothing mapped anywhere falls
back to `defaultTerrain`. This keeps you from having to hand-author a separate
terrain array that stays in sync with the art.

### Importing from Tiled

`src/game/map/data/fantasy.tilemap.json` is a port of the Kenney sample
`Tilemap/sample_fantasy.tmx`. To convert a Tiled CSV export:

- Tiled tile ids are 1-based (`firstgid`), ours are 0-based - subtract `firstgid`.
- The top three bits of a Tiled id are flip flags
  (`0x80000000` H, `0x40000000` V, `0x20000000` D). Split them off into the
  layer's `flips` array (H=1, V=2, D=4) and keep the low bits as the frame.
- An empty Tiled cell (`0`) becomes `-1`.

The Kenney `.tmx` files index the legacy 32-column `tileset_legacy.png`; those
frames were then pixel-matched onto the shipped 49-column packed sheet (they are
the same art, repacked). `fantasy.tilemap.json` is now a normal, hand-editable
map file. The parser side is `parseTileMapDocument`, which validates the flip
masks and the background colour like everything else.

### Using a map

```ts
import document from "@/game/map/data/fantasy.tilemap.json";
import { parseTileMapDocument, TileMapDocument } from "@/game/map/model/TileMapFormat";

const map = parseTileMapDocument(document as TileMapDocument);
// map.layers  -> feeds TileMapComponent (TileMapRenderSystem draws it, flips and all)
// map.terrain -> feeds GridComponent via GridSystem.fromTileMap(map, cellSize)
```

`MapState` (`src/game/map/states/MapState.ts`) does exactly this for the shipped
`fantasy.tilemap.json`. Rendering is split across two systems on the background
layer: `GridRenderSystem` lays the flat terrain colours and the grid, then
`TileMapRenderSystem` paints the map's `background` (when set) and blits the
tileset art on top of it - flips and all - doing nothing until the tileset
spritesheet has finished loading.

`cellSize` is the on-screen size of a tile and is independent of the tileset's
`tileWidth`; the fantasy map draws 16px source tiles at a 24px cell size (scale
1.5) so its 48 x 24 tiles fit the viewport.
