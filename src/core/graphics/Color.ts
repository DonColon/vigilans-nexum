import { ColorSpaces, HexCode, HSL, HWB, RGB } from "./ColorSpaces";


export class Color
{
    private code: string;

    private red: number;
    private green: number;
    private blue: number;

    private hue: number;
    private saturation: number;
    private lightness: number;

    private whiteness: number;
    private blackness: number;

    private alpha?: number;


    private constructor(settings: HexCode & RGB & HSL & HWB)
    {
        this.code = settings.code;

        this.red = settings.red;
        this.green = settings.green;
        this.blue = settings.blue;

        this.hue = settings.hue;
        this.saturation = settings.saturation;
        this.lightness = settings.lightness;

        this.whiteness = settings.whiteness;
        this.blackness = settings.blackness;

        this.alpha = settings.alpha;
    }

    public static hex(code: string): Color
    {
        const { red, green, blue, alpha } = ColorSpaces.hex2rgb(code);
        const { hue, saturation, lightness} = ColorSpaces.rgb2hsl(red, green, blue, alpha);
        const { whiteness, blackness } = ColorSpaces.hsl2hwb(hue, saturation, lightness, alpha);

        return new Color({ code, red, green, blue, hue, saturation, lightness, whiteness, blackness, alpha });
    }

    public static rgb(red: number, green: number, blue: number, alpha?: number): Color
    {
        const code = ColorSpaces.rgb2hex(red, green, blue, alpha);
        const { hue, saturation, lightness } = ColorSpaces.rgb2hsl(red, green, blue, alpha);
        const { whiteness, blackness } = ColorSpaces.hsl2hwb(hue, saturation, lightness, alpha);

        return new Color({ code, red, green, blue, hue, saturation, lightness, whiteness, blackness, alpha });
    }

    public static hsl(hue: number, saturation: number, lightness: number, alpha?: number): Color
    {
        const { red, green, blue } = ColorSpaces.hsl2rgb(hue, saturation, lightness, alpha);
        const { whiteness, blackness } = ColorSpaces.hsl2hwb(hue, saturation, lightness, alpha);
        const code = ColorSpaces.rgb2hex(red, green, blue, alpha);

        return new Color({ code, red, green, blue, hue, saturation, lightness, whiteness, blackness, alpha });
    }

    public static hwb(hue: number, whiteness: number, blackness: number, alpha?: number): Color
    {
        const { saturation, lightness } = ColorSpaces.hwb2hsl(hue, whiteness, blackness, alpha);
        const { red, green, blue } = ColorSpaces.hsl2rgb(hue, saturation, lightness, alpha);
        const code = ColorSpaces.rgb2hex(red, green, blue, alpha);

        return new Color({ code, red, green, blue, hue, saturation, lightness, whiteness, blackness, alpha });
    }

    public static css(property: string): Color | null
    {
        if(property.startsWith("#")) {
            return Color.hex(property);
        }
        else if(property.startsWith("rgb")) {
            const args = property.match(/\d*\.?\d+/g);

            if(args !== null) {
                const [red, green, blue, alpha] = args.map(Number);
                return Color.rgb(red, green, blue, alpha);
            }
        }
        else if(property.startsWith("hsl")) {
            const args = property.match(/\d*\.?\d+/g);

            if(args !== null) {
                const [hue, saturation, lightness, alpha] = args.map(Number);
                return Color.hsl(hue, saturation, lightness, alpha);
            }
        }
        else if(property.startsWith("hwb")) {
            const args = property.match(/\d*\.?\d+/g);

            if(args !== null) {
                const [hue, whiteness, blackness, alpha] = args.map(Number);
                return Color.hwb(hue, whiteness, blackness, alpha);
            }
        }

        return null;
    }


    public mix(other: Color, percentage: number = 0.5): Color
    {
        const red = (1 - percentage) * this.red + percentage * other.red;
        const green = (1 - percentage) * this.green + percentage * other.green;
        const blue = (1 - percentage) * this.blue + percentage * other.blue;

        if(this.alpha !== undefined && other.alpha !== undefined) {
            const alpha = (1 - percentage) * this.alpha + percentage * other.alpha;
            return Color.rgb(red, green, blue, alpha);
        }

        return Color.rgb(red, green, blue);
    }

