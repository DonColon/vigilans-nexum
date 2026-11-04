import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { saveSlotCommands } from "@/game/campaign/commands/SaveSlotCommands";
import { SaveSlotComponent, SaveSlotSummary, SlotPurpose } from "@/game/campaign/components/SaveSlotComponent";

export interface SaveSlotRequest {
	/** What choosing a slot will do - take its run up, or begin a new one in it. */
	purpose: SlotPurpose;
	/** Every slot the game keeps, in order, occupied or not. */
	slots: SaveSlotSummary[];
	/** Row to open on. Defaults to the first. */
	selectedIndex?: number;
}

/**
 * The save slot list, pushed over the title screen when "Continue" or "New
 * Game" is chosen there: one row per slot, each showing the chapter its run
 * is on, how long it has been played, when it was written and the screen it
 * was written from. It holds only the summaries and the highlight;
 * `CampaignSystem` runs the commands and reports a chosen slot or a cancel,
 * `CampaignFlowSystem` acts on them, `CampaignRenderSystem` draws the list.
 */
export class SaveSlotState extends GameState {
	public static readonly type = "save-slots";

	protected commands = [...saveSlotCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: SaveSlotRequest | null = null;
	private slots: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: SaveSlotRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		this.slots = this.world.createEntity();
		this.slots.addComponent(SaveSlotComponent, SaveSlotComponent.open(request?.purpose ?? SlotPurpose.CONTINUE, request?.slots ?? [], request?.selectedIndex ?? 0));

		this.resetCommands();
	}

	public onExit(): void {
		if (this.slots && this.world.hasEntity(this.slots.getID())) {
			this.world.unregisterEntity(this.slots);
		}

		this.slots = null;
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getSlots(): Entity | null {
		return this.slots;
	}
}
