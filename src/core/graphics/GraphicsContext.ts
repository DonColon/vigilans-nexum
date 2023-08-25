export abstract class GraphicsContext
{
    constructor(protected context: CanvasRenderingContext2D) {}


    beginPath()
    {
        this.context.beginPath();
    }

    moveTo(x: number, y: number)
    {
        this.context.moveTo(x, y);
    }

    lineTo(x: number, y: number)
    {
        this.context.lineTo(x, y);
    }

    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number)
    {
        this.context.arcTo(x1, y1, x2, y2, radius);
    }

    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number)
    {
        this.context.quadraticCurveTo(cpx, cpy, x, y);
    }

    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number)
    {
        this.context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    }

    closePath()
    {
        this.context.closePath();
    }


    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean)
    {
        this.context.arc(x, y, radius, startAngle, endAngle, counterclockwise);
    }

    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean)
    {
        this.context.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise);
    }


    rect(x: number, y: number, w: number, h: number)
    {
        this.context.rect(x, y, w, h);
    }

    roundRect(x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[] | undefined): void;
    roundRect(x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | Iterable<number | DOMPointInit> | undefined): void;
    roundRect(x: number, y: number, w: number, h: number, radii?: number | DOMPointInit | (number | DOMPointInit)[] | Iterable<number | DOMPointInit>)
    {
        this.context.roundRect(x, y, w, h, radii);
    }

    fillRect(x: number, y: number, w: number, h: number)
    {
        this.context.fillRect(x, y, w, h);
    }

    strokeRect(x: number, y: number, w: number, h: number)
    {
        this.context.strokeRect(x, y, w, h);
    }

    clearRect(x: number, y: number, w: number, h: number)
    {
        this.context.clearRect(x, y, w, h);
    }


    fill(fillRule?: CanvasFillRule | undefined): void;
    fill(path: Path2D, fillRule?: CanvasFillRule | undefined): void;
    fill(one?: Path2D | CanvasFillRule, two?: CanvasFillRule)
    {
        if(one instanceof Path2D) {
            this.context.fill(one, two);
        } else {
            this.context.fill(one);
        }
    }

    stroke(): void;
    stroke(path: Path2D): void;
    stroke(one?: Path2D)
    {
        if(one) {
            this.context.stroke(one)
        } else {
            this.context.stroke();
        }
    }

    clip(fillRule?: CanvasFillRule | undefined): void;
    clip(path: Path2D, fillRule?: CanvasFillRule | undefined): void;
    clip(one?: Path2D | CanvasFillRule, two?: CanvasFillRule)
    {
        if(one instanceof Path2D) {
            this.context.clip(one, two);
        } else {
            this.context.clip(one);
        }
    }


    createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient
    {
        return this.context.createLinearGradient(x0, y0, x1, y1);
    }

    createConicGradient(startAngle: number, x: number, y: number): CanvasGradient
    {
        return this.context.createConicGradient(startAngle, x, y);
    }

    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient
    {
        return this.context.createRadialGradient(x0, y0, r0, x1, y1, r1);
    }

    createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null
    {
        return this.context.createPattern(image, repetition);
    }


    drawImage(image: CanvasImageSource, dx: number, dy: number): void;
    drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
    drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
    drawImage(one: CanvasImageSource, two: number, three: number, four?: number, five?: number, six?: number, seven?: number, eight?: number, nine?: number)
    {
        if(four && five && six && seven && eight && nine) {
            this.context.drawImage(one, two, three, four, five, six, seven, eight, nine);
        }
        else if(four && five && !six && !seven && !eight && !nine) {
            this.context.drawImage(one, two, three, four, five);
        }
        else if(!four && !five && !six && !seven && !eight && !nine) {
            this.context.drawImage(one, two, three);
        }
    }

    createImageData(sw: number, sh: number, settings?: ImageDataSettings | undefined): ImageData;
    createImageData(imagedata: ImageData): ImageData;
    createImageData(one: ImageData | number, two?: number, three?: ImageDataSettings): ImageData
    {
        if(one instanceof ImageData) {
            return this.context.createImageData(one);
        }

        if(!two) {
            throw new TypeError("Second parameter of method createImageData must be of type number");
        }

        return this.context.createImageData(one, two, three);
    }

    putImageData(imagedata: ImageData, dx: number, dy: number): void;
    putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
    putImageData(one: ImageData, two: number, three: number, four?: number, five?: number, six?: number, seven?: number)
    {
        if(four && five && six && seven) {
            this.context.putImageData(one, two, three, four, five, six, seven);
        }
        else if(!four && !five && !six && !seven) {
            this.context.putImageData(one, two, three);
        }
    }

    getImageData(sx: number, sy: number, sw: number, sh: number, settings?: ImageDataSettings): ImageData
    {
        return this.context.getImageData(sx, sy, sw, sh, settings);
    }


    fillText(text: string, x: number, y: number, maxWidth?: number)
    {
        this.context.fillText(text, x, y, maxWidth);
    }

    strokeText(text: string, x: number, y: number, maxWidth?: number)
    {
        this.context.strokeText(text, x, y, maxWidth);
    }

    measureText(text: string): TextMetrics
    {
        return this.context.measureText(text);
    }


    save()
    {
        this.context.save();
    }

    transform(a: number, b: number, c: number, d: number, e: number, f: number)
    {
        this.context.transform(a, b, c, d, e, f);
    }

    rotate(angle: number)
    {
        this.context.rotate(angle);
    }

    scale(x: number, y: number)
    {
        this.context.scale(x, y);
    }

    translate(x: number, y: number)
    {
        this.context.translate(x, y);
    }

    restore()
    {
        this.context.restore();
    }

    resetTransform()
    {
        this.context.resetTransform();
    }

    getTransform(): DOMMatrix
    {
        return this.context.getTransform();
    }

    setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
    setTransform(transform?: DOMMatrix2DInit | undefined): void;
    setTransform(one?: DOMMatrix2DInit | number, two?: number, three?: number, four?: number, five?: number, six?: number)
    {
        if(typeof one === "number") {
            if(two && three && four && five && six) {
                this.context.setTransform(one, two, three, four, five, six);
            }
        } else {
            this.context.setTransform(one);
        }
    }


    isPointInPath(x: number, y: number, fillRule?: CanvasFillRule | undefined): boolean;
    isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule | undefined): boolean;
    isPointInPath(one: Path2D | number, two: number, three?: CanvasFillRule | number, four?: CanvasFillRule): boolean
    {
        if(one instanceof Path2D && typeof three === "number") {
            return this.context.isPointInPath(one, two, three, four);
        }
        else if(typeof one === "number" && typeof three !== "number") {
            return this.context.isPointInPath(one, two, three);
        }
            
        return false;
    }

    isPointInStroke(x: number, y: number): boolean;
    isPointInStroke(path: Path2D, x: number, y: number): boolean;
    isPointInStroke(one: Path2D | number, two: number, three?: number): boolean
    {
        if(one instanceof Path2D) {
            if(three) {
                return this.context.isPointInStroke(one, two, three);
            }
        } else {
            return this.context.isPointInStroke(one, two);
        }
        
        return false;
    }

    drawFocusIfNeeded(element: Element): void;
    drawFocusIfNeeded(path: Path2D, element: Element): void;
    drawFocusIfNeeded(one: Path2D | Element, two?: Element)
    {
        if(one instanceof Path2D) {
            if(two) {
                this.context.drawFocusIfNeeded(one, two);
            }
        } else {
            this.context.drawFocusIfNeeded(one);
        }
    }


    getLineDash(): number[]
    {
        return this.context.getLineDash();
    }

    setLineDash(segments: number[]): void;
    setLineDash(segments: Iterable<number>): void;
    setLineDash(segments: number[] | Iterable<number>)
    {
        this.context.setLineDash(segments);
    }


    getContextAttributes(): CanvasRenderingContext2DSettings
    {
        return this.context.getContextAttributes();
    }

    getCanvas(): HTMLCanvasElement
    {
        return this.context.canvas;
    }
}