    public invert(): Color
    {
        const red = 255 - this.red;
        const green = 255 - this.green;
        const blue = 255 - this.blue;

        return Color.rgb(red, green, blue, this.alpha);
    }

    public complement(): Color
    {
        const hue = (this.hue + 180) % 360;
        return Color.hsl(hue, this.saturation, this.lightness, this.alpha);
    }

    public saturate(value: number): Color
    {
        if(value < 0 || value > 100) {
            throw new RangeError("value must be percentage");
        }

        let saturation = this.saturation + value;
        if(saturation > 100) saturation = 100;

        return Color.hsl(this.hue, saturation, this.lightness, this.alpha);
    }

    public desaturate(value: number): Color
    {
        if(value < 0 || value > 100) {
            throw new RangeError("value must be percentage");
        }

        let saturation = this.saturation - value;
        if(saturation < 0) saturation = 0;

        return Color.hsl(this.hue, saturation, this.lightness, this.alpha);
    }

    public grayscale(): Color
    {
        return Color.hsl(this.hue, 0, this.lightness, this.alpha);
    }

    public lighten(value: number): Color
    {
        if(value < 0 || value > 100) {
            throw new RangeError("value must be percentage");
        }

        let lightness = this.lightness + value;
        if(lightness > 100) lightness = 100;

        return Color.hsl(this.hue, this.saturation, lightness, this.alpha);
    }

    public darken(value: number): Color
    {
        if(value < 0 || value > 100) {
            throw new RangeError("value must be percentage");
        }

        let lightness = this.lightness - value;
        if(lightness < 0) lightness = 0;

        return Color.hsl(this.hue, this.saturation, lightness, this.alpha);
    }

    public opacify(value: number): Color
    {
        if(value < 0 || value > 100) {
            throw new RangeError("value must be percentage");
        }

        let alpha = this.alpha || 100;
        alpha += value;

        if(alpha > 100) alpha = 100;

        return Color.hsl(this.hue, this.saturation, this.lightness, alpha);
    }

    public transparentize(value: number): Color
    {
        if(value < 0 || value > 100) {
            throw new RangeError("value must be percentage");
        }

        let alpha = this.alpha || 100;
        alpha -= value;

        if(alpha < 0) alpha = 0;

        return Color.hsl(this.hue, this.saturation, this.lightness, alpha);
    }


    public asHexCode(): string
    {
        return this.code;
    }

    public asRGB(): RGB
    {
        return {
            red: this.red,
            green: this.green,
            blue: this.blue,
            alpha: this.alpha
        };
    }

    public asCssRGB(): string
    {
        if(this.alpha === undefined) {
            return `rgb(${this.red} ${this.green} ${this.blue})`;
        } else {
            return `rgb(${this.red} ${this.green} ${this.blue} / ${this.alpha})`;
        }
    }

    public asHSL(): HSL
    {
        return {
            hue: this.hue,
            saturation: this.saturation,
            lightness: this.lightness,
            alpha: this.alpha   
        };
    }

    public asCssHSL(): string
    {
        if(this.alpha === undefined) {
            return `hsl(${this.hue} ${this.saturation} ${this.lightness})`;
        } else {
            return `hsl(${this.hue} ${this.saturation} ${this.lightness} / ${this.alpha})`;
        }
    }

    public asHWB(): HWB
    {
        return {
            hue: this.hue,
            whiteness: this.whiteness,
            blackness: this.blackness,
            alpha: this.alpha
        };
    }

    public asCssHWB(): string
    {
        if(this.alpha === undefined) {
            return `hwb(${this.hue} ${this.whiteness} ${this.blackness})`;
        } else {
            return `hwb(${this.hue} ${this.whiteness} ${this.blackness} / ${this.alpha})`;
        }
    }
}