import { Display } from "core/Display";
import { Vector } from "math/Vector";
import { GamepadInput } from "./GamepadInput";
import { InputChannel } from "./InputChannel";
import { KeyboardInput } from "./KeyboardInput";
import { MouseInput } from "./MouseInput";
import { Pointer } from "./Pointer";
import { SwipeInput } from "./SwipeInput";
import { TouchInput } from "./TouchInput";


export class InputDevice
{
    private display: Display;
    private channels: Map<InputChannel, number>;
    private gamepad: Map<GamepadInput, boolean>;
    private keyboard: Map<KeyboardInput, boolean>;
    private touchpad: Map<SwipeInput, boolean>;

    private gamepadSlot: number;
    private pointer: Pointer;


    constructor(display: Display)
    {
        this.display = display;
        this.channels = new Map<InputChannel, number>();
        this.gamepad = new Map<GamepadInput, boolean>();
        this.keyboard = new Map<KeyboardInput, boolean>();
        this.touchpad = new Map<SwipeInput, boolean>();

        this.gamepadSlot = 0;
        this.pointer = {} as Pointer;

        window.addEventListener( "contextmenu", this.cancelEvent);
        window.addEventListener( "selectstart", this.cancelEvent);

        if(this.isGamepadSupported()) {
            this.initGamepad();
        }

        this.initKeyboard();
        this.initMouse();
        this.initTouch();
    }


    public update()
    {
        this.updateGamepad();
        this.updatePointer();
    }

    public uses(channel: InputChannel): boolean
    {
        const min = Math.max(...this.channels.values());
        const inputChannel = [...this.channels].find(([key, value]) => value === min);
        
        if(!inputChannel) return false;

        return inputChannel.at(0) === channel;
    }

    public isPressed(channel: InputChannel, input: GamepadInput | KeyboardInput | MouseInput | TouchInput | SwipeInput): boolean
    {
        if(channel === InputChannel.GAMEPAD) {
            return !!this.gamepad.get(input as GamepadInput);
        }
        else if(channel === InputChannel.KEYBOARD) {
            return !!this.keyboard.get(input as KeyboardInput);
        }
        else if(channel === InputChannel.MOUSE) {
            return (this.pointer.button === input as MouseInput) ? this.pointer.pressed : false;
        }
        else if(channel === InputChannel.TOUCH) {
            const touchInput = input as TouchInput;

            if(touchInput === TouchInput.TOUCH) {
                return (this.pointer.button === touchInput) ? this.pointer.pressed : false;
            } else {
                return !!this.touchpad.get(input as SwipeInput);
            }
        }

        return false;
    }

    public getPointer(): Pointer
    {
        return this.pointer;
    }

    
    private isGamepadSupported()
    {
        return "getGamepads" in navigator;
    }

    private initGamepad()
    {
        for(const value of GamepadInput.values()) {
            this.gamepad.set(value, false);
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

        this.channels.set(InputChannel.GAMEPAD, gamepad.timestamp);

        for(const [index, button] of gamepad.buttons.entries()) {
            this.gamepad.set(index as GamepadInput, button.pressed);
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
        for(const key of KeyboardInput.values()) {
            this.keyboard.set(key, false);
        }

        window.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("keyup", this.onKeyUp.bind(this));
    }

    private onKeyDown(event: KeyboardEvent)
    {
        this.channels.set(InputChannel.KEYBOARD, event.timeStamp);
        this.keyboard.set(event.code as KeyboardInput, true);
        this.cancelEvent(event);
    }

    private onKeyUp(event: KeyboardEvent)
    {
        this.keyboard.set(event.code as KeyboardInput, false);
        this.cancelEvent(event);
    }


    private initMouse()
    {
        this.display.addMouseDownListener(this.onMouseDown.bind(this));
        this.display.addMouseUpListener(this.onMouseUp.bind(this));
        this.display.addMouseMoveListener(this.onMouseMove.bind(this));
        this.display.addWheelChangeListener(this.onMouseWheel.bind(this));
    }

    private onMouseDown(event: MouseEvent)
    {
        this.channels.set(InputChannel.MOUSE, event.timeStamp);
        this.pointerPressed(event.clientX, event.clientY, 0, event.button);
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
        this.channels.set(InputChannel.MOUSE, event.timeStamp);

        const direction = Math.sign(event.deltaY);
        this.pointer.identifier = (direction < 0) ? MouseInput.WHEEL_UP : MouseInput.WHEEL_DOWN;
        this.pointerMoved(event.clientX, event.clientY);
        this.cancelEvent(event);
    }


    private initTouch()
    {
        for(const value of SwipeInput.values()) {
            this.touchpad.set(value, false);
        }

        this.display.addTouchStartListener(this.onTouchStart.bind(this));
        this.display.addTouchEndListener(this.onTouchEnd.bind(this));
        this.display.addTouchMoveListener(this.onTouchMove.bind(this));
    }

    private onTouchStart(event: TouchEvent)
    {
        this.channels.set(InputChannel.TOUCH, event.timeStamp);

        const touch = event.touches[0];
        this.pointerPressed(touch.clientX, touch.clientY, touch.identifier, TouchInput.TOUCH);
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


    private pointerPressed(x: number, y: number, identifier: number, button: number)
    {
        this.pointerMoved(x, y);

        this.pointer.identifier = identifier;
        this.pointer.button = button;
        this.pointer.pressed = true;
        this.pointer.previous = this.pointer.current;
    }

    private pointerReleased()
    {
        for(const value of SwipeInput.values()) {
            this.touchpad.set(value, false);
        }

        this.pointer.identifier = -1;
        this.pointer.button = -1;
        this.pointer.pressed = false;
    }

    private pointerMoved(x: number, y: number)
    {
        const offset = this.display.getViewportOffset();
        const viewportX = x - offset.width;
        const viewportY = y - offset.height;

        this.pointer.current = new Vector(viewportX, viewportY);
        this.pointer.moved = true;
    }

    private updatePointer()
    {
        if(!this.pointer.pressed) return;
        const { current, previous } = this.pointer;

        const swipe = current.subtract(previous).flipY();
        const angle = swipe.heading();
        
        this.touchpad.set(SwipeInput.fromAngle(angle), true);
    }

    private cancelEvent(event: Event)
    {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}
