import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { RosterComponent, RosterData } from "@/game/roster/components/RosterComponent";
import { ROSTER_PLATE, ROSTER_RULE, rosterCellX, rosterColumnLayout, rosterHeading, rosterPanel } from "@/game/roster/model/RosterScreen";
import { drawMenuHighlight, drawPanel, drawText, uiAssetsReady } from "@/game/ui/model/UIPanel";
import { UITheme } from "@/game/ui/model/UITheme";
import { menuRowColor } from "@/game/ui/systems/UIRenderSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitData } from "@/game/units/model/UnitData";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Draws the army list: a heading row over one row per unit, every column of
 * every sheet lined up so the numbers can be read down the page. The highlighted
 * row gets the same bracket cursor a menu row does, so the table reads as
 * something the player is moving through rather than a static readout.
 *
 * A spent unit is greyed out with the menu's own disabled colour - the same
 * signal its token carries on the map, so the list agrees with what is on the
 * board.
 *
 * Runs after UIRenderSystem (which owns and clears the "ui" layer) and after the
 * corner HUDs, so the list covers them the way a full screen should.
 */
export class RosterRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			rosters: new Query({ allowlist: [RosterComponent] }),
			units: new Query({ allowlist: [UnitComponent] })
		};
	}

	public execute(): void {
		const entity = this.queries.rosters.getSingleResult();

		if (entity === null || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		const data = entity.getComponent(RosterComponent).read();
		const units = this.units(data);

		const graphics = this.display.getLayer("ui");
		const panel = rosterPanel(this.display.getViewportDimension(), units.length);

		// Solid plate first, the ornate frame over it - see ROSTER_PLATE.
		graphics.fillColor(ROSTER_PLATE).fillRectangle(panel);
		drawPanel(graphics, this.assetStorage, panel);

		const { x, y } = panel.getPosition();
		let rowTop = y + UITheme.padding;

		this.label(graphics, i18n("roster.title"), x + panel.getWidth() / 2, rowTop + UITheme.lineHeight / 2, UITheme.menuTitle, TextAlign.CENTER, UITheme.name);
		rowTop += UITheme.lineHeight;

		// No flourish under the title: the divider art stretches its ornament across
		// whatever width it is given, which over a table this wide reads as a smear.
		// The rule under the headings below is what separates the parts here.
		rowTop += UITheme.padding / 2;

		const tableX = x + UITheme.padding;
		const columns = rosterColumnLayout(panel.getWidth() - 2 * UITheme.padding);

		for (const { column, x: offset, width } of columns) {
			const cellX = rosterCellX(tableX + offset, width, column.align);
			this.label(graphics, rosterHeading(column), cellX, rowTop + UITheme.lineHeight / 2, UITheme.menuTitle, column.align, UITheme.subheading);
		}

		rowTop += UITheme.lineHeight;

		// A plain rule across the table, where the ornate flourish would smear:
		// the headings stop here and the numbers start.
		graphics.fillColor(ROSTER_RULE).fillRectangle(new Rectangle(tableX, Math.round(rowTop) - 1, panel.getWidth() - 2 * UITheme.padding, 1));

		if (units.length === 0) {
			this.label(graphics, i18n("roster.empty"), x + panel.getWidth() / 2, rowTop + UITheme.lineHeight / 2, UITheme.hint, TextAlign.CENTER, UITheme.menu);
			return;
		}

		// The cursor sits a couple of pixels in from the panel keyline so its arms
		// never touch the frame - the same inset the menus use.
		const inset = UITheme.nineSlice.corner / 2 + 2;

		for (const [index, unit] of units.entries()) {
			const top = rowTop + index * UITheme.lineHeight;
			const centreY = top + UITheme.lineHeight / 2;

			if (index === data.selectedIndex) {
				drawMenuHighlight(graphics, new Rectangle(x + inset, top + 1, panel.getWidth() - 2 * inset, UITheme.lineHeight - 2));
			}

			const color = menuRowColor(index === data.selectedIndex, unit.hasMoved);

			for (const { column, x: offset, width } of columns) {
				const cellX = rosterCellX(tableX + offset, width, column.align);
				this.label(graphics, column.value(unit), cellX, centreY, color, column.align, UITheme.subheading);
			}
		}
	}

	/** The sheets of the listed units, in the order the roster named them, skipping any that have left the map. */
	private units(data: RosterData): UnitData[] {
		const onMap = this.queries.units.getResult();

		return data.unitIds
			.map((id) => UnitSystem.byId(onMap, id))
			.filter((unit): unit is NonNullable<typeof unit> => unit !== null)
			.map((unit) => unit.getComponent(UnitComponent).read());
	}

	/** A line of text on its optical centre - see `drawText` in UIPanel. */
	private label(graphics: Graphics, value: string, x: number, centreY: number, color: Color, align: TextAlignType, font: FontStyleSettings): void {
		drawText(graphics, value, x, centreY, { font, color, align });
	}
}
