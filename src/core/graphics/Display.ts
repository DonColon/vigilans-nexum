import { GameError } from "../GameError";
import { Vector } from "../math/Vector";
import { Dimension } from "../math/Dimension";
import { Graphics } from "./Graphics";
import { DisplayOrientationType } from "./DisplayOrientation";


export interface DisplaySettings
{
    viewportID: string,
    dimension?: Dimension,
    layers?: {
        [order: number]: string
    }
}


export class Display
{
    private viewport: HTMLElement;
    private viewportDimension: Dimension;
    private viewportOffset: Vector;
    private viewportCenter: Vector;

    private layers: Map<string, Graphics>;

    private dimension: Dimension;
    private center: Vector;

    private orientationLocked: boolean;


    constructor(settings?: DisplaySettings)
    {
        if(settings === undefined) {

            this.viewport = document.createElement("main");

            this.viewport.style.width = `${window.innerWidth}px`;
            this.viewport.style.height = `${window.innerHeight}px`;

            document.body.append(this.viewport);

        } else {

            const { viewportID, dimension } = settings;
            const viewport = document.getElementById(viewportID);
    
            if(viewport === null) {
                throw new GameError(`Element with ID ${viewportID} does not exist`);
            }
    
            if(dimension !== undefined) {
                viewport.style.width = `${dimension.width}px`;
                viewport.style.height = `${dimension.height}px`;
            }
    
            this.viewport = viewport;

        }

        this.viewportDimension = {
            width: parseFloat(this.viewport.style.width) * devicePixelRatio,
            height: parseFloat(this.viewport.style.height) * devicePixelRatio
        };

        this.viewportOffset = new Vector(
            this.viewport.offsetLeft * devicePixelRatio, 
            this.viewport.offsetTop * devicePixelRatio
        );

        this.viewportCenter = new Vector(
            this.viewportOffset.x + this.viewportDimension.width / 2,
            this.viewportOffset.y + this.viewportDimension.height / 2
        );


        this.layers = new Map<string, Graphics>();

        if(settings !== undefined && settings.layers !== undefined) {
            for(const [order, name] of Object.entries(settings.layers)) {
                this.addLayer(name, parseInt(order));
            }
        }

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


    public addLayer(name: string, order: number): this
    {
        if(this.layers.has(name)) {
            throw new GameError(`Layer ${name} already exists`);
        }

        const canvas = this.createCanvas(name, order);
        const context = canvas.getContext("2d");

        if(context === null) {
            throw new GameError(`Rendering Context for layer ${name} could not be created`);
        }

        const graphics = new Graphics(context);

        this.layers.set(name, graphics);
        this.viewport.append(canvas);

        return this;
    }

    public removeLayer(name: string): this
    {
        const canvas = document.getElementById(name);

        if(canvas === null) {
            throw new GameError(`Layer ${name} does not exist`);
        }

        this.layers.delete(name);
        this.viewport.removeChild(canvas);

        return this;
    }

    public getLayer(name: string): Graphics
    {
        const layer = this.layers.get(name);

        if(layer === undefined) {
            throw new GameError(`Layer ${name} does not exist`);
        }

        return layer;
    }

    private createCanvas(name: string, order: number): HTMLCanvasElement
    {
        const canvas = document.createElement("canvas");
        canvas.width = this.viewportDimension.width;
        canvas.height = this.viewportDimension.height;
        canvas.style.zIndex = order.toString();
        canvas.id = name;

        return canvas;
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


    public getViewport(): HTMLElement
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

    public getViewportCenter(): Vector
    {
        return this.viewportCenter;
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