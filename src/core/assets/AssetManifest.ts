import { AssetType } from "@/core/assets/Asset";

export interface AssetManifest {
	assetRoot?: string;
	bundles: {
		[bundleName: string]: AssetType[];
	};
}
