import { GameError } from "@/core/GameError";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { DisplayOrientationType } from "@/core/graphics/DisplayOrientation";
import { GameCoreService } from "@/core/service/GameCoreService";

/** Darkest and lightest the screen can be set to - far enough either way to be useful, not far enough to be unplayable. */
export const MIN_BRIGHTNESS = 50;
export const MAX_BRIGHTNESS = 150;

/**
 * Most backing-store pixels per logical pixel. A phone reports a device pixel
 * ratio of 3 or more; three full-screen layers at that density cost a lot to
 * clear and fill every frame for little a player would see on a small screen.
 */
export const MAX_RENDER_SCALE = 2;

export interface DisplayConfiguration {
	dimension?: Dimension;
	layers?: {
		[order: number]: string;
	};
}

@GameCoreService("Display")
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

	/** Backing-store pixels per logical pixel, fixed at start (see `MAX_RENDER_SCALE`). */
	private readonly renderScale: number;
	/** How far the viewport is shrunk on screen to fit the window, 1 when it fits as it is. */
	private fitScale: number;

	/**
	 * The viewport is laid out in logical pixels - `dimension`, 1280x720 for the
	 * game - on every device, so every renderer works in one coordinate space.
	 * Each layer's backing store is that times `renderScale` and drawn through a
	 * matching scale, so it stays crisp on a dense screen. The viewport is then
	 * shrunk with a css transform until it fits the window (`fit`), never grown:
	 * on a phone the whole battlefield shows, on a desktop nothing changes.
	 */
	constructor(id: string, config?: DisplayConfiguration) {
		this.viewport = document.createElement("main");
		this.viewport.id = id;

		// Pinned to the middle of the window and centred on itself, so it stays
		// centred however it is scaled - a flex layout would centre the unscaled
		// box, which overflows a small screen before the transform shrinks it.
		this.viewport.style.position = "fixed";
		this.viewport.style.left = "50%";
		this.viewport.style.top = "50%";
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

		this.renderScale = Math.min(Math.max(devicePixelRatio || 1, 1), MAX_RENDER_SCALE);
		this.fitScale = 1;

		this.viewportDimension = {
			width: Number.parseFloat(this.viewport.style.width),
			height: Number.parseFloat(this.viewport.style.height)
		};

		this.viewportOffset = new Vector2D(this.viewport.offsetLeft, this.viewport.offsetTop);

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

		this.fit();
		window.addEventListener("resize", () => this.fit());
		window.addEventListener("orientationchange", () => this.fit());
	}

	/**
	 * Scales the viewport to fit the window, keeping its aspect ratio; the page
	 * centres it. In a window it is only ever shrunk - a desktop shows the game at
	 * its own size - but in fullscreen it fills the screen. Called on every
	 * resize and turn of the device - entering or leaving fullscreen resizes the window too.
	 */
	public fit(): this {
		const { width, height } = this.viewportDimension;
		const fill = Math.min(window.innerWidth / width, window.innerHeight / height);
		const scale = this.isFullscreen() ? fill : Math.min(1, fill);

		this.fitScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
		this.viewport.style.transform = this.fitScale !== 1 ? `translate(-50%, -50%) scale(${this.fitScale})` : "translate(-50%, -50%)";

		return this;
	}

	public getFitScale(): number {
		return this.fitScale;
	}

	public getRenderScale(): number {
		return this.renderScale;
	}

	/**
	 * Where a point on the page - a pointer's `clientX` / `clientY` - lands in
	 * the viewport's logical pixels, whatever the viewport is scaled to or where
	 * it sits on the page right now.
	 */
	public toViewport(clientX: number, clientY: number): Vector2D {
		const bounds = this.viewport.getBoundingClientRect();
		const scaleX = bounds.width > 0 ? this.viewportDimension.width / bounds.width : 1;
		const scaleY = bounds.height > 0 ? this.viewportDimension.height / bounds.height : 1;

		return new Vector2D((clientX - bounds.left) * scaleX, (clientY - bounds.top) * scaleY);
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

	/**
	 * The screen as it is right now, every layer composited and scaled down to
	 * `width` x `height`, as a JPEG data URL - small enough to keep in a save
	 * slot as its thumbnail. Synchronous, unlike `screenshot()`; an empty string
	 * when the canvas cannot be encoded (a headless run).
	 */
	public thumbnail(width: number, height: number, quality = 0.8): string {
		const layers = Array.from(this.layers.values());
		layers.sort(Graphics.byLayerIndex);

		const thumbnail = document.createElement("canvas");
		thumbnail.width = width;
		thumbnail.height = height;

		const context = thumbnail.getContext("2d");

		if (!context) {
			return "";
		}

		for (const layer of layers) {
			context.drawImage(layer.getCanvas(), 0, 0, width, height);
		}

		try {
			const url = thumbnail.toDataURL("image/jpeg", quality);
			return typeof url === "string" && url.startsWith("data:") ? url : "";
		} catch {
			return "";
		}
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

		// Renderers draw in logical pixels; the backing store is denser by renderScale.
		context.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);

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

		// The backing store is denser than the viewport by renderScale to keep
		// rendering crisp on high density displays. The element itself stays at the
		// viewport's logical size, otherwise the canvas would overflow it.
		canvas.width = Math.round(this.viewportDimension.width * this.renderScale);
		canvas.height = Math.round(this.viewportDimension.height * this.renderScale);

		canvas.style.width = `${this.viewportDimension.width}px`;
		canvas.style.height = `${this.viewportDimension.height}px`;

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
	 *
	 * The whole page goes fullscreen, not the viewport alone: whatever is laid
	 * over the game - the touch pad on a phone - has to come along. The viewport
	 * is then fitted to the screen, grown if need be (see `fit`).
	 */
	public async enterFullscreen(): Promise<boolean> {
		if (this.isFullscreen()) {
			return true;
		}

		try {
			await document.documentElement.requestFullscreen({ navigationUI: "hide" });
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
		return document.fullscreenElement === document.documentElement;
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
			// Refused without a recent user gesture, or when the player just left the
			// lock - `isPointerLocked` stays false, which is all a caller reads.
			// Wrapped because older Safari returns nothing rather than a promise.
			Promise.resolve(this.viewport.requestPointerLock()).catch(() => undefined);
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
				// Desktop browsers, and mobile ones outside fullscreen, refuse the lock:
				// then the orientation is not locked after all.
				screen.orientation.lock(orientation).catch(() => {
					this.orientationLocked = false;
				});
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
