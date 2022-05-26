import { DISPLAY_HEIGHT, DISPLAY_WIDTH } from "Constants";
import { Vector } from "./math/Vector";
import { DisplayOrientation } from "./DisplayOrientation";
import { Dimension } from "./math/Dimension";
import { Graphics } from "./graphics/Graphics";


export interface DisplaySettings
{
    dimension?: Dimension,
    viewportID?: string,
    viewport?: HTMLCanvasElement
}


export class Display
{
    private viewport: HTMLCanvasElement;
    private graphics: Graphics;

    private onMouseDown!: (event: MouseEvent) => any;
    private onMouseUp!: (event: MouseEvent) => any;
    private onMouseMove!: (event: MouseEvent) => any;
    private onWheelChange!: (event: WheelEvent) => any;

    private onTouchStart!: (event: TouchEvent) => any;
    private onTouchEnd!: (event: TouchEvent) => any;
    private onTouchMove!: (event: TouchEvent) => any;

    private onFullscreenChange!: (event: Event) => any;
    private onFullscreenError!: (event: Event) => any;

    private onPointerLockChange!: (event: Event) => any;
    private onPointerLockError!: (event: Event) => any;

    private onOrientationChange!: (event: Event) => any;


    constructor(settings?: DisplaySettings)
    {
        const { dimension, viewportID, viewport } = settings as DisplaySettings;

        if(viewportID) {
            this.viewport = document.getElementById(viewportID) as HTMLCanvasElement;
        }
        else if(viewport) {
            this.viewport = viewport;
        }
        else {
            this.viewport = document.createElement("canvas") as HTMLCanvasElement;
            document.body.append(this.viewport);
        }

        if(dimension) {
            this.viewport.width = dimension.width;
            this.viewport.height = dimension.height;
        } else {
            this.viewport.width = DISPLAY_WIDTH;
            this.viewport.height = DISPLAY_HEIGHT;
        }

        const context = this.viewport.getContext("2d");

        if(context === null) {
            throw new Error("Rendering Context could not be created");
        }

        this.graphics = new Graphics(context);
    }


    public addMouseDownListener(onDown: (event: MouseEvent) => any)
    {
        this.onMouseDown = onDown;
        this.viewport.addEventListener("mousedown", onDown);
    }

    public addMouseUpListener(onUp: (event: MouseEvent) => any)
    {
        this.onMouseUp = onUp;
        this.viewport.addEventListener("mouseup", onUp);
    }

    public addMouseMoveListener(onMove: (event: MouseEvent) => any)
    {
        this.onMouseMove = onMove;
        this.viewport.addEventListener("mousemove", onMove);
    }

    public addWheelChangeListener(onChange: (event: WheelEvent) => any)
    {
        this.onWheelChange = onChange;
        this.viewport.addEventListener("wheel", onChange);
    }

    public removeMouseDownListener()
    {
        this.viewport.removeEventListener("mousedown", this.onMouseDown);
    }

    public removeMouseUpListener()
    {
        this.viewport.removeEventListener("mouseup", this.onMouseUp);
    }

    public removeMouseMoveListener()
    {
        this.viewport.removeEventListener("mousemove", this.onMouseMove);
    }

    public removeWheelChangeListener()
    {
        this.viewport.removeEventListener("wheel", this.onWheelChange);
    }


    public addTouchStartListener(onStart: (event: TouchEvent) => any)
    {
        this.onTouchStart = onStart;
        this.viewport.addEventListener("touchstart", onStart);
    }

    public addTouchEndListener(onEnd: (event: TouchEvent) => any)
    {
        this.onTouchEnd = onEnd;
        this.viewport.addEventListener("touchend", onEnd);
    }

    public addTouchMoveListener(onMove: (event: TouchEvent) => any)
    {
        this.onTouchMove = onMove;
        this.viewport.addEventListener("touchmove", onMove);
    }

    public removeTouchStartListener()
    {
        this.viewport.addEventListener("touchstart", this.onTouchStart);
    }

    public removeTouchEndListener()
    {
        this.viewport.addEventListener("touchend", this.onTouchEnd);
    }

    public removeTouchMoveListener()
    {
        this.viewport.addEventListener("touchmove", this.onTouchMove);
    }


    public isFullscreen(): boolean
    {
        return !!document.fullscreenElement;
    }

    public toggleFullscreen()
    {
        if(this.isFullscreen()) {
            document.exitFullscreen();
        } else {
            this.viewport.requestFullscreen({ navigationUI: "hide" });
        }
    }

    public addFullscreenChangeListener(onChange: (event: Event) => any)
    {
        this.onFullscreenChange = onChange;
        this.viewport.addEventListener("fullscreenchange", onChange);
    }

    public addFullscreenErrorListener(onError: (event: Event) => any)
    {
        this.onFullscreenError = onError;
        this.viewport.addEventListener("fullscreenerror", onError);
    }

    public removeFullscreenChangeListener()
    {
        this.viewport.removeEventListener("fullscreenchange", this.onFullscreenChange);
    }

    public removeFullscreenErrorListener()
    {
        this.viewport.removeEventListener("fullscreenerror", this.onFullscreenError);
    }


    public isPointerLock()
    {
        return document.pointerLockElement === this.viewport;
    }

    public lockPointer()
    {
        this.viewport.requestPointerLock();
    }

    public unlockPointer()
    {
        if(this.isPointerLock()) {
            document.exitPointerLock();
        }
    }

    public addPointerLockChangeListener(onChange: (event: Event) => any)
    {
        this.onPointerLockChange = onChange;
        document.addEventListener("pointerlockchange", onChange);
    }

    public addPointerLockErrorListener(onError: (event: Event) => any)
    {
        this.onPointerLockError = onError;
        document.addEventListener("pointerlockerror", onError);
    }

    public removePointerLockChangeListener()
    {
        document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    }

    public removePointerLockErrorListener()
    {
        document.removeEventListener("pointerlockerror", this.onPointerLockError);
    }


    public lockDisplayOrientation(orientation: DisplayOrientation)
    {
        screen.orientation.lock(orientation);
    }

    public unlockDisplayOrientation()
    {
        screen.orientation.unlock();
    }

    public addOrientationChangeListener(onChange: (event: Event) => any)
    {
        this.onOrientationChange = onChange;
        screen.orientation.addEventListener("change", onChange)
    }

    public removeOrientationChangeListener()
    {
        screen.orientation.removeEventListener("change", this.onOrientationChange);
    }

    public getDisplayOrientation(): DisplayOrientation
    {
        return screen.orientation.type as DisplayOrientation;
    }


    public getViewportDimension(): Dimension
    {
        return {
            width: this.viewport.width * devicePixelRatio,
            height: this.viewport.height * devicePixelRatio
        };
    }

    public getViewportOffset(): Dimension
    {
        return {
            width: this.viewport.offsetLeft * devicePixelRatio,
            height: this.viewport.offsetTop * devicePixelRatio
        };
    }

    public getDisplayDimension(): Dimension
    {
        return { 
            width: screen.width * devicePixelRatio, 
            height: screen.height * devicePixelRatio 
        };
    }

    public getDisplayCenter(): Vector
    {
        const dimension = this.getDisplayDimension();
        return new Vector(dimension.width / 2, dimension.height / 2);
    }


    public getGraphicsContext(): Graphics
    {
        return this.graphics;
    }
}