import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { staffCommands } from "@/game/staff/commands/StaffCommands";
import { StaffChoiceComponent } from "@/game/staff/components/StaffChoiceComponent";

export interface StaffRequest {
	/** The unit raising the staff. */
	unitId: string;
	/** Catalog id of the staff it picked. */
	staffId: string;
	/** Every wounded ally the staff reaches - who the cursor steps through. */
	partnerIds: string[];
	/** Which of them to point at first - index into `partnerIds`. */
	partnerIndex: number;
	/** Tile the map cursor snaps back to when the choice is backed out of. */
	restoreColumn: number;
	restoreRow: number;
}

/**
 * "Who am I healing?", pushed on top of the map like a menu and freezing it,
 * once a staff has been picked. Opened even with a single ally in reach, so the
 * command always shows who it is about to act on before it acts - the same
 * step a talk opens with.
 *
 * StaffChoiceSystem runs the cycling commands and keeps the map cursor on the
 * unit being pointed at; confirm reports `staff:confirmed` and the staff is
 * raised, cancel reports `staff:cancelled`.
 */
export class StaffState extends GameState {
	public static readonly type = "heal";

	protected commands = [...staffCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: StaffRequest | null = null;
	private choice: Entity | null = null;

	public request(request: StaffRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		this.choice = this.world.createEntity();
		this.choice.addComponent(StaffChoiceComponent, {
			unitId: request?.unitId ?? "",
			staffId: request?.staffId ?? "",
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
