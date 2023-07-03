import { Vector } from "core/math/Vector";
import { Input, Pointer } from "./Input";
import { MouseInput, MouseInputType } from "./MouseInput";


export class MouseDevice
{
    private mouse: Map<MouseInputType, Pointer>;
    private lastUsed: number;

    
    constructor()
    {
        this.mouse = new Map<MouseInputType, Pointer>();
        this.lastUsed = 0;

        for(const value of Object.values(MouseInput)) {
            this.mouse.set(value, this.initPointer());
        }

        display.addMouseDownListener(event => this.onMouseDown(event));
        display.addMouseUpListener(event => this.onMouseUp(event));
        display.addMouseMoveListener(event => this.onMouseMove(event));
        display.addWheelChangeListener(event => this.onMouseWheel(event));
    }


    public update(): number
    {
        for(const pointer of this.mouse.values()) {
            pointer.state.previous = pointer.state.current;
        }

        return this.lastUsed;
    }

    public getInput(inputType: MouseInputType): Input
    {
        const pointer = this.mouse.get(inputType);

        if(!pointer) return { current: false, previous: false };

        return pointer.state;
    }

    public getPointer(inputType: MouseInputType): Pointer
    {
        const pointer = this.mouse.get(inputType);

        if(!pointer) return this.initPointer();

        return pointer;
    }


    private onMouseDown(event: MouseEvent)
    {
        this.lastUsed = event.timeStamp;

        const pointer = this.getPointer(event.button as MouseInputType);
        this.pointerPressed(pointer, event.clientX, event.clientY, 0);

        this.cancelEvent(event);
    }

    private onMouseUp(event: MouseEvent)
    {
        const pointer = this.getPointer(event.button as MouseInputType);
        this.pointerReleased(pointer);

        this.cancelEvent(event);
    }

    private onMouseMove(event: MouseEvent)
    {
        const pointer = this.getPointer(event.button as MouseInputType);
        this.pointerMoved(pointer, event.clientX, event.clientY);

        this.cancelEvent(event);
    }

    private onMouseWheel(event: WheelEvent)
    {
        this.lastUsed = event.timeStamp;

        const direction = Math.sign(event.deltaY);
        const input = (direction < 0) ? MouseInput.WHEEL_UP : MouseInput.WHEEL_DOWN;

        const pointer = this.getPointer(input);
        this.pointerMoved(pointer, event.clientX, event.clientY);

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
        const offset = display.getViewportOffset();
        const viewportX = x - offset.x;
        const viewportY = y - offset.y;

        pointer.position.current = new Vector(viewportX, viewportY);
    }
    
    private cancelEvent(event: Event)
    {
        event.preventDefault();
        event.stopImmediatePropagation();
    }
}