import { TextAlign } from "./TextAlign";
import { TextBaseline } from "./TextBaseline";
import { TextDirection } from "./TextDirection";


export class TextStyle
{
    private align: TextAlign;
    private baseline: TextBaseline;
    private direction: TextDirection;


    constructor(align?: TextAlign, baseline?: TextBaseline, direction?: TextDirection)
    {
        this.align = align || TextAlign.START;
        this.baseline = baseline || TextBaseline.ALPHABETIC;
        this.direction = direction || TextDirection.LTR;
    }


    public getAlign(): TextAlign
    {
        return this.align;
    }

    public getBaseline(): TextBaseline
    {
        return this.baseline;
    }

    public getDirection(): TextDirection
    {
        return this.direction;
    }
}