import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { clamp01 } from "@/core/math/utils/Clamp";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { Terrain, TerrainType } from "@/game/map/model/Terrain";
import { GridSystem } from "@/game/map/systems/GridSystem";
import { StatusComponent } from "@/game/status/components/StatusComponent";
import {
	classLine,
	EMPTY_SLOT,
	factionLabel,
	pageLabel,
	StatRow,
	StatusColumn,
	statusColumnLayout,
	statusCombatRows,
	statusHeaderHeight,
	statusHeading,
	statusInventorySlots,
	statusPanel,
	StatusRow,
	statusStatRows,
	STATUS_BAR_FILL,
	STATUS_BAR_HEIGHT,
	STATUS_BAR_TRACK,
	STATUS_HP_FILL,
	STATUS_PLATE,
	STATUS_RULE,
	STATUS_TOKEN_RADIUS
} from "@/game/status/model/StatusScreen";
import { StatusSystem } from "@/game/status/systems/StatusSystem";
import { BADGE_DIAMETER, drawBadge, drawPanel, drawText, uiAssetsReady } from "@/game/ui/model/UIPanel";
import { UITheme } from "@/game/ui/model/UITheme";
import { menuRowColor } from "@/game/ui/systems/UIRenderSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { isUsableEntry } from "@/game/units/model/Inventory";
import { InventoryEntry, UnitData } from "@/game/units/model/UnitData";
import { drawUnitToken } from "@/game/units/model/UnitToken";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/** Room the stat column keeps for a label before its bar starts, and for the number after it. */
const STAT_LABEL_WIDTH = 64;
const STAT_VALUE_WIDTH = 96;

/**
 * Draws the unit sheet: the unit's token and name across the top, then its
 * stats with a bar to the cap behind each, the combat numbers they come to,
 * and every slot of its pack, side by side. A weapon the unit cannot wield is
 * greyed out the way the trade screen greys it, and the readied one carries the
 * same badge the items menu gives it, so the pack reads the same everywhere.
 *
 * Runs after UIRenderSystem (which owns and clears the "ui" layer) and after
 * the corner HUDs, so the page covers them the way a full screen should.
 */
