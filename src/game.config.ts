import { GameConfiguration } from "@/core/Game";
import { assetManifest } from "@/asset.manifest";
import { MapState } from "@/game/map";

const gameConfiguration: GameConfiguration = {
	id: "vigilans-nexum",
	maxFPS: 60,
	savegameSlots: 8,
	initial: {
		state: MapState,
		bundle: "BattleMap"
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
		// The 48x24 battle map drawn at MapTheme.cellSize (32) - the map fills the
		// viewport exactly, with no band around it.
		dimension: {
			width: 1536,
			height: 768
		},
		layers: {
			1: "background",
			2: "gameplay",
			3: "ui"
		}
	},
	audioDevice: {
		channels: ["sound", "music", "voice"]
	},
	// The browser language picks the locale; German is the fallback for any key a
	// less complete translation is missing, and for a language we do not ship.
	i18n: {
		fallbackLocale: "de"
	}
};

export { gameConfiguration };
