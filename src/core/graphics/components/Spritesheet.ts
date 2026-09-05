import { GameError } from "@/core/GameError";
import { GridSheetLayout } from "@/core/assets/Asset";
import { Sprite, TextureRegion } from "@/core/graphics/components/Sprite";

/**
 * One frame of a TexturePacker "JSON (Hash)" atlas. Only the source rectangle is
 * read; `rotated`, `trimmed` and `spriteSourceSize` are ignored for now, so packs
 * have to be exported without rotation and without trimming.
 */
interface AtlasFrame {
	frame: { x: number; y: number; w: number; h: number };
}

export interface TexturePackerHash {
	frames: Record<string, AtlasFrame>;
}

/**
 * A source image cut into frames - either on a regular grid (a tilesheet) or by
 * a companion atlas (named frames at arbitrary positions). Frames are addressed
 * by their row major index, or by name when the sheet came from an atlas.
 */
export class Spritesheet {
	private constructor(
		private readonly image: HTMLImageElement,
		private readonly regions: TextureRegion[],
		private readonly names: Map<string, number>
	) {}

	public static fromGrid(image: HTMLImageElement, layout: GridSheetLayout): Spritesheet {
		const { tileWidth, tileHeight, columns, rows } = layout;
		const margin = layout.margin ?? 0;
		const spacing = layout.spacing ?? 0;

		if (tileWidth <= 0 || tileHeight <= 0 || columns <= 0 || rows <= 0) {
			throw new GameError(`Grid sheet layout needs positive tile size and tile count`);
		}

		const required = {
			width: margin * 2 + columns * tileWidth + (columns - 1) * spacing,
			height: margin * 2 + rows * tileHeight + (rows - 1) * spacing
		};

		// image.width is 0 until the image has decoded, e.g. under jsdom - only
		// validate the fit once the browser actually knows the size.
		if (image.width > 0 && image.height > 0 && (required.width > image.width || required.height > image.height)) {
			throw new GameError(`Grid sheet layout of ${required.width}x${required.height}px does not fit the ${image.width}x${image.height}px image`);
		}

		const regions: TextureRegion[] = [];

		for (let row = 0; row < rows; row++) {
			for (let column = 0; column < columns; column++) {
				regions.push({
					x: margin + column * (tileWidth + spacing),
					y: margin + row * (tileHeight + spacing),
					width: tileWidth,
					height: tileHeight
				});
			}
		}

		return new Spritesheet(image, regions, new Map());
	}

	public static fromAtlas(image: HTMLImageElement, data: TexturePackerHash): Spritesheet {
		if (!data || typeof data.frames !== "object") {
			throw new GameError(`Atlas is not a TexturePacker "JSON (Hash)" export: no frames map`);
		}

		const regions: TextureRegion[] = [];
		const names = new Map<string, number>();

		for (const [name, entry] of Object.entries(data.frames)) {
			const frame = entry?.frame;

			if (!frame || typeof frame.x !== "number" || typeof frame.y !== "number" || typeof frame.w !== "number" || typeof frame.h !== "number") {
				throw new GameError(`Atlas frame ${name} is missing its source rectangle`);
			}

			names.set(name, regions.length);
			regions.push({ x: frame.x, y: frame.y, width: frame.w, height: frame.h });
		}

		return new Spritesheet(image, regions, names);
	}

	public getImage(): HTMLImageElement {
		return this.image;
	}

	public size(): number {
		return this.regions.length;
	}

	public has(frame: number | string): boolean {
		const index = typeof frame === "string" ? this.names.get(frame) : frame;
		return index !== undefined && index >= 0 && index < this.regions.length;
	}

	public getRegion(frame: number | string): TextureRegion {
		const index = typeof frame === "string" ? this.names.get(frame) : frame;

		if (index === undefined) {
			throw new GameError(`Spritesheet has no frame named ${frame}`);
		}

		const region = this.regions[index];

		if (region === undefined) {
			throw new GameError(`Spritesheet frame ${index} is out of range 0..${this.regions.length - 1}`);
		}

		return region;
	}

	public getName(index: number): string | undefined {
		for (const [name, value] of this.names) {
			if (value === index) {
				return name;
			}
		}

		return undefined;
	}

	public sprite(frame: number | string): Sprite {
		return new Sprite(this.image, this.getRegion(frame));
	}
}
