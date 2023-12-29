import { Game } from "core/Game";
import { EventSystem } from "./events/EventSystem";
import { LocalDatabase } from "./database/LocalDatabase";
import { AssetStorage } from "./assets/AssetStorage";
import { AssetLoader } from "./assets/AssetLoader";
import { GameStateManager } from "core/GameStateManager";
import { Display } from "core/graphics/Display";
import { InputDevice } from "core/input/InputDevice";
import { AudioDevice } from "./audio/AudioDevice";
import { World } from "core/ecs/World";

declare global {
	var game: Game;
	var eventSystem: EventSystem;
	var localDatabase: LocalDatabase;
	var assetStorage: AssetStorage;
	var assetLoader: AssetLoader;
	var stateManager: GameStateManager;
	var display: Display;
	var inputDevice: InputDevice;
	var audioDevice: AudioDevice;
	var world: World;
}
