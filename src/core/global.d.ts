import { Game } from "core/Game";
import { World } from "core/ecs/World";
import { Display } from "core/Display";
import { InputDevice } from "core/input/InputDevice";
import { AudioDevice } from "./audio/AudioDevice";
import { GameStateManager } from "core/GameStateManager";

import { EventSystem } from "./EventSystem";
import { GameEvents } from "./GameEvents";
import { GameEvent } from "./GameEvent";


declare global
{
    var game: Game;
    var world: World;
    var display: Display;
    var inputDevice: InputDevice;
    var audioDevice: AudioDevice;
    var stateManager: GameStateManager;
    var eventSystem: EventSystem<GameEvents, GameEvent>;
}