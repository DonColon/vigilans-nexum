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
	private readonly width: number;
	private readonly dashPattern: number[];
	private readonly dashOffset: number;
	private readonly cap: LineCapType;
	private readonly join: LineJoinType;

	constructor(settings?: LineStyleSettings) {
		this.width = settings?.width ?? 1;
		this.dashPattern = settings?.dashPattern ?? [];
		this.dashOffset = settings?.dashOffset ?? 0;
		this.cap = settings?.cap ?? LineCap.BUTT;
		this.join = settings?.join ?? LineJoin.MITER;
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
