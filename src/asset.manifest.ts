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
