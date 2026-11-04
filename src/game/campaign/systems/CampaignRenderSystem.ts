import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { SmoothingQuality } from "@/core/graphics/rendering/SmoothingQuality";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { Dimension } from "@/core/math/geometry/Dimension";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { ChapterCardComponent, ChapterCardData } from "@/game/campaign/components/ChapterCardComponent";
import { SaveSlotComponent, SaveSlotData, SaveSlotSummary } from "@/game/campaign/components/SaveSlotComponent";
import { TitleComponent, TitleData } from "@/game/campaign/components/TitleComponent";
import { CHAPTER_BEGIN_KEY, CHAPTER_LABEL_KEY, chapterCardAcceptsPress, chapterCardAlpha, ChapterCardTheme } from "@/game/campaign/view/ChapterCard";
import {
	formatPlaytime,
	SaveSlotTheme,
	SLOT_CHAPTER_KEY,
	SLOT_EMPTY_KEY,
	SLOT_HEADING_KEY,
	SLOT_KEY,
	SLOT_PLAYTIME_KEY,
	SLOT_SAVED_KEY,
	slotHeadingY,
	slotPanels,
	slotThumbnailBox
} from "@/game/campaign/view/SaveSlots";
import { TITLE_TAGLINE_KEY, titleAlpha, TitleTheme } from "@/game/campaign/view/TitleScreen";
import { menuRowColor } from "@/game/ui/view/UIMenuPanel";
import { drawMenuHighlight, drawPanel, drawText, uiAssetsReady } from "@/game/ui/view/UIPanel";
import { UITheme } from "@/game/ui/view/UITheme";

/** The game's name, as the title screen shows it. Not a string to translate. */
const GAME_NAME = "VIGILANS NEXUM";

/**
 * Draws the title screen, the save slot list over it, and the chapter card -
 * whichever is up; none shares the screen with a map. All are a dark ground
 * with centred text, faded in by their clocks; the card adds "press to begin"
 * once it takes a press, and the slot list frames one panel per slot with
 * the saved screen's thumbnail beside the words about the run.
 *
 * On the background layer above GridRenderSystem (10), which owns and clears
 * it: the ground is painted over the whole layer, and with no map up there is
 * nothing under it to show through. The title's menu is drawn on the ui layer
 * by the UI feature.
 */
export class CampaignRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	/** The slots' thumbnails, decoded once per data URL; a save's picture never changes under the same URL. */
	private thumbnails = new Map<string, HTMLImageElement>();

	public initialize(): this {
		this.queries = {
			titles: new Query({ allowlist: [TitleComponent] }),
			cards: new Query({ allowlist: [ChapterCardComponent] }),
			slots: new Query({ allowlist: [SaveSlotComponent] })
		};

		this.thumbnails = new Map();

		return this;
	}

	public execute(): void {
		const title = this.queries.titles.getSingleResult();
		const card = this.queries.cards.getSingleResult();
		const slots = this.queries.slots.getSingleResult();

		if (title === null && card === null) {
			return;
		}

		const graphics = this.display.getLayer("background");
		const viewport = this.display.getViewportDimension();

		if (card !== null) {
			this.renderCard(graphics, viewport, card.getComponent(ChapterCardComponent).read());
		} else if (slots !== null) {
			this.renderSlots(graphics, viewport, slots.getComponent(SaveSlotComponent).read());
		} else if (title !== null) {
			this.renderTitle(graphics, viewport, title.getComponent(TitleComponent).read());
		}
	}

	/** The slot list: a heading for what it is for, then a panel per slot, the highlighted one bracketed. */
	private renderSlots(graphics: Graphics, viewport: Dimension, data: SaveSlotData): void {
		graphics.fillColor(TitleTheme.background).fillRectangle(new Rectangle(0, 0, viewport.width, viewport.height));

		const centreX = Math.round(viewport.width / 2);
		drawText(graphics, i18n(SLOT_HEADING_KEY[data.purpose]), centreX, slotHeadingY(viewport), { font: SaveSlotTheme.headingFont, color: SaveSlotTheme.heading, align: TextAlign.CENTER });

		const framed = uiAssetsReady(this.assetStorage);
		const panels = slotPanels(viewport, data.slots.length);

		for (const [index, slot] of data.slots.entries()) {
			const panel = panels[index];

			if (framed) {
				drawPanel(graphics, this.assetStorage, panel);
			} else {
				graphics.fillColor(UITheme.panelFill).fillRectangle(panel);
			}

			if (index === data.selectedIndex) {
				const inset = UITheme.nineSlice.corner / 2 + 2;
				drawMenuHighlight(graphics, new Rectangle(panel.getPosition().x + inset, panel.getPosition().y + inset, panel.getWidth() - 2 * inset, panel.getHeight() - 2 * inset));
			}

			this.renderSlot(graphics, panel, slot, index === data.selectedIndex, data.purpose === "continue" && slot.empty);
		}
	}

	/** One slot: its thumbnail on the left, and beside it its name, the chapter and the playtime with the date - or that it is empty. */
	private renderSlot(graphics: Graphics, panel: Rectangle, slot: SaveSlotSummary, selected: boolean, disabled: boolean): void {
		const thumbnail = slotThumbnailBox(panel);
		this.renderThumbnail(graphics, thumbnail, slot.snapshot);

		const textX = thumbnail.getPosition().x + thumbnail.getWidth() + UITheme.padding;
		const top = panel.getPosition().y + UITheme.padding;
		const line = (index: number) => top + index * UITheme.lineHeight + UITheme.lineHeight / 2;
		const color = menuRowColor(selected, disabled);

		drawText(graphics, i18n(SLOT_KEY, { number: slot.slot }), textX, line(0), { font: UITheme.name, color: UITheme.menuTitle });

		if (slot.empty) {
			drawText(graphics, i18n(SLOT_EMPTY_KEY), textX, line(1), { font: UITheme.menu, color });
			return;
		}

		const chapter = slot.number > 0 ? `${i18n(SLOT_CHAPTER_KEY, { number: slot.number })} - ${slot.title}` : slot.title;
		drawText(graphics, chapter, textX, line(1), { font: UITheme.menu, color });

		const when = slot.savedOn.length > 0 ? `   ${i18n(SLOT_SAVED_KEY, { date: slot.savedOn })}` : "";
		drawText(graphics, i18n(SLOT_PLAYTIME_KEY, { time: formatPlaytime(slot.playtime) }) + when, textX, line(2), { font: UITheme.subheading, color });
	}

	/** The saved screen, once its data URL has decoded; until then, and for a slot without one, a dark plate. */
	private renderThumbnail(graphics: Graphics, box: Rectangle, snapshot: string): void {
		graphics.fillColor(SaveSlotTheme.thumbnailGround).fillRectangle(box);

		const image = snapshot.length > 0 ? this.thumbnail(snapshot) : null;

		if (image !== null && image.complete && image.naturalWidth > 0) {
			graphics.imageSmoothing(SmoothingQuality.HIGH);
			graphics.drawImage(image, box.getPosition().x, box.getPosition().y, box.getWidth(), box.getHeight());
		}

		graphics.strokeColor(SaveSlotTheme.thumbnailEdge).lineStyle({ width: 1 }).strokeRectangle(box);
	}

	private thumbnail(snapshot: string): HTMLImageElement {
		let image = this.thumbnails.get(snapshot);

		if (image === undefined) {
			image = new Image();
			image.src = snapshot;
			this.thumbnails.set(snapshot, image);
		}

		return image;
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
