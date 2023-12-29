import { LineCap, LineCapType } from "./LineCap";
import { LineJoin, LineJoinType } from "./LineJoin";

export interface LineStyleSettings {
	width?: number;
	dashPattern?: number[];
	dashOffset?: number;
	cap?: LineCapType;
	join?: LineJoinType;
}

export class LineStyle {
	private width: number;
	private dashPattern: number[];
	private dashOffset: number;
	private cap: LineCapType;
	private join: LineJoinType;

	constructor(settings?: LineStyleSettings) {
		this.width = (settings && settings.width) || 1;
		this.dashPattern = (settings && settings.dashPattern) || [];
		this.dashOffset = (settings && settings.dashOffset) || 0;
		this.cap = (settings && settings.cap) || LineCap.BUTT;
		this.join = (settings && settings.join) || LineJoin.MITER;
	}

	public getWidth(): number {
		return this.width;
	}

	public getDashPattern(): number[] {
		return [...this.dashPattern];
	}

	public getDashOffset(): number {
		return this.dashOffset;
	}

	public getCap(): LineCapType {
		return this.cap;
	}

	public getJoin(): LineJoinType {
		return this.join;
	}
}
