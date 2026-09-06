import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query, QueryList } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformComponent } from "@/core/ecs/components/TransformComponent";
import { Color } from "@/core/graphics/color/Color";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { TextBaseline } from "@/core/graphics/styles/text/TextBaseline";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { DialogComponent, DialogData } from "@/game/ui/components/DialogComponent";
import { MenuComponent, MenuData } from "@/game/ui/components/MenuComponent";
import { drawDivider, drawMenuHighlight, drawPanel, uiAssetsReady } from "@/game/ui/model/UIPanel";
import { countWords, revealedWordCount, splitWords, wrapText } from "@/game/ui/model/TextReveal";
import { dialogBox, menuHeight } from "@/game/ui/model/UILayout";
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
			menus: new Query({ allowlist: [MenuComponent, TransformComponent] })
		};

		this.blink = 0;
	}

	public execute(elapsed: number): void {
		const graphics = this.display.getLayer("ui");
		graphics.clearCanvas();

		const menu = this.queries.menus.getSingleResult();
		const dialog = this.queries.dialogs.getSingleResult();

		if ((menu === null && dialog === null) || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		this.blink += elapsed;

		if (menu !== null) {
			const position = menu.getComponent(TransformComponent).read();
			this.renderMenu(graphics, menu.getComponent(MenuComponent).read(), position.x, position.y);
		}

		if (dialog !== null) {
			const position = dialog.getComponent(TransformComponent).read();
			this.renderDialog(graphics, dialog.getComponent(DialogComponent).read(), position.x, position.y);
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

		if (data.speaker.length > 0) {
			this.label(graphics, data.speaker, innerX, slotTop + UITheme.lineHeight / 2, UITheme.name, UITheme.speaker, TextAlign.LEFT);
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

		for (const [index, item] of data.items.entries()) {
			const rowTop = slotTop + index * UITheme.lineHeight;

			if (index === data.selectedIndex) {
				const row = new Rectangle(x + inset, rowTop + 1, box.getWidth() - 2 * inset, UITheme.lineHeight - 2);
				drawMenuHighlight(graphics, row);
			}

			const color = index === data.selectedIndex ? UITheme.menuItemSelected : UITheme.menuItem;
			this.label(graphics, item, x + UITheme.padding, rowTop + UITheme.lineHeight / 2, UITheme.menu, color, TextAlign.LEFT);
		}
	}

	/**
	 * Draws one line of text with its optical centre (the middle of the cap
	 * height, not the em box) on `centreY`. Pixel fonts sit oddly in the em box,
	 * so `textBaseline: "middle"` leaves them looking high or low; this places the
	 * baseline by hand from the font's cap ratio instead.
	 */
	private label(graphics: Graphics, value: string, x: number, centreY: number, font: FontStyleSettings, color: Color, align: TextAlignType): void {
		const size = parseInt(font.size ?? "16", 10);
		const baseline = Math.round(centreY + (size * UITheme.capRatio) / 2);

		graphics.fontStyle(font).textStyle({ align, baseline: TextBaseline.ALPHABETIC }).fillColor(color);
		graphics.fillText(value, x, baseline);
	}
}
