import { InputBinding } from "@/core/input/commands/InputBinding";

export interface GameCommandConstructor {
	new (): GameCommand<any>;
}

/**
 * Family of commands a system knows how to run, in practice the abstract base
 * class they derive from. Used to narrow the command list of a state down to
 * the ones a single system is responsible for.
 */
export type GameCommandFamily<T extends GameCommand<any>> = abstract new (...args: never[]) => T;

/**
 * How a command behaves while its input stays held down.
 */
export interface RepeatPolicy {
	/** Milliseconds the input has to be held before the command repeats. */
	delay: number;
	/** Milliseconds between two repeats once it does. */
	rate: number;
}

/**
 * A named, rebindable input tied to an action. `execute` is the only thing a
 * driving system calls: it decides whether the player is asking for the
 * command right now - condition, held state, repeat timing - and if so runs
 * `action` with whatever the command needs to work on, shaped by TContext. A
 * command still neither knows the states it is allowed in nor how to find the
 * entities it works on: states list the commands they allow, systems poll
 * those lists and hand `execute` the context.
 */
export abstract class GameCommand<CommandContext = void> {
	private held: boolean;
	private remaining: number;

	constructor(
		protected binding: InputBinding,
		private readonly repeat?: RepeatPolicy
	) {
		this.held = false;
		this.remaining = 0;
	}

	/**
	 * Runs `action` if the command is triggered this update. A command must be
	 * executed at most once per update - two systems executing the same command
	 * would run its action twice.
	 */
	public execute(elapsed: number, frame: number, context: CommandContext): void {
		if (this.isTriggered(elapsed)) {
			this.action(elapsed, frame, context);
		}
	}

	protected abstract action(elapsed: number, frame: number, context: CommandContext): void;

	/**
	 * Whether the command should act in this update. Without a repeat policy
	 * that is true exactly once per press, however long the input is held. With
	 * one it is true again every `rate` milliseconds, once the input has been
	 * held for `delay` milliseconds.
	 */
	private isTriggered(elapsed: number): boolean {
		if (!this.binding.condition()) {
			this.held = false;
			return false;
		}

		if (!this.held) {
			this.held = true;
			this.remaining = this.repeat ? this.repeat.delay : 0;
			return true;
		}

		if (this.repeat === undefined) {
			return false;
		}

		this.remaining -= elapsed;

		if (this.remaining > 0) {
			return false;
		}

		this.remaining = this.repeat.rate;
		return true;
	}

	/**
	 * Forgets that the input was held. A state resets its commands when it
	 * becomes the active one, so that an input the player has been holding
	 * elsewhere counts as a fresh press here instead of a continued one.
	 */
	public reset() {
		this.held = false;
		this.remaining = 0;
	}

	public bindInput(binding: InputBinding) {
		this.binding = binding;
	}
}
