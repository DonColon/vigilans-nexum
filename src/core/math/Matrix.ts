import { fillMatrix } from "core/utils/Arrays";
import { Vector } from "./Vector";


export type MatrixRow = [number, number, number];
export type MatrixColumn = [number, number, number];
export type MatrixLike = [MatrixRow, MatrixRow, MatrixRow];


export class Matrix
{
    private values: MatrixLike;


    constructor(values: MatrixLike)
    {
        this.values = values;
    }

    public static fromVectors(start: Vector, center: Vector, end: Vector): Matrix
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

    public static determinant(values: number[][]): number
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

    public toArray(): MatrixLike
    {
        return this.values;
    }


    public getRow(index: number): MatrixRow
    {
        return this.values[index];
    }

    public setRow(index: number, row: MatrixRow)
    {
        this.values[index] = row;
    }

    public getColumn(index: number): MatrixColumn
    {
        return [
            this.values[0][index],
            this.values[1][index],
            this.values[2][index]
        ];
    }

    public setColumn(index: number, column: MatrixColumn)
    {
        this.values[0][index] = column[0];
        this.values[1][index] = column[1];
        this.values[2][index] = column[2];
    }

    public getValue(row: number, column: number): number
    {
        return this.values[row][column];
    }

    public setValue(row: number, column: number, value: number)
    {
        this.values[row][column] = value;
    }
}