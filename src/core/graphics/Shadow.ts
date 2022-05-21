import { Color } from "./Color";


export class Shadow
{
    private color: Color;
    private offsetX: number;
    private offsetY: number;
    private blur: number;


    constructor(color: Color, offsetX: number, offsetY: number, blur: number)
    {
        this. color = color || Color.hex("#000");
        this.offsetX = offsetX || 0;
        this.offsetY = offsetY || 0;
        this.blur = blur || 0;
    }


    public asDropShadow(): string
    {
        return `drop-shadow(${this.offsetX} ${this.offsetY} ${this.blur} ${this.color.asHexCode()})`;
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