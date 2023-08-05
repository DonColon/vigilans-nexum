import { Game } from "core/Game";
import { AssetManifest } from "core/assets/AssetManifest";


const manifest: AssetManifest = {
    bundles: {
        StartScreen: []
    }
};

const game = new Game({
    maxFPS: 60,
    loaderSettings: {
        manifest: manifest,
        initialBundle: "StartScreen",
        useCache: true
    },
    displaySettings: {
        viewportID: "viewport",
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
    audioSettings: {
        channels: [
            "sound",
            "music",
            "voice"
        ]
    }
});