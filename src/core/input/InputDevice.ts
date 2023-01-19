import { Display } from "core/Display";
import { Matrix } from "core/math/Matrix";
import { Vector } from "core/math/Vector";
import { GamepadInput, GamepadInputType } from "./GamepadInput";
import { InputChannel, InputChannelType } from "./InputChannel";
import { InputState, InputStateType } from "./InputState";
import { KeyboardInput, KeyboardInputType } from "./KeyboardInput";
import { MouseInput, MouseInputType } from "./MouseInput";
import { SwipeInput, SwipeInputs, SwipeInputType } from "./SwipeInput";
import { TouchInput, TouchInputType } from "./TouchInput";


export type DeviceInputType = GamepadInputType | KeyboardInputType | MouseInputType | TouchInputType | SwipeInputType;


interface Input
{
    current: boolean,
    previous: boolean
}

interface Pointer
{
    identifier: number,
    position: {
        current: Vector,
        previous: Vector,
    }
    state: Input
}


export class InputDevice
{
    private display: Display;
    private channels: Map<InputChannelType, number>;

    private gamepad!: Map<GamepadInputType, Input>;
    private gamepadSlot!: number;

    private keyboard!: Map<KeyboardInputType, Input>;
    private mouse!: Map<MouseInputType, Pointer>;

    private touchpad!: Map<SwipeInputType, Input>;
    private touch!: Pointer;


    constructor(display: Display)
    {
        this.display = display;
        this.channels = new Map<InputChannelType, number>();

        window.addEventListener( "contextmenu", this.cancelEvent);
        window.addEventListener( "selectstart", this.cancelEvent);

        if(this.isGamepadSupported()) {
            this.initGamepad();
        }

        this.initKeyboard();
        this.initMouse();
        this.initTouchpad();
    }


    public update()
    {
        this.updateGamepad();
        this.updateKeyboard();
        this.updateMouse();
        this.updateTouchpad();
    }

    public uses(channel: InputChannelType): boolean
    {
        const min = Math.max(...this.channels.values());
        const inputChannel = [...this.channels].find(([key, value]) => value === min);
        
        if(!inputChannel) return false;

        return inputChannel.at(0) === channel;
    }

    public isStateOf(channel: InputChannelType, deviceInput: DeviceInputType, state: InputStateType): boolean
    {
        return this.stateOf(channel, deviceInput) === state;
    }

    private stateOf(channel: InputChannelType, deviceInput: DeviceInputType): InputStateType
    {
        const input = this.inputOf(channel, deviceInput);

        if(input.previous === false && input.current === false) {
            return InputState.STILL_RELEASED;
        }
        else if(input.previous === false && input.current === true) {
            return InputState.JUST_PRESSED;
        }
        else if(input.previous === true && input.current === true) {
            return InputState.STILL_PRESSED;
        }
        else if(input.previous === true && input.current === false) {
            return InputState.JUST_RELEASED;
        }

        return InputState.STILL_RELEASED;
    }

    private inputOf(channel: InputChannelType, deviceInput: DeviceInputType): Input
    {
        if(channel === InputChannel.GAMEPAD) {
            return this.gamepad.get(deviceInput as GamepadInputType) as Input;
        }
        else if(channel === InputChannel.KEYBOARD) {
            return this.keyboard.get(deviceInput as KeyboardInputType) as Input;
        }
        else if(channel === InputChannel.MOUSE) {
            const pointer = this.mouse.get(deviceInput as MouseInputType) as Pointer;
            return pointer.state;
        }
        else if(channel === InputChannel.TOUCHPAD) {
            const touchInput = deviceInput as TouchInputType;

            if(touchInput === TouchInput.TOUCH) {
                return this.touch.state;
            } else {
                return this.touchpad.get(deviceInput as SwipeInputType) as Input;
            }
        }

        return {
            current: false,
            previous: false
        };
    }

    
    private isGamepadSupported()
    {
        return "getGamepads" in navigator;
    }

