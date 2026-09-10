import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { NOTHING_HELD, TradeComponent, TradeData, TradeSide } from "@/game/trade/components/TradeComponent";
import { EMPTY_SLOT, tradePanels, tradeSlots } from "@/game/trade/model/TradeScreen";
import { menuRowColor } from "@/game/ui/systems/UIRenderSystem";
import { BADGE_DIAMETER, drawBadge, drawDivider, drawMenuHighlight, drawPanel, drawText, uiAssetsReady } from "@/game/ui/model/UIPanel";
import { UITheme } from "@/game/ui/model/UITheme";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { isUsableEntry } from "@/game/units/model/Inventory";
import { InventoryEntry, UnitData } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Draws the trade screen: the two packs side by side, the unit's own on the
 * left, every slot of both shown so an empty one is somewhere an item can be
 * put down. The cursor - the same bracket a menu row gets - marks the
 * highlighted slot in the pack the player is driving; a picked-up entry keeps a
 * solid gold box around it wherever the cursor then goes. A weapon the pack's
 * owner cannot wield is greyed out, so it is obvious on both sides which way a
 * trade makes something useful.
 *
 * Nothing is drawn until a partner is locked in: the `partner` phase is just the
 * map cursor moving between the allies beside the unit.
 *
 * Runs after UIRenderSystem (which owns and clears the "ui" layer) so it
 * survives the frame.
 */
export class TradeRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			trades: new Query({ allowlist: [TradeComponent] }),
			units: new Query({ allowlist: [UnitComponent] })
		};
	}

	public execute(): void {
		const entity = this.queries.trades.getSingleResult();

		if (entity === null || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		const data = entity.getComponent(TradeComponent).read();

		if (data.phase !== "trade") {
			return;
		}

		const unit = this.unit(data.unitId);
		const partner = this.unit(data.partnerId);

		if (unit === null || partner === null) {
			return;
		}

		const graphics = this.display.getLayer("ui");
		const panels = tradePanels(this.display.getViewportDimension());

		this.renderPack(graphics, panels.left, unit.getComponent(UnitComponent).read(), TradeSide.UNIT, data);
		this.renderPack(graphics, panels.right, partner.getComponent(UnitComponent).read(), TradeSide.PARTNER, data);
	}

	/** One side of the screen: the unit's name over every slot of its pack. */
	private renderPack(graphics: Graphics, box: Rectangle, unit: UnitData, side: TradeSide, data: TradeData): void {
		drawPanel(graphics, this.assetStorage, box);

		const { x, y } = box.getPosition();
		const active = data.side === side;
		const selectedSlot = side === TradeSide.PARTNER ? data.partnerSlot : data.unitSlot;
		const heldSlot = data.heldSide === side ? data.heldSlot : NOTHING_HELD;

		let slotTop = y + UITheme.padding;

		this.label(graphics, unit.name, x + box.getWidth() / 2, slotTop + UITheme.lineHeight / 2, UITheme.menuTitle, TextAlign.CENTER, UITheme.name);
		slotTop += UITheme.lineHeight;
		drawDivider(graphics, this.assetStorage, x + UITheme.padding, slotTop, box.getWidth() - 2 * UITheme.padding);
		slotTop += UITheme.padding / 2;

		// The cursor sits a couple of pixels in from the panel keyline, so its arms
		// never touch the frame - the same inset the menus use.
		const inset = UITheme.nineSlice.corner / 2 + 2;
		const textX = x + UITheme.padding + BADGE_DIAMETER + 8;

		for (const [index, entry] of tradeSlots(unit).entries()) {
			const rowTop = slotTop + index * UITheme.lineHeight;
			const centreY = rowTop + UITheme.lineHeight / 2;
			const row = new Rectangle(x + inset, rowTop + 1, box.getWidth() - 2 * inset, UITheme.lineHeight - 2);

			if (active && index === selectedSlot) {
				drawMenuHighlight(graphics, row);
			}

			if (index === heldSlot) {
				// A solid box, not the bracket cursor: this entry is in hand, waiting
				// for a slot to land on.
				graphics.strokeColor(UITheme.menuCursor).lineStyle({ width: 2 }).strokeRectangle(row);
			}

			this.renderSlot(graphics, entry, x, box.getWidth(), textX, centreY, this.slotColor(entry, index === selectedSlot && active, index === heldSlot));
		}
	}

	/** One row: an empty marker, or the entry's badge, name and remaining uses. */
	private renderSlot(graphics: Graphics, entry: InventoryEntry | null, x: number, width: number, textX: number, centreY: number, color: Color): void {
		if (entry === null) {
			this.label(graphics, EMPTY_SLOT, textX, centreY, UITheme.hint, TextAlign.LEFT);
			return;
		}

		if (entry.equipped) {
			drawBadge(graphics, i18n("menu.equipped"), x + UITheme.padding + BADGE_DIAMETER / 2, centreY);
		}

		this.label(graphics, entry.name, textX, centreY, color, TextAlign.LEFT);
		this.label(graphics, `${entry.uses}/${entry.maxUses}`, x + width - UITheme.padding, centreY, color, TextAlign.RIGHT);
	}

	/** Gold for the entry in hand; otherwise the menu's own row colour, greyed out for a weapon this unit cannot wield. */
	private slotColor(entry: InventoryEntry | null, selected: boolean, held: boolean): Color {
		if (held) {
			return UITheme.menuTitle;
		}

		return menuRowColor(selected, entry !== null && !isUsableEntry(entry));
	}

	/** The unit with this id, out of the ones on the map right now. */
	private unit(id: string): Entity | null {
		return UnitSystem.byId(this.queries.units.getResult(), id);
	}

	/** A line of text on its optical centre - see `drawText` in UIPanel. */
	private label(graphics: Graphics, value: string, x: number, centreY: number, color: Color, align: TextAlignType, font = UITheme.menu): void {
		drawText(graphics, value, x, centreY, { font, color, align });
	}
}
