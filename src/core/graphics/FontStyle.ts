export class FontStyle
{
    private family: string;
    private size: string;
    private weight: string;
    private style: string;
    private lineHeight: string;


    constructor(family: string, size: string, weight?: string, style?: string, lineHeight?: string)
    {
        this.family = family;
        this.size = size;
        this.weight = weight || "normal";
        this.style = style || "normal";
        this.lineHeight = lineHeight || "normal";
    }


    public asCss(): string
    {
        return `${this.weight} ${this.style} ${this.size}/${this.lineHeight} ${this.family}`
    }

    public getFamily(): string
    {
        return this.family;
    }

    public getSize(): string
    {
        return this.size;
    }

    public getWeight(): string
    {
        return this.weight;
    }

    public getStyle(): string
    {
        return this.style;
    }

    public getLineHeight(): string
    {
        return this.lineHeight;
    }
}