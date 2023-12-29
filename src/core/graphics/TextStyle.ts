import { TextAlign, TextAlignType } from "./TextAlign";
import { TextBaseline, TextBaselineType } from "./TextBaseline";
import { TextDirection, TextDirectionType } from "./TextDirection";

export interface TextStyleSettings {
	align?: TextAlignType;
	baseline?: TextBaselineType;
	direction?: TextDirectionType;
}

export class TextStyle {
	private align: TextAlignType;
	private baseline: TextBaselineType;
	private direction: TextDirectionType;

	constructor(settings?: TextStyleSettings) {
		this.align = (settings && settings.align) || TextAlign.START;
		this.baseline = (settings && settings.baseline) || TextBaseline.ALPHABETIC;
		this.direction = (settings && settings.direction) || TextDirection.LTR;
	}

	public getAlign(): TextAlignType {
		return this.align;
	}

	public getBaseline(): TextBaselineType {
		return this.baseline;
	}

	public getDirection(): TextDirectionType {
		return this.direction;
	}
}
