import { Circle } from "./Circle";
import { Line } from "./Line";
import { Polygon } from "./Polygon";
import { Rectangle } from "./Rectangle";


export type Shape = (Line | Circle | Rectangle | Polygon);