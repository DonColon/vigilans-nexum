import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { talkCommands } from "@/game/talk/commands/TalkCommands";
import { TalkChoiceComponent } from "@/game/talk/components/TalkChoiceComponent";

export interface TalkRequest {
	/** The unit that chose "Talk". */
	unitId: string;
	/** Everyone beside it it still has a conversation with - who the cursor steps through. */
	partnerIds: string[];
	/** Which of them to point at first - index into `partnerIds`. */
	partnerIndex: number;
	/** Tile the map cursor snaps back to when the choice is backed out of. */
	restoreColumn: number;
	restoreRow: number;
}

/**
 * "Who am I talking to?", pushed on top of the map like a menu and freezing it.
 * Only opened when more than one unit beside this one has a conversation left -
 * with a single partner the talk feature goes straight into it.
 *
 * TalkChoiceSystem runs the cycling commands and keeps the map cursor on the
 * unit being pointed at; confirm reports `talk:confirmed` and the conversation
 * plays, cancel reports `talk:cancelled`.
 */
export class TalkState extends GameState {
	public static readonly type = "talk";

	protected commands = [...talkCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: TalkRequest | null = null;
	private choice: Entity | null = null;

	public request(request: TalkRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		this.choice = this.world.createEntity();
		this.choice.addComponent(TalkChoiceComponent, {
			unitId: request?.unitId ?? "",
			partnerIds: request ? [...request.partnerIds] : [],
			partnerIndex: request?.partnerIndex ?? 0,
			partnerId: request?.partnerIds[request.partnerIndex] ?? "",
			restoreColumn: request?.restoreColumn ?? 0,
			restoreRow: request?.restoreRow ?? 0,
			confirmed: false,
			cancelled: false
		});

		this.resetCommands();
	}

	public onExit(): void {
		if (this.choice) {
			this.world.unregisterEntity(this.choice);
			this.choice = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getChoice(): Entity | null {
		return this.choice;
	}
}
