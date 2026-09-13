import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { experienceCommands } from "@/game/experience/commands/ExperienceCommands";
import { ExperienceComponent, ExperienceData } from "@/game/experience/components/ExperienceComponent";

/**
 * On the stack while a unit's experience is shown, so the map cursor and every
 * command freeze the way they do for a fight; the only input it allows is the
 * press that hurries the level-up panel along and takes it down. It owns
 * nothing but the display entity; `ExperienceSystem` runs the clock and pops
 * the state when the showing is done.
 */
export class ExperienceState extends GameState {
	public static readonly type = "experience";

	protected commands = [...experienceCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: ExperienceData | null = null;
	private display: Entity | null = null;

	public request(data: ExperienceData): void {
		this.pending = data;
	}

	public onEnter(): void {
		if (this.pending === null) {
			return;
		}

		this.display = this.world.createEntity();
		this.display.addComponent(ExperienceComponent, this.pending);
		this.pending = null;

		this.resetCommands();
	}

	public onExit(): void {
		if (this.display && this.world.hasEntity(this.display.getID())) {
			this.world.unregisterEntity(this.display);
		}

		this.display = null;
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getDisplay(): Entity | null {
		return this.display;
	}
}
