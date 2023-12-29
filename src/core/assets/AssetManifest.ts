import { AssetType } from "./Asset";

export interface AssetManifest {
	assetRoot?: string;
	bundles: {
		[bundleName: string]: AssetType[];
	};
}
