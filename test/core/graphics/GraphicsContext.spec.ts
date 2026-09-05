import { test, expect, suite, vi } from "vitest";
import { Graphics } from "@/core/graphics/rendering/Graphics";

function makeGraphics(): { graphics: Graphics; context: CanvasRenderingContext2D } {
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d") as CanvasRenderingContext2D;
	return { graphics: new Graphics(context), context };
}

suite("GraphicsContext drawImage overload dispatch", () => {
	test("A 9 argument drawImage with zero source offsets still reaches the context", () => {
		const { graphics, context } = makeGraphics();
		const spy = vi.spyOn(context, "drawImage");
		const image = document.createElement("canvas");

		graphics.drawImage(image, 0, 0, 16, 16, 40, 24, 32, 32);

		expect(spy).toHaveBeenCalledWith(image, 0, 0, 16, 16, 40, 24, 32, 32);
	});

	test("A 5 argument drawImage is dispatched as destination-rect", () => {
		const { graphics, context } = makeGraphics();
		const spy = vi.spyOn(context, "drawImage");
		const image = document.createElement("canvas");

		graphics.drawImage(image, 0, 0, 64, 64);

		expect(spy).toHaveBeenCalledWith(image, 0, 0, 64, 64);
	});

	test("A 3 argument drawImage is dispatched as a plain blit", () => {
		const { graphics, context } = makeGraphics();
		const spy = vi.spyOn(context, "drawImage");
		const image = document.createElement("canvas");

		graphics.drawImage(image, 12, 8);

		expect(spy).toHaveBeenCalledWith(image, 12, 8);
	});
});

suite("Graphics.drawTile flip orientation", () => {
	const region = { x: 32, y: 16, width: 16, height: 16 };
	const image = document.createElement("canvas");

	function drawTile(flip: number): number[] | null {
		const { graphics, context } = makeGraphics();
		const transform = vi.spyOn(context, "transform");
		(graphics as unknown as { assetStorage: unknown }).assetStorage = {
			getSpritesheet: () => ({ getRegion: () => region, getImage: () => image })
		};

		graphics.drawTile("sheet", 0, 100, 200, 1, flip);

		// `+ 0` folds -0 (a harmless artefact of negating a zero) back to 0.
		return transform.mock.calls.length ? (transform.mock.calls[0].slice(0, 4) as number[]).map((n) => n + 0) : null;
	}

	test("An upright tile is blitted without a transform", () => {
		expect(drawTile(0)).toBeNull();
	});

	test("Horizontal, vertical and 180 flips negate the right axes", () => {
		expect(drawTile(1)).toStrictEqual([-1, 0, 0, 1]); // mirror X
		expect(drawTile(2)).toStrictEqual([1, 0, 0, -1]); // mirror Y
		expect(drawTile(3)).toStrictEqual([-1, 0, 0, -1]); // 180 degrees
	});

	test("Diagonal combinations rotate the way Tiled does", () => {
		expect(drawTile(4)).toStrictEqual([0, 1, 1, 0]); // transpose
		expect(drawTile(5)).toStrictEqual([0, 1, -1, 0]); // H + D  -> rotate 90 CCW
		expect(drawTile(6)).toStrictEqual([0, -1, 1, 0]); // V + D  -> rotate 90 CW
	});
});
