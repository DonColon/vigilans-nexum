import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { UpdateSystem } from "@/core/ecs/UpdateSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { EventSystem } from "@/core/events/EventSystem";
import { GameStateManager } from "@/core/GameStateManager";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { DialogCommand } from "@/game/ui/commands/UICommand";
import { DialogComponent, DialogData } from "@/game/ui/components/DialogComponent";
import { countWords, revealedWordCount, wrapText } from "@/game/ui/model/TextReveal";
import { dialogBox, DialogSide } from "@/game/ui/model/UILayout";
import { UITheme } from "@/game/ui/model/UITheme";
import { DialogState } from "@/game/ui/states/DialogState";

/**
 * Drives the open textbox: it ages the current page so words appear one at a
 * time, runs the advance command the DialogState allows and, once that command
 * has marked the box closed, reports it and pops the state.
 *
 * One dialog at a time - the box the player is reading is the only one there is.
 */
export class DialogSystem extends UpdateSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(EventSystem)
	private eventSystem!: EventSystem;

	public initialize(): void {
		this.queries = {
			dialogs: new Query({ allowlist: [DialogComponent, TransformComponent] })
		};
	}

	public execute(elapsed: number, frame: number): void {
		const entity = this.queries.dialogs.getSingleResult();

		if (entity === null) {
			return;
		}

		const component = entity.getComponent(DialogComponent);
		const data = component.read();

		if (data.closed) {
			this.eventSystem.dispatch("ui:dialogClosed", { dialog: data.id });
			this.stateManager.pop();
			return;
		}

		const pageElapsed = data.pageElapsed + elapsed;
		component.update({ ...data, pageElapsed });

		this.pinToSpeaker(entity, data);

		const totalWords = this.pageWordCount(data.pages[data.pageIndex]);
		const fullyRevealed = data.revealAll || revealedWordCount(pageElapsed, UITheme.wordRevealDelay, totalWords) >= totalWords;

		this.runCommands(elapsed, frame, entity, fullyRevealed);
	}

	/**
	 * Keeps the box on the side of the screen the current speaker holds. A
	 * one-voice dialog never moves; a two-hander swaps ends as it changes hands.
	 */
	private pinToSpeaker(entity: Entity, data: DialogData): void {
		const side = (data.sides[data.pageIndex] ?? DialogSide.BOTTOM) as DialogSide;
		const box = dialogBox(this.display.getViewportDimension(), side);

		const transform = entity.getComponent(TransformComponent);
		const current = transform.read();
		const { x, y } = box.getPosition();

		if (current.x !== x || current.y !== y) {
			transform.update({ ...current, x, y });
		}
	}

	/** How many words the page wraps to inside the box, so the advance command knows whether the reveal is done. */
	private pageWordCount(page: string): number {
		const viewport = this.display.getViewportDimension();
		const innerWidth = dialogBox(viewport).getWidth() - 2 * UITheme.padding;

		const graphics = this.display.getLayer("ui");
		graphics.fontStyle(UITheme.body);

		return countWords(wrapText(page, innerWidth, (text) => graphics.measureText(text).width));
	}

	/**
	 * The advance command comes from the state on top of the stack. If that is
	 * not this DialogState - because a menu or another dialog was pushed over it
	 * - the box just sits there revealed and waits, the same way the map cursor
	 * waits under this one.
	 */
	private runCommands(elapsed: number, frame: number, dialog: Entity, fullyRevealed: boolean): void {
		const state = this.stateManager.peek();

		if (!(state instanceof DialogState)) {
			return;
		}

		for (const command of state.getCommands(DialogCommand)) {
			command.execute(elapsed, frame, { dialog, fullyRevealed });
		}
	}
}
