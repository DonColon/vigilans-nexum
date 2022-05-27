import { TextAlign } from "./TextAlign";
import { TextBaseline } from "./TextBaseline";
import { TextDirection } from "./TextDirection";


export interface TextStyleSettings
{
    align?: TextAlign,
    baseline?: TextBaseline,
    direction?: TextDirection
}


export class TextStyle
{
    private align: TextAlign;
    private baseline: TextBaseline;
    private direction: TextDirection;


    constructor(settings?: TextStyleSettings)
    {
        this.align = (settings && settings.align) || TextAlign.START;
        this.baseline = (settings && settings.baseline) || TextBaseline.ALPHABETIC;
        this.direction = (settings && settings.direction) || TextDirection.LTR;
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