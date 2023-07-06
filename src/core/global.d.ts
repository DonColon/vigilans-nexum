import { Game } from "core/Game";
import { EventSystem } from "./EventSystem";
import { GameEvents } from "./GameEvents";
import { GameEvent } from "./GameEvent";
import { GameStateManager } from "core/GameStateManager";
import { Display } from "core/graphics/Display";
import { InputDevice } from "core/input/InputDevice";
import { AudioDevice } from "./audio/AudioDevice";
import { World } from "core/ecs/World";


declare global
{
    var game: Game;
    var eventSystem: EventSystem<GameEvents, GameEvent>;
    var stateManager: GameStateManager;
    var display: Display;
    var inputDevice: InputDevice;
    var audioDevice: AudioDevice;
    var world: World;
}