import { GameConfiguration } from "@/core/Game";
import { assetManifest } from "@/asset.manifest";

const gameConfiguration: GameConfiguration = {
	id: "vigilans-nexum",
	maxFPS: 60,
	savegameSlots: 8,
	initial: {
		state: "StartScreen",
		bundle: "StartScreen"
	},
	eventSystem: {
		history: {
			enabled: true,
			maxSize: 100
		}
	},
	inputDevice: {
		gamepad: {
			axisThreshold: 0.5,
			deadZone: 0.1
		},
		buffer: {
			bufferFrames: 5,
			bufferTime: 200
		}
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
		channels: ["sound", "music", "voice"]
	}
};

export { gameConfiguration };
