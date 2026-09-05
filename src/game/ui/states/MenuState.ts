import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameState } from "@/core/GameState";
import { Display } from "@/core/graphics/Display";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { menuCommands } from "@/game/ui/commands/MenuCommands";
import { menuBox } from "@/game/ui/model/UILayout";

export interface MenuRequest {
	id?: string;
	title?: string;
	items: string[];
	/** Row the highlight starts on. Defaults to the first row. */
	selectedIndex?: number;
}

const FALLBACK: Required<MenuRequest> = {
	id: "menu",
	title: "",
	items: ["OK"],
	selectedIndex: 0
};

/**
 * On-screen menu. Like DialogState it is pushed on top of the map and freezes
 * it. The state only builds and tears down the entity; MenuSystem runs the
 * navigation and, when the player confirms or backs out, reports the outcome
 * through an event and pops the state.
 */
export class MenuState extends GameState {
	public static readonly type = "menu";

	protected commands = [...menuCommands];

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	private pending: MenuRequest | null = null;
	private menu: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: MenuRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request = this.pending ?? FALLBACK;
		this.pending = null;

		const items = request.items.length > 0 ? [...request.items] : [...FALLBACK.items];
		const title = request.title ?? FALLBACK.title;

		const viewport = this.display.getViewportDimension();
		const box = menuBox(viewport, items.length, title.length > 0);

		this.menu = this.world.createEntity();
		this.menu.addComponent(MenuComponent, {
			id: request.id ?? FALLBACK.id,
			title,
			items,
			selectedIndex: clampIndex(request.selectedIndex ?? 0, items.length),
			confirmedIndex: -1,
			cancelled: false
		});
		this.menu.addComponent(TransformComponent, {
			...identityTransform,
			x: box.getPosition().x,
			y: box.getPosition().y
		});

		this.resetCommands();
	}

	public onExit(): void {
		if (this.menu) {
			this.world.unregisterEntity(this.menu);
			this.menu = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	public getMenu(): Entity | null {
		return this.menu;
	}
}

function clampIndex(index: number, length: number): number {
	if (!Number.isInteger(index) || index < 0) {
		return 0;
	}

	return Math.min(index, length - 1);
}
