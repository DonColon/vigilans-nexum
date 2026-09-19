import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { GameState } from "@/core/GameState";
import { GameCoreService } from "@/core/service/GameCoreService";
import { positionalCommands } from "@/game/positional/commands/PositionalCommands";
import { PositionalChoiceComponent, PositionalOption } from "@/game/positional/components/PositionalChoiceComponent";
import { PositionalAbility } from "@/game/positional/content/PositionalAbilities";

export interface PositionalRequest {
	/** The unit using the ability. */
	unitId: string;
	/** Which of the six it chose. */
	ability: PositionalAbility;
	/** Everyone it could be used on and where each choice puts people - who the cursor steps through. */
	options: PositionalOption[];
	/** Tile the map cursor snaps back to when the choice is backed out of. */
	restoreColumn: number;
	restoreRow: number;
}

/**
 * "Who am I moving?", pushed on top of the map like a menu and freezing it.
 * Opened for every use of a positional ability, even with a single unit in
 * reach, so the command always shows who it is about to act on - and where
 * they will land - before it acts.
 *
 * PositionalChoiceSystem runs the cycling commands and keeps the map cursor on
 * the unit being pointed at; confirm reports `positional:confirmed` and the
 * pieces slide, cancel reports `positional:cancelled`.
 */
export class PositionalState extends GameState {
	public static readonly type = "positional";

	protected commands = [...positionalCommands];

	@GameCoreService(World)
	private world!: World;

	private pending: PositionalRequest | null = null;
	private choice: Entity | null = null;

	/** Sets what is offered the next time this state is entered. */
	public request(request: PositionalRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending;
		this.pending = null;

		const options = request ? request.options.map((option) => ({ ...option, steps: option.steps.map((step) => ({ ...step })) })) : [];

		this.choice = this.world.createEntity();
		this.choice.addComponent(PositionalChoiceComponent, {
			unitId: request?.unitId ?? "",
			ability: request?.ability ?? PositionalAbility.SWAP,
			partnerIds: options.map((option) => option.targetId),
			partnerIndex: 0,
			partnerId: options[0]?.targetId ?? "",
			options,
			restoreColumn: request?.restoreColumn ?? 0,
			restoreRow: request?.restoreRow ?? 0,
			confirmed: false,
			cancelled: false
		});

		this.resetCommands();
	}

	public onExit(): void {
		if (this.choice && this.world.hasEntity(this.choice.getID())) {
			this.world.unregisterEntity(this.choice);
		}

		this.choice = null;
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getChoice(): Entity | null {
		return this.choice;
	}
}
