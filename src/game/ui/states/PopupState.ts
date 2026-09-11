import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameState } from "@/core/GameState";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { popupCommands } from "@/game/ui/commands/PopupCommands";
import { PopupComponent } from "@/game/ui/components/PopupComponent";
import { popupBox } from "@/game/ui/model/UILayout";

export interface PopupRequest {
	id?: string;
	/** Heading across the top of the panel. Left out, the popup is only its lines. */
	title?: string;
	/** The lines of the notice, in order. Kept short - a popup does not wrap. */
	lines: string[];
}

const FALLBACK: Required<PopupRequest> = {
	id: "popup",
	title: "",
	lines: ["..."]
};

/**
 * On-screen notice. Pushed on top of whatever the player was doing, which
 * freezes that state the way a textbox does, and dismissed with a single press.
 *
 * The content is set with `request()` just before the state is pushed. The
 * state owns the entity; PopupSystem runs the dismiss input and, once the
 * player has acknowledged it, marks it closed so the state gets popped.
 */
export class PopupState extends GameState {
	public static readonly type = "popup";

	protected commands = [...popupCommands];

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	private pending: PopupRequest | null = null;
	private popup: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: PopupRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending ?? FALLBACK;
		this.pending = null;

		const title = request.title ?? FALLBACK.title;
		const lines = request.lines.length > 0 ? [...request.lines] : [...FALLBACK.lines];
		const box = popupBox(this.display.getViewportDimension(), lines.length, title.length > 0);

		this.popup = this.world.createEntity();
		this.popup.addComponent(PopupComponent, { id: request.id ?? FALLBACK.id, title, lines, closed: false });
		this.popup.addComponent(TransformComponent, {
			...identityTransform,
			x: box.getPosition().x,
			y: box.getPosition().y
		});

		this.resetCommands();
	}

	public onExit(): void {
		if (this.popup) {
			this.world.unregisterEntity(this.popup);
			this.popup = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getPopup(): Entity | null {
		return this.popup;
	}
}
