import { AssetStorage } from "@/core/assets/AssetStorage";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { World } from "@/core/ecs/World";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GameStateManager } from "@/core/GameStateManager";
import { ConvoyComponent } from "@/game/convoy/components/ConvoyComponent";
import { ExchangeComponent, ExchangeData, ExchangeSide, NOTHING_HELD } from "@/game/prepare/components/ExchangeComponent";
import { PrepareComponent, PrepareData, PrepareMode } from "@/game/prepare/components/PrepareComponent";
import { convoySlots } from "@/game/prepare/rules/Exchange";
import { packSheet } from "@/game/prepare/rules/Packs";
import { PrepareExchangeState } from "@/game/prepare/states/PrepareExchangeState";
import { ARMY_MENU, otherBox, PACK_MENU, packBox, panelRows, scrolledFrom } from "@/game/prepare/view/PrepareMenus";
import { EMPTY_SLOT, tradeSlots } from "@/game/trade/view/TradeScreen";
import { MenuComponent } from "@/game/ui/components/MenuComponent";
import { MenuState } from "@/game/ui/states/MenuState";
import { menuRowColor } from "@/game/ui/view/UIMenuPanel";
import { BADGE_DIAMETER, drawBadge, drawDivider, drawMenuHighlight, drawPanel, drawText, uiAssetsReady } from "@/game/ui/view/UIPanel";
import { UITheme } from "@/game/ui/view/UITheme";
import { InventoryEntry, UnitComponent, UnitData } from "@/game/units/components/UnitComponent";

/** One panel of the items screen: whose rows they are, which is under the cursor and which is in hand. */
interface PackPanel {
	title: string;
	/** Every row, `null` where there is nothing - a place something can be put down. */
	slots: (InventoryEntry | null)[];
	/** The unit the rows are judged against - a weapon it cannot wield is greyed. */
	owner: UnitData;
	/** Row under the cursor, or -1 while the cursor is on the other side. */
	cursor: number;
	/** Row picked up and waiting for somewhere to land, or -1. */
	held: number;
	/** Row the panel keeps on screen when it has more rows than it can show - its own cursor, whichever side is being driven. */
	anchor: number;
}

/**
 * Draws the packs of the items screen under the army list: on the left the
 * pack of the unit the list is on - or the picked one, while its pack menu is
 * up - every slot shown so an empty one reads as somewhere an item can go;
 * on the right, while a trade partner is being chosen, the pack of whoever
 * the list is on now. Once packs are open against each other
 * ([[PrepareExchangeState]]) both sides get the menu's bracket cursor on the
 * side the player is driving and a solid gold box around what is in hand,
 * and the convoy's side scrolls with its cursor. Hovering is enough to see
 * what everyone carries, the way Radiant Dawn's preparations show it.
 *
 * On the ui layer above UIRenderSystem (50), which draws the list and the
 * menus; the "Equip" and "Use" lists sit exactly where the pack panel does,
 * so the panel steps aside while one is up.
 */
