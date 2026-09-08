import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { identityTransform, TransformComponent } from "@/core/ecs/components/TransformComponent";
import { GameState } from "@/core/GameState";
import { Display } from "@/core/graphics/Display";
import { clamp } from "@/core/math/utils/Clamp";
import { GameCoreService } from "@/core/service/GameCoreService";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { menuCommands } from "@/game/ui/commands/MenuCommands";
import { DEFAULT_MENU_WIDTH, menuAt, menuBeside, menuBox, menuHeight } from "@/game/ui/model/UILayout";

export interface MenuRequest {
	id?: string;
	title?: string;
	items: string[];
	/**
	 * Per-row badge letters, parallel to `items`. A non-empty entry shows as a
	 * small lettered disc left of that row. Shorter than `items` (or omitted) is
	 * fine - missing entries are treated as no badge.
	 */
	badges?: string[];
	/**
	 * Per-row trailing text, parallel to `items`, drawn flush right (a weapon's
	 * `uses/maxUses`, say). Same "shorter is fine" rule as `badges`.
	 */
	values?: string[];
	/**
	 * Keep the menu open after a row is confirmed (the outcome is still reported)
	 * so a submenu can be layered on top with {@link MenuState.openSubmenu}.
	 */
	keepOpen?: boolean;
	/** Row the highlight starts on. Defaults to the first row. */
	selectedIndex?: number;
	/** Panel width in pixels. Defaults to the wide right-hand slot. */
	width?: number;
	/**
	 * Screen point to tuck the menu next to - a selected unit's tile. Left out,
	 * the menu sits in the fixed right-hand slot.
	 */
	anchor?: { x: number; y: number };
	/**
	 * Exact top-left screen point for the panel - for one positioned against
	 * another panel (a submenu). Takes precedence over `anchor`; only nudged to
	 * stay on screen.
	 */
	position?: { x: number; y: number };
}

const FALLBACK = {
	id: "menu",
	title: "",
	items: ["OK"] as string[],
	selectedIndex: 0
};

/**
 * On-screen menu. Like DialogState it is pushed on top of the map and freezes
 * it. The state builds and tears down the menu entities; MenuSystem runs the
 * navigation and, when the player confirms or backs out, reports the outcome
 * through an event and pops the state.
 *
 * A menu can carry a **submenu** - a second panel layered on top of it while the
 * first stays on screen (Fire Emblem's "pick an item, then pick an action").
 * Both panels are separate entities; MenuSystem drives whichever is on top.
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
	private submenu: Entity | null = null;

	/** Sets the content shown the next time this state is entered. */
	public request(request: MenuRequest): void {
		this.pending = request;
	}

	public onEnter(): void {
		const request: MenuRequest = this.pending ?? { items: [...FALLBACK.items] };
		this.pending = null;

		this.menu = this.buildMenu(request);
		this.resetCommands();
	}

	public onExit(): void {
		this.closeSubmenu();

		if (this.menu) {
			this.world.unregisterEntity(this.menu);
			this.menu = null;
		}
	}

	public onPause(): void {}

	public onResume(): void {
		this.resetCommands();
	}

	/** Rebuilds the base menu in place - to reflect a pack that just changed - keeping the state on the stack. */
	public updateMenu(request: MenuRequest): void {
		if (this.menu === null) {
			return;
		}

		this.world.unregisterEntity(this.menu);
		this.menu = this.buildMenu(request);
		this.resetCommands();
	}

	/** Layers a second panel on top of the base menu; the base one stays visible. */
	public openSubmenu(request: MenuRequest): void {
		this.closeSubmenu();
		this.submenu = this.buildMenu(request);
		this.resetCommands();
	}

	/** Drops the submenu, handing control back to the base menu. */
	public closeSubmenu(): void {
		if (this.submenu) {
			this.world.unregisterEntity(this.submenu);
			this.submenu = null;
			// Flush the confirm/cancel press that closed it so it does not cascade
			// straight into the base menu (see resetCommands / InputBuffer).
			this.resetCommands();
		}
	}

	public hasSubmenu(): boolean {
		return this.submenu !== null;
	}

	/** The panel the player is driving - the submenu when one is open, else the base menu. */
	public getActiveMenu(): Entity | null {
		return this.submenu ?? this.menu;
	}

	public getMenu(): Entity | null {
		return this.menu;
	}

	public getSubmenu(): Entity | null {
		return this.submenu;
	}

	private buildMenu(request: MenuRequest): Entity {
		const items = request.items.length > 0 ? [...request.items] : [...FALLBACK.items];
		const title = request.title ?? FALLBACK.title;
		const width = request.width ?? DEFAULT_MENU_WIDTH;
		const badges = items.map((_, index) => request.badges?.[index] ?? "");
		const values = items.map((_, index) => request.values?.[index] ?? "");

		const viewport = this.display.getViewportDimension();
		const height = menuHeight(items.length, title.length > 0);
		const box = request.position
			? menuAt(viewport, request.position, width, height)
			: request.anchor
				? menuBeside(viewport, request.anchor, width, height)
				: menuBox(viewport, items.length, title.length > 0, width);

		const entity = this.world.createEntity();
		entity.addComponent(MenuComponent, {
			id: request.id ?? FALLBACK.id,
			title,
			width,
			items,
			badges,
			values,
			keepOpen: request.keepOpen ?? false,
			selectedIndex: clampIndex(request.selectedIndex ?? 0, items.length),
			confirmedIndex: -1,
			cancelled: false
		});
		entity.addComponent(TransformComponent, {
			...identityTransform,
			x: box.getPosition().x,
			y: box.getPosition().y
		});

		return entity;
	}
}

function clampIndex(index: number, length: number): number {
	return Number.isInteger(index) ? clamp(index, 0, length - 1) : 0;
}
