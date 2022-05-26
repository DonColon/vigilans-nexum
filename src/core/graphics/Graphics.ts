import { GraphicsContext } from "./GraphicsContext";

import { Vector } from "core/math/Vector";
import { Line } from "core/math/Line";
import { Circle } from "core/math/Circle";
import { Rectangle } from "core/math/Rectangle";
import { Polygon } from "core/math/Polygon";

import { Color } from "./Color";
import { Shadow } from "./Shadow";
import { LineStyle } from "./LineStyle";
import { TextStyle } from "./TextStyle";
import { FontStyle } from "./FontStyle";


export class Graphics extends GraphicsContext
{
    constructor(context: CanvasRenderingContext2D)
    {
        super(context);
    }


    public fillStyle(color: Color): Graphics
    {
        this.context.fillStyle = color.asHexCode();
        return this;
    }

    public strokeStyle(color: Color): Graphics
    {
        this.context.strokeStyle = color.asHexCode();
        return this;
    }

    public lineStyle(style: LineStyle): Graphics
    {
        this.context.lineWidth = style.getWidth();
        this.context.lineCap = style.getCap();
        this.context.lineJoin = style.getJoin();
        this.context.lineDashOffset = style.getDashOffset();
        this.context.setLineDash(style.getDashPattern());
        return this;
    }

    public textStyle(style: TextStyle): Graphics
    {
        this.context.textAlign = style.getAlign();
        this.context.textBaseline = style.getBaseline();
        this.context.direction = style.getDirection();
        return this;
    }

    public fontStyle(style: FontStyle): Graphics
    {
        this.context.font = style.asCss();
        return this;
    }

    public shadowStyle(style: Shadow): Graphics
    {
        this.context.shadowColor = style.getColor().asHexCode();
        this.context.shadowOffsetX = style.getOffsetX();
        this.context.shadowOffsetY = style.getOffsetY();
        this.context.shadowBlur = style.getBlur();
        return this;
    }


    public applySvgFilter(url: string): Graphics
    {
        const filter = `url(${url})`;
        this.applyFilter(filter);
        return this;
    }

    public applyBlurFilter(radius: string): Graphics
    {
        const filter = `blur(${radius})`;
        this.applyFilter(filter);
        return this;
    }

    public applyBrightnessFilter(amount: string): Graphics
    {
        const filter = `brightness(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public applyContrastFilter(amount: string): Graphics
    {
        const filter = `contrast(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public applyDropShadowFilter(shadow: Shadow): Graphics
    {
        this.applyFilter(shadow.asDropShadow());
        return this;
    }

    public applyGrayscaleFilter(amount: string): Graphics
    {
        const filter = `grayscale(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public applyHueFilter(angle: string): Graphics
    {
        const filter = `hue-rotate(${angle})`;
        this.applyFilter(filter);
        return this;
    }

    public applyInvertFilter(amount: string): Graphics
    {
        const filter = `invert(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public applyOpacityFilter(alpha: string): Graphics
    {
        const filter = `opacity(${alpha})`;
        this.applyFilter(filter);
        return this;
    }

    public applySaturationFilter(amount: string): Graphics
    {
        const filter = `saturate(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public applySepiaFilter(amount: string): Graphics
    {
        const filter = `sepia(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    private applyFilter(filter: string)
    {
        (this.context.filter)
            ? this.context.filter.concat(" ", filter) 
            : this.context.filter.concat(filter);
    }


    public clearCanvas(): Graphics
    {
        const { width, height } = this.context.canvas;
        this.context.clearRect(0, 0, width, height);
        return this;
    }


    public drawLine(line: Line): Graphics
    {
        const start = line.getStart();
        const end = line.getEnd();

        this.beginPath();

            this.moveTo(start.x, start.y);
            this.lineTo(end.x, end.y);

        this.closePath();

        this.stroke();
        return this;
    }


    public fillCircle(circle: Circle): Graphics
    {
        this.drawCircle(circle);
        this.fill();
        return this;
    }

    public strokeCircle(circle: Circle): Graphics
    {
        this.drawCircle(circle);
        this.stroke();
        return this;
    }

    private drawCircle(circle: Circle)
    {
        const center = circle.getPosition();
        const radius = circle.getRadius();

        this.arc(center.x, center.y, radius, 0, 2 * Math.PI);
    }


    public fillRectangle(rectangle: Rectangle): Graphics
    {
        this.drawRectangle(rectangle);
        this.fill();
        return this;
    }

    public strokeRectangle(rectangle: Rectangle): Graphics
    {
        this.drawRectangle(rectangle);
        this.stroke();
        return this;
    }

    private drawRectangle(rectangle: Rectangle)
    {
        const { width, height } = rectangle.getDimension();
        const position = rectangle.getPosition();

        this.rect(position.x, position.y, width, height);
    }


    public fillRoundedRectangle(rectangle: Rectangle, radius: number): Graphics
    {
        this.drawRoundedRectangle(rectangle, radius);
        this.fill();
        return this;
    }

    public strokeRoundedRectangle(rectangle: Rectangle, radius: number): Graphics
    {
        this.drawRoundedRectangle(rectangle, radius);
        this.stroke();
        return this;
    }

    private drawRoundedRectangle(rectangle: Rectangle, radius: number)
    {
        const { topLeft, bottomRight } = rectangle.getCorners();
        const { width, height } = rectangle.getDimension();
        
        if(radius > width / 2) radius = width / 2;
        if(radius > height / 2) radius = height / 2;

        this.beginPath();

            this.moveTo(bottomRight.x - radius, topLeft.y);
            this.quadraticCurveTo(bottomRight.x, topLeft.y, bottomRight.x, topLeft.y + radius);

            this.lineTo(bottomRight.x, bottomRight.y - radius);
            this.quadraticCurveTo(bottomRight.x, bottomRight.y, bottomRight.x - radius, bottomRight.y);

            this.lineTo(topLeft.x + radius, bottomRight.y);
            this.quadraticCurveTo(topLeft.x, bottomRight.y, topLeft.x, bottomRight.y - radius);

            this.lineTo(topLeft.x, topLeft.y + radius);
            this.quadraticCurveTo(topLeft.x, topLeft.y, topLeft.x + radius, topLeft.y);

        this.closePath();
    }

    
    public fillPolygon(polygon: Polygon): Graphics
    {
        this.drawPolygon(polygon);
        this.fill();
        return this;
    }

    public strokePolygon(polygon: Polygon): Graphics
    {
        this.drawPolygon(polygon);
        this.stroke();
        return this;
    }

    private drawPolygon(polygon: Polygon)
    {
        const vertices = polygon.getVertices();
        const start = vertices.shift() as Vector;

        this.beginPath();

            this.moveTo(start.x, start.y);

            for(const vertex of vertices) {
                this.lineTo(vertex.x, vertex.y);
            }

        this.closePath();
    }
}