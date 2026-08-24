export type Tuple<Type, Length extends number = 1, Cache extends Type[] = [Type]> = Cache extends { length: Length } ? Cache : Tuple<Type, Length, [...Cache, Type]>;
export type Matrix<Type, Rows extends number, Columns extends number> = Tuple<Tuple<Type, Columns>, Rows>;

export function fillTuple<Type, Length extends number>(value: Type, length: Length): Tuple<Type, Length> {
	const array = new Array<Type>(length);
	return array.fill(value) as Tuple<Type, Length>;
}

export function fillMatrix<Type, Rows extends number, Columns extends number>(value: Type, rows: Rows, columns: Columns): Matrix<Type, Rows, Columns> {
	const matrix = new Array<Type[]>(rows);

	for (let row = 0; row < rows; row++) {
		matrix[row] = fillTuple(value, columns);
	}

	return matrix as Matrix<Type, Rows, Columns>;
}

export function binaryInsert<T>(array: T[], item: T, compare: (a: T, b: T) => number): void {
	let left = 0;
	let right = array.length;

	// Binary search for insertion point
	while (left < right) {
		const mid = Math.floor((left + right) / 2);

		if (compare(array[mid], item) < 0) {
			left = mid + 1;
		} else {
			right = mid;
		}
	}

	// Insert at the found position
	array.splice(left, 0, item);
}
