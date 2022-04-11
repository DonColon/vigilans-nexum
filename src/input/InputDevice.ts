import { GamepadInput } from "./GamepadInput";
import { KeyboardInput } from "./KeyboardInput";


export class InputDevice
{
    private viewport: HTMLCanvasElement;
    private keyboard: Map<string, boolean>;
    private gamepad: Map<string, boolean>;
    private gamepadSlot: number;


    constructor(viewport: HTMLCanvasElement)
    {
        this.viewport = viewport;
        this.keyboard = new Map<string, boolean>();
        this.gamepad = new Map<string, boolean>();
        this.gamepadSlot = 0;

        if(this.isGamepadSupported()) {
            this.initGamepad();
        }

        this.initKeyboard();
        this.initMouse();
        this.initTouch();
    }

    
    private isGamepadSupported()
    {
        return "getGamepads" in navigator;
    }

    private initGamepad()
    {
        for(const key of Object.values(GamepadInput)) {
            this.gamepad.set(key, false);
        }

        window.addEventListener("gamepadconnected", this.onGamepadConnected.bind(this));
    }

    private onGamepadConnected(event: GamepadEvent)
    {
        this.gamepadSlot = event.gamepad.index;
        this.cancelEvent(event);
    }

    public pollGamepadStatus()
    {
        const gamepad = navigator.getGamepads()[this.gamepadSlot];

        if(!gamepad) return;

        gamepad.buttons.forEach((gamepadButton, index) => {
            const buttonIndex = index.toString();
            this.gamepad.set(buttonIndex, gamepadButton.pressed);
        });

        this.gamepad.set(GamepadInput.LSTICK_LEFT, gamepad.axes[0] <= -0.5);
        this.gamepad.set(GamepadInput.LSTICK_RIGHT, gamepad.axes[0] >= 0.5);
        this.gamepad.set(GamepadInput.LSTICK_UP, gamepad.axes[1] <= -0.5);
        this.gamepad.set(GamepadInput.LSTICK_DOWN, gamepad.axes[1] >= 0.5);

        this.gamepad.set(GamepadInput.RSTICK_LEFT, gamepad.axes[2] <= -0.5);
        this.gamepad.set(GamepadInput.RSTICK_RIGHT, gamepad.axes[2] >= 0.5);
        this.gamepad.set(GamepadInput.RSTICK_UP, gamepad.axes[3] <= -0.5);
        this.gamepad.set(GamepadInput.RSTICK_DOWN, gamepad.axes[3] >= 0.5);
    }


    private initKeyboard()
    {
        for(const key of Object.values(KeyboardInput)) {
            this.keyboard.set(key, false);
        }

        window.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("keyup", this.onKeyUp.bind(this));
    }

    private onKeyDown(event: KeyboardEvent)
    {
        this.keyboard.set(event.code, true);
        this.cancelEvent(event);
    }

    private onKeyUp(event: KeyboardEvent)
    {
        this.keyboard.set(event.code, false);
        this.cancelEvent(event);
    }


    private initMouse()
    {
        this.viewport.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.viewport.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.viewport.addEventListener("mouseup", this.onMouseUp.bind(this));
    }

    private onMouseMove(event: MouseEvent)
    {
        this.cancelEvent(event);
    }

    private onMouseDown(event: MouseEvent)
    {
        this.cancelEvent(event);
    }

    private onMouseUp(event: MouseEvent)
    {
        this.cancelEvent(event);
    }


    private initTouch()
    {
        this.viewport.addEventListener("touchmove", this.onTouchMove.bind(this));
        this.viewport.addEventListener("touchstart", this.onTouchStart.bind(this));
        this.viewport.addEventListener("touchend", this.onTouchEnd.bind(this));
    }

    private onTouchMove(event: TouchEvent)
    {
        this.cancelEvent(event);
    }

    private onTouchStart(event: TouchEvent)
    {
        this.cancelEvent(event);
    }

    private onTouchEnd(event: TouchEvent)
    {
        this.cancelEvent(event);
    }


    private cancelEvent(event: Event)
    {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}
