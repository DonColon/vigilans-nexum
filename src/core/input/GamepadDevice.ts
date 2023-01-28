import { GamepadInput, GamepadInputType } from "./GamepadInput";
import { Input } from "./Input";


export class GamepadDevice
{
    private gamepad: Map<GamepadInputType, Input>;
    private slot: number;

    
    constructor()
    {
        this.gamepad = new Map<GamepadInputType, Input>();
        this.slot = 0;

        for(const value of Object.values(GamepadInput)) {
            this.gamepad.set(value, { current: false, previous: false });
        }

        window.addEventListener("gamepadconnected", this.onGamepadConnected);
    }


    public update(): number
    {
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads.at(this.slot);

        if(!gamepad) return 0;

        for(const [index, button] of gamepad.buttons.entries()) {
            const input = this.getInput(index as GamepadInputType);
            input.previous = input.current;
            input.current = button.pressed;
        }

        const axisButtons = [
            gamepad.axes[0] <= -0.5,
            gamepad.axes[0] >= 0.5,
            gamepad.axes[1] <= -0.5,
            gamepad.axes[1] >= 0.5,
            gamepad.axes[2] <= -0.5,
            gamepad.axes[2] >= 0.5,
            gamepad.axes[3] <= -0.5,
            gamepad.axes[3] >= 0.5
        ];

        for(let i = 0; i < axisButtons.length; i++) {
            const index = i + gamepad.buttons.length;
            
            const input = this.getInput(index as GamepadInputType);
            input.previous = input.current;
            input.current = axisButtons[i];
        }

        return gamepad.timestamp;
    }

    public getInput(inputType: GamepadInputType): Input
    {
        const input = this.gamepad.get(inputType);

        if(!input) return { current: false, previous: false };

        return input;
    }


    private onGamepadConnected(event: GamepadEvent)
    {
        this.slot = event.gamepad.index;
        this.cancelEvent(event);
    }

    private cancelEvent(event: Event)
    {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}