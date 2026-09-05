import { test, expect, suite, beforeEach } from "vitest";
import { GameCommand } from "@/core/input/commands/GameCommand";
import { InputBinding } from "@/core/input/commands/InputBinding";
import { InputChannel } from "@/core/input/InputChannel";
import { InputState } from "@/core/input/InputState";
import { KeyboardInput } from "@/core/input/keyboard/KeyboardInput";

suite("GameCommand Test Suite", () => {
	/**
	 * Binding whose condition is switched by hand, so a command can be tested
	 * without an input device behind it.
	 */
	class TestBinding extends InputBinding {
		public pressed: boolean;

		constructor() {
			super({ channel: InputChannel.KEYBOARD, input: KeyboardInput.KEY_A, state: InputState.JUST_PRESSED });
			this.pressed = false;
		}

		public condition(): boolean {
			return this.pressed;
		}
	}

	class TapCommand extends GameCommand {
		public runs: number;

		constructor(binding: InputBinding) {
			super(binding);
			this.runs = 0;
		}

		protected action(): void {
			this.runs++;
		}
	}

	class RepeatCommand extends GameCommand {
		public runs: number;

		constructor(binding: InputBinding) {
			super(binding, { delay: 250, rate: 90 });
			this.runs = 0;
		}

		protected action(): void {
			this.runs++;
		}
	}

	/**
	 * Runs the command for this update and reports whether its action fired,
	 * the way `isTriggered` used to report it directly before execute() folded
	 * the check and the action into one call.
	 */
	function triggered(command: TapCommand | RepeatCommand, elapsed: number): boolean {
		const before = command.runs;
		command.execute(elapsed, 0, undefined);
		return command.runs > before;
	}

	let binding: TestBinding;

	beforeEach(() => {
		binding = new TestBinding();
		binding.pressed = true;
	});

	test("Command without a repeat policy triggers once per press", () => {
		const command = new TapCommand(binding);

		expect(triggered(command, 16)).toBe(true);
		expect(triggered(command, 16)).toBe(false);
		expect(triggered(command, 1000)).toBe(false);
	});

	test("Command triggers again after the input was released", () => {
		const command = new TapCommand(binding);

		expect(triggered(command, 16)).toBe(true);

		binding.pressed = false;
		expect(triggered(command, 16)).toBe(false);

		binding.pressed = true;
		expect(triggered(command, 16)).toBe(true);
	});

	test("Released input never triggers", () => {
		const command = new RepeatCommand(binding);
		binding.pressed = false;

		expect(triggered(command, 16)).toBe(false);
		expect(triggered(command, 1000)).toBe(false);
	});

	test("Held input repeats after the delay and then at the rate", () => {
		const command = new RepeatCommand(binding);

		expect(triggered(command, 16)).toBe(true);

		// Still inside the delay a held input waits out before repeating.
		expect(triggered(command, 200)).toBe(false);
		expect(triggered(command, 60)).toBe(true);

		// From here on it repeats at the faster rate.
		expect(triggered(command, 50)).toBe(false);
		expect(triggered(command, 50)).toBe(true);
	});

	test("Repeat starts over with the delay on the next press", () => {
		const command = new RepeatCommand(binding);

		triggered(command, 16);
		triggered(command, 300);

		binding.pressed = false;
		triggered(command, 16);

		binding.pressed = true;
		expect(triggered(command, 16)).toBe(true);
		expect(triggered(command, 200)).toBe(false);
	});

	test("Reset makes a held input count as a fresh press", () => {
		const command = new RepeatCommand(binding);

		expect(triggered(command, 16)).toBe(true);
		expect(triggered(command, 16)).toBe(false);

		command.reset();

		expect(triggered(command, 16)).toBe(true);
		expect(triggered(command, 200)).toBe(false);
	});

	test("Rebinding the input changes what triggers the command", () => {
		const command = new TapCommand(binding);
		const other = new TestBinding();

		command.bindInput(other);

		expect(triggered(command, 16)).toBe(false);

		other.pressed = true;
		expect(triggered(command, 16)).toBe(true);
	});
});
