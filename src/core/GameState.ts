import { GameCoreService } from "@/core/service/GameCoreService";
import type { GameCommand, GameCommandConstructor, GameCommandFamily } from "@/core/input/commands/GameCommand";
import type { InputDevice } from "@/core/input/InputDevice";

export type GameStateConstructor = (new () => GameState) & { readonly type: string };

export abstract class GameState {
	/**
	 * Stable identifier of this state. Savegames store the active states by
	 * this id, so it must not be derived from the class name - see the note on
	 * Component.type. Every concrete state has to declare its own.
	 */
	public static readonly type: string = "state";

	// Resolved by name rather than by class: states sit below the input layer
	// and pulling it in would put GameState into an import cycle with it.
	@GameCoreService("InputDevice")
	private inputDevice!: InputDevice;

	/**
	 * Commands the player may trigger while this state is the active one. The
	 * state only declares which ones are allowed here - the InputDevice owns
	 * the instances, and the system polling them decides what they act on.
	 */
	protected commands: GameCommandConstructor[] = [];

	/**
	 * Commands of this state, narrowed to the family a system is responsible
	 * for. A system that owns the map cursor asks for MapCommands and never
	 * sees the ones belonging to somebody else.
	 */
	public getCommands<T extends GameCommand<any>>(family?: GameCommandFamily<T>): T[] {
		const commands = this.commands.map((commandType) => this.inputDevice.getCommand(commandType));

		if (family === undefined) {
			return commands as T[];
		}

		return commands.filter((command) => command instanceof family) as T[];
	}

	/**
	 * Forgets held inputs on every command of this state. Called when the state
	 * becomes the active one, so that an input held while another state was on
	 * top does not come through as a continued press here.
	 */
	protected resetCommands() {
		for (const command of this.getCommands()) {
			command.reset();
		}
	}

	public abstract onEnter(): void;
	public abstract onExit(): void;
	public abstract onPause(): void;
	public abstract onResume(): void;
}
