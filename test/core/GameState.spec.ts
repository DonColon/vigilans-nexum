import { test, expect, suite } from "vitest";
import { GameState } from "@/core/GameState";
import { Display } from "@/core/graphics/Display";
import { GameCommand } from "@/core/input/commands/GameCommand";
import { GlobalCommand } from "@/core/input/commands/GlobalCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputDevice } from "@/core/input/InputDevice";
import { InputState } from "@/core/input/InputState";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";

suite("GameState Command List Test Suite", () => {
	const binding = () => new InputBinding({ channel: InputChannel.KEYBOARD, input: KeyboardInput.KEY_A, state: InputState.JUST_PRESSED });

	abstract class MapCommand extends GameCommand {
		public runs: number;

		constructor() {
			super(binding());
			this.runs = 0;
		}

		protected action(): void {
			this.runs++;
		}
	}

	/**
	 * Runs the command for this update and reports whether its action fired,
	 * now that execute() folds the trigger check and the action into one call.
	 */
	function triggered(command: MapCommand, elapsed: number): boolean {
		const before = command.runs;
		command.execute(elapsed, 0, undefined);
		return command.runs > before;
	}

	class MoveCommand extends MapCommand {}
	class ConfirmCommand extends MapCommand {}

	class FullscreenCommand extends GlobalCommand {
		constructor() {
			super(binding());
		}

		protected action(): void {}
	}

	class MapState extends GameState {
		public static readonly type = "map";

		protected commands = [MoveCommand, ConfirmCommand];

		onEnter() {}
		onExit() {}
		onPause() {}
		onResume() {}

		public forget() {
			this.resetCommands();
		}
	}

	class MenuState extends GameState {
		public static readonly type = "menu";

		onEnter() {}
		onExit() {}
		onPause() {}
		onResume() {}
	}

	// The mouse device reads the viewport off the display, so an input device
	// can only be built once there is one.
	new Display("game-state-test", { dimension: { width: 320, height: 240 } });

	const inputDevice = new InputDevice({ gamepad: { axisThreshold: 0.5, deadZone: 0.1 } });

	inputDevice.registerCommand(MoveCommand);
	inputDevice.registerCommand(ConfirmCommand);
	inputDevice.registerCommand(FullscreenCommand);

	test("State hands out the command instances the input device owns", () => {
		const state = new MapState();
		const commands = state.getCommands();

		expect(commands).toHaveLength(2);
		expect(commands[0]).toBe(inputDevice.getCommand(MoveCommand));
		expect(commands[1]).toBe(inputDevice.getCommand(ConfirmCommand));
	});

	test("Command list is narrowed to the family a system asks for", () => {
		const state = new MapState();

		expect(state.getCommands(MapCommand)).toHaveLength(2);
		expect(state.getCommands(MoveCommand)).toStrictEqual([inputDevice.getCommand(MoveCommand)]);
		expect(state.getCommands(GlobalCommand)).toStrictEqual([]);
	});

	test("State without commands allows nothing", () => {
		const state = new MenuState();

		expect(state.getCommands()).toStrictEqual([]);
		expect(state.getCommands(MapCommand)).toStrictEqual([]);
	});

	test("Resetting forgets inputs held while the state was not active", () => {
		const state = new MapState();
		const command = state.getCommands(MoveCommand)[0];

		const held = new InputBinding({ bindings: [], and: false });
		held.condition = () => true;
		command.bindInput(held);

		expect(triggered(command, 16)).toBe(true);
		expect(triggered(command, 16)).toBe(false);

		state.forget();

		expect(triggered(command, 16)).toBe(true);
	});
});
