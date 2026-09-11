import { GameError } from "@/core/GameError";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { DisplayOrientationType } from "@/core/graphics/DisplayOrientation";
import { GameCoreService } from "@/core/service/GameCoreService";

/** Darkest and lightest the screen can be set to - far enough either way to be useful, not far enough to be unplayable. */
export const MIN_BRIGHTNESS = 50;
export const MAX_BRIGHTNESS = 150;

export interface DisplayConfiguration {
	dimension?: Dimension;
	layers?: {
		[order: number]: string;
	};
}

@GameCoreService()
export class Display {
	private readonly viewport: HTMLElement;
	private readonly viewportDimension: Dimension;
	private readonly viewportOffset: Vector2D;
	private readonly viewportCenter: Vector2D;

	private readonly layers: Map<string, Graphics>;

	private readonly dimension: Dimension;
	private readonly center: Vector2D;

	private orientationLocked: boolean;
	private brightness: number;

	constructor(id: string, config?: DisplayConfiguration) {
		this.viewport = document.createElement("main");
		this.viewport.id = id;

		this.viewport.style.position = "relative";
		this.viewport.style.display = "block";
		this.viewport.style.background = "#eee";

		if (config?.dimension) {
			this.viewport.style.width = `${config.dimension.width}px`;
			this.viewport.style.height = `${config.dimension.height}px`;
		} else {
			this.viewport.style.width = `${window.innerWidth}px`;
			this.viewport.style.height = `${window.innerHeight}px`;
		}

		document.body.append(this.viewport);

		this.viewportDimension = {
			width: parseFloat(this.viewport.style.width) * devicePixelRatio,
			height: parseFloat(this.viewport.style.height) * devicePixelRatio
		};

		this.viewportOffset = new Vector2D(this.viewport.offsetLeft * devicePixelRatio, this.viewport.offsetTop * devicePixelRatio);

		this.viewportCenter = new Vector2D(this.viewportOffset.x + this.viewportDimension.width / 2, this.viewportOffset.y + this.viewportDimension.height / 2);

		this.layers = new Map<string, Graphics>();

		if (config?.layers) {
			for (const [order, name] of Object.entries(config.layers)) {
				this.addLayer(name, parseInt(order));
			}
		}

		this.dimension = {
			width: screen.width * devicePixelRatio,
			height: screen.height * devicePixelRatio
		};

		this.center = new Vector2D(this.dimension.width / 2, this.dimension.height / 2);

		this.orientationLocked = false;
		this.brightness = 100;
	}

	public async screenshot(): Promise<Blob> {
		const layers = Array.from(this.layers.values());
		layers.sort(Graphics.byLayerIndex);

		const { width, height } = this.viewportDimension;

		const screenshot = document.createElement("canvas");
		screenshot.width = width;
		screenshot.height = height;

		const context = screenshot.getContext("2d");

		if (!context) {
			throw new GameError(`Rendering Context could not be created`);
		}

		for (const layer of layers) {
			context.drawImage(layer.getCanvas(), 0, 0, width, height);
		}

		return new Promise<Blob>((resolve, reject) => {
			screenshot.toBlob((blob) => {
				if (blob === null) {
					reject(new GameError("Creating screenshot failed"));
					return;
				}

				resolve(blob);
			});
		});
	}

	public addLayer(name: string, order: number): this {
		if (this.layers.has(name)) {
			throw new GameError(`Layer ${name} already exists`);
		}

		const canvas = this.createCanvas(name, order);
		const context = canvas.getContext("2d");

		if (context === null) {
			throw new GameError(`Rendering Context for layer ${name} could not be created`);
		}

		const graphics = new Graphics(context);

		this.viewport.append(canvas);
		this.layers.set(name, graphics);

		return this;
	}

	public removeLayer(name: string): this {
		if (!this.layers.has(name)) {
			throw new GameError(`Layer ${name} does not exist`);
		}

		const canvas = document.getElementById(name) as HTMLCanvasElement;
		canvas.remove();

		this.layers.delete(name);

		return this;
	}

