import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Display } from "@/core/graphics/Display";
import { i18n } from "@/core/i18n/I18n";
import { GameCoreService } from "@/core/service/GameCoreService";
import { PhaseBannerComponent } from "@/game/turn/components/PhaseBannerComponent";
import { drawBanner, PHASE_TITLE_KEY, PHASE_TURN_KEY, phaseBannerFrame, PhaseBannerTheme } from "@/game/turn/view/PhaseBanner";

/**
 * Draws the phase banner - see `drawBanner` for the shape - with the turn in
 * small text over the phase in large, at the opacity and drift the banner
 * record's clock says, so it fades and slides exactly as far as
 * `PhaseBannerSystem` has counted.
 *
 * Runs after UIRenderSystem (which owns and clears the "ui" layer) and above
 * the turn counter, so nothing sits on top of it while it is up.
 */
export class PhaseBannerRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): this {
		this.queries = {
			banners: new Query({ allowlist: [PhaseBannerComponent] })
		};

		return this;
	}

	public execute(): void {
		const entity = this.queries.banners.getSingleResult();

		if (entity === null || !this.assetStorage.hasSpritesheet(PhaseBannerTheme.divider)) {
			return;
		}

		const data = entity.getComponent(PhaseBannerComponent).read();
		const frame = phaseBannerFrame(data.elapsed);

		drawBanner(this.display.getLayer("ui"), this.assetStorage.getSpritesheet(PhaseBannerTheme.divider).getImage(), this.display.getViewportDimension(), {
			label: i18n(PHASE_TURN_KEY, { turn: data.turn }),
			title: i18n(PHASE_TITLE_KEY[data.faction]),
			titleColor: PhaseBannerTheme.title[data.faction],
			alpha: frame.alpha,
			offset: frame.offset
		});
	}
}
