import { Vector } from "math/Vector";


export interface Pointer
{
    identifier: number,
    current: Vector,
    previous: Vector,
    moved: boolean,
    pressed: boolean
}