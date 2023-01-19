export type SwipeInputType = typeof SwipeInput[keyof typeof SwipeInput];


export const SwipeInput = {

    RIGHT:  8,
    RIGHT_UP:  9,
    UP:  10,
    LEFT_UP:  11,
    LEFT:  12,
    LEFT_DOWN:  13,
    DOWN:  14,
    RIGHT_DOWN:  15,

} as const;


export namespace SwipeInputs
{
    export function ofAngle(angle: number): SwipeInputType
    {
        if(angle >= 0 && angle <= 22.5 || angle > 337.5 && angle <= 360) {
            return SwipeInput.RIGHT;
        }
        else if(angle > 22.5 && angle <= 67.5) {
            return SwipeInput.RIGHT_UP;
        }
        else if(angle > 67.5 && angle <= 112.5) {
            return SwipeInput.UP;
        }
        else if(angle > 112.5 && angle <= 157.5) {
            return SwipeInput.LEFT_UP;
        }
        else if(angle > 157.5 && angle <= 202.5) {
            return SwipeInput.LEFT;
        }
        else if(angle > 202.5 && angle <= 247.5) {
            return SwipeInput.LEFT_DOWN;
        }
        else if(angle > 247.5 && angle <= 292.5) {
            return SwipeInput.DOWN;
        }
        else if(angle > 292.5 && angle <= 337.5) {
            return SwipeInput.RIGHT_DOWN;
        }
        else {
            throw new TypeError("Enum value does not exist");
        }
    }
}