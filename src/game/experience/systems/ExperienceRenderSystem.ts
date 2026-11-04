import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ExperienceComponent, ExperienceData, ExperiencePhase } from "@/game/experience/components/ExperienceComponent";
import { EXPERIENCE_BAR_HEIGHT, EXPERIENCE_FILL, EXPERIENCE_LABEL_WIDTH, EXPERIENCE_TRACK, EXPERIENCE_VALUE_WIDTH, experienceBox, experienceFrame } from "@/game/experience/view/ExperienceBar";
import { LEVEL_UP_COLUMNS, LEVEL_UP_GAIN, LEVEL_UP_ROWS, levelUpBox, levelUpFrame, LevelUpStat } from "@/game/experience/view/LevelUpPanel";
import { drawPanel, drawText, uiAssetsReady } from "@/game/ui/view/UIPanel";
import { UITheme } from "@/game/ui/view/UITheme";

/** Room a stat column keeps on its right for the gain, so the number never shifts when it lights up. */
const STAT_GAIN_WIDTH = 64;

/**
 * Draws the experience display. While the bar fills: the unit's name and
 * level on the left, "EXP" and the bar across the middle, the count on the
 * right. Once a level is reached the bar is gone and the level-up panel is up
 * instead: the unit and its new level across the top, every stat below in two
 * columns, and the ones that rose lighting up in turn with their gain popping
 * in beside them - big for a moment, then settled. The fill and the reveal
 * are both read off the display record's clock, so they advance exactly as far
 * as `ExperienceSystem` has counted.
 *
 * Runs after UIRenderSystem (which owns and clears the "ui" layer) so it
 * survives the frame.
 */
export class ExperienceRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): this {
		this.queries = {
			displays: new Query({ allowlist: [ExperienceComponent] })
		};

		return this;
	}

	public execute(): void {
		const entity = this.queries.displays.getSingleResult();

		if (entity === null || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		const data = entity.getComponent(ExperienceComponent).read();
		const graphics = this.display.getLayer("ui");

		if (data.phase === ExperiencePhase.LEVEL_UP) {
			this.renderLevelUp(graphics, data);
		} else {
			this.renderBar(graphics, data);
		}
	}

	/** The bar: name and level, then "EXP", the bar and the count. */
	private renderBar(graphics: Graphics, data: ExperienceData): void {
		const frame = experienceFrame(data, data.elapsed);
		const panel = experienceBox(this.display.getViewportDimension());

		drawPanel(graphics, this.assetStorage, panel);

		const { x, y } = panel.getPosition();
		const centreY = y + panel.getHeight() / 2;
		const left = x + UITheme.padding;
		const right = x + panel.getWidth() - UITheme.padding;

		const heading = `${data.name}  ${i18n("roster.level")} ${frame.level}`;
		const headingWidth = Math.round((panel.getWidth() - 2 * UITheme.padding) * 0.4);

		drawText(graphics, heading, left, centreY, { font: UITheme.subheading, color: UITheme.menuTitle, align: TextAlign.LEFT });

		const labelX = left + headingWidth;
		drawText(graphics, i18n("experience.label"), labelX, centreY, { font: UITheme.subheading, color: UITheme.menuItem, align: TextAlign.LEFT });

		const barX = labelX + EXPERIENCE_LABEL_WIDTH;
		const barWidth = Math.max(0, right - EXPERIENCE_VALUE_WIDTH - barX);

		this.renderTrack(graphics, barX, Math.round(centreY - EXPERIENCE_BAR_HEIGHT / 2), barWidth, frame.ratio, EXPERIENCE_FILL);
		drawText(graphics, String(frame.experience), right, centreY, { font: UITheme.subheading, color: UITheme.menuItemSelected, align: TextAlign.RIGHT });
	}

	/** The level-up panel: the banner across the top, the stats in two columns, the hint once it is all on show. */
	private renderLevelUp(graphics: Graphics, data: ExperienceData): void {
		const frame = levelUpFrame(data, data.elapsed);
		const panel = levelUpBox(this.display.getViewportDimension());

		drawPanel(graphics, this.assetStorage, panel);

		const { x, y } = panel.getPosition();
		const left = x + UITheme.padding;
		const right = x + panel.getWidth() - UITheme.padding;
		const bannerY = y + UITheme.padding + UITheme.lineHeight / 2;

		// "Level up!" on the left, the unit and its level - rolling over - on the right.
		drawText(graphics, i18n("experience.levelUp"), left, bannerY, { font: UITheme.menu, color: UITheme.menuTitle, align: TextAlign.LEFT });
		drawText(graphics, `${data.name}  ${i18n("roster.level")} ${frame.level}`, right, bannerY, { font: UITheme.subheading, color: UITheme.menuItemSelected, align: TextAlign.RIGHT });

		const rowsTop = y + UITheme.padding + UITheme.lineHeight;
		const columnWidth = (panel.getWidth() - 2 * UITheme.padding) / LEVEL_UP_COLUMNS;

		for (const [index, stat] of frame.stats.entries()) {
			const column = Math.floor(index / LEVEL_UP_ROWS);
			const row = index % LEVEL_UP_ROWS;
			const columnX = left + column * columnWidth;
			const centreY = rowsTop + row * UITheme.lineHeight + UITheme.lineHeight / 2;

			this.renderStat(graphics, stat, columnX, columnX + columnWidth - UITheme.padding, centreY);
		}

		// The hint sits under the stats once everything is on show, blinking like a textbox's.
		if (frame.complete && Math.floor(data.elapsed / 500) % 2 === 0) {
			drawText(graphics, "■", right, y + panel.getHeight() - UITheme.padding - UITheme.lineHeight / 2, { font: UITheme.name, color: UITheme.hint, align: TextAlign.RIGHT });
		}
	}

	/** One stat: label, the number, and - once lit - the gain, big while it pops and then settled. */
	private renderStat(graphics: Graphics, stat: LevelUpStat, left: number, right: number, centreY: number): void {
		const label = i18n(`roster.${stat.stat}`);
		const lit = stat.revealed;

		drawText(graphics, label, left, centreY, { font: UITheme.subheading, color: lit ? UITheme.menuItemSelected : UITheme.menuItem, align: TextAlign.LEFT });
		drawText(graphics, String(stat.value), right - STAT_GAIN_WIDTH, centreY, { font: UITheme.subheading, color: lit ? UITheme.menuItemSelected : UITheme.menuItem, align: TextAlign.RIGHT });

		if (lit) {
			// The pop: the gain lands in the larger menu size, then drops to the row's own.
			drawText(graphics, `+${stat.gain}`, right, centreY, { font: stat.popping ? UITheme.menu : UITheme.subheading, color: LEVEL_UP_GAIN, align: TextAlign.RIGHT });
		}
	}

	/** A dark-bordered bar: the empty track, then a fill as long as `ratio` of it - the unit sheet's bar. */
	private renderTrack(graphics: Graphics, x: number, y: number, width: number, ratio: number, fill: Color): void {
		graphics.fillColor(UITheme.menuBadgeRim).fillRectangle(new Rectangle(x - 1, y - 1, width + 2, EXPERIENCE_BAR_HEIGHT + 2));
		graphics.fillColor(EXPERIENCE_TRACK).fillRectangle(new Rectangle(x, y, width, EXPERIENCE_BAR_HEIGHT));

		const filled = Math.round(width * ratio);

		if (filled > 0) {
			graphics.fillColor(fill).fillRectangle(new Rectangle(x, y, filled, EXPERIENCE_BAR_HEIGHT));
		}
	}
}
