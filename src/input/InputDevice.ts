import { Vector } from "math/Vector";
import { GamepadInput } from "./GamepadInput";
import { KeyboardInput } from "./KeyboardInput";
import { MouseInput } from "./MouseInput";
import { Pointer } from "./Pointer";


export class InputDevice
{
    private viewport: HTMLCanvasElement;
    private keyboard: Map<string, boolean>;
    private gamepad: Map<string, boolean>;
    private pointer: Pointer;

    private gamepadSlot: number;


    constructor(viewport: HTMLCanvasElement)
    {
        this.viewport = viewport;
        this.keyboard = new Map<string, boolean>();
        this.gamepad = new Map<string, boolean>();
        this.pointer = {} as Pointer;
        this.gamepadSlot = 0;

        window.addEventListener( "contextmenu", this.cancelEvent);
        window.addEventListener( "selectstart", this.cancelEvent);

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

    private updateGamepad()
    {
        const gamepad = navigator.getGamepads()[this.gamepadSlot];

        if(!gamepad) return;

        for(const index in gamepad.buttons) {
            this.gamepad.set(index, gamepad.buttons[index].pressed);
        }

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
        this.viewport.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.viewport.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.viewport.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.viewport.addEventListener("wheel", this.onMouseWheel.bind(this));
    }

    private onMouseDown(event: MouseEvent)
    {
        this.pointerPressed(event.clientX, event.clientY, event.button);
        this.cancelEvent(event);
    }

    private onMouseUp(event: MouseEvent)
    {
        this.pointerReleased();
        this.cancelEvent(event);
    }

    private onMouseMove(event: MouseEvent)
    {
        this.pointerMoved(event.clientX, event.clientY);
        this.cancelEvent(event);
    }

    private onMouseWheel(event: WheelEvent)
    {
        const direction = Math.sign(event.deltaY);
        this.pointer.identifier = (direction < 0) ? MouseInput.WHEEL_UP : MouseInput.WHEEL_DOWN;
        this.pointerMoved(event.clientX, event.clientY);
        this.cancelEvent(event);
    }


    private initTouch()
    {
        this.viewport.addEventListener("touchstart", this.onTouchStart.bind(this));
        this.viewport.addEventListener("touchend", this.onTouchEnd.bind(this));
        this.viewport.addEventListener("touchmove", this.onTouchMove.bind(this));
    }

    private onTouchStart(event: TouchEvent)
    {
        const touch = event.touches[0];
        this.pointerPressed(touch.clientX, touch.clientY, touch.identifier);
        this.cancelEvent(event);
    }

    private onTouchEnd(event: TouchEvent)
    {
        for(const touch of event.changedTouches) {
            if(this.pointer.identifier === touch.identifier) {
                this.pointerReleased();
                break;
            }
        }
        
        this.cancelEvent(event);
    }

    private onTouchMove(event: TouchEvent)
    {
        for(const touch of event.changedTouches) {
            if(this.pointer.identifier === touch.identifier) {
                this.pointerMoved(touch.clientX, touch.clientY);
                break;
            }
        }

        this.cancelEvent(event);
    }


    private pointerPressed(x: number, y: number, identifier: number)
    {
        this.pointerMoved(x, y);

        this.pointer.identifier = identifier;
        this.pointer.pressed = true;
        this.pointer.previous = this.pointer.current;
    }

    private pointerReleased()
    {
        this.pointer.identifier = -1;
        this.pointer.pressed = false;
    }

    private pointerMoved(x: number, y: number)
    {
        const viewportX = x - this.viewport.offsetLeft;
        const viewportY = y - this.viewport.offsetTop;

        this.pointer.current = new Vector(viewportX, viewportY);
        this.pointer.moved = true;
    }

    private cancelEvent(event: Event)
    {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}
