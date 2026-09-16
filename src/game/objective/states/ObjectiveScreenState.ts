import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { objectiveScreenCommands } from "@/game/objective/commands/ObjectiveScreenCommands";
import { ObjectiveScreenComponent } from "@/game/objective/components/ObjectiveScreenComponent";

/**
 * The objective screen, pushed on top of the map like a menu and freezing it.
 * There is nothing to request: what it shows is read live while it is up. It
 * owns the screen entity; ObjectiveScreenSystem runs the close command and
 * pops the state, ObjectiveScreenRenderSystem draws the readout.
 */
export class ObjectiveScreenState extends GameState {
	public static readonly type = "objective-screen";

	protected commands = [...objectiveScreenCommands];

	@GameCoreService(World)
	private world!: World;

	private screen: Entity | null = null;

	public onEnter(): void {
		this.screen = this.world.createEntity();
		this.screen.addComponent(ObjectiveScreenComponent, { closed: false });

		this.resetCommands();
	}

	public onExit(): void {
		if (this.screen && this.world.hasEntity(this.screen.getID())) {
			this.world.unregisterEntity(this.screen);
		}

		this.screen = null;
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getScreen(): Entity | null {
		return this.screen;
	}
}