	public getLayer(name: string): Graphics {
		const layer = this.layers.get(name);

		if (layer === undefined) {
			throw new GameError(`Layer ${name} does not exist`);
		}

		return layer;
	}

	private createCanvas(name: string, order: number): HTMLCanvasElement {
		const canvas = document.createElement("canvas");
		canvas.id = name;

		canvas.style.backgroundColor = "transparent";
		canvas.style.position = "absolute";
		canvas.style.zIndex = order.toString();

		canvas.width = this.viewportDimension.width;
		canvas.height = this.viewportDimension.height;

		// The backing store is sized in device pixels to keep rendering crisp on
		// high density displays. The element itself has to stay at the css size of
		// the viewport, otherwise the canvas overflows it by devicePixelRatio.
		canvas.style.width = `${this.viewportDimension.width / devicePixelRatio}px`;
		canvas.style.height = `${this.viewportDimension.height / devicePixelRatio}px`;

		return canvas;
	}

	/**
	 * Brightness of everything on screen, as a percentage of normal: 100 leaves it
	 * alone, less darkens, more lifts. Applied as a css filter on the viewport, so
	 * it costs nothing per frame and covers every layer at once - no renderer has
	 * to know about it. Clamped to a range that cannot make the game unplayable.
	 */
	public setBrightness(percentage: number): this {
		const clamped = Math.min(Math.max(Number.isFinite(percentage) ? percentage : 100, MIN_BRIGHTNESS), MAX_BRIGHTNESS);

		this.brightness = clamped;
		this.viewport.style.filter = clamped === 100 ? "" : `brightness(${clamped / 100})`;

		return this;
	}

	/** What the screen brightness is set to, as a percentage. */
	public getBrightness(): number {
		return this.brightness;
	}

	/**
	 * Asks the browser for fullscreen, resolving to whether it is now in it.
	 *
	 * The browser is allowed to say no - `requestFullscreen` needs a real user
	 * gesture behind it and rejects without one - so the refusal is caught here
	 * rather than left to every caller. A rejected promise that nobody handles is
	 * an unhandled error in the console, and asking for fullscreen at the wrong
	 * moment is an ordinary thing to do, not a fault.
	 */
	public async enterFullscreen(): Promise<boolean> {
		if (this.isFullscreen()) {
			return true;
		}

		try {
			await this.viewport.requestFullscreen({ navigationUI: "hide" });
			return true;
		} catch {
			return false;
		}
	}

	/** Leaves fullscreen, resolving to whether it is now out of it. Never rejects. */
	public async exitFullscreen(): Promise<boolean> {
		if (!this.isFullscreen()) {
			return true;
		}

		try {
			await document.exitFullscreen();
			return true;
		} catch {
			return false;
		}
	}

	public isFullscreen(): boolean {
		return document.fullscreenElement === this.viewport;
	}

	/**
	 * Called whenever the browser enters or leaves fullscreen, with what it is
	 * now. Worth listening to even when nothing here asked: the player can leave
	 * with Escape or the window chrome, and the browser does not tell whoever
	 * requested it - so anything showing a fullscreen state has to follow the
	 * browser rather than its own last instruction.
	 */
	public addFullscreenListener(onChange: (fullscreen: boolean) => void): () => void {
		const listener = () => onChange(this.isFullscreen());

		document.addEventListener("fullscreenchange", listener);

		return () => document.removeEventListener("fullscreenchange", listener);
	}

	public lockPointer() {
		if (!this.isPointerLocked()) {
			this.viewport.requestPointerLock();
		}
	}

	public unlockPointer() {
		if (this.isPointerLocked()) {
			document.exitPointerLock();
		}
	}

	public isPointerLocked() {
		return document.pointerLockElement === this.viewport;
	}

	public lockOrientation(orientation: DisplayOrientationType) {
		if (!this.isOrientationLocked()) {
			if ("lock" in screen.orientation && typeof screen.orientation.lock === "function") {
				this.orientationLocked = true;
				screen.orientation.lock(orientation);
			}
		}
	}

	public unlockOrientation() {
		if (this.isOrientationLocked()) {
			this.orientationLocked = false;
			screen.orientation.unlock();
		}
	}

