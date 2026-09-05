import { QueryList } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { GlobalCommand, GlobalCommandConstructor } from "@/core/input/commands/GlobalCommand";
import { InputDevice } from "@/core/input/InputDevice";
import { GameCoreService } from "@/core/service/GameCoreService";

/**
 * Drives the commands that are bound to no state at all. Everything that only
 * applies while the game shows a certain screen is polled by the system owning
 * the entities it acts on, through the command list of the active state; what
 * is left over are the few inputs that work everywhere, and this is where they
 * run.
 *
 * A game declares them by extending this system:
 *
 * ```ts
 * export class GlobalCommandSystem extends CommandSystem {
 *     protected commands = [ToggleFullscreenCommand, TakeScreenshotCommand];
 * }
 * ```
 */
export abstract class CommandSystem extends UpdateSystem {
	protected queries!: QueryList;

	/** Types of the commands this system drives, registered on the InputDevice. */
	protected abstract commands: GlobalCommandConstructor[];

	@GameCoreService(InputDevice)
	private inputDevice!: InputDevice;

	public initialize(): void {
		this.queries = {};
	}

	public execute(elapsed: number, frame: number): void {
		for (const commandType of this.commands) {
			const command = this.inputDevice.getCommand(commandType) as GlobalCommand;

			command.execute(elapsed, frame, undefined);
		}
	}
}
