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
import { OptionsComponent } from "@/game/options/components/OptionsComponent";
import { choiceOf, OptionDefinition } from "@/core/options/Option";
import { OptionId } from "@/game/options/model/GameOptions";
import { OPTIONS_ARROW_GAP, OPTIONS_PLATE, OPTIONS_VALUE_WIDTH, optionsPanel } from "@/game/options/model/OptionsScreen";
import { OptionsService } from "@/core/options/OptionsService";
import { drawMenuHighlight, drawPanel, drawText, uiAssetsReady } from "@/game/ui/model/UIPanel";
import { UITheme } from "@/game/ui/model/UITheme";
import { menuRowColor } from "@/game/ui/systems/UIRenderSystem";

/**
 * Draws the options screen: one row per setting, its name on the left and what
 * it is currently on along the right. The highlighted row gets the menu's own
 * bracket cursor and a `<` `>` pair around its value, which is the whole of the
 * instruction for how to change it.
 *
 * Runs after UIRenderSystem (which owns and clears the "ui" layer) and above the
 * corner HUDs, so the screen covers them the way a full screen should.
 */
export class OptionsRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	@GameCoreService(OptionsService)
	private options!: OptionsService;

	public initialize(): void {
		this.queries = {
			screens: new Query({ allowlist: [OptionsComponent] })
		};
	}

	public execute(): void {
		const entity = this.queries.screens.getSingleResult();

		if (entity === null || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		const data = entity.getComponent(OptionsComponent).read();
		const definitions = data.optionIds.map((id) => this.options.definitionOf(id as OptionId)).filter((definition): definition is OptionDefinition => definition !== null);

		const sections = new Set(definitions.map((definition) => definition.section));

		const graphics = this.display.getLayer("ui");
		const panel = optionsPanel(this.display.getViewportDimension(), definitions.length, sections.size);

		// Solid plate first, the ornate frame over it - the Kenney panel body alone
		// is too translucent for rows of small text over a busy map.
		graphics.fillColor(OPTIONS_PLATE).fillRectangle(panel);
		drawPanel(graphics, this.assetStorage, panel);

		const { x, y } = panel.getPosition();
		let rowTop = y + UITheme.padding;

		this.label(graphics, i18n("options.title"), x + panel.getWidth() / 2, rowTop + UITheme.lineHeight / 2, UITheme.menuTitle, TextAlign.CENTER, UITheme.name);
		rowTop += UITheme.lineHeight + UITheme.padding / 2;

		if (definitions.length === 0) {
			this.label(graphics, i18n("options.empty"), x + panel.getWidth() / 2, rowTop + UITheme.lineHeight / 2, UITheme.hint, TextAlign.CENTER, UITheme.menu);
			return;
		}

		// The cursor sits a couple of pixels in from the panel keyline so its arms
		// never touch the frame - the same inset the menus use.
		const inset = UITheme.nineSlice.corner / 2 + 2;
		// The chevrons are pinned inside the padding and the value sits between them,
		// so neither arm ever lands on the frame however wide the panel is.
		const rightArrowX = x + panel.getWidth() - UITheme.padding;
		const valueCentreX = rightArrowX - OPTIONS_ARROW_GAP - OPTIONS_VALUE_WIDTH / 2;
		const leftArrowX = valueCentreX - OPTIONS_VALUE_WIDTH / 2 - OPTIONS_ARROW_GAP;

		// Rows and headings share the same run of lines, but only rows can be
		// selected - so the line a row lands on is its index plus every heading
		// drawn above it, not its index alone.
		let line = 0;
		let section: string | undefined;

		for (const [index, definition] of definitions.entries()) {
			if (definition.section !== section) {
				section = definition.section;

				this.label(
					graphics,
					i18n(`options.section.${section}`),
					x + UITheme.padding,
					rowTop + line * UITheme.lineHeight + UITheme.lineHeight / 2,
					UITheme.menuTitle,
					TextAlign.LEFT,
					UITheme.subheading
				);

				line++;
			}

			const top = rowTop + line * UITheme.lineHeight;
			const centreY = top + UITheme.lineHeight / 2;
			const selected = index === data.selectedIndex;

			line++;

			if (selected) {
				drawMenuHighlight(graphics, new Rectangle(x + inset, top + 1, panel.getWidth() - 2 * inset, UITheme.lineHeight - 2));
			}

			const color = menuRowColor(selected, false);

			this.label(graphics, definition.label(), x + UITheme.padding, centreY, color, TextAlign.LEFT, UITheme.menu);
			this.label(graphics, choiceOf(definition, this.options.get(definition.id)).label(), valueCentreX, centreY, color, TextAlign.CENTER, UITheme.menu);

			// The chevrons say "this one is the row you can change", and only the
			// highlighted row can be.
			if (selected) {
				this.label(graphics, "<", leftArrowX, centreY, UITheme.menuTitle, TextAlign.RIGHT, UITheme.menu);
				this.label(graphics, ">", rightArrowX, centreY, UITheme.menuTitle, TextAlign.RIGHT, UITheme.menu);
			}
		}
	}

	/** A line of text on its optical centre - see `drawText` in UIPanel. */
	private label(graphics: Graphics, value: string, x: number, centreY: number, color: Color, align: TextAlignType, font: FontStyleSettings): void {
		drawText(graphics, value, x, centreY, { font, color, align });
	}
}
