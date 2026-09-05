import { GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState } from "@/core/input/InputState";
import { GamepadInput, GamepadInputType } from "@/core/input/gamepad/GamepadInput";
import { KeyboardInput, KeyboardInputType } from "@/core/input/keyboard/KeyboardInput";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { MapCommand, MapCommandContext } from "@/game/map/commands/MapCommand";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { GridSystem } from "@/game/map/systems/GridSystem";

/** Milliseconds a direction has to be held before the cursor starts repeating. */
const REPEAT_DELAY = 250;

/** Milliseconds between two steps while a direction stays held. */
const REPEAT_RATE = 45;

interface CursorInput {
	keys: KeyboardInputType[];
	buttons: GamepadInputType[];
}

function directionBinding(input: CursorInput): InputBinding {
	const bindings: InputBinding[] = [];

	for (const key of input.keys) {
		bindings.push(new InputBinding({ channel: InputChannel.KEYBOARD, input: key, state: InputState.JUST_PRESSED }));
		bindings.push(new InputBinding({ channel: InputChannel.KEYBOARD, input: key, state: InputState.STILL_PRESSED }));
	}

	for (const button of input.buttons) {
		bindings.push(new InputBinding({ channel: InputChannel.GAMEPAD, input: button, state: InputState.JUST_PRESSED }));
		bindings.push(new InputBinding({ channel: InputChannel.GAMEPAD, input: button, state: InputState.STILL_PRESSED }));
	}

	return new InputBinding({ bindings, and: false });
}

/**
 * Steps the map cursor one tile into a direction, as far as the map reaches.
 * Bound to both the pressed and the held state of its inputs: the first update
 * after a press moves right away, holding the direction repeats the way the
 * cursor of a Fire Emblem battle map does.
 */
export abstract class MoveCursorCommand extends MapCommand {
	constructor(
		private readonly direction: Vector2D,
		input: CursorInput
	) {
		super(directionBinding(input), { delay: REPEAT_DELAY, rate: REPEAT_RATE });
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
		super(new Vector2D(0, -1), {
			keys: [KeyboardInput.ARROW_UP, KeyboardInput.KEY_W],
			buttons: [GamepadInput.DPAD_UP, GamepadInput.LSTICK_UP]
		});
	}
}

export class MoveCursorDownCommand extends MoveCursorCommand {
	constructor() {
		super(new Vector2D(0, 1), {
			keys: [KeyboardInput.ARROW_DOWN, KeyboardInput.KEY_S],
			buttons: [GamepadInput.DPAD_DOWN, GamepadInput.LSTICK_DOWN]
		});
	}
}

export class MoveCursorLeftCommand extends MoveCursorCommand {
	constructor() {
		super(new Vector2D(-1, 0), {
			keys: [KeyboardInput.ARROW_LEFT, KeyboardInput.KEY_A],
			buttons: [GamepadInput.DPAD_LEFT, GamepadInput.LSTICK_LEFT]
		});
	}
}

export class MoveCursorRightCommand extends MoveCursorCommand {
	constructor() {
		super(new Vector2D(1, 0), {
			keys: [KeyboardInput.ARROW_RIGHT, KeyboardInput.KEY_D],
			buttons: [GamepadInput.DPAD_RIGHT, GamepadInput.LSTICK_RIGHT]
		});
	}
}

/**
 * The four directions as one list, so that the feature registering them and
 * the state allowing them stay in sync.
 */
export const moveCursorCommands: GameCommandConstructor[] = [MoveCursorUpCommand, MoveCursorDownCommand, MoveCursorLeftCommand, MoveCursorRightCommand];
