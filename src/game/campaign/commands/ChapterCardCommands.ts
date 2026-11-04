import { Entity } from "@/core/ecs/Entity";
import { GameCommand, GameCommandConstructor } from "@/core/input/commands/GameCommand";
import { cancelBinding, confirmBinding } from "@/game/input/Controls";
import { ChapterCardComponent } from "@/game/campaign/components/ChapterCardComponent";
import { chapterCardAcceptsPress } from "@/game/campaign/view/ChapterCard";

/** What a chapter card command is handed each tick. */
export interface ChapterCardCommandContext {
	/** Entity carrying the card. */
	card: Entity;
}

/**
 * Input the player can trigger while the chapter card is up. There is one
 * thing to do with it - acknowledge it - so this is the whole vocabulary.
 * Listed by ChapterCardState, run by CampaignSystem.
 */
export abstract class ChapterCardCommand extends GameCommand<ChapterCardCommandContext> {}

/**
 * Acknowledges the card. Confirm and cancel both do it - there is nothing to
 * back out of - but neither counts until the card has been up long enough to
 * be read, so the press that ended the last battle does not skip it. It never
 * switches states itself; it marks the card and CampaignSystem takes it from
 * there.
 */
abstract class AcknowledgeChapterCardCommand extends ChapterCardCommand {
	protected action(_elapsed: number, _frame: number, { card }: ChapterCardCommandContext): void {
		const component = card.getComponent(ChapterCardComponent);
		const data = component.read();

		if (chapterCardAcceptsPress(data.elapsed)) {
			component.update({ ...data, acknowledged: true });
		}
	}
}

export class ConfirmChapterCardCommand extends AcknowledgeChapterCardCommand {
	constructor() {
		super(confirmBinding());
	}
}

export class CancelChapterCardCommand extends AcknowledgeChapterCardCommand {
	constructor() {
		super(cancelBinding());
	}
}

/** The chapter card commands as one list, so the state allowing them and the feature registering them stay in step. */
export const chapterCardCommands: GameCommandConstructor[] = [ConfirmChapterCardCommand, CancelChapterCardCommand];