	public isOrientationLocked(): boolean {
		return this.orientationLocked;
	}

	public addMouseDownListener(onDown: (event: MouseEvent) => void) {
		this.viewport.addEventListener("mousedown", onDown);
	}

	public removeMouseDownListener(onDown: (event: MouseEvent) => void) {
		this.viewport.removeEventListener("mousedown", onDown);
	}

	public addMouseUpListener(onUp: (event: MouseEvent) => void) {
		this.viewport.addEventListener("mouseup", onUp);
	}

	public removeMouseUpListener(onUp: (event: MouseEvent) => void) {
		this.viewport.removeEventListener("mouseup", onUp);
	}

	public addMouseMoveListener(onMove: (event: MouseEvent) => void) {
		this.viewport.addEventListener("mousemove", onMove);
	}

	public removeMouseMoveListener(onMove: (event: MouseEvent) => void) {
		this.viewport.removeEventListener("mousemove", onMove);
	}

	public addWheelChangeListener(onChange: (event: WheelEvent) => void) {
		this.viewport.addEventListener("wheel", onChange);
	}

	public removeWheelChangeListener(onChange: (event: WheelEvent) => void) {
		this.viewport.removeEventListener("wheel", onChange);
	}

	public addTouchStartListener(onStart: (event: TouchEvent) => void) {
		this.viewport.addEventListener("touchstart", onStart);
	}

	public removeTouchStartListener(onStart: (event: TouchEvent) => void) {
		this.viewport.removeEventListener("touchstart", onStart);
	}

	public addTouchEndListener(onEnd: (event: TouchEvent) => void) {
		this.viewport.addEventListener("touchend", onEnd);
	}

	public removeTouchEndListener(onEnd: (event: TouchEvent) => void) {
		this.viewport.removeEventListener("touchend", onEnd);
	}

	public addTouchMoveListener(onMove: (event: TouchEvent) => void) {
		this.viewport.addEventListener("touchmove", onMove);
	}

	public removeTouchMoveListener(onMove: (event: TouchEvent) => void) {
		this.viewport.removeEventListener("touchmove", onMove);
	}

	public addFullscreenChangeListener(onChange: (event: Event) => void) {
		this.viewport.addEventListener("fullscreenchange", onChange);
	}

	public removeFullscreenChangeListener(onChange: (event: Event) => void) {
		this.viewport.removeEventListener("fullscreenchange", onChange);
	}

	public addFullscreenErrorListener(onError: (event: Event) => void) {
		this.viewport.addEventListener("fullscreenerror", onError);
	}

	public removeFullscreenErrorListener(onError: (event: Event) => void) {
		this.viewport.removeEventListener("fullscreenerror", onError);
	}

	public addPointerLockChangeListener(onChange: (event: Event) => void) {
		document.addEventListener("pointerlockchange", onChange);
	}

	public removePointerLockChangeListener(onChange: (event: Event) => void) {
		document.removeEventListener("pointerlockchange", onChange);
	}

	public addPointerLockErrorListener(onError: (event: Event) => void) {
		document.addEventListener("pointerlockerror", onError);
	}

	public removePointerLockErrorListener(onError: (event: Event) => void) {
		document.removeEventListener("pointerlockerror", onError);
	}

	public addOrientationChangeListener(onChange: (event: Event) => void) {
		screen.orientation.addEventListener("change", onChange);
	}

	public removeOrientationChangeListener(onChange: (event: Event) => void) {
		screen.orientation.removeEventListener("change", onChange);
	}

	public getViewport(): HTMLElement {
		return this.viewport;
	}

	public getViewportDimension(): Dimension {
		return this.viewportDimension;
	}

	public getViewportOffset(): Vector2D {
		return this.viewportOffset;
	}

	public getViewportCenter(): Vector2D {
		return this.viewportCenter;
	}

	public getDimension(): Dimension {
		return this.dimension;
	}

	public getCenter(): Vector2D {
		return this.center;
	}

	public getOrientation(): DisplayOrientationType {
		return screen.orientation.type;
	}

	public getOrientationAngle(): number {
		return screen.orientation.angle;
	}
}
