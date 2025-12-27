import { Color } from "@/core/graphics/Color";

export interface ShadowSettings {
	color?: Color;
	offsetX?: number;
	offsetY?: number;
	blur?: number;
}

export class Shadow {
	private readonly color: Color;
	private readonly offsetX: number;
	private readonly offsetY: number;
	private readonly blur: number;

	constructor(settings?: ShadowSettings) {
		this.color = settings?.color ?? Color.hex("#000");
		this.offsetX = settings?.offsetX ?? 0;
		this.offsetY = settings?.offsetY ?? 0;
		this.blur = settings?.blur ?? 0;
	}

	public asDropShadow(): string {
		return `drop-shadow(${this.offsetX} ${this.offsetY} ${this.blur} ${this.color.asHEX()})`;
	}

	public getColor(): Color {
		return this.color;
	}

	public getOffsetX(): number {
		return this.offsetX;
	}

	public getOffsetY(): number {
		return this.offsetY;
	}

	public getBlur(): number {
		return this.blur;
	}
}
