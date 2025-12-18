export interface FontStyleSettings {
	style?: string;
	variant?: string;
	weight?: string;
	size?: string;
	lineHeight?: string;
	family?: string;
}

export class FontStyle {
	private readonly style: string;
	private readonly variant: string;
	private readonly weight: string;
	private readonly size: string;
	private readonly lineHeight: string;
	private readonly family: string;

	constructor(settings?: FontStyleSettings) {
		this.style = settings?.style ?? "normal";
		this.variant = settings?.variant ?? "normal";
		this.weight = settings?.weight ?? "normal";
		this.size = settings?.size ?? "10px";
		this.lineHeight = settings?.lineHeight ?? "normal";
		this.family = settings?.family ?? "sans-serif";
	}

	public asCss(): string {
		return `${this.style} ${this.variant} ${this.weight} ${this.size}/${this.lineHeight} ${this.family}`;
	}

	public getStyle(): string {
		return this.style;
	}

	public getVariant(): string {
		return this.variant;
	}

	public getWeight(): string {
		return this.weight;
	}

	public getSize(): string {
		return this.size;
	}

	public getLineHeight(): string {
		return this.lineHeight;
	}

	public getFamily(): string {
		return this.family;
	}
}
