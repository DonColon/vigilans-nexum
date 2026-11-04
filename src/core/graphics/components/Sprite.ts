import { Dimension } from "@/core/math/geometry/Dimension";
import { Graphics } from "@/core/graphics/rendering/Graphics";

/**
 * A rectangular slice of a source image, in image pixels. A whole-image sprite
 * leaves it undefined; a spritesheet frame carries the region it was cut from.
 */
export interface TextureRegion {
	x: number;
	y: number;
	width: number;
	height: number;
}

export class Sprite {
	private dimension: Dimension;

	constructor(
		private data: HTMLImageElement | ImageData,
		private region?: TextureRegion
	) {
		this.dimension = region ? { width: region.width, height: region.height } : { width: data.width, height: data.height };
	}

	public display(graphics: Graphics, x: number, y: number) {
		if (this.data instanceof HTMLImageElement) {
			if (this.region) {
				const { x: sx, y: sy, width, height } = this.region;
				graphics.drawImage(this.data, sx, sy, width, height, x, y, width, height);
			} else {
				graphics.drawImage(this.data, x, y);
			}
		} else if (this.data instanceof ImageData) {
			graphics.putImageData(this.data, x, y);
		}
	}

	public getRegion(): TextureRegion | undefined {
		return this.region;
	}

	public getDimension(): Dimension {
		return this.dimension;
	}

	public getWidth(): number {
		return this.dimension.width;
	}

	public getHeight(): number {
		return this.dimension.height;
	}
}
