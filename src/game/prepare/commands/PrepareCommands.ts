import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { PrepareComponent } from "@/game/prepare/components/PrepareComponent";

/** What a prepare command is handed each tick. */
export interface PrepareCommandContext {
	/** Entity carrying the preparations record. */
	prepare: Entity;
}

/**
 * Input the player can trigger on the map while preparing - over and above
 * moving the cursor, which the map's own commands do. Confirm and cancel mark
 * the record; [[PrepareSystem]] reads the marks off it with the cursor's tile
 * and hands them on to the flow. Listed by PrepareState, run by PrepareSystem.
 */
export abstract class PrepareCommand extends GameCommand<PrepareCommandContext> {}

export class ConfirmPrepareCommand extends PrepareCommand {
	constructor() {
		super(confirmBinding());
	}

	protected action(_elapsed: number, _frame: number, { prepare }: PrepareCommandContext): void {
		const component = prepare.getComponent(PrepareComponent);
		component.update({ ...component.read(), confirmed: true });
	}
}

export class CancelPrepareCommand extends PrepareCommand {
	constructor() {
		super(cancelBinding());
	}

	protected action(_elapsed: number, _frame: number, { prepare }: PrepareCommandContext): void {
		const component = prepare.getComponent(PrepareComponent);
		component.update({ ...component.read(), cancelled: true });
	}
}

/** The prepare commands as one list, so the state allowing them and the feature registering them stay in step. */
export const prepareCommands: GameCommandConstructor[] = [ConfirmPrepareCommand, CancelPrepareCommand];
