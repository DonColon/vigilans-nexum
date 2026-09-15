import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Display } from "@/core/graphics/Display";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { GameCoreService } from "@/core/service/GameCoreService";
import { OutcomeComponent } from "@/game/objective/components/OutcomeComponent";
import { OUTCOME_CONTINUE_KEY, OUTCOME_TITLE_KEY, outcomeAcceptsPress, outcomeBannerFrame, OutcomeBannerTheme, outcomeContinueBox } from "@/game/objective/view/OutcomeBanner";
import { drawBand, drawBanner, PHASE_TURN_KEY, PhaseBannerTheme } from "@/game/turn/view/PhaseBanner";
import { drawText } from "@/game/ui/view/UIPanel";

/**
 * Draws the outcome banner: the phase banner's band and flourishes, with the
 * turn in small text over "Victory" or "Defeat" in large, swept in as far as
 * the banner's clock says and then held. Once it takes a press, a line on a
 * narrower band under it says what the press does.
 *
 * Runs above the phase banner, so nothing sits on top of it while it is up.
 */
export class OutcomeRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): this {
		this.queries = {
			banners: new Query({ allowlist: [OutcomeComponent] })
		};

		return this;
	}

	public execute(): void {
		const entity = this.queries.banners.getSingleResult();

		if (entity === null || !this.assetStorage.hasSpritesheet(PhaseBannerTheme.divider)) {
			return;
		}

		const data = entity.getComponent(OutcomeComponent).read();
		const frame = outcomeBannerFrame(data.elapsed);
		const graphics = this.display.getLayer("ui");
		const viewport = this.display.getViewportDimension();

		drawBanner(graphics, this.assetStorage.getSpritesheet(PhaseBannerTheme.divider).getImage(), viewport, {
			label: i18n(PHASE_TURN_KEY, { turn: data.turn }),
			title: i18n(OUTCOME_TITLE_KEY[data.outcome]),
			titleColor: OutcomeBannerTheme.title[data.outcome],
			alpha: frame.alpha,
			offset: frame.offset
		});

		if (!outcomeAcceptsPress(data.elapsed)) {
			return;
		}

		const box = outcomeContinueBox(viewport);
		drawBand(graphics, box);

		drawText(graphics, i18n(OUTCOME_CONTINUE_KEY), Math.round(viewport.width / 2), Math.round(box.getPosition().y + box.getHeight() / 2), {
			font: OutcomeBannerTheme.continueFont,
			color: OutcomeBannerTheme.continueColor,
			align: TextAlign.CENTER
		});
	}
}
