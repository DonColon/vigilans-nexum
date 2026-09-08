import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputSet, pressedOrHeld } from "@/core/input/commands/InputBindings";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { DOWN, LEFT, RIGHT, UP } from "@/game/input/Controls";
import { MapCommand, MapCommandContext } from "@/game/map/commands/MapCommand";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { GridSystem } from "@/game/map/systems/GridSystem";

/** Milliseconds a direction has to be held before the cursor starts repeating. */
const REPEAT_DELAY = 250;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 45;

/**
 * Steps the map cursor one tile into a direction, as far as the map reaches.
 * Bound to both the pressed and the held state of its inputs: the first update
 * after a press moves right away, holding the direction repeats the way the
 * cursor of a Fire Emblem battle map does.
 */
export abstract class MoveCursorCommand extends MapCommand {
	constructor(
		private readonly direction: Vector2D,
		input: InputSet
	) {
		super(pressedOrHeld(input), { delay: REPEAT_DELAY, rate: REPEAT_RATE });
	}

	protected action(_elapsed: number, _frame: number, { map, cursor }: MapCommandContext): void {
		const grid = map.getComponent(GridComponent).read();
		const component = cursor.getComponent(GridPositionComponent);
		const { column, row } = component.read();

		const next = new Vector2D(column, row).add(this.direction);

		if (GridSystem.containsTile(grid, next.x, next.y)) {
			component.update({ column: next.x, row: next.y });
		}
	}

	public getDirection(): Vector2D {
		return this.direction;
	}
}

export class MoveCursorUpCommand extends MoveCursorCommand {
	constructor() {
		super(new Vector2D(0, -1), UP);
	}
}

export class MoveCursorDownCommand extends MoveCursorCommand {
	constructor() {
		super(new Vector2D(0, 1), DOWN);
	}
}

export class MoveCursorLeftCommand extends MoveCursorCommand {
	constructor() {
		super(new Vector2D(-1, 0), LEFT);
	}
}

export class MoveCursorRightCommand extends MoveCursorCommand {
	constructor() {
		super(new Vector2D(1, 0), RIGHT);
	}
}

/**
 * The four directions as one list, so that the feature registering them and
 * the state allowing them stay in sync.
 */
export const moveCursorCommands: GameCommandConstructor[] = [MoveCursorUpCommand, MoveCursorDownCommand, MoveCursorLeftCommand, MoveCursorRightCommand];
