export interface HSL
{
    hue: number,
    saturation: number,
    lightness: number,
    alpha?: number
}

export interface RGB
{
    red: number,
    green: number,
    blue: number,
    alpha?: number
}

export interface HexCode
{
    code: string
}


export class Color
{
    private code: string;

    private hue: number;
    private saturation: number;
    private lightness: number;

    private red: number;
    private green: number;
    private blue: number;

    private alpha?: number;


    private constructor(settings: RGB & HSL & HexCode)
    {
        this.code = settings.code;

        this.hue = settings.hue;
        this.saturation = settings.saturation;
        this.lightness = settings.lightness;

        this.red = settings.red;
        this.green = settings.green;
        this.blue = settings.blue;

        this.alpha = settings.alpha;
    }

    public static hsl(hue: number, saturation: number, lightness: number, alpha?: number): Color
    {
        const { red, green, blue } = Color.hslAsRgb(hue, saturation, lightness, alpha);
        const code = Color.hslAsHex(hue, saturation, lightness, alpha);

        return new Color({ code, hue, saturation, lightness, red, green, blue, alpha });
    }

    public static rgb(red: number, green: number, blue: number, alpha?: number): Color
    {
        const { hue, saturation, lightness } = Color.rgbAsHsl(red, green, blue, alpha);
        const code = Color.rgbAsHex(red, green, blue, alpha);

        return new Color({ code, hue, saturation, lightness, red, green, blue, alpha });
    }

    public static hex(code: string): Color
    {
        const { hue, saturation, lightness, alpha } = Color.hexAsHsl(code);
        const { red, green, blue } = Color.hexAsRgb(code);

        return new Color({ code, hue, saturation, lightness, red, green, blue, alpha });
    }


    private static hslAsHex(hue: number, saturation: number, lightness: number, alpha?: number): string
    {
        const { red, green, blue } = Color.hslAsRgb(hue, saturation, lightness, alpha);
        return Color.rgbAsHex(red, green, blue, alpha);
    }

    private static hslAsRgb(hue: number, saturation: number, lightness: number, alpha?: number): RGB
    {
        const s = saturation / 100;
        const l = lightness / 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
        const m = l - c / 2;

        let r = 0;
        let g = 0;
        let b = 0;

        if (0 <= hue && hue < 60) {
            r = c; g = x; b = 0;  
        }
        else if (60 <= hue && hue < 120) {
            r = x; g = c; b = 0;
        }
        else if (120 <= hue && hue < 180) {
            r = 0; g = c; b = x;
        } 
        else if (180 <= hue && hue < 240) {
            r = 0; g = x; b = c;
        }
        else if (240 <= hue && hue < 300) {
            r = x; g = 0; b = c;
        }
        else if (300 <= hue && hue < 360) {
            r = c; g = 0; b = x;
        }

        const red = Math.round((r + m) * 255);
        const green = Math.round((g + m) * 255);
        const blue = Math.round((b + m) * 255);

        return { red, green, blue, alpha };
    }

    private static rgbAsHex(red: number, green: number, blue: number, alpha?: number): string
    {
        const r = red.toString(16).padStart(2, "0");
        const g = green.toString(16).padStart(2, "0");
        const b = blue.toString(16).padStart(2, "0");

        if(alpha !== undefined) {
            const a = Math.ceil(alpha * 255).toString(16).padStart(2, "0");
            return "#" + r + g + b + a;
        }

        return "#" + r + g + b;
    }

    private static rgbAsHsl(red: number, green: number, blue: number, alpha?: number): HSL
    {
        const r = red / 255;
        const g = green / 255;
        const b = blue / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let angle = 0;

        if(max === r) {
            angle = (g - b) / delta % 6;
        }
        else if(max === g) {
            angle = (b - r) / delta + 2;
        }
        else if(max === b) {
            angle = (r - g) / delta + 4;
        }
        else if(delta === 0) {
            angle = 0;
        }

        let hue = (Math.round(angle * 60) + 360) % 360;
        let lightness = (max + min) / 2;
        let saturation = delta / (1 - Math.abs(2 * lightness - 1));

        const hsl: HSL = {
            hue: hue,
            saturation: +(saturation * 100).toFixed(1),
            lightness: +(lightness * 100).toFixed(1)
        };

        if(alpha !== undefined) {
            hsl.alpha = alpha;
        }

        return hsl;
    }

    private static hexAsHsl(code: string): HSL
    {
        const { red, green, blue, alpha } = Color.hexAsRgb(code);
        return Color.rgbAsHsl(red, green, blue, alpha);
    }

    private static hexAsRgb(code: string): RGB
    {
        if(code.length === 4) {
            const red = parseInt(code[1] + code[1], 16);
            const green = parseInt(code[2] + code[2], 16);
            const blue = parseInt(code[3] + code[3], 16);

            return { red, green, blue };
        }
        else if(code.length === 5) {
            const red = parseInt(code[1] + code[1], 16);
            const green = parseInt(code[2] + code[2], 16);
            const blue = parseInt(code[3] + code[3], 16);

            let alpha = parseInt(code[4] + code[4], 16);
            alpha = +(alpha / 255).toFixed(3);

            return { red, green, blue, alpha };
        }
        else if(code.length === 7) {
            const red = parseInt(code[1]+ code[2], 16);
            const green = parseInt(code[3] + code[4], 16);
            const blue = parseInt(code[5] + code[6], 16);

            return { red, green, blue };
        }
        else if(code.length === 9) {
            const red = parseInt(code[1]+ code[2], 16);
            const green = parseInt(code[3] + code[4], 16);
            const blue = parseInt(code[5] + code[6], 16);

            let alpha = parseInt(code[7] + code[8], 16);
            alpha = +(alpha / 255).toFixed(3);

            return { red, green, blue, alpha };
        }

        return {} as RGB;
    }


    public asHsl(): HSL
    {
        return {
            hue: this.hue,
            saturation: this.saturation,
            lightness: this.lightness,
            alpha: this.alpha
        };
    }

    public asRgb(): RGB
    {
        return {
            red: this.red,
            green: this.green,
            blue: this.blue,
            alpha: this.alpha
        };
    }

    public asHexCode(): string
    {
        return this.code;
    }
}