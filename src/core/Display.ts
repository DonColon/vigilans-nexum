import { DISPLAY_HEIGHT, DISPLAY_WIDTH } from "Constants";
import { Vector } from "math/Vector";
import { DisplayOrientation } from "./DisplayOrientation";


export class Display
{
    private viewport: HTMLCanvasElement;

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


    public getRenderContext(): CanvasRenderingContext2D
    {
        return this.viewport.getContext("2d") as CanvasRenderingContext2D;
    }
}


export interface DisplaySettings
{
    dimension?: Dimension,
    viewportID?: string,
    viewport?: HTMLCanvasElement
}