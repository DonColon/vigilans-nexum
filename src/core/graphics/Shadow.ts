import { Color } from "./Color";


export interface ShadowSettings
{
    color?: Color,
    offsetX?: number,
    offsetY?: number,
    blur?: number
}


export class Shadow
{
    private color: Color;
    private offsetX: number;
    private offsetY: number;
    private blur: number;


    constructor(settings?: ShadowSettings)
    {
        this.color = (settings && settings.color) || Color.hex("#000");
        this.offsetX = (settings && settings.offsetX) || 0;
        this.offsetY = (settings && settings.offsetY) || 0;
        this.blur = (settings && settings.blur) || 0;
    }


    public asDropShadow(): string
    {
        return `drop-shadow(${this.offsetX} ${this.offsetY} ${this.blur} ${this.color.asHEX()})`;
    }

    public getColor(): Color
    {
        return this.color;
    }

    public getOffsetX(): number
    {
        return this.offsetX;
    }

    public getOffsetY(): number
    {
        return this.offsetY;
    }

    public getBlur(): number
    {
        return this.blur;
    }
}