export interface HexCode
{
    code: string
}

export interface RGB
{
    red: number,
    green: number,
    blue: number,
    alpha?: number
}

export interface HSL
{
    hue: number,
    saturation: number,
    lightness: number,
    alpha?: number
}

export interface HWB
{
    hue: number,
    whiteness: number,
    blackness: number,
    alpha?: number
}


export namespace ColorSpaces
{
    export function hex2rgb(code: string): RGB
    {
        const hexCode = code.substring(1);

        if(hexCode.length === 3) {
            const red = parseInt(hexCode[0] + hexCode[0], 16);
            const green = parseInt(hexCode[1] + hexCode[1], 16);
            const blue = parseInt(hexCode[2] + hexCode[2], 16);

            return { red, green, blue };
        }
        else if(hexCode.length === 4) {
            const red = parseInt(hexCode[0] + hexCode[0], 16);
            const green = parseInt(hexCode[1] + hexCode[1], 16);
            const blue = parseInt(hexCode[2] + hexCode[2], 16);

            let alpha = parseInt(hexCode[3] + hexCode[3], 16);
            alpha = +(alpha / 255).toFixed(3);

            return { red, green, blue, alpha };
        }
        else if(hexCode.length === 6) {
            const red = parseInt(hexCode[0]+ hexCode[1], 16);
            const green = parseInt(hexCode[2] + hexCode[3], 16);
            const blue = parseInt(hexCode[4] + hexCode[5], 16);

            return { red, green, blue };
        }
        else if(hexCode.length === 8) {
            const red = parseInt(hexCode[0]+ hexCode[1], 16);
            const green = parseInt(hexCode[2] + hexCode[3], 16);
            const blue = parseInt(hexCode[4] + hexCode[5], 16);

            let alpha = parseInt(hexCode[6] + hexCode[7], 16);
            alpha = +(alpha / 255).toFixed(3);

            return { red, green, blue, alpha };
        }

        return {} as RGB;
    }

    export function hex2hsl(code: string): HSL
    {
        const { red, green, blue, alpha } = hex2rgb(code);
        return rgb2hsl(red, green, blue, alpha);
    }

    export function hex2hwb(code: string): HWB
    {
        const { hue, saturation, lightness, alpha } = hex2hsl(code);
        return hsl2hwb(hue, saturation, lightness, alpha);
    }

    export function rgb2hex(red: number, green: number, blue: number, alpha?: number): string
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

    export function rgb2hsl(red: number, green: number, blue: number, alpha?: number): HSL
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

    export function rgb2hwb(red: number, green: number, blue: number, alpha?: number): HWB
    {
        const { hue, saturation, lightness } = rgb2hsl(red, green, blue, alpha);
        return hsl2hwb(hue, saturation, lightness, alpha);
    }

    export function hsl2hex(hue: number, saturation: number, lightness: number, alpha?: number): string
    {
        const { red, green, blue } = hsl2rgb(hue, saturation, lightness, alpha);
        return rgb2hex(red, green, blue, alpha);
    }

    export function hsl2rgb(hue: number, saturation: number, lightness: number, alpha?: number): RGB
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

    export function hsl2hwb(hue: number, saturation: number, lightness: number, alpha?: number): HWB
    {
        const b = (2 * lightness + saturation * (1 - Math.abs(2 * lightness - 1))) / 2;
        const s = 2 * (b - lightness) / b;

        const whiteness = (1 - s) * b;
        const blackness = 1 - b;

        return { hue, whiteness, blackness, alpha };
    }

    export function hwb2hex(hue: number, whiteness: number, blackness: number, alpha?: number): string
    {
        const { red, green, blue } = hwb2rgb(hue, whiteness, blackness, alpha);
        return rgb2hex(red, green, blue, alpha);
    }

    export function hwb2rgb(hue: number, whiteness: number, blackness: number, alpha?: number): RGB
    {
        const { saturation, lightness } = hwb2hsl(hue, whiteness, blackness, alpha);
        return hsl2rgb(hue, saturation, lightness, alpha);
    }

    export function hwb2hsl(hue: number, whiteness: number, blackness: number, alpha?: number): HSL
    {
        const s = 1 - (whiteness / (1 - blackness));
        const b = 1 - blackness;

        const lightness = 0.5 * b * (2 - s);
        const saturation = b * s / (1 - Math.abs(2 * lightness - 1));

        return { hue, saturation, lightness, alpha };
    }
}