import { Game } from "core/Game";
import { AssetManifest } from "core/assets/AssetManifest";


const manifest: AssetManifest = {
    bundles: {
        StartScreen: []
    }
};

const game = new Game({
    id: "vigilans-nexum",
    maxFPS: 60,
    savegameSlots: 8,
    assetLoader: {
        manifest: manifest,
        initialBundle: "StartScreen",
        useCache: true
    },
    localDatabase: {
        version: 1,
        repositories: {
            entities: {
                key: "id"
            },
            saveFiles: {
                autoIncrement: true,
                key: "id"
            }
        }
    },
    display: {
        dimension: {
            width: 1280,
            height: 720
        },
        layers: {
            1: "background",
            2: "gameplay",
            3: "ui"
        }
    },
    audioDevice: {
        channels: [
            "sound",
            "music",
            "voice"
        ]
    }
});