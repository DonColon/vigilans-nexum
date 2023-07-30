import { GraphicsContext } from "./GraphicsContext";
import { CompositeOperationType } from "./CompositeOperation";
import { SmoothingQualityType } from "./SmoothingQuality";

import { Line } from "core/math/Line";
import { Circle } from "core/math/Circle";
import { Rectangle } from "core/math/Rectangle";
import { Polygon } from "core/math/Polygon";

import { Color } from "./Color";
import { Shadow, ShadowSettings } from "./Shadow";
import { LineStyle, LineStyleSettings } from "./LineStyle";
import { TextStyle, TextStyleSettings } from "./TextStyle";
import { FontStyle, FontStyleSettings } from "./FontStyle";
import { Label, LabelSettings } from "./Label";


export class Graphics extends GraphicsContext
{
    private globalShadowStyle: Shadow;
    private globalLineStyle: LineStyle;
    private globalTextStyle: TextStyle;
    private globalFontStyle: FontStyle;

    private globalFillColor: Color;
    private globalStrokeColor: Color;


    constructor(context: CanvasRenderingContext2D)
    {
        super(context);
        this.globalShadowStyle = new Shadow();
        this.globalLineStyle = new LineStyle();
        this.globalTextStyle = new TextStyle();
        this.globalFontStyle = new FontStyle();

        this.globalFillColor = Color.hex("#000");
        this.globalStrokeColor = Color.hex("#000");
    }


    public alpha(value: number): this
    {
        if(value < 0.0 || value > 1.0) {
            throw new RangeError("alpha value goes from 0.0 to 1.0");
        }

        this.context.globalAlpha = value;
        return this;
    }

    public compositeOperation(operation: CompositeOperationType): this
    {
        this.context.globalCompositeOperation = operation;
        return this;
    }

    public imageSmoothing(quality?: SmoothingQualityType): this
    {
        if(quality) {
            this.context.imageSmoothingQuality = quality;
            this.context.imageSmoothingEnabled = true;
        } else {
            this.context.imageSmoothingEnabled = false;
        }

        return this;
    }

    public shadowStyle(settings: ShadowSettings): this
    {
        this.globalShadowStyle = new Shadow(settings);
        this.setShadowStyle(this.globalShadowStyle);
        return this;
    }

    public lineStyle(settings: LineStyleSettings): this
    {
        this.globalLineStyle = new LineStyle(settings);
        this.setLineStyle(this.globalLineStyle);
        return this;
    }

    public textStyle(settings: TextStyleSettings): this
    {
        this.globalTextStyle = new TextStyle(settings);
        this.setTextStyle(this.globalTextStyle);
        return this;
    }

    public fontStyle(settings: FontStyleSettings): this
    {
        this.globalFontStyle = new FontStyle(settings);
        this.setFontStyle(this.globalFontStyle);
        return this;
    }

    public fillColor(color: Color): this
    {
        this.globalFillColor = color;
        this.setFillColor(this.globalFillColor);
        return this;
    }

    public fillGradient(gradient: CanvasGradient): this
    {
        this.context.fillStyle = gradient;
        return this;
    }

    public fillPattern(pattern: CanvasPattern): this
    {
        this.context.fillStyle = pattern;
        return this;
    }

    public strokeColor(color: Color): this
    {
        this.globalStrokeColor = color;
        this.setStrokeColor(this.globalStrokeColor);
        return this;
    }

    public strokeGradient(gradient: CanvasGradient): this
    {
        this.context.strokeStyle = gradient;
        return this;
    }

    public strokePattern(pattern: CanvasPattern): this
    {
        this.context.strokeStyle = pattern;
        return this;
    }


    public applySvgFilter(url: string): this
    {
        const filter = `url(${url})`;
        this.applyFilter(filter);
        return this;
    }

    public undoSvgFilter(): this
    {
        this.undoFilter("url");
        return this;
    }

    public applyBlurFilter(radius: string): this
    {
        const filter = `blur(${radius})`;
        this.applyFilter(filter);
        return this;
    }

    public undoBlurFilter(): this
    {
        this.undoFilter("blur");
        return this;
    }