export class PrepareItemsRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	@GameCoreService(World)
	private world!: World;

	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	public initialize(): this {
		return this;
	}

	public execute(): void {
		const prepare = this.world.entityWith(PrepareComponent)?.getComponent(PrepareComponent).read();

		if (prepare === undefined || prepare.mode !== PrepareMode.ITEMS || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		// Only under the items screen's own states: a notice over them (a
		// booster's gains) is drawn earlier in the frame and would be covered.
		const state = this.stateManager.peek();
		const viewport = this.display.getViewportDimension();
		const graphics = this.display.getLayer("ui");

		if (state instanceof PrepareExchangeState) {
			const exchange = state.getExchange()?.getComponent(ExchangeComponent).read();

			if (exchange !== undefined) {
				this.renderExchange(graphics, exchange);
			}

			return;
		}

		if (!(state instanceof MenuState)) {
			return;
		}

		const menu = state.getActiveMenu()?.getComponent(MenuComponent).read();

		if (menu === undefined || (menu.id !== ARMY_MENU && menu.id !== PACK_MENU)) {
			return;
		}

		const hovered = menu.id === ARMY_MENU ? (menu.ids[menu.selectedIndex] ?? "") : "";
		const left = packSheet(this.world, prepare.picked !== "" ? prepare.picked : hovered);

		if (left !== null) {
			this.renderPanel(graphics, packBox(viewport), this.packPanel(left, -1, -1));
		}

		const right = this.partnerSheet(prepare, hovered);

		if (right !== null) {
			this.renderPanel(graphics, otherBox(viewport), this.packPanel(right, -1, -1));
		}
	}

	/** While a trade partner is being chosen: the pack of whoever the list is on, unless it is the picked unit itself. */
	private partnerSheet(prepare: PrepareData, hovered: string): UnitData | null {
		if (!prepare.trading || hovered === "" || hovered === prepare.picked) {
			return null;
		}

		return packSheet(this.world, hovered);
	}

	/** Both sides of an open exchange: the unit's pack, and the partner's pack or the convoy. */
	private renderExchange(graphics: Graphics, exchange: ExchangeData): void {
		const viewport = this.display.getViewportDimension();
		const unit = packSheet(this.world, exchange.unitId);

		if (unit === null) {
			return;
		}

		const packCursor = exchange.side === ExchangeSide.PACK ? exchange.packSlot : -1;
		const packHeld = exchange.heldSide === ExchangeSide.PACK ? exchange.heldSlot : NOTHING_HELD;
		this.renderPanel(graphics, packBox(viewport), this.packPanel(unit, packCursor, packHeld, exchange.packSlot));

		const otherCursor = exchange.side === ExchangeSide.OTHER ? exchange.otherSlot : -1;
		const otherHeld = exchange.heldSide === ExchangeSide.OTHER ? exchange.heldSlot : NOTHING_HELD;

		if (ExchangeComponent.withConvoy(exchange)) {
			const convoy = this.world.entityWith(ConvoyComponent)?.getComponent(ConvoyComponent).read();

			if (convoy !== undefined) {
				const slots = convoySlots(convoy);
				this.renderPanel(graphics, otherBox(viewport), {
					title: i18n("prepare.convoy", { count: convoy.items.length }),
					slots,
					owner: unit,
					cursor: otherCursor,
					held: otherHeld,
					anchor: exchange.otherSlot
				});
			}

			return;
		}

		const partner = packSheet(this.world, exchange.partnerId);

		if (partner !== null) {
			this.renderPanel(graphics, otherBox(viewport), this.packPanel(partner, otherCursor, otherHeld, exchange.otherSlot));
		}
	}

	private packPanel(unit: UnitData, cursor: number, held: number, anchor = 0): PackPanel {
		return { title: unit.name, slots: tradeSlots(unit), owner: unit, cursor, held, anchor };
	}

	/**
	 * One panel: its title over as many rows as fit, scrolled so the cursor's
	 * row is on screen. A pack's eight slots always fit; the convoy's list
	 * may not.
	 */
	private renderPanel(graphics: Graphics, box: Rectangle, panel: PackPanel): void {
		drawPanel(graphics, this.assetStorage, box);

		const { x, y } = box.getPosition();
		const rows = panelRows(box);
		const first = scrolledFrom(panel.slots.length, panel.anchor, rows);

		let slotTop = y + UITheme.padding;

		drawText(graphics, panel.title, x + box.getWidth() / 2, slotTop + UITheme.lineHeight / 2, { font: UITheme.name, color: UITheme.menuTitle, align: TextAlign.CENTER });
		slotTop += UITheme.lineHeight;
		drawDivider(graphics, this.assetStorage, x + UITheme.padding, slotTop, box.getWidth() - 2 * UITheme.padding);
		slotTop += UITheme.padding / 2;

		// The cursor sits a couple of pixels in from the panel keyline, so its
		// arms never touch the frame - the same inset the menus use.
		const inset = UITheme.nineSlice.corner / 2 + 2;
		const textX = x + UITheme.padding + BADGE_DIAMETER + 8;

		for (const [line, entry] of panel.slots.slice(first, first + rows).entries()) {
			const index = first + line;
			const rowTop = slotTop + line * UITheme.lineHeight;
			const centreY = rowTop + UITheme.lineHeight / 2;
			const row = new Rectangle(x + inset, rowTop + 1, box.getWidth() - 2 * inset, UITheme.lineHeight - 2);
			const selected = index === panel.cursor;

			if (selected) {
				drawMenuHighlight(graphics, row);
			}

			if (index === panel.held) {
				// A solid box, not the bracket cursor: this entry is in hand,
				// waiting for a row to land on.
				graphics.strokeColor(UITheme.menuCursor).lineStyle({ width: 2 }).strokeRectangle(row);
			}

			this.renderSlot(graphics, entry, x, box.getWidth(), textX, centreY, this.slotColor(entry, panel.owner, selected, index === panel.held));
		}

		// More rows above or below the window: a hint at either edge.
		if (first > 0) {
			drawText(graphics, "▲", x + box.getWidth() - UITheme.padding, slotTop - UITheme.padding / 4, { font: UITheme.badge, color: UITheme.hint, align: TextAlign.RIGHT });
		}

		if (first + rows < panel.slots.length) {
			drawText(graphics, "▼", x + box.getWidth() - UITheme.padding, y + box.getHeight() - UITheme.padding / 2, { font: UITheme.badge, color: UITheme.hint, align: TextAlign.RIGHT });
		}
	}

	/** One row: an empty marker, or the entry's badge, name and remaining uses. */
	private renderSlot(graphics: Graphics, entry: InventoryEntry | null, x: number, width: number, textX: number, centreY: number, color: Color): void {
		if (entry === null) {
			drawText(graphics, EMPTY_SLOT, textX, centreY, { font: UITheme.menu, color: UITheme.hint, align: TextAlign.LEFT });
			return;
		}

		if (entry.equipped) {
			drawBadge(graphics, i18n("menu.equipped"), x + UITheme.padding + BADGE_DIAMETER / 2, centreY);
		}

		drawText(graphics, entry.name, textX, centreY, { font: UITheme.menu, color, align: TextAlign.LEFT });
		drawText(graphics, `${entry.uses}/${entry.maxUses}`, x + width - UITheme.padding, centreY, { font: UITheme.menu, color, align: TextAlign.RIGHT });
	}

	/** Gold for the entry in hand; otherwise the menu's own row colour, greyed for a weapon the owner cannot wield. */
	private slotColor(entry: InventoryEntry | null, owner: UnitData, selected: boolean, held: boolean): Color {
		if (held) {
			return UITheme.menuTitle;
		}

		return menuRowColor(selected, entry !== null && !UnitComponent.isUsableEntry(UnitComponent.received(entry, owner)));
	}
}
