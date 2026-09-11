import { AssetManifest } from "@/core/assets/AssetManifest";

const assetManifest: AssetManifest = {
	bundles: {
		BattleMap: [
			{
				// Packed 1-bit tilesheet: 49 columns, no gutter, art on transparency.
				// Both shipped maps are authored against this layout.
				id: "kenney-1bit",
				type: "image",
				subtype: "spritesheet",
				url: "/tilesets/kenney-1bit-packed.png",
				layout: {
					type: "grid",
					tileWidth: 16,
					tileHeight: 16,
					columns: 49,
					rows: 22
				}
			},
			// Kenney "Fantasy UI Borders", 1-bit alpha masks the UI feature tints and
			// nine-slices. Loaded as single-frame spritesheets so the raw image stays
			// reachable - a plain sprite hides it. See src/game/ui/model/NineSlice.ts.
			{
				id: "ui-panel",
				type: "image",
				subtype: "spritesheet",
				url: "/ui/panel.png",
				layout: { type: "grid", tileWidth: 48, tileHeight: 48, columns: 1, rows: 1 }
			},
			{
				id: "ui-frame",
				type: "image",
				subtype: "spritesheet",
				url: "/ui/frame.png",
				layout: { type: "grid", tileWidth: 48, tileHeight: 48, columns: 1, rows: 1 }
			},
			{
				id: "ui-divider",
				type: "image",
				subtype: "spritesheet",
				url: "/ui/divider.png",
				layout: { type: "grid", tileWidth: 96, tileHeight: 22, columns: 1, rows: 1 }
			},
			// The game's rulebook: the shared catalogs every unit sheet resolves
			// against. Seeded into the catalog registry by the UnitsFeature - see
			// src/game/units/model/UnitCatalog.ts.
			{
				id: "catalog-classes",
				type: "json",
				url: "/data/catalog/classes.json"
			},
			{
				id: "catalog-weapons",
				type: "json",
				url: "/data/catalog/weapons.json"
			},
			{
				id: "catalog-items",
				type: "json",
				url: "/data/catalog/items.json"
			},
			// Scenario content. A deployment names the units it puts on the map, and
			// each is looked up as `unit-<id>`, so a new character is a sheet plus an
			// entry here - no TypeScript changes.
			{
				id: "deployment-skirmish",
				type: "json",
				url: "/data/deployments/skirmish.deployment.json"
			},
			{
				id: "unit-dardan",
				type: "json",
				url: "/data/units/dardan.unit.json"
			},
			{
				id: "unit-elira",
				type: "json",
				url: "/data/units/elira.unit.json"
			},
			{
				id: "unit-hasan",
				type: "json",
				url: "/data/units/hasan.unit.json"
			},
			{
				id: "unit-besnik",
				type: "json",
				url: "/data/units/besnik.unit.json"
			},
			// The houses on the map, who is in and what they hand over - see
			// src/game/visit.
			{
				id: "houses-skirmish",
				type: "json",
				url: "/data/houses/skirmish.houses.json"
			},
			// Who may talk to whom, and the script they speak - see src/game/talk.
			{
				id: "conversations-skirmish",
				type: "json",
				url: "/data/conversations/skirmish.conversations.json"
			},
			// The battle map MapState builds. `maps/skirmish.tilemap.json` ships
			// alongside it but is left unlisted - no scenario loads it yet, and an
			// entry here would cost a fetch at startup.
			{
				id: "map-fantasy",
				type: "json",
				url: "/data/maps/fantasy.tilemap.json"
			},
			// Pixel fonts for the UI text. AssetLoader registers each as
			// `new FontFace("<id>", ...)`, so the CSS family name is the asset id.
			// UITheme picks which one is active - see src/game/ui/model/UITheme.ts.
			{
				id: "kenney-mini",
				type: "font",
				url: "/fonts/kenney-mini.ttf"
			},
			{
				id: "kenney-pixel",
				type: "font",
				url: "/fonts/kenney-pixel.ttf"
			}
		]
	}
};

export { assetManifest };
