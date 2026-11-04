import { test, expect, suite, beforeEach, afterEach, vi } from "vitest";
import { createContext } from "@miyauci/get-event-listeners";

import { Display, MAX_BRIGHTNESS, MIN_BRIGHTNESS } from "../../../src/core/graphics/Display";
import { GameError } from "../../../src/core/GameError";

suite("Display Class Unit Tests", () => {
	const { addEventListener, removeEventListener } = EventTarget.prototype;
	const context = createContext({ addEventListener, removeEventListener });

	beforeEach(() => {
		EventTarget.prototype.addEventListener = context.addEventListener;
		EventTarget.prototype.removeEventListener = context.removeEventListener;
	});

	afterEach(() => {
		EventTarget.prototype.addEventListener = addEventListener;
		EventTarget.prototype.removeEventListener = removeEventListener;
	});

	test("should create a display object", () => {
		const display = new Display("vigilans-nexum", {
			dimension: {
				width: 1280,
				height: 720
			},
			layers: {
				1: "background",
				2: "gameplay",
				3: "ui"
			}
		});

		expect(display).toBeDefined();
	});

	test("should add and retrieve a layer from display", () => {
		const display = new Display("vigilans-nexum");

		expect(() => display.getLayer("background")).toThrowError(GameError);

		display.addLayer("background", 0);

		const layer = display.getLayer("background");
		expect(layer).toBeDefined();

		expect(() => display.addLayer("background", 0)).toThrowError(GameError);
	});

	test("should throw error when adding layer with null context", () => {
		const display = new Display("vigilans-nexum");

		(display as any).createCanvas = vi.fn(() => {
			const canvas = document.createElement("canvas");
			canvas.getContext = vi.fn().mockReturnValue(null);
			return canvas;
		});

		expect(() => display.addLayer("background", 0)).toThrowError(GameError);
	});

	test("should remove a layer from display", () => {
		const display = new Display("vigilans-nexum");

		expect(() => display.removeLayer("background")).toThrowError(GameError);

		display.addLayer("background", 0);
		display.removeLayer("background");

		expect(() => display.getLayer("background")).toThrowError(GameError);
	});

	test("should add and remove mouse down listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addMouseDownListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("mousedown" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeMouseDownListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("mousedown" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove mouse up listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addMouseUpListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("mouseup" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeMouseUpListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("mouseup" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove mouse move listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addMouseMoveListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("mousemove" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeMouseMoveListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("mousemove" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove wheel change listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addWheelChangeListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("wheel" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeWheelChangeListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("wheel" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove touch start listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addTouchStartListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("touchstart" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeTouchStartListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("touchstart" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove touch end listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addTouchEndListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("touchend" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeTouchEndListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("touchend" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove touch move listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addTouchMoveListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("touchmove" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeTouchMoveListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("touchmove" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove fullscreen change listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addFullscreenChangeListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("fullscreenchange" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeFullscreenChangeListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("fullscreenchange" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove fullscreen error listener", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();

		const handler = () => {};
		display.addFullscreenErrorListener(handler);

		let eventListeners = context.getEventListeners(viewport);
		expect("fullscreenerror" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removeFullscreenErrorListener(handler);

		eventListeners = context.getEventListeners(viewport);
		expect("fullscreenerror" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove pointerlock change listener", () => {
		const display = new Display("vigilans-nexum");

		const handler = () => {};
		display.addPointerLockChangeListener(handler);

		let eventListeners = context.getEventListeners(document);
		expect("pointerlockchange" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removePointerLockChangeListener(handler);

		eventListeners = context.getEventListeners(document);
		expect("pointerlockchange" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should add and remove pointerlock error listener", () => {
		const display = new Display("vigilans-nexum");

		const handler = () => {};
		display.addPointerLockErrorListener(handler);

		let eventListeners = context.getEventListeners(document);
		expect("pointerlockerror" in eventListeners).toBeTruthy();
		expect(Object.keys(eventListeners)).toHaveLength(1);

		display.removePointerLockErrorListener(handler);

		eventListeners = context.getEventListeners(document);
		expect("pointerlockerror" in eventListeners).toBeFalsy();
		expect(Object.keys(eventListeners)).toHaveLength(0);
	});

	test("should retrieve viewport object", () => {
		const display = new Display("vigilans-nexum");
		const viewport = display.getViewport();
		expect(viewport).toBeDefined();
	});

	test("should retrieve viewport dimensions", () => {
		const display = new Display("vigilans-nexum", {
			dimension: {
				width: 1280,
				height: 720
			}
		});

		const dimension = display.getViewportDimension();
		expect(dimension.width).toBe(1280);
		expect(dimension.height).toBe(720);
	});

	test("should retrieve viewport offset", () => {
		const display = new Display("vigilans-nexum", {
			dimension: {
				width: 1280,
				height: 720
			}
		});

		const offset = display.getViewportOffset();
		expect(offset.x).toBe(0);
		expect(offset.y).toBe(0);
	});

	test("should retrieve viewport center", () => {
		const display = new Display("vigilans-nexum", {
			dimension: {
				width: 1280,
				height: 720
			}
		});

		const center = display.getViewportCenter();
		expect(center.x).toBe(640);
		expect(center.y).toBe(360);
	});

	test("should retrieve display dimension", () => {
		const display = new Display("vigilans-nexum");
		const dimension = display.getDimension();
		expect(dimension.width).toBe(0);
		expect(dimension.height).toBe(0);
	});

	test("should retrieve display center", () => {
		const display = new Display("vigilans-nexum");
		const center = display.getCenter();
		expect(center.x).toBe(0);
		expect(center.y).toBe(0);
	});
});

suite("Display Brightness Unit Tests", () => {
	const display = () => new Display(`brightness-${Math.random().toString(36).slice(2)}`, { dimension: { width: 640, height: 480 } });

	test("should leave the viewport alone at full brightness", () => {
		const screen = display();

		expect(screen.getBrightness()).toBe(100);
		expect(screen.setBrightness(100).getBrightness()).toBe(100);
	});

	test("should darken and lift the whole viewport at once", () => {
		const screen = display();

		expect(screen.setBrightness(70).getBrightness()).toBe(70);
		expect(screen.setBrightness(130).getBrightness()).toBe(130);
	});

	test("should clamp to a range that keeps the game playable", () => {
		const screen = display();

		expect(screen.setBrightness(0).getBrightness()).toBe(MIN_BRIGHTNESS);
		expect(screen.setBrightness(1000).getBrightness()).toBe(MAX_BRIGHTNESS);
		expect(screen.setBrightness(Number.NaN).getBrightness()).toBe(100);
	});
});

suite("Display Fullscreen Unit Tests", () => {
	const display = () => new Display(`fullscreen-${Math.random().toString(36).slice(2)}`, { dimension: { width: 640, height: 480 } });

	test("should resolve false rather than reject when the browser refuses", async () => {
		const screen = display();

		// jsdom has no fullscreen, so requestFullscreen is either absent or rejects -
		// which is exactly the case a player hits by asking without a gesture. It has
		// to come back as an answer, not as an unhandled rejection.
		await expect(screen.enterFullscreen()).resolves.toBe(false);
	});

	test("should report leaving fullscreen as done when it was never in it", async () => {
		const screen = display();

		await expect(screen.exitFullscreen()).resolves.toBe(true);
		expect(screen.isFullscreen()).toBe(false);
	});
});
