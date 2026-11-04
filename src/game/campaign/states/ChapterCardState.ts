import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { chapterCardCommands } from "@/game/campaign/commands/ChapterCardCommands";
import { ChapterCardComponent } from "@/game/campaign/components/ChapterCardComponent";

export interface ChapterCardRequest {
	chapter: string;
	number: number;
	title: string;
	map: string;
}

/**
 * The chapter card between two battles - and before the first. Nothing is
 * under it: it is switched to from the title screen or from a won battle's
 * map, so the last battle is torn down before the card goes up. It allows
 * one thing: acknowledging the card, which is what enters the battle.
 *
 * The content is set with `request()` just before the state is switched to.
 * The state owns the card entity; `CampaignSystem` runs its clock and its
 * press and, once acknowledged, builds the chapter's map.
 */
export class ChapterCardState extends GameState {
	public static readonly type = "chapter-card";

	protected commands = [...chapterCardCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: ChapterCardRequest | null = null;
	private card: Entity | null = null;

	/** Sets what the card announces the next time this state is entered. */
	public request(request: ChapterCardRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		if (this.pending === null) {
			return;
		}

		this.card = this.world.createEntity();
		this.card.addComponent(ChapterCardComponent, { ...this.pending, elapsed: 0, acknowledged: false });
		this.pending = null;

		this.resetCommands();
	}

	public onExit(): void {
		if (this.card && this.world.hasEntity(this.card.getID())) {
			this.world.unregisterEntity(this.card);
		}

		this.card = null;
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getCard(): Entity | null {
		return this.card;
	}
}