export class StatusRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			statuses: new Query({ allowlist: [StatusComponent] }),
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] }),
			grids: new Query({ allowlist: [GridComponent] })
		};
	}

	public execute(): void {
		const entity = this.queries.statuses.getSingleResult();

		if (entity === null || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		const data = entity.getComponent(StatusComponent).read();
		const unit = UnitSystem.byId(this.queries.units.getResult(), StatusSystem.shownUnit(data));

		// The unit has left the map since the sheet went up - nothing to show.
		if (unit === null) {
			return;
		}

		const sheet = unit.getComponent(UnitComponent).read();
		const graphics = this.display.getLayer("ui");
		const panel = statusPanel(this.display.getViewportDimension());

		// Solid plate first, the ornate frame over it - see STATUS_PLATE.
		graphics.fillColor(STATUS_PLATE).fillRectangle(panel);
		drawPanel(graphics, this.assetStorage, panel);

		const { x, y } = panel.getPosition();
		const contentX = x + UITheme.padding;
		const contentWidth = panel.getWidth() - 2 * UITheme.padding;

		this.renderHeader(graphics, sheet, data.index, data.unitIds.length, contentX, y + UITheme.padding, contentWidth);

		const columnsTop = y + UITheme.padding + statusHeaderHeight();

		for (const { column, x: offset, width } of statusColumnLayout(contentWidth)) {
			this.renderColumn(graphics, column, sheet, unit, contentX + offset, columnsTop, width);
		}
	}

	/** The token, the name and class beside it, and on the right which side it is on and which page this is. */
	private renderHeader(graphics: Graphics, unit: UnitData, index: number, count: number, x: number, top: number, width: number): void {
		const height = statusHeaderHeight() - UITheme.padding / 2;
		const centreY = top + height / 2;

		drawUnitToken(graphics, unit.faction, unit.weapon?.type ?? null, new Vector2D(x + STATUS_TOKEN_RADIUS, centreY), STATUS_TOKEN_RADIUS);

		const textX = x + 2 * STATUS_TOKEN_RADIUS + UITheme.padding / 2;

		this.label(graphics, unit.name, textX, centreY - UITheme.lineHeight / 2, UITheme.menuTitle, TextAlign.LEFT, UITheme.menu);
		this.label(graphics, classLine(unit), textX, centreY + UITheme.lineHeight / 2, UITheme.menuItem, TextAlign.LEFT, UITheme.subheading);

		// A spent unit says so beside its side, the way its token greys out on the map.
		const side = unit.hasMoved ? `${factionLabel(unit.faction)} - ${i18n("status.acted")}` : factionLabel(unit.faction);

		this.label(graphics, side, x + width, centreY - UITheme.lineHeight / 2, UITheme.menuItem, TextAlign.RIGHT, UITheme.subheading);
		this.label(graphics, pageLabel(index, count), x + width, centreY + UITheme.lineHeight / 2, UITheme.hint, TextAlign.RIGHT, UITheme.subheading);

		// A plain rule, not the divider flourish: the ornament stretches across a
		// page this wide and smears into the page label - see RosterRenderSystem.
		graphics.fillColor(STATUS_RULE).fillRectangle(new Rectangle(x, Math.round(top + height) - 1, width, 1));
	}

	/** One column: its heading over a rule, then its rows. */
	private renderColumn(graphics: Graphics, column: StatusColumn, unit: UnitData, entity: Entity, x: number, top: number, width: number): void {
		this.label(graphics, statusHeading(column), x, top + UITheme.lineHeight / 2, UITheme.menuTitle, TextAlign.LEFT, UITheme.subheading);

		const rowsTop = top + UITheme.lineHeight;
		graphics.fillColor(STATUS_RULE).fillRectangle(new Rectangle(x, Math.round(rowsTop) - 1, width, 1));

		if (column === "stats") {
			this.renderStats(graphics, statusStatRows(unit), x, rowsTop, width);
		} else if (column === "combat") {
			this.renderRows(graphics, statusCombatRows(unit, this.terrainUnder(entity)), x, rowsTop, width);
		} else {
			this.renderPack(graphics, statusInventorySlots(unit), x, rowsTop, width);
		}
	}

	/** Label, the bar to the cap, the number - one row per stat. */
	private renderStats(graphics: Graphics, rows: StatRow[], x: number, top: number, width: number): void {
		const barX = x + STAT_LABEL_WIDTH;
		const barWidth = Math.max(0, width - STAT_LABEL_WIDTH - STAT_VALUE_WIDTH);

		for (const [index, row] of rows.entries()) {
			const centreY = top + index * UITheme.lineHeight + UITheme.lineHeight / 2;

			this.label(graphics, row.label, x, centreY, UITheme.menuItem, TextAlign.LEFT, UITheme.subheading);

			if (row.cap > 0 && barWidth > 0) {
				// HP is the wound, in green; the rest is the stat against its cap, in the frame's gold.
				this.renderBar(graphics, barX, Math.round(centreY - STATUS_BAR_HEIGHT / 2), barWidth, clamp01(row.current / row.cap), index === 0 ? STATUS_HP_FILL : STATUS_BAR_FILL);
			}

			this.label(graphics, row.value, x + width, centreY, UITheme.menuItemSelected, TextAlign.RIGHT, UITheme.subheading);
		}
	}

	/** Label on the left, number on the right - the combat readout. */
	private renderRows(graphics: Graphics, rows: StatusRow[], x: number, top: number, width: number): void {
		for (const [index, row] of rows.entries()) {
			const centreY = top + index * UITheme.lineHeight + UITheme.lineHeight / 2;

			this.label(graphics, row.label, x, centreY, UITheme.menuItem, TextAlign.LEFT, UITheme.subheading);
			this.label(graphics, row.value, x + width, centreY, row.muted ? UITheme.menuItemDisabled : UITheme.menuItemSelected, TextAlign.RIGHT, UITheme.subheading);
		}
	}

	/** Every slot of the pack: an empty marker, or the entry's badge, name and remaining uses. */
	private renderPack(graphics: Graphics, slots: (InventoryEntry | null)[], x: number, top: number, width: number): void {
		const textX = x + BADGE_DIAMETER + 8;

		for (const [index, entry] of slots.entries()) {
			const centreY = top + index * UITheme.lineHeight + UITheme.lineHeight / 2;

			if (entry === null) {
				this.label(graphics, EMPTY_SLOT, textX, centreY, UITheme.hint, TextAlign.LEFT, UITheme.subheading);
				continue;
			}

			if (entry.equipped) {
				drawBadge(graphics, i18n("menu.equipped"), x + BADGE_DIAMETER / 2, centreY);
			}

			const color = menuRowColor(false, !isUsableEntry(entry));

			this.label(graphics, entry.name, textX, centreY, color, TextAlign.LEFT, UITheme.subheading);
			this.label(graphics, `${entry.uses}/${entry.maxUses}`, x + width, centreY, color, TextAlign.RIGHT, UITheme.subheading);
		}
	}

	/** A dark-bordered bar: the empty track, then a fill as long as `ratio` of it. */
	private renderBar(graphics: Graphics, x: number, y: number, width: number, ratio: number, fill: Color): void {
		graphics.fillColor(UITheme.menuBadgeRim).fillRectangle(new Rectangle(x - 1, y - 1, width + 2, STATUS_BAR_HEIGHT + 2));
		graphics.fillColor(STATUS_BAR_TRACK).fillRectangle(new Rectangle(x, y, width, STATUS_BAR_HEIGHT));

		const filled = Math.round(width * ratio);

		if (filled > 0) {
			graphics.fillColor(fill).fillRectangle(new Rectangle(x, y, filled, STATUS_BAR_HEIGHT));
		}
	}

	/** The terrain the unit is standing on - what its avoid counts - or plain when there is no map to ask. */
	private terrainUnder(unit: Entity): TerrainType {
		const map = this.queries.grids.getSingleResult();

		if (map === null) {
			return Terrain.PLAIN;
		}

		const tile = UnitSystem.tileOf(unit);

		return GridSystem.getTerrain(map.getComponent(GridComponent).read(), tile.column, tile.row) ?? Terrain.PLAIN;
	}

	/** A line of text on its optical centre - see `drawText` in UIPanel. */
	private label(graphics: Graphics, value: string, x: number, centreY: number, color: Color, align: TextAlignType, font: FontStyleSettings): void {
		drawText(graphics, value, x, centreY, { font, color, align });
	}
}