    public applyBrightnessFilter(amount: string): this
    {
        const filter = `brightness(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public undoBrightnessFilter(): this
    {
        this.undoFilter("brightness");
        return this;
    }

    public applyContrastFilter(amount: string): this
    {
        const filter = `contrast(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public undoContrastFilter(): this
    {
        this.undoFilter("contrast");
        return this;
    }

    public applyDropShadowFilter(shadow: Shadow): this
    {
        this.applyFilter(shadow.asDropShadow());
        return this;
    }

    public undoDropShadowFilter(): this
    {
        this.undoFilter("drop-shadow");
        return this;
    }

    public applyGrayscaleFilter(amount: string): this
    {
        const filter = `grayscale(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public undoGrayscaleFilter(): this
    {
        this.undoFilter("grayscale");
        return this;
    }

    public applyHueFilter(angle: string): this
    {
        const filter = `hue-rotate(${angle})`;
        this.applyFilter(filter);
        return this;
    }

    public undoHueFilter(): this
    {
        this.undoFilter("hue-rotate");
        return this;
    }

    public applyInvertFilter(amount: string): this
    {
        const filter = `invert(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public undoInvertFilter(): this
    {
        this.undoFilter("invert");
        return this;
    }

    public applyOpacityFilter(alpha: string): this
    {
        const filter = `opacity(${alpha})`;
        this.applyFilter(filter);
        return this;
    }

    public undoOpacityFilter(): this
    {
        this.undoFilter("opacity");
        return this;
    }

    public applySaturationFilter(amount: string): this
    {
        const filter = `saturate(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public undoSaturationFilter(): this
    {
        this.undoFilter("saturate");
        return this;
    }

    public applySepiaFilter(amount: string): this
    {
        const filter = `sepia(${amount})`;
        this.applyFilter(filter);
        return this;
    }

    public undoSepiaFilter(): this
    {
        this.undoFilter("sepia");
        return this;
    }

    private applyFilter(filter: string)
    {
        (this.context.filter === "none")
            ? this.context.filter = filter
            : this.context.filter.concat(" ", filter);
    }

    private undoFilter(name: string)
    {
        if(this.context.filter === "none") return;

        const effects = this.context.filter.split(" ");
        const newEffects = effects.filter(value => !value.startsWith(name));

        this.context.filter = newEffects.join(" ");
    }

    public resetFilters(): this
    {
        this.context.filter = "none";
        return this;
    }


    public createLabel(settings: Omit<LabelSettings, "height" | "width">): Label
    {
        const height = (settings.fontStyle)? parseInt(settings.fontStyle.getSize()) : parseInt(this.globalFontStyle.getSize());

        const metrics = this.measureText(settings.text);
        const width = metrics.width;

        return new Label({ ...settings, width, height });
    }

    public clearCanvas(): this
    {
        const { width, height } = this.context.canvas;
        this.clearRect(0, 0, width, height);
        return this;
    }


    public fillLabel(label: Label): this
    {
        this.drawLabel(label, "fill");
        return this;
    }

    public strokeLabel(label: Label): this
    {
        this.drawLabel(label, "stroke");
        return this;
    }

    private drawLabel(label: Label, action: "fill" | "stroke")
    {
        const text = label.getText();
        const position = label.getPosition();

        const fontStyle = label.getFontStyle();
        const textStyle = label.getTextStyle();

        if(fontStyle !== undefined) {
            this.setFontStyle(fontStyle);
        }

        if(textStyle !== undefined) {
            this.setTextStyle(textStyle);
        }

        if(action === "fill") {
            this.fillText(text, position.x, position.y);
        }
        else if(action === "stroke") {
            this.strokeText(text, position.x, position.y);
        }

        this.setFontStyle(this.globalFontStyle);
        this.setTextStyle(this.globalTextStyle);
    }

    public drawSprite(id: string, x: number, y: number): this
    {
        const image = assetStorage.getImage(id);
        image.display(this, x, y);
        return this;
    }


    public drawLine(line: Line): this
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

    public fillCircle(circle: Circle): this
    {
        this.drawCircle(circle);
        this.fill();
        return this;
    }

    public strokeCircle(circle: Circle): this
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

    public fillRectangle(rectangle: Rectangle): this
    {
        this.drawRectangle(rectangle);
        this.fill();
        return this;
    }

    public strokeRectangle(rectangle: Rectangle): this
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

    public fillRoundRectangle(rectangle: Rectangle, radius: number): this
    {
        this.drawRoundRectangle(rectangle, radius);
        this.fill();
        return this;
    }

    public strokeRoundRectangle(rectangle: Rectangle, radius: number): this
    {
        this.drawRoundRectangle(rectangle, radius);
        this.stroke();
        return this;
    }

    private drawRoundRectangle(rectangle: Rectangle, radius: number)
    {
        const { width, height } = rectangle.getDimension();
        const position = rectangle.getPosition();

        this.roundRect(position.x, position.y, width, height, radius);
    }

    public fillPolygon(polygon: Polygon): this
    {
        this.drawPolygon(polygon);
        this.fill();
        return this;
    }

    public strokePolygon(polygon: Polygon): this
    {
        this.drawPolygon(polygon);
        this.stroke();
        return this;
    }

    private drawPolygon(polygon: Polygon)
    {
        const vertices = polygon.getVertices();
        const start = vertices.shift();

        if(start === undefined) {
            throw new TypeError("Polygon has no vertices");
        }

        this.beginPath();

            this.moveTo(start.x, start.y);

            for(const vertex of vertices) {
                this.lineTo(vertex.x, vertex.y);
            }

        this.closePath();
    }


    private setShadowStyle(style: Shadow)
    {
        this.context.shadowColor = style.getColor().asHEX();
        this.context.shadowOffsetX = style.getOffsetX();
        this.context.shadowOffsetY = style.getOffsetY();
        this.context.shadowBlur = style.getBlur();
    }

    private setLineStyle(style: LineStyle)
    {
        this.context.lineWidth = style.getWidth();
        this.context.lineCap = style.getCap();
        this.context.lineJoin = style.getJoin();
        this.context.lineDashOffset = style.getDashOffset();
        this.setLineDash(style.getDashPattern());
    }

    private setTextStyle(style: TextStyle)
    {
        this.context.textAlign = style.getAlign();
        this.context.textBaseline = style.getBaseline();
        this.context.direction = style.getDirection();
    }

    private setFontStyle(style: FontStyle)
    {
        this.context.font = style.asCss();
    }

    private setFillColor(color: Color)
    {
        this.context.fillStyle = color.asHEX();
    }

    private setStrokeColor(color: Color)
    {
        this.context.strokeStyle = color.asHEX();
    }
}