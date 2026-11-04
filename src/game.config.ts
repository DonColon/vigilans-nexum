import { GameConfiguration } from "@/core/Game";
import { assetManifest } from "@/asset.manifest";
import { TitleState } from "@/game/campaign";

const gameConfiguration: GameConfiguration = {
	id: "vigilans-nexum",
	maxFPS: 60,
	savegameSlots: 8,
	// The title screen first: the campaign feature takes it from there to the
	// chapter card and the battle map. The bundle carries every chapter's
	// content, so nothing is fetched between them.
	initial: {
		state: TitleState,
		bundle: "BattleMap"
	},
	eventBus: {
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
	// Version 3: one store, the framework's savegames keyed by their slot id;
	// the campaign's run is part of the same record (see src/database.schema.ts).
	// A store's key is fixed when it is created, so changing one is an upgrade,
	// and a store no longer listed here is dropped on the next.
	localDatabase: {
		version: 3,
		repositories: {
			savegames: {
				key: "id"
			}
		}
	},
	display: {
		// 16:9, about 27x15 tiles at MapTheme.cellSize (48) - the view a 3DS Fire
		// Emblem has. A bigger map scrolls with the cursor, a smaller one is centred.
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
	},
	// The browser language picks the locale; German is the fallback for any key a
	// less complete translation is missing, and for a language we do not ship.
	i18n: {
		fallbackLocale: "de"
	}
};

export { gameConfiguration };
