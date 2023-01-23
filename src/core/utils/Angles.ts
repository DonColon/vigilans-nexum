export namespace Angles
{
    export function toDegrees(radians: number): number
    {
        return (radians * 180 / Math.PI + 360) % 360;
    }
    
    export function toRadians(degrees: number): number
    {
        return degrees * Math.PI / 180
    }
}