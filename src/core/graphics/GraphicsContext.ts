export abstract class GraphicsContext
{
    protected context: CanvasRenderingContext2D;


    constructor(context: CanvasRenderingContext2D)
    {
        this.context = context;
    }


    public beginPath(): void
    {
        this.context.beginPath();
    }

    public moveTo(x: number, y: number): void 
    {
        this.context.moveTo(x, y);
    }

    public lineTo(x: number, y: number): void
    {
        this.context.lineTo(x, y);
    }

    public arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void
    {
        this.context.arcTo(x1, y1, x2, y2, radius);
    }

    public quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
    {
        this.context.quadraticCurveTo(cpx, cpy, x, y);
    }

    public bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void
    {
        this.context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    }

    public closePath(): void
    {
        this.context.closePath();
    }

    public clip(fillRule?: CanvasFillRule): void;
    public clip(path: Path2D, fillRule?: CanvasFillRule): void;
    public clip(path?: any, fillRule?: any): void
    {
        if(arguments.length === 2) {
            this.context.clip(path as Path2D, fillRule as CanvasFillRule);
        }
        else if(arguments.length === 1) {
            this.context.clip(path as CanvasFillRule);
        }
        else if(arguments.length === 0) {
            this.context.clip();
        }
    }

    public fill(fillRule?: CanvasFillRule): void;
    public fill(path: Path2D, fillRule?: CanvasFillRule): void;
    public fill(path?: any, fillRule?: any): void
    {
        if(arguments.length === 2) {
            this.context.fill(path as Path2D, fillRule as CanvasFillRule);
        }
        else if(arguments.length === 1) {
            this.context.fill(path as CanvasFillRule);
        }
        else if(arguments.length === 0) {
            this.context.fill();
        }
    }

    public stroke(): void;
    public stroke(path: Path2D): void;
    public stroke(path?: any): void
    {
        if(arguments.length === 1) {
            this.context.stroke(path as Path2D);
        }
        if(arguments.length === 0) {
            this.context.stroke();
        }
    }


    public createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient
    {
        return this.context.createLinearGradient(x0, y0, x1, y1);
    }

    public createConicGradient(startAngle: number, x: number, y: number): CanvasGradient
    {
        return this.context.createConicGradient(startAngle, x, y);
    }

    public createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient
    {
        return this.context.createRadialGradient(x0, y0, r0, x1, y1, r1);
    }

    public createPattern(image: CanvasImageSource, repetition: string | null): CanvasPattern | null
    {
        return this.context.createPattern(image, repetition);
    }


    public drawImage(image: CanvasImageSource, dx: number, dy: number): void;
    public drawImage(image: CanvasImageSource, dx: number, dy: number, dw: number, dh: number): void;
    public drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number): void;
    public drawImage(image: any, sx: any, sy: any, sw?: any, sh?: any, dx?: any, dy?: any, dw?: any, dh?: any): void
    {
        if(arguments.length === 9) {
            this.context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        }
        else if(arguments.length === 5) {
            this.context.drawImage(image, dx, dy, dw, dh);
        }
        else if(arguments.length === 3) {
            this.context.drawImage(image, dx, dy);
        }
    }

    public createImageData(sw: number, sh: number, settings?: ImageDataSettings): ImageData;
    public createImageData(imagedata: ImageData): ImageData;
    public createImageData(sw: any, sh?: any, settings?: any): ImageData
    {
        return this.context.createImageData(sw, sh, settings);
    }

    public putImageData(imagedata: ImageData, dx: number, dy: number): void;
    public putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX: number, dirtyY: number, dirtyWidth: number, dirtyHeight: number): void;
    public putImageData(imagedata: any, dx: any, dy: any, dirtyX?: any, dirtyY?: any, dirtyWidth?: any, dirtyHeight?: any): void
    {
        this.context.putImageData(imagedata, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight);
    }

    public getImageData(sx: number, sy: number, sw: number, sh: number, settings?: ImageDataSettings): ImageData
    {
        return this.context.getImageData(sx, sy, sw, sh, settings);
    }


    public arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void
    {
        this.context.arc(x, y, radius, startAngle, endAngle, counterclockwise);
    }

    public ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void
    {
        this.context.ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, counterclockwise);
    }


    public rect(x: number, y: number, w: number, h: number): void
    {
        this.context.rect(x, y, w, h);
    }

    public fillRect(x: number, y: number, w: number, h: number): void
    {
        this.context.fillRect(x, y, w, h);
    }

    public strokeRect(x: number, y: number, w: number, h: number): void
    {
        this.context.strokeRect(x, y, w, h);
    }

    public clearRect(x: number, y: number, w: number, h: number): void 
    {
        this.context.clearRect(x, y, w, h);
    }


    public fillText(text: string, x: number, y: number, maxWidth?: number): void 
    {
        this.context.fillText(text, x, y, maxWidth);
    }
    
    public strokeText(text: string, x: number, y: number, maxWidth?: number): void
    {
        this.context.strokeText(text, x, y, maxWidth);
    }

    public measureText(text: string): TextMetrics
    {
        return this.context.measureText(text);
    }

    public isPointInPath(x: number, y: number, fillRule?: CanvasFillRule): boolean;
    public isPointInPath(path: Path2D, x: number, y: number, fillRule?: CanvasFillRule): boolean;
    public isPointInPath(path: any, x: any, y?: any, fillRule?: any): boolean
    {
        return this.context.isPointInPath(path, x, y, fillRule);
    }

    public isPointInStroke(x: number, y: number): boolean;
    public isPointInStroke(path: Path2D, x: number, y: number): boolean;
    public isPointInStroke(path: any, x: any, y?: any): boolean
    {
        return this.context.isPointInStroke(path, x, y);
    }

    public drawFocusIfNeeded(element: Element): void;
    public drawFocusIfNeeded(path: Path2D, element: Element): void;
    public drawFocusIfNeeded(path: any, element?: any): void
    {
        this.context.drawFocusIfNeeded(path, element);
    }


    public save(): void 
    {
        this.context.save();
    }

    public transform(a: number, b: number, c: number, d: number, e: number, f: number): void
    {
        this.context.transform(a, b, c, d, e, f);
    }

    public rotate(angle: number): void
    {
        this.context.rotate(angle);
    }

    public scale(x: number, y: number): void
    {
        this.context.scale(x, y);
    }

    public translate(x: number, y: number): void
    {
        this.context.translate(x, y);
    }

    public restore(): void
    {
        this.context.restore();
    }

    public resetTransform(): void
    {
        return this.context.resetTransform();
    }

    public getTransform(): DOMMatrix
    {
        return this.context.getTransform();
    }

    public setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
    public setTransform(transform?: DOMMatrix2DInit): void;
    public setTransform(a?: any, b?: any, c?: any, d?: any, e?: any, f?: any): void
    {
        this.context.setTransform(a, b, c, d, e, f);
    }


    public getLineDash(): number[]
    {
        return this.getLineDash();
    }

    public setLineDash(segments: number[]): void;
    public setLineDash(segments: Iterable<number>): void;
    public setLineDash(segments: any): void
    {
        this.context.setLineDash(segments);
    }

    public getContextAttributes(): CanvasRenderingContext2DSettings
    {
        return this.context.getContextAttributes();
    }
}