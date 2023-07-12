import { Asset } from "./Asset";


export interface AssetManifest
{
    assetRoot?: string,
    bundles: {
        [bundleName: string]: Asset[]
    }
}