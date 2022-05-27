import { LineCap } from "./LineCap";
import { LineJoin } from "./LineJoin";


export interface LineStyleSettings
{
    width?: number;
    dashPattern?: number[];
    dashOffset?: number;
    cap?: LineCap;
    join?: LineJoin;
}


export class LineStyle
{
    private width: number;
    private dashPattern: number[];
    private dashOffset: number;
    private cap: LineCap;
    private join: LineJoin;


    constructor(settings?: LineStyleSettings)
    {
        this.width = (settings && settings.width) || 1;
        this.dashPattern = (settings && settings.dashPattern) || [];
        this.dashOffset = (settings && settings.dashOffset) || 0;
        this.cap = (settings && settings.cap) || LineCap.BUTT;
        this.join = (settings && settings.join) || LineJoin.MITER;
    }


    public getWidth(): number
    {
        return this.width;
    }

    public getDashPattern(): number[]
    {
        return [...this.dashPattern];
    }

    public getDashOffset(): number
    {
        return this.dashOffset;
    }

    public getCap(): LineCap
    {
        return this.cap;
    }

    public getJoin(): LineJoin
    {
        return this.join;
    }
}