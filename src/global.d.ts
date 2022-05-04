import { Game } from "core/Game";
import { InputDevice } from "core/input/InputDevice";
import { World } from "core/ecs/World";


declare global
{
    var game: Game;
    var world: World;
    var inputDevice: InputDevice;
}   