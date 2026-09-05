import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { Rectangle } from "@/core/math/geometry/Rectangle";

/**
 * A source image plus the corner size that separates its fixed corners from its
 * stretchable edges and centre.
 */
export interface NineSlice {
	image: HTMLImageElement;
	/** Edge length of each corner square, in source pixels. */
	corner: number;
}

/**
 * Tinted copies of a source image, keyed first by the image and then by the
 * hex colour. The Kenney art is a white-on-transparent alpha mask, so every
 * panel and every menu highlight is the same three PNGs recoloured on demand;
 * without this cache that recolour would run for all nine slices every frame.
 */
const tintCache = new WeakMap<HTMLImageElement, Map<string, CanvasImageSource>>();

function tint(image: HTMLImageElement, color: Color): CanvasImageSource {
	let byColour = tintCache.get(image);

	if (byColour === undefined) {
		byColour = new Map<string, CanvasImageSource>();
		tintCache.set(image, byColour);
	}

	const key = color.asHEX();
	const cached = byColour.get(key);

	if (cached !== undefined) {
		return cached;
	}

	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;

	const context = canvas.getContext("2d");

	if (context === null) {
		// No 2d context (some headless setups) - fall back to the untinted mask.
		byColour.set(key, image);
		return image;
	}

	// Keep the mask's shape, replace its colour: draw the art, then paint the
	// colour only where the art already put pixels.
	context.drawImage(image, 0, 0);
	context.globalCompositeOperation = "source-in";
	context.fillStyle = key;
	context.fillRect(0, 0, canvas.width, canvas.height);

	byColour.set(key, canvas);
	return canvas;
}

/**
 * Draws `slice` stretched across `rect` in the classic nine-patch way: the four
 * corners at their native size, the four edges stretched along one axis and the
 * centre stretched both ways, all recoloured to `color`.
 *
 * The caller is expected to have turned image smoothing off - the 1-bit art
 * turns to grey mush when the upscaled edges are interpolated.
 */
export function drawNineSlice(graphics: Graphics, slice: NineSlice, rect: Rectangle, color: Color): void {
	const image = tint(slice.image, color);

	const source = slice.corner;
	const { x, y } = rect.getPosition();
	const width = rect.getWidth();
	const height = rect.getHeight();

	const imageWidth = slice.image.width;
	const imageHeight = slice.image.height;

	// A box narrower than two corners splits the difference so the corners meet
	// in the middle instead of overlapping past each other.
	const left = Math.min(source, width / 2);
	const right = Math.min(source, width / 2);
	const top = Math.min(source, height / 2);
	const bottom = Math.min(source, height / 2);

	const middleWidth = width - left - right;
	const middleHeight = height - top - bottom;

	const sourceMiddleWidth = imageWidth - 2 * source;
	const sourceMiddleHeight = imageHeight - 2 * source;

	// Corners.
	graphics.drawImage(image, 0, 0, source, source, x, y, left, top);
	graphics.drawImage(image, imageWidth - source, 0, source, source, x + width - right, y, right, top);
	graphics.drawImage(image, 0, imageHeight - source, source, source, x, y + height - bottom, left, bottom);
	graphics.drawImage(image, imageWidth - source, imageHeight - source, source, source, x + width - right, y + height - bottom, right, bottom);

	// Horizontal edges.
	if (middleWidth > 0) {
		graphics.drawImage(image, source, 0, sourceMiddleWidth, source, x + left, y, middleWidth, top);
		graphics.drawImage(image, source, imageHeight - source, sourceMiddleWidth, source, x + left, y + height - bottom, middleWidth, bottom);
	}

	// Vertical edges.
	if (middleHeight > 0) {
		graphics.drawImage(image, 0, source, source, sourceMiddleHeight, x, y + top, left, middleHeight);
		graphics.drawImage(image, imageWidth - source, source, source, sourceMiddleHeight, x + width - right, y + top, right, middleHeight);
	}

	// Centre.
	if (middleWidth > 0 && middleHeight > 0) {
		graphics.drawImage(image, source, source, sourceMiddleWidth, sourceMiddleHeight, x + left, y + top, middleWidth, middleHeight);
	}
}
