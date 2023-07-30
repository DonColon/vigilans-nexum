import { Dimension } from "core/math/Dimension";
import { Graphics } from "./Graphics";


export class Sprite
{
    private dimension: Dimension;


    constructor(private data: HTMLImageElement | ImageData)
    {
        this.dimension = { width: data.width, height: data.height };
    }


    public display(graphics: Graphics, x: number, y: number)
    {
        if(this.data instanceof HTMLImageElement) {
            graphics.drawImage(this.data, x, y);
        }
        else if(this.data instanceof ImageData) {
            graphics.putImageData(this.data, x, y);
        }
    }


    public getDimension(): Dimension
    {
        return this.dimension;
    }

    public getWidth(): number
    {
        return this.dimension.width;
    }

    public getHeight(): number
    {
        return this.dimension.height;
    }
}