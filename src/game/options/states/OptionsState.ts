import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { optionsCommands } from "@/game/options/commands/OptionsCommands";
import { OptionsComponent } from "@/game/options/components/OptionsComponent";

export interface OptionsRequest {
	/** Ids of the settings to list, in the order they should be drawn. */
	optionIds: string[];
	/** Row to open on. Defaults to the first. */
	selectedIndex?: number;
}

/**
 * The options screen, pushed on top of the map like a menu and freezing it.
 * OptionsSystem runs the commands and pops the state once the player closes it;
 * OptionsRenderSystem draws the rows.
 *
 * A change takes effect the moment it is made, not when the screen closes -
 * switching language relabels the screen under the cursor, which is the clearest
 * confirmation that the setting did anything.
 */
export class OptionsState extends GameState {
	public static readonly type = "options";

	protected commands = [...optionsCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: OptionsRequest | null = null;
	private options: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: OptionsRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		const optionIds = request ? [...request.optionIds] : [];
		const selectedIndex = Math.min(Math.max(request?.selectedIndex ?? 0, 0), Math.max(0, optionIds.length - 1));

		this.options = this.world.createEntity();
		this.options.addComponent(OptionsComponent, { optionIds, selectedIndex, closed: false });

		this.resetCommands();
	}

	public onExit(): void {
		if (this.options) {
			this.world.unregisterEntity(this.options);
			this.options = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getOptions(): Entity | null {
		return this.options;
	}
}
