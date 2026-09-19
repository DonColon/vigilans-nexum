import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { EventBus } from "@/core/events/EventBus";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { TitleComponent } from "@/game/campaign/components/TitleComponent";

/**
 * The title screen - where the game starts, and where a finished run comes
 * back to. There is no map under it and it allows no commands of its own: the
 * one thing to do here is choose from the title menu, which is a MenuState
 * pushed over this one by [[CampaignFlowSystem]] once the store has said
 * whether there is a run to continue.
 *
 * Entering it announces `title:opened`; the flow asks the store then. The
 * state owns the screen entity and takes it down on exit.
 */
export class TitleState extends GameState {
	public static readonly type = "title";

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(EventBus)
	private events!: EventBus;

	private screen: Entity | null = null;

	public onEnter(): void {
		this.screen = this.world.createEntity();
		this.screen.addComponent(TitleComponent, TitleComponent.open());

		this.resetCommands();

		// Announced rather than acted on: the flow reads the save slot in answer,
		// and puts the menu up once it knows what to offer.
		this.events.dispatch("title:opened", {});
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
