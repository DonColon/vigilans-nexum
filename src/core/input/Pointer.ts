import { Vector } from "core/math/Vector";


export interface Pointer
{
    identifier: number,
    button: number,
    current: Vector,
    previous: Vector,
    moved: boolean,
    pressed: boolean
}