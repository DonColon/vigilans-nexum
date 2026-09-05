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
			}
		]
	}
};

export { assetManifest };
