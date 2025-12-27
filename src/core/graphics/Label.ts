import { Dimension } from "@/core/math/geometry/Dimension";
import { Vector } from "@/core/math/geometry/Vector";
import { FontStyle } from "@/core/graphics/FontStyle";
import { TextStyle } from "@/core/graphics/TextStyle";

export interface LabelSettings {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;

	fontStyle?: FontStyle;
	textStyle?: TextStyle;
}

export class Label {
	private readonly text: string;
	private readonly position: Vector;
	private readonly dimension: Dimension;

	private readonly fontStyle?: FontStyle;
	private readonly textStyle?: TextStyle;

	constructor(settings: LabelSettings) {
		this.text = settings.text;
		this.position = new Vector(settings.x, settings.y);

		this.dimension = {
			width: settings.width,
			height: settings.height
		};

		this.fontStyle = settings.fontStyle;
		this.textStyle = settings.textStyle;
	}

	public getText(): string {
		return this.text;
	}

	public getPosition(): Vector {
		return this.position;
	}

	public getDimension(): Dimension {
		return this.dimension;
	}

	public getFontStyle(): FontStyle | undefined {
		return this.fontStyle;
	}

	public getTextStyle(): TextStyle | undefined {
		return this.textStyle;
	}
}
