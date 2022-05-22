export interface FontStyleSettings
{
    family: string,
    size: string,
    weight?: string,
    style?: string,
    lineHeight?: string
}


export class FontStyle
{
    private family: string;
    private size: string;
    private weight: string;
    private style: string;
    private lineHeight: string;


    constructor(settings: FontStyleSettings)
    {
        this.family = settings.family;
        this.size = settings.size;
        this.weight = settings.weight || "normal";
        this.style = settings.style || "normal";
        this.lineHeight = settings.lineHeight || "normal";
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