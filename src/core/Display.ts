import { GameError } from "./GameError";
import { Vector } from "./math/Vector";
import { Dimension } from "./math/Dimension";
import { Graphics } from "./graphics/Graphics";
import { DisplayOrientationType } from "./DisplayOrientation";


export interface DisplaySettings
{
    viewportID: string,
    dimension?: Dimension
}


export class Display
{
    private viewport: HTMLCanvasElement;
    private viewportDimension: Dimension;
    private viewportOffset: Vector;

    private graphics: Graphics;
    private dimension: Dimension;
    private center: Vector;

    private orientationLocked: boolean;


    constructor(settings?: DisplaySettings)
    {
        if(settings === undefined) {

            this.viewport = document.createElement("canvas");

            this.viewport.width = window.innerWidth;
            this.viewport.height = window.innerHeight;

            document.body.append(this.viewport);

        } else {

            const { viewportID, dimension } = settings;
            const viewport = document.getElementById(viewportID);
    
            if(viewport === null) {
                throw new GameError(`Element with ID ${viewportID} does not exist`);
            }
            
            if(!(viewport instanceof HTMLCanvasElement)) {
                throw new GameError(`Viewport is not of type ${HTMLCanvasElement.name}`);
            }
    
            if(dimension !== undefined) {
                viewport.width = dimension.width;
                viewport.height = dimension.height;
            }
    
            this.viewport = viewport;

        }

        const context = this.viewport.getContext("2d");

        if(context === null) {
            throw new GameError("Rendering Context for viewport could not be created");
        }

        this.graphics = new Graphics(context);

        this.viewportDimension = {
            width: this.viewport.width * devicePixelRatio,
            height: this.viewport.height * devicePixelRatio
        };

        this.viewportOffset = new Vector(
            this.viewport.offsetLeft * devicePixelRatio, 
            this.viewport.offsetTop * devicePixelRatio
        );

        this.dimension = { 
            width: screen.width * devicePixelRatio, 
            height: screen.height * devicePixelRatio 
        };

        this.center = new Vector(
            this.dimension.width / 2, 
            this.dimension.height / 2
        );

        this.orientationLocked = false;
    }


    public addMouseDownListener(onDown: (event: MouseEvent) => any)
    {
        this.viewport.addEventListener("mousedown", onDown);
    }

    public removeMouseDownListener(onDown: (event: MouseEvent) => any)
    {
        this.viewport.removeEventListener("mousedown", onDown);
    }

    public addMouseUpListener(onUp: (event: MouseEvent) => any)
    {
        this.viewport.addEventListener("mouseup", onUp);
    }

    public removeMouseUpListener(onUp: (event: MouseEvent) => any)
    {
        this.viewport.removeEventListener("mouseup", onUp);
    }

    public addMouseMoveListener(onMove: (event: MouseEvent) => any)
    {
        this.viewport.addEventListener("mousemove", onMove);
    }

    public removeMouseMoveListener(onMove: (event: MouseEvent) => any)
    {
        this.viewport.removeEventListener("mousemove", onMove);
    }

    public addWheelChangeListener(onChange: (event: WheelEvent) => any)
    {
        this.viewport.addEventListener("wheel", onChange);
    }

    public removeWheelChangeListener(onChange: (event: WheelEvent) => any)
    {
        this.viewport.removeEventListener("wheel", onChange);
    }

    public addTouchStartListener(onStart: (event: TouchEvent) => any)
    {
        this.viewport.addEventListener("touchstart", onStart);
    }

    public removeTouchStartListener(onStart: (event: TouchEvent) => any)
    {
        this.viewport.addEventListener("touchstart", onStart);
    }

    public addTouchEndListener(onEnd: (event: TouchEvent) => any)
    {
        this.viewport.addEventListener("touchend", onEnd);
    }

    public removeTouchEndListener(onEnd: (event: TouchEvent) => any)
    {
        this.viewport.addEventListener("touchend", onEnd);
    }

    public addTouchMoveListener(onMove: (event: TouchEvent) => any)
    {
        this.viewport.addEventListener("touchmove", onMove);
    }

    public removeTouchMoveListener(onMove: (event: TouchEvent) => any)
    {
        this.viewport.addEventListener("touchmove", onMove);
    }

    public addFullscreenChangeListener(onChange: (event: Event) => any)
    {
        this.viewport.addEventListener("fullscreenchange", onChange);
    }

    public removeFullscreenChangeListener(onChange: (event: Event) => any)
    {
        this.viewport.removeEventListener("fullscreenchange", onChange);
    }

    public addFullscreenErrorListener(onError: (event: Event) => any)
    {
        this.viewport.addEventListener("fullscreenerror", onError);
    }

    public removeFullscreenErrorListener(onError: (event: Event) => any)
    {
        this.viewport.removeEventListener("fullscreenerror", onError);
    }

    public addPointerLockChangeListener(onChange: (event: Event) => any)
    {
        document.addEventListener("pointerlockchange", onChange);
    }

    public removePointerLockChangeListener(onChange: (event: Event) => any)
    {
        document.removeEventListener("pointerlockchange", onChange);
    }

    public addPointerLockErrorListener(onError: (event: Event) => any)
    {
        document.addEventListener("pointerlockerror", onError);
    }

    public removePointerLockErrorListener(onError: (event: Event) => any)
    {
        document.removeEventListener("pointerlockerror", onError);
    }

    public addOrientationChangeListener(onChange: (event: Event) => any)
    {
        screen.orientation.addEventListener("change", onChange)
    }

    public removeOrientationChangeListener(onChange: (event: Event) => any)
    {
        screen.orientation.removeEventListener("change", onChange);
    }


    public enterFullscreen()
    {
        if(!this.isFullscreen()) {
            this.viewport.requestFullscreen({ navigationUI: "hide" });
        }
    }

    public exitFullscreen()
    {
        if(this.isFullscreen()) {
            document.exitFullscreen();
        }
    }

    public isFullscreen(): boolean
    {
        return document.fullscreenElement === this.viewport;
    }

    public lockPointer()
    {
        if(!this.isPointerLocked()) {
            this.viewport.requestPointerLock();
        }
    }

    public unlockPointer()
    {
        if(this.isPointerLocked()) {
            document.exitPointerLock();
        }
    }

    public isPointerLocked()
    {
        return document.pointerLockElement === this.viewport;
    }

    public lockOrientation(orientation: DisplayOrientationType)
    {
        if(!this.isOrientationLocked()) {
            this.orientationLocked = true;
            screen.orientation.lock(orientation);
        }
    }

    public unlockOrientation()
    {
        if(this.isOrientationLocked()) {
            this.orientationLocked = false;
            screen.orientation.unlock();
        }
    }

    public isOrientationLocked(): boolean
    {
        return this.orientationLocked;
    }


    public getViewport(): HTMLCanvasElement
    {
        return this.viewport;
    }

    public getViewportDimension(): Dimension
    {
        return this.viewportDimension;
    }

    public getViewportOffset(): Vector
    {
        return this.viewportOffset;
    }

    public getGraphicsContext(): Graphics
    {
        return this.graphics;
    }

    public getDimension(): Dimension
    {
        return this.dimension;
    }

    public getCenter(): Vector
    {
        return this.center;
    }

    public getOrientation(): DisplayOrientationType
    {
        return screen.orientation.type;
    }

    public getOrientationAngle(): number
    {
        return screen.orientation.angle;
    }
}