import { Game } from "core/Game";
import { World } from "core/ecs/World";
import { Display } from "core/Display";
import { InputDevice } from "core/input/InputDevice";
import { GameStateManager } from "core/GameStateManager";


declare global
{
    var game: Game;
    var world: World;
    var display: Display
    var inputDevice: InputDevice;
    var stateManager: GameStateManager;
}