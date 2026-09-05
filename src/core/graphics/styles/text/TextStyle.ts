import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { TextBaseline, TextBaselineType } from "@/core/graphics/styles/text/TextBaseline";
import { TextDirection, TextDirectionType } from "@/core/graphics/styles/text/TextDirection";

export interface TextStyleSettings {
	align?: TextAlignType;
	baseline?: TextBaselineType;
	direction?: TextDirectionType;
}

export class TextStyle {
	private readonly align: TextAlignType;
	private readonly baseline: TextBaselineType;
	private readonly direction: TextDirectionType;

	constructor(settings?: TextStyleSettings) {
		this.align = settings?.align ?? TextAlign.START;
		this.baseline = settings?.baseline ?? TextBaseline.ALPHABETIC;
		this.direction = settings?.direction ?? TextDirection.LTR;
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
