import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Display } from "@/core/graphics/Display";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { GameCoreService } from "@/core/service/GameCoreService";
import { PhaseBannerComponent } from "@/game/turn/components/PhaseBannerComponent";
import { PHASE_TITLE_KEY, PHASE_TURN_KEY, phaseBannerBox, phaseBannerFrame, PhaseBannerTheme } from "@/game/turn/model/PhaseBanner";
import { tint } from "@/game/ui/model/NineSlice";
import { drawText } from "@/game/ui/model/UIPanel";

/**
 * Draws the phase banner: a band across the middle of the screen, fading out
 * towards both edges, with the turn in small text over the phase in large, and
 * a gold flourish pointing in at the text from either side. The whole thing is
 * drawn at the opacity and drift the banner record's clock says, so it fades
 * and slides exactly as far as `PhaseBannerSystem` has counted.
 *
 * Runs after UIRenderSystem (which owns and clears the "ui" layer) and above
 * the turn counter, so nothing sits on top of it while it is up.
 */
export class PhaseBannerRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			banners: new Query({ allowlist: [PhaseBannerComponent] })
		};
	}

	public execute(): void {
		const entity = this.queries.banners.getSingleResult();

		if (entity === null || !this.assetStorage.hasSpritesheet(PhaseBannerTheme.divider)) {
			return;
		}

		const data = entity.getComponent(PhaseBannerComponent).read();
		const frame = phaseBannerFrame(data.elapsed);

		if (frame.alpha <= 0) {
			return;
		}

		const graphics = this.display.getLayer("ui");
		const viewport = this.display.getViewportDimension();
		const box = phaseBannerBox(viewport);
		const { x, y } = box.getPosition();

		graphics.alpha(frame.alpha);

		// The band: solid in the middle, gone by the screen's edges.
		const gradient = graphics.createLinearGradient(x, 0, x + box.getWidth(), 0);
		gradient.addColorStop(0, PhaseBannerTheme.bandEdge.asHEX());
		gradient.addColorStop(PhaseBannerTheme.bandFade, PhaseBannerTheme.band.asHEX());
		gradient.addColorStop(1 - PhaseBannerTheme.bandFade, PhaseBannerTheme.band.asHEX());
		gradient.addColorStop(1, PhaseBannerTheme.bandEdge.asHEX());
		graphics.fillGradient(gradient).fillRectangle(box);

		const label = i18n(PHASE_TURN_KEY, { turn: data.turn });
		const title = i18n(PHASE_TITLE_KEY[data.faction]);

		const labelSize = parseInt(PhaseBannerTheme.labelFont.size ?? "24", 10);
		const titleSize = parseInt(PhaseBannerTheme.titleFont.size ?? "48", 10);

		const centreX = Math.round(viewport.width / 2 + frame.offset);
		const labelY = y + PhaseBannerTheme.padding + labelSize / 2;
		const titleY = y + PhaseBannerTheme.padding + labelSize + PhaseBannerTheme.lineGap + titleSize / 2;

		drawText(graphics, label, centreX, labelY, { font: PhaseBannerTheme.labelFont, color: PhaseBannerTheme.label, align: TextAlign.CENTER });
		drawText(graphics, title, centreX, titleY, { font: PhaseBannerTheme.titleFont, color: PhaseBannerTheme.title[data.faction], align: TextAlign.CENTER });

		// The flourishes clear the wider of the two lines, whichever that is.
		const labelWidth = graphics.fontStyle(PhaseBannerTheme.labelFont).measureText(label).width;
		const titleWidth = graphics.fontStyle(PhaseBannerTheme.titleFont).measureText(title).width;
		const reach = Math.ceil(Math.max(labelWidth, titleWidth) / 2) + PhaseBannerTheme.flourishGap;

		const flourishY = Math.round(y + box.getHeight() / 2);

		this.drawFlourish(graphics, centreX - reach - PhaseBannerTheme.flourishWidth, flourishY, false);
		this.drawFlourish(graphics, centreX + reach, flourishY, true);

		graphics.alpha(1);
	}

	/**
	 * One fading flourish, `PhaseBannerTheme.flourishWidth` wide from `x`, its
	 * middle on `centreY`. The art's tip - the ring and the cross - sits at its
	 * right end, so the left-hand one is drawn as it is and the right-hand one
	 * mirrored, both tips pointing at the text. The tip keeps its proportions;
	 * only the fading tail is stretched to make up the length.
	 */
	private drawFlourish(graphics: Graphics, x: number, centreY: number, mirrored: boolean): void {
		const image = this.assetStorage.getSpritesheet(PhaseBannerTheme.divider).getImage();
		const tinted = tint(image, PhaseBannerTheme.flourish);

		const scale = PhaseBannerTheme.flourishScale;
		const width = PhaseBannerTheme.flourishWidth;
		const height = Math.round(image.height * scale);
		const top = Math.round(centreY - height / 2);

		const tip = PhaseBannerTheme.flourishTip;
		const tipWidth = Math.round(tip * scale);
		const tail = image.width - tip;
		const tailWidth = width - tipWidth;

		graphics.imageSmoothing();
		graphics.save();

		if (mirrored) {
			graphics.translate(x + width, top);
			graphics.scale(-1, 1);
		} else {
			graphics.translate(x, top);
		}

		graphics.drawImage(tinted, 0, 0, tail, image.height, 0, 0, tailWidth, height);
		graphics.drawImage(tinted, tail, 0, tip, image.height, tailWidth, 0, tipWidth, height);

		graphics.restore();
	}
}
