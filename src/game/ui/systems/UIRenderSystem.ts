import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query, QueryList } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { DialogComponent, DialogData } from "@/game/ui/components/DialogComponent";
import { MenuComponent, MenuData } from "@/game/ui/components/MenuComponent";
import { PopupComponent, PopupData } from "@/game/ui/components/PopupComponent";
import { BADGE_DIAMETER, drawBadge, drawDivider, drawMenuHighlight, drawPanel, drawText, uiAssetsReady } from "@/game/ui/model/UIPanel";
import { countWords, revealedWordCount, splitWords, wrapText } from "@/game/ui/model/TextReveal";
import { dialogBox, menuHeight, popupBox } from "@/game/ui/model/UILayout";
import { UITheme } from "@/game/ui/model/UITheme";

/**
 * Draws the UI layer: the menu panel first, the textbox over it, both framed
 * with the tinted Kenney art. Owns the layer, so it clears it every frame -
 * when nothing is open that clear is all it does, which is what wipes a box off
 * the screen the frame after its state is popped.
 *
 * Dialog text is always laid out in full; the words that have not been revealed
 * yet are drawn at a near-zero alpha instead of being left out, so the box never
 * changes size as it fills in.
 */
export class UIRenderSystem extends RenderSystem {
	protected queries!: QueryList;

