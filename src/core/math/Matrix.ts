import { fillMatrix } from "core/utils/Arrays";
import { toRadians } from "core/utils/Maths";
import { Vector } from "./Vector";


export type MatrixRow = [number, number, number];
export type MatrixColumn = [number, number, number];
export type MatrixLike = [MatrixRow, MatrixRow, MatrixRow];


export class Matrix
{
    private values: MatrixLike;


    constructor(values: number[][])
    {
        this.values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let row = 0; row < this.values.length; row++) {
            for(let column = 0; column < this.values[row].length; column++) {
                if(values[row][column] === undefined) return;
                this.values[row][column] = values[row][column];
            }
        }
    }

    public static ofRowVector(vector: Vector): Matrix
    {
        return new Matrix([
            [vector.x, vector.y, vector.z]
        ]);
    }

    public static ofColumnVector(vector: Vector): Matrix
    {
        return new Matrix([
            [vector.x],
            [vector.y],
            [vector.z]
        ]);
    }

    public static ofRowVectors(start: Vector, center: Vector, end: Vector): Matrix
    {
        return new Matrix([
            [start.x, start.y, start.z],
            [center.x, center.y, center.z],
            [end.x, end.y, end.z]
        ]);
    }

    public static ofColumnVectors(start: Vector, center: Vector, end: Vector): Matrix
    {
        return new Matrix([
            [start.x, center.x, end.x],
            [start.y, center.y, end.y],
            [start.z, center.z, end.z]
        ]);
    }

    
    public static identity(): Matrix
    {
        const values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let index = 0; index < values.length; index++) {
            values[index][index] = 1;
        }

        return new Matrix(values);
    }

    private static determinant(values: number[][]): number
    {
        if(values.length === 1) {
            return values[0][0];
        }
        else if(values.length === 2) {
            return values[0][0] * values[1][1] - values[0][1] * values[1][0];
        }

        return values[0].reduce((previous, current, i) => 
            previous + (-1) ** (i + 2) * current * Matrix.determinant(values.slice(1).map(matrix => matrix.filter((_, k) => i != k))), 0);
    }


    public static translate(vector: Vector, x: number, y: number): Vector
    {
        const other = Matrix.ofColumnVector(vector);

        const transformation = new Matrix([
            [1, 0, x],
            [0, 1, y],
            [0, 0, 1]
        ]);

        return transformation.product(other).asColumnVector();
    }

    public static scale(vector: Vector, width: number, height: number): Vector
    {
        const other = Matrix.ofColumnVector(vector);

        const transformation = new Matrix([
            [width, 0, 0],
            [0, height, 0],
            [0, 0, 1]
        ]);

        return transformation.product(other).asColumnVector();
    }

    public static rotate(vector: Vector, angle: number, clockwise: boolean = false): Vector
    {
        const other = Matrix.ofColumnVector(vector);
        const radian = toRadians(angle);

        const transformation = new Matrix([
            [Math.cos(radian), Math.sin(radian), 0],
            [Math.sin(radian), Math.cos(radian), 0],
            [0, 0, 1]
        ]);

        if(clockwise) {
            transformation.values[1][0] *= -1;
        } else {
            transformation.values[0][1] *= -1;
        }

        return transformation.product(other).asColumnVector();
    }

    public static shear(vector: Vector, angle: number): Vector
    {
        const other = Matrix.ofColumnVector(vector);
        const radian = toRadians(angle);

        const transformation = new Matrix([
            [1, Math.tan(radian), 0],
            [Math.tan(radian), 1, 0],
            [0, 0, 1]
        ]);

        return transformation.product(other).asColumnVector();
    }

    public static shearX(vector: Vector, angle: number): Vector
    {
        const other = Matrix.ofColumnVector(vector);
        const radian = toRadians(angle);

        const transformation = new Matrix([
            [1, Math.tan(radian), 0],
            [0, 1, 0],
            [0, 0, 1]
        ]);

        return transformation.product(other).asColumnVector();
    }

    public static shearY(vector: Vector, angle: number): Vector
    {
        const other = Matrix.ofColumnVector(vector);
        const radian = toRadians(angle);

        const transformation = new Matrix([
            [1, 0, 0],
            [Math.tan(radian), 0, 0],
            [0, 0, 1]
        ]);

        return transformation.product(other).asColumnVector();
    }

    public static reflect(vector: Vector): Vector
    {
        const other = Matrix.ofColumnVector(vector);

        const transformation = new Matrix([
            [-1, 0, 0],
            [0, -1, 0],
            [0, 0, -1]
        ]);

        return transformation.product(other).asColumnVector();
    }

    public static reflectX(vector: Vector): Vector
    {
        const other = Matrix.ofColumnVector(vector);

        const transformation = new Matrix([
            [-1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ]);

        return transformation.product(other).asColumnVector();
    }

    public static reflectY(vector: Vector): Vector
    {
        const other = Matrix.ofColumnVector(vector);

        const transformation = new Matrix([
            [1, 0, 0],
            [0, -1, 0],
            [0, 0, 1]
        ]);

        return transformation.product(other).asColumnVector();
    }

    public static reflectZ(vector: Vector): Vector
    {
        const other = Matrix.ofColumnVector(vector);

        const transformation = new Matrix([
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, -1]
        ]);

        return transformation.product(other).asColumnVector();
    }


    public add(other: Matrix): Matrix
    {
        const values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            for(let column = 0; column < values[row].length; column++) {
                values[row][column] = this.values[row][column] + other.values[row][column];
            }
        }

        return new Matrix(values);
    }

    public addRow(from: number, to: number): Matrix
    {
        const values = [...this.values] as MatrixLike;

        for(let column = 0; column < values[to].length; column++) {
            values[to][column] += values[from][column];
        }

        return new Matrix(values);
    }

    public addColumn(from: number, to: number): Matrix
    {
        const values = [...this.values] as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            values[row][to] += values[row][from];
        }

        return new Matrix(values);
    }

    public subtract(other: Matrix): Matrix
    {
        const values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            for(let column = 0; column < values[row].length; column++) {
                values[row][column] = this.values[row][column] - other.values[row][column];
            }
        }

        return new Matrix(values);
    }

    public subtractRow(from: number, to: number): Matrix
    {
        const values = [...this.values] as MatrixLike;

        for(let column = 0; column < values[to].length; column++) {
            values[to][column] -= values[from][column];
        }

        return new Matrix(values);
    }

    public subtractColumn(from: number, to: number): Matrix
    {
        const values = [...this.values] as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            values[row][to] -= values[row][from];
        }

        return new Matrix(values);
    }

    public multiply(scalar: number): Matrix
    {
        const values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            for(let column = 0; column < values[row].length; column++) {
                values[row][column] = this.values[row][column] * scalar;
            }
        }

        return new Matrix(values);
    }

    public multiplyRow(scalar: number, to: number)
    {
        const values = [...this.values] as MatrixLike;

        for(let column = 0; column < values[to].length; column++) {
            values[to][column] *= scalar;
        }

        return new Matrix(values);
    }

    public multiplyColumn(scalar: number, to: number): Matrix
    {
        const values = [...this.values] as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            values[row][to] *= scalar;
        }

        return new Matrix(values);
    }

    public divide(scalar: number): Matrix
    {
        const values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            for(let column = 0; column < values[row].length; column++) {
                values[row][column] = this.values[row][column] / scalar;
            }
        }

        return new Matrix(values);
    }
    
    public divideRow(scalar: number, to: number)
    {
        const values = [...this.values] as MatrixLike;

        for(let column = 0; column < values[to].length; column++) {
            values[to][column] /= scalar;
        }

        return new Matrix(values);
    }

    public divideColumn(scalar: number, to: number): Matrix
    {
        const values = [...this.values] as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            values[row][to] /= scalar;
        }

        return new Matrix(values);
    }


    public switchRows(from: number, to: number): Matrix
    {
        const values = [...this.values] as MatrixLike;

        const temp = values[to];
        values[to] = values[from];
        values[from] = temp;

        return new Matrix(values);
    }

    public switchColumns(from: number, to: number): Matrix
    {
        const values = [...this.values] as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            const temp = values[row][to];
            values[row][to] = values[row][from];
            values[row][from] = temp;
        }

        return new Matrix(values);
    }


    public product(other: Matrix): Matrix
    {
        const values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let row = 0; row < this.values.length; row++) {
            for(let column = 0; column < other.values[0].length; column++) {
                for(let index = 0; index < this.values[row].length; index++) {
                    values[row][column] += this.values[row][index] * other.values[index][column];
                }
            }
        }

        return new Matrix(values);
    }

    public transpose(): Matrix
    {
        const values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            for(let column = 0; column < values[row].length; column++) {
                values[column][row] = this.values[row][column];
            }
        }

        return new Matrix(values);
    }


    public determinant(): number
    {
        return Matrix.determinant(this.values);
    }

    public trace(): number
    {
        let trace = 0;

        for(let index = 0; index < this.values.length; index++) {
            trace += this.values[index][index];
        }

        return trace;
    }

    public inverse(): Matrix
    {
        return this.adjoint().divide(this.determinant());
    }

    public adjoint(): Matrix
    {
        return this.cofactor().transpose();
    }

    public cofactor(): Matrix
    {
        const values = fillMatrix(3, 3, 0) as MatrixLike;

        for(let row = 0; row < values.length; row++) {
            for(let column = 0; column < values[row].length; column++) {
                const subMatrix = this.values.filter((_, i) => i != row)
                        .map((row) => row.filter((_, k) => k != column));

                values[row][column] = (-1) ** (row + column) * Matrix.determinant(subMatrix);
            }
        }

        return new Matrix(values);
    }


    public equals(other: Matrix): boolean
    {
        let equals = true;

        for(let row = 0; row < this.values.length; row++) {
            for(let column = 0; this.values[row].length; column++) {
                if(this.values[row][column] !== other.values[row][column]) {
                    return false;
                }
            }
        }

        return equals;
    }

    public asArray(): MatrixLike
    {
        return [...this.values];
    }

    public asRowVector(row: number = 0): Vector
    {
        return new Vector(this.values[row][0], this.values[row][1], this.values[row][2]);
    }

    public asColumnVector(column: number = 0): Vector
    {
        return new Vector(this.values[0][column], this.values[1][column], this.values[2][column]);
    }
}