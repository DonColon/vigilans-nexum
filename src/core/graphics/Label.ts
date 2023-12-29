import { Dimension } from "core/math/Dimension";
import { Vector } from "core/math/Vector";
import { FontStyle } from "./FontStyle";
import { TextStyle } from "./TextStyle";

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
	private text: string;
	private position: Vector;
	private dimension: Dimension;

	private fontStyle?: FontStyle;
	private textStyle?: TextStyle;

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
