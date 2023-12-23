import { GameConfiguration } from "core/Game";
import { assetManifest } from "asset.manifest";


const gameConfiguration: GameConfiguration = {
    id: "vigilans-nexum",
    maxFPS: 60,
    savegameSlots: 8,
    initial: {
        state: "StartScreen",
        bundle: "StartScreen"
    },
    assetLoader: {
        manifest: assetManifest,
        useCache: true
    },
    localDatabase: {
        version: 1,
        repositories: {
            savegames: {
                key: ""
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
};


export { gameConfiguration };