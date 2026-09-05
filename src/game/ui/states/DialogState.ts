import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameState } from "@/core/GameState";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { DialogComponent } from "@/game/ui/components/DialogComponent";
import { dialogCommands } from "@/game/ui/commands/DialogCommands";
import { dialogBox } from "@/game/ui/model/UILayout";

export interface DialogRequest {
	id?: string;
	speaker?: string;
	/** One entry per page of raw text; a newline forces a hard break inside a page. */
	pages: string[];
}

const FALLBACK: Required<DialogRequest> = {
	id: "dialog",
	speaker: "",
	pages: ["..."]
};

/**
 * On-screen textbox. Pushed on top of whatever the player was doing, which
 * freezes that state - the map cursor stops because CursorSystem only runs the
 * map commands while a MapState is on top, and this is not one.
 *
 * The content is set with `request()` just before the state is pushed. The
 * state owns the entity; DialogSystem advances the reveal and, once the player
 * dismisses the box, marks it closed so the state gets popped.
 */
export class DialogState extends GameState {
	public static readonly type = "dialog";

	protected commands = [...dialogCommands];

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	private pending: DialogRequest | null = null;
	private dialog: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: DialogRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending ?? FALLBACK;
		this.pending = null;

		const viewport = this.display.getViewportDimension();
		const box = dialogBox(viewport);

		this.dialog = this.world.createEntity();
		this.dialog.addComponent(DialogComponent, {
			id: request.id ?? FALLBACK.id,
			speaker: request.speaker ?? FALLBACK.speaker,
			pages: request.pages.length > 0 ? [...request.pages] : [...FALLBACK.pages],
			pageIndex: 0,
			pageElapsed: 0,
			revealAll: false,
			closed: false
		});
		this.dialog.addComponent(TransformComponent, {
			...identityTransform,
			x: box.getPosition().x,
			y: box.getPosition().y
		});

		this.resetCommands();
	}

	public onExit(): void {
		if (this.dialog) {
			this.world.unregisterEntity(this.dialog);
			this.dialog = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getDialog(): Entity | null {
		return this.dialog;
	}
}
