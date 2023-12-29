export interface FontStyleSettings {
	style?: string;
	variant?: string;
	weight?: string;
	size?: string;
	lineHeight?: string;
	family?: string;
}

export class FontStyle {
	private style: string;
	private variant: string;
	private weight: string;
	private size: string;
	private lineHeight: string;
	private family: string;

	constructor(settings?: FontStyleSettings) {
		this.style = (settings && settings.style) || "normal";
		this.variant = (settings && settings.variant) || "normal";
		this.weight = (settings && settings.weight) || "normal";
		this.size = (settings && settings.size) || "10px";
		this.lineHeight = (settings && settings.lineHeight) || "normal";
		this.family = (settings && settings.family) || "sans-serif";
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