    private initGamepad()
    {
        this.gamepad = new Map<GamepadInputType, Input>();

        for(const value of Object.values(GamepadInput)) {
            this.gamepad.set(value, {
                current: false,
                previous: false
            });
        }

        this.gamepadSlot = 0;

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
            const input = this.gamepad.get(index as GamepadInputType) as Input;
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

            const input = this.gamepad.get(index as GamepadInputType) as Input;
            input.previous = input.current;
            input.current = axisButtons[i];
        }
    }


    private initKeyboard()
    {
        this.keyboard = new Map<KeyboardInputType, Input>();

        for(const key of Object.values(KeyboardInput)) {
            this.keyboard.set(key, {
                current: false,
                previous: false
            });
        }

        window.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("keyup", this.onKeyUp.bind(this));
    }

    private onKeyDown(event: KeyboardEvent)
    {
        this.channels.set(InputChannel.KEYBOARD, event.timeStamp);

        const input = this.keyboard.get(event.code as KeyboardInputType) as Input;
        input.previous = input.current;
        input.current = true;
        
        this.cancelEvent(event);
    }

    private onKeyUp(event: KeyboardEvent)
    {
        const input = this.keyboard.get(event.code as KeyboardInputType) as Input;
        input.previous = input.current;
        input.current = false;

        this.cancelEvent(event);
    }

    private updateKeyboard()
    {
        for(const input of this.keyboard.values()) {
            input.previous = input.current;
        }
    }


    private initMouse()
    {
        this.mouse = new Map<MouseInputType, Pointer>();

        for(const value of Object.values(MouseInput)) {
            this.mouse.set(value, this.initPointer());
        }

        this.display.addMouseDownListener(this.onMouseDown.bind(this));
        this.display.addMouseUpListener(this.onMouseUp.bind(this));
        this.display.addMouseMoveListener(this.onMouseMove.bind(this));
        this.display.addWheelChangeListener(this.onMouseWheel.bind(this));
    }

    private onMouseDown(event: MouseEvent)
    {
        this.channels.set(InputChannel.MOUSE, event.timeStamp);

        const pointer = this.mouse.get(event.button as MouseInputType) as Pointer;
        this.pointerPressed(pointer, event.clientX, event.clientY, 0);

        this.cancelEvent(event);
    }

    private onMouseUp(event: MouseEvent)
    {
        const pointer = this.mouse.get(event.button as MouseInputType) as Pointer;
        this.pointerReleased(pointer);

        this.cancelEvent(event);
    }

    private onMouseMove(event: MouseEvent)
    {
        const pointer = this.mouse.get(event.button as MouseInputType) as Pointer;
        this.pointerMoved(pointer, event.clientX, event.clientY);

        this.cancelEvent(event);
    }

    private onMouseWheel(event: WheelEvent)
    {
        this.channels.set(InputChannel.MOUSE, event.timeStamp);

        const direction = Math.sign(event.deltaY);
        const input = (direction < 0) ? MouseInput.WHEEL_UP : MouseInput.WHEEL_DOWN;

        const pointer = this.mouse.get(input) as Pointer;
        this.pointerMoved(pointer, event.clientX, event.clientY);

        this.cancelEvent(event);
    }

    private updateMouse()
    {
        for(const pointer of this.mouse.values()) {
            pointer.state.previous = pointer.state.current;
        }
    }


    private initTouchpad()
    {
        this.touchpad = new Map<SwipeInputType, Input>();

        for(const value of Object.values(SwipeInput)) {
            this.touchpad.set(value, {
                current: false,
                previous: false
            });
        }

        this.touch = this.initPointer();

        this.display.addTouchStartListener(this.onTouchStart.bind(this));
        this.display.addTouchEndListener(this.onTouchEnd.bind(this));
        this.display.addTouchMoveListener(this.onTouchMove.bind(this));
    }

    private onTouchStart(event: TouchEvent)
    {
        this.channels.set(InputChannel.TOUCHPAD, event.timeStamp);

        const touch = event.touches[0];
        this.pointerPressed(this.touch, touch.clientX, touch.clientY, touch.identifier);

        this.cancelEvent(event);
    }

    private onTouchEnd(event: TouchEvent)
    {
        for(const touch of event.changedTouches) {
            if(this.touch.identifier === touch.identifier) {
                this.pointerReleased(this.touch);
                break;
            }
        }

        for(const value of Object.values(SwipeInput)) {
            const input = this.touchpad.get(value) as Input;
            input.previous = input.current;
            input.current = false;
        }
        
        this.cancelEvent(event);
    }

    private onTouchMove(event: TouchEvent)
    {
        for(const touch of event.changedTouches) {
            if(this.touch.identifier === touch.identifier) {
                this.pointerMoved(this.touch, touch.clientX, touch.clientY);
                break;
            }
        }

        this.cancelEvent(event);
    }

    private updateTouchpad()
    {
        const { position, state } = this.touch;
        state.previous = state.current;

        if(state.current) {
            const swipe = Matrix.reflectY(position.current.subtract(position.previous));
            const angle = swipe.heading();
            
            const input = this.touchpad.get(SwipeInputs.ofAngle(angle)) as Input;
            input.previous = input.current;
            input.current = true;
            return;
        } 

        for(const input of this.touchpad.values()) {
            input.previous = input.current;
        }
    }


    private initPointer(): Pointer
    {
        return {
            identifier: -1,
            position: {
                current: new Vector(0, 0),
                previous: new Vector(0, 0)
            },
            state: {
                current: false,
                previous: false
            }
        };
    }

    private pointerPressed(pointer: Pointer, x: number, y: number, identifier: number)
    {
        pointer.identifier = identifier;
        pointer.state.previous = pointer.state.current;
        pointer.state.current = true;

        pointer.position.previous = pointer.position.current;
        this.pointerMoved(pointer, x, y);
    }

    private pointerReleased(pointer: Pointer)
    {
        pointer.identifier = -1;
        pointer.state.previous = pointer.state.current;
        pointer.state.current = false;
    }

    private pointerMoved(pointer: Pointer, x: number, y: number)
    {
        const offset = this.display.getViewportOffset();
        const viewportX = x - offset.width;
        const viewportY = y - offset.height;

        pointer.position.current = new Vector(viewportX, viewportY);
    }

    private cancelEvent(event: Event)
    {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}
