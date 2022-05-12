export function fillArray<T>(size: number, value: T): T[]
{
    const array = new Array(size);
    return array.fill(value);
}

export function fillMatrix<T>(rows: number, columns: number, value: T): T[][]
{
    const matrix = new Array(rows);

    for(let row = 0; row < rows; row++) {
        matrix[row] = new Array(columns);
        matrix[row].fill(value);
    }

    return matrix;
}