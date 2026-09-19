import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ChapterCardComponent, ChapterCardData } from "@/game/campaign/components/ChapterCardComponent";
import { TitleComponent, TitleData } from "@/game/campaign/components/TitleComponent";
import { CHAPTER_BEGIN_KEY, CHAPTER_LABEL_KEY, chapterCardAcceptsPress, chapterCardAlpha, ChapterCardTheme } from "@/game/campaign/view/ChapterCard";
import { TITLE_TAGLINE_KEY, titleAlpha, TitleTheme } from "@/game/campaign/view/TitleScreen";
import { drawText } from "@/game/ui/view/UIPanel";

/** The game's name, as the title screen shows it. Not a string to translate. */
const GAME_NAME = "VIGILANS NEXUM";

/**
 * Draws the title screen and the chapter card - whichever is up; neither
 * shares the screen with a map. Both are a dark ground with centred text,
 * faded in by their clocks; the card adds "press to begin" once it takes a
 * press.
 *
 * On the background layer above GridRenderSystem (10), which owns and clears
 * it: the ground is painted over the whole layer, and with no map up there is
 * nothing under it to show through. The title's menu is drawn on the ui layer
 * by the UI feature.
 */
export class CampaignRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	public initialize(): this {
		this.queries = {
			titles: new Query({ allowlist: [TitleComponent] }),
			cards: new Query({ allowlist: [ChapterCardComponent] })
		};

		return this;
	}

	public execute(): void {
		const title = this.queries.titles.getSingleResult();
		const card = this.queries.cards.getSingleResult();

		if (title === null && card === null) {
			return;
		}

		const graphics = this.display.getLayer("background");
		const viewport = this.display.getViewportDimension();

		if (card !== null) {
			this.renderCard(graphics, viewport, card.getComponent(ChapterCardComponent).read());
		} else if (title !== null) {
			this.renderTitle(graphics, viewport, title.getComponent(TitleComponent).read());
		}
	}

	private renderTitle(graphics: Graphics, viewport: Dimension, data: TitleData): void {
		graphics.fillColor(TitleTheme.background).fillRectangle(new Rectangle(0, 0, viewport.width, viewport.height));

		const alpha = titleAlpha(data.elapsed);
		const centreX = Math.round(viewport.width / 2);
		const nameY = Math.round(viewport.height * TitleTheme.nameY);

		graphics.alpha(alpha);
		drawText(graphics, GAME_NAME, centreX, nameY, { font: TitleTheme.nameFont, color: TitleTheme.name, align: TextAlign.CENTER });
		drawText(graphics, i18n(TITLE_TAGLINE_KEY), centreX, nameY + TitleTheme.taglineGap, { font: TitleTheme.taglineFont, color: TitleTheme.tagline, align: TextAlign.CENTER });
		graphics.alpha(1);
	}

	private renderCard(graphics: Graphics, viewport: Dimension, data: ChapterCardData): void {
		graphics.fillColor(ChapterCardTheme.background).fillRectangle(new Rectangle(0, 0, viewport.width, viewport.height));

		const alpha = chapterCardAlpha(data.elapsed);
		const centreX = Math.round(viewport.width / 2);
		const titleY = Math.round(viewport.height * ChapterCardTheme.titleY);

		graphics.alpha(alpha);
		drawText(graphics, i18n(CHAPTER_LABEL_KEY, { number: data.number }), centreX, titleY - ChapterCardTheme.labelGap, {
			font: ChapterCardTheme.labelFont,
			color: ChapterCardTheme.label,
			align: TextAlign.CENTER
		});
		drawText(graphics, data.title, centreX, titleY, { font: ChapterCardTheme.titleFont, color: ChapterCardTheme.title, align: TextAlign.CENTER });

		if (chapterCardAcceptsPress(data.elapsed)) {
			drawText(graphics, i18n(CHAPTER_BEGIN_KEY), centreX, titleY + ChapterCardTheme.beginGap, {
				font: ChapterCardTheme.beginFont,
				color: ChapterCardTheme.begin,
				align: TextAlign.CENTER
			});
		}

		graphics.alpha(1);
	}
}