	private blink = 0;

	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			dialogs: new Query({ allowlist: [DialogComponent, TransformComponent] }),
			menus: new Query({ allowlist: [MenuComponent, TransformComponent] }),
			popups: new Query({ allowlist: [PopupComponent, TransformComponent] })
		};

		this.blink = 0;
	}

	public execute(elapsed: number): void {
		const graphics = this.display.getLayer("ui");
		graphics.clearCanvas();

		const menus = this.queries.menus.getResult();
		const dialog = this.queries.dialogs.getSingleResult();
		const popup = this.queries.popups.getSingleResult();

		if ((menus.length === 0 && dialog === null && popup === null) || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		this.blink += elapsed;

		// Oldest first, so a submenu (created later) lands on top of its base menu.
		for (const menu of menus) {
			const position = menu.getComponent(TransformComponent).read();
			this.renderMenu(graphics, menu.getComponent(MenuComponent).read(), position.x, position.y);
		}

		if (dialog !== null) {
			const position = dialog.getComponent(TransformComponent).read();
			this.renderDialog(graphics, dialog.getComponent(DialogComponent).read(), position.x, position.y);
		}

		// Last, so a notice lands over whatever opened it.
		if (popup !== null) {
			const position = popup.getComponent(TransformComponent).read();
			this.renderPopup(graphics, popup.getComponent(PopupComponent).read(), position.x, position.y);
		}
	}

	private renderDialog(graphics: Graphics, data: DialogData, x: number, y: number): void {
		const viewport = this.display.getViewportDimension();
		const size = dialogBox(viewport);
		const box = new Rectangle(x, y, size.getWidth(), size.getHeight());

		drawPanel(graphics, this.assetStorage, box);

		const innerX = x + UITheme.padding;
		const innerWidth = box.getWidth() - 2 * UITheme.padding;

		// Every line - speaker included - is centred in its own lineHeight slot.
		let slotTop = y + UITheme.padding;

		// Whoever is talking on this page - a two-hander swaps the name as it goes.
		const speaker = data.speakers[data.pageIndex] ?? data.speaker;

		if (speaker.length > 0) {
			this.label(graphics, speaker, innerX, slotTop + UITheme.lineHeight / 2, UITheme.name, UITheme.speaker, TextAlign.LEFT);
		}

		slotTop += UITheme.lineHeight;

		graphics.fontStyle(UITheme.body);
		const lines = wrapText(data.pages[data.pageIndex] ?? "", innerWidth, (text) => graphics.measureText(text).width);
		const totalWords = countWords(lines);
		const visibleWords = data.revealAll ? totalWords : revealedWordCount(data.pageElapsed, UITheme.wordRevealDelay, totalWords);

		// Each line is drawn twice: once whole at the hidden alpha, then its
		// revealed prefix on top at full alpha. Left-aligned text means the prefix
		// lands exactly over its own words.
		let wordsBefore = 0;

		for (const [index, line] of lines.entries()) {
			const lineCentre = slotTop + index * UITheme.lineHeight + UITheme.lineHeight / 2;
			const words = splitWords(line);
			const shownHere = Math.max(0, Math.min(words.length, visibleWords - wordsBefore));

			this.label(graphics, line, innerX, lineCentre, UITheme.body, UITheme.textHidden, TextAlign.LEFT);

			if (shownHere > 0) {
				this.label(graphics, words.slice(0, shownHere).join(" "), innerX, lineCentre, UITheme.body, UITheme.text, TextAlign.LEFT);
			}

			wordsBefore += words.length;
		}

		const pageFull = visibleWords >= totalWords;
		const showChevron = pageFull && Math.floor(this.blink / 500) % 2 === 0;

		if (showChevron) {
			const glyph = data.pageIndex < data.pages.length - 1 ? "▼" : "■";
			this.label(graphics, glyph, x + box.getWidth() - UITheme.padding, y + box.getHeight() - UITheme.padding, UITheme.name, UITheme.hint, TextAlign.RIGHT);
		}
	}

	/**
	 * A notice: a heading and its lines, every one of them centred, with the
	 * blinking acknowledge mark in the corner. No reveal - a popup is a single
	 * short statement and drip-feeding it would only make it slower to read.
	 */
	private renderPopup(graphics: Graphics, data: PopupData, x: number, y: number): void {
		const hasTitle = data.title.length > 0;
		const size = popupBox(this.display.getViewportDimension(), data.lines.length, hasTitle);
		const box = new Rectangle(x, y, size.getWidth(), size.getHeight());

		drawPanel(graphics, this.assetStorage, box);

		const centreX = x + box.getWidth() / 2;
		let slotTop = y + UITheme.padding;

		if (hasTitle) {
			this.label(graphics, data.title, centreX, slotTop + UITheme.lineHeight / 2, UITheme.name, UITheme.speaker, TextAlign.CENTER);
			slotTop += UITheme.lineHeight;
		}

		for (const [index, line] of data.lines.entries()) {
			this.label(graphics, line, centreX, slotTop + index * UITheme.lineHeight + UITheme.lineHeight / 2, UITheme.body, UITheme.text, TextAlign.CENTER);
		}

		if (Math.floor(this.blink / 500) % 2 === 0) {
			this.label(graphics, "■", x + box.getWidth() - UITheme.padding, y + box.getHeight() - UITheme.padding / 2, UITheme.name, UITheme.hint, TextAlign.RIGHT);
		}
	}

	private renderMenu(graphics: Graphics, data: MenuData, x: number, y: number): void {
		const hasTitle = data.title.length > 0;
		const box = new Rectangle(x, y, data.width, menuHeight(data.items.length, hasTitle));

		drawPanel(graphics, this.assetStorage, box);

		let slotTop = y + UITheme.padding;

		if (hasTitle) {
			this.label(graphics, data.title, x + box.getWidth() / 2, slotTop + UITheme.lineHeight / 2, UITheme.name, UITheme.menuTitle, TextAlign.CENTER);
			slotTop += UITheme.lineHeight;
			drawDivider(graphics, this.assetStorage, x + UITheme.padding, slotTop, box.getWidth() - 2 * UITheme.padding);
			slotTop += UITheme.padding / 2;
		}

		// The bracket cursor sits a couple of pixels in from the panel keyline so
		// its arms never touch the frame.
		const inset = UITheme.nineSlice.corner / 2 + 2;

		// A left gutter for the badge discs, reserved for every row only when some
		// row actually carries one, so a plain menu is unchanged.
		const badged = data.badges.some((badge) => badge.length > 0);
		const textX = x + UITheme.padding + (badged ? BADGE_DIAMETER + 8 : 0);

		for (const [index, item] of data.items.entries()) {
			const rowTop = slotTop + index * UITheme.lineHeight;
			const centreY = rowTop + UITheme.lineHeight / 2;

			if (index === data.selectedIndex) {
				const row = new Rectangle(x + inset, rowTop + 1, box.getWidth() - 2 * inset, UITheme.lineHeight - 2);
				drawMenuHighlight(graphics, row);
			}

			const badge = data.badges[index] ?? "";

			if (badge.length > 0) {
				drawBadge(graphics, badge, x + UITheme.padding + BADGE_DIAMETER / 2, centreY);
			}

			const color = menuRowColor(index === data.selectedIndex, data.disabled[index] ?? false);
			this.label(graphics, item, textX, centreY, UITheme.menu, color, TextAlign.LEFT);

			const value = data.values[index] ?? "";

			if (value.length > 0) {
				this.label(graphics, value, x + box.getWidth() - UITheme.padding, centreY, UITheme.menu, color, TextAlign.RIGHT);
			}
		}
	}

	/** A line of text on its optical centre - see `drawText` in UIPanel. */
	private label(graphics: Graphics, value: string, x: number, centreY: number, font: FontStyleSettings, color: Color, align: TextAlignType): void {
		drawText(graphics, value, x, centreY, { font, color, align });
	}
}

/** The four states a menu row can be drawn in: live or greyed out, under the cursor or not. */
export function menuRowColor(selected: boolean, disabled: boolean): Color {
	if (disabled) {
		return selected ? UITheme.menuItemDisabledSelected : UITheme.menuItemDisabled;
	}

	return selected ? UITheme.menuItemSelected : UITheme.menuItem;
}
