import { Display } from "core/Display";
import { Matrix } from "core/math/Matrix";
import { Vector } from "core/math/Vector";
import { Input, Pointer } from "./Input";
import { SwipeInput, SwipeInputs, SwipeInputType } from "./SwipeInput";
import { TouchInput, TouchInputType } from "./TouchInput";


export class TouchpadDevice
{
    private touchpad: Map<SwipeInputType, Input>;
    private touch: Pointer;

    private display: Display;
    private lastUsed: number;


    constructor(display: Display)
    {
        this.touchpad = new Map<SwipeInputType, Input>();
        this.touch = this.initPointer();
        
        this.display = display;
        this.lastUsed = 0;

        for(const value of Object.values(SwipeInput)) {
            this.touchpad.set(value, { current: false, previous: false });
        }

        this.display.addTouchStartListener(this.onTouchStart.bind(this));
        this.display.addTouchEndListener(this.onTouchEnd.bind(this));
        this.display.addTouchMoveListener(this.onTouchMove.bind(this));
    }


    public update(): number
    {
        const { position, state } = this.touch;
        state.previous = state.current;

        if(state.current) {
            const swipe = Matrix.reflectY(position.current.subtract(position.previous));
            const angle = swipe.heading();
            
            const input = this.touchpad.get(SwipeInputs.ofAngle(angle)) as Input;
            input.previous = input.current;
            input.current = true;

            return this.lastUsed;
        } 

        for(const input of this.touchpad.values()) {
            input.previous = input.current;
        }

        return this.lastUsed;
    }

    public getInput(inputType: TouchInputType | SwipeInputType): Input
    {
        if(inputType === TouchInput.TOUCH) {
            return this.touch.state;
        }

        const input = this.touchpad.get(inputType);

        if(!input) return { current: false, previous: false };

        return input;
    }


    private onTouchStart(event: TouchEvent)
    {
        this.lastUsed = event.timeStamp;

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
            const input = this.getInput(value);
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