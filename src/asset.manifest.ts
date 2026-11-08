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
			// reachable - a plain sprite hides it. See src/game/ui/view/NineSlice.ts.
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
				layout: { type: "grid", tileWidth: 96, tileHeight: 18, columns: 1, rows: 1 }
			},
			// The border nine-sliced around the selected row of a bare menu (the
			// title screen's) - see drawMenuFrame in src/game/ui/view/UIPanel.ts.
			{
				id: "ui-select",
				type: "image",
				subtype: "spritesheet",
				url: "/ui/select.png",
				layout: { type: "grid", tileWidth: 48, tileHeight: 48, columns: 1, rows: 1 }
			},
			// The same flourish with its tail fading out - one on each side of the
			// phase banner (see src/game/turn/view/PhaseBanner.ts). Not 1-bit: the
			// fade is a real alpha ramp, which the tint keeps.
			{
				id: "ui-divider-fade",
				type: "image",
				subtype: "spritesheet",
				url: "/ui/divider-fade.png",
				layout: { type: "grid", tileWidth: 96, tileHeight: 22, columns: 1, rows: 1 }
			},
			// The game's rulebook: the shared catalogs every unit sheet resolves
			// against. Seeded into the catalog registry by the UnitsFeature - see
			// src/game/units/content/UnitCatalog.ts.
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
			// The chapters in order, each naming its scenario and map - see
			// src/game/campaign.
			{
				id: "campaign",
				type: "json",
				url: "/data/campaign/campaign.json"
			},
			// Scenario content, one document of each kind per scenario under
			// `<kind>-<scenario>`. A deployment names the units it puts on the map, and
			// each is looked up as `unit-<id>`, so a new character is a sheet plus an
			// entry here - no TypeScript changes.
			{
				id: "deployment-bellum-duel",
				type: "json",
				url: "/data/deployments/bellum-duel.deployment.json"
			},
			{
				id: "deployment-bellum-brawl",
				type: "json",
				url: "/data/deployments/bellum-brawl.deployment.json"
			},
			{
				id: "deployment-bellum-soldier",
				type: "json",
				url: "/data/deployments/bellum-soldier.deployment.json"
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
			{
				id: "unit-teuta",
				type: "json",
				url: "/data/units/teuta.unit.json"
			},
			// The eight Vigilant Knights, keyed by their wiki slug, and the generic
			// enemies a deployment places by instance (see the `id` on a placement).
			{
				id: "unit-dardan-niveli",
				type: "json",
				url: "/data/units/dardan-niveli.unit.json"
			},
			{
				id: "unit-hasan-eyletmez",
				type: "json",
				url: "/data/units/hasan-eyletmez.unit.json"
			},
			{
				id: "unit-maksimo-auditore",
				type: "json",
				url: "/data/units/maksimo-auditore.unit.json"
			},
			{
				id: "unit-ivan-grussinskin",
				type: "json",
				url: "/data/units/ivan-grussinskin.unit.json"
			},
			{
				id: "unit-leona-kaori",
				type: "json",
				url: "/data/units/leona-kaori.unit.json"
			},
			{
				id: "unit-lina-yukari",
				type: "json",
				url: "/data/units/lina-yukari.unit.json"
			},
			{
				id: "unit-mikael-flaco",
				type: "json",
				url: "/data/units/mikael-flaco.unit.json"
			},
			{
				id: "unit-marven-camini",
				type: "json",
				url: "/data/units/marven-camini.unit.json"
			},
			{
				id: "unit-bandit",
				type: "json",
				url: "/data/units/bandit.unit.json"
			},
			{
				id: "unit-ruffian",
				type: "json",
				url: "/data/units/ruffian.unit.json"
			},
			{
				id: "unit-poacher",
				type: "json",
				url: "/data/units/poacher.unit.json"
			},
			{
				id: "unit-bandit-chief",
				type: "json",
				url: "/data/units/bandit-chief.unit.json"
			},
			{
				id: "unit-hasan-duel",
				type: "json",
				url: "/data/units/hasan-duel.unit.json"
			},
			{
				id: "unit-older-child",
				type: "json",
				url: "/data/units/older-child.unit.json"
			},
			{
				id: "unit-older-child-leader",
				type: "json",
				url: "/data/units/older-child-leader.unit.json"
			},
			{
				id: "unit-red-soldier",
				type: "json",
				url: "/data/units/red-soldier.unit.json"
			},
			// The houses on the map, who is in and what they hand over - see
			// src/game/visit.
			{
				id: "houses-bellum-duel",
				type: "json",
				url: "/data/houses/bellum-duel.houses.json"
			},
			{
				id: "houses-bellum-brawl",
				type: "json",
				url: "/data/houses/bellum-brawl.houses.json"
			},
			{
				id: "houses-bellum-soldier",
				type: "json",
				url: "/data/houses/bellum-soldier.houses.json"
			},
			// The locked doors and chests on the map, and what the chests hold - see
			// src/game/locks.
			{
				id: "locks-bellum-duel",
				type: "json",
				url: "/data/locks/bellum-duel.locks.json"
			},
			{
				id: "locks-bellum-brawl",
				type: "json",
				url: "/data/locks/bellum-brawl.locks.json"
			},
			{
				id: "locks-bellum-soldier",
				type: "json",
				url: "/data/locks/bellum-soldier.locks.json"
			},
			// Who may talk to whom, and the script they speak - see src/game/talk.
			{
				id: "conversations-bellum-duel",
				type: "json",
				url: "/data/conversations/bellum-duel.conversations.json"
			},
			{
				id: "conversations-bellum-brawl",
				type: "json",
				url: "/data/conversations/bellum-brawl.conversations.json"
			},
			{
				id: "conversations-bellum-soldier",
				type: "json",
				url: "/data/conversations/bellum-soldier.conversations.json"
			},
			// The tile maps the chapters are fought on, `map-<name>` as the campaign
			// sheet names them; MapState builds whichever the chapter asks for.
			// Chapter 01 "Every End...": fights 1 and 2 are fought on the market
			// square drawn in Tiled.
			{
				id: "map-market-square",
				type: "json",
				url: "/data/maps/market-square.tilemap.json"
			},
			// Fight 3 is fought in the burning orphanage's yard, drawn in Tiled.
			{
				id: "map-bellum-orphanage-war",
				type: "json",
				url: "/data/maps/bellum-orphanage-war.tilemap.json"
			},
			// The Level-01 sketches of the market and of the orphanage, unused.
			{
				id: "map-bellum-market",
				type: "json",
				url: "/data/maps/bellum-market.tilemap.json"
			},
			{
				id: "map-bellum-orphanage",
				type: "json",
				url: "/data/maps/bellum-orphanage.tilemap.json"
			},
			// Pixel fonts for the UI text. AssetLoader registers each as
			// `new FontFace("<id>", ...)`, so the CSS family name is the asset id.
			// UITheme picks which one is active - see src/game/ui/view/UITheme.ts.
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
