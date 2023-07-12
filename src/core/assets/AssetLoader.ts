import { GameError } from "core/GameError";
import { AssetManifest } from "./AssetManifest";
import { Asset } from "./Asset";


export class AssetLoader
{
    private context: AudioContext;


    constructor(private manifest: AssetManifest)
    {
        this.context = new AudioContext();
    }


    public async load(bundleName: string)
    {
        const bundle = this.manifest.bundles[bundleName];

        if(!bundle) {
            throw new GameError(`Bundle ${bundleName} does not exist in asset manifest`);
        }

        for(const asset of bundle) {
            if(asset.type === "audio") {
                this.loadAudio(asset);
            }
        }
    }


    private async loadAudio(audio: Asset)
    {
        const response = await fetch(audio.url);
        const data = await response.arrayBuffer();
        const audioBuffer = await this.context.decodeAudioData(data);

        const audioTrack = { 
            buffer: audioBuffer, 
            channel: audio.subtype 
        };

        eventSystem.dispatch("audioLoaded", { assetID: audio.id, track: audioTrack });
    }
}