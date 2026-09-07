import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { TransformSystem } from "@/core/ecs/systems/TransformSystem";
import { World } from "@/core/ecs/World";
import { Display } from "@/core/graphics/Display";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { TextBaseline } from "@/core/graphics/styles/text/TextBaseline";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent } from "@/game/map/components/GridComponent";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { TurnHud, turnDigits } from "@/game/turn/model/TurnHud";

/**
 * Draws the turn counter tucked into the map's top-left corner from
 * `kenney-1bit` digit tiles. On the "ui" layer above UIRenderSystem (which owns
 * and clears that layer), so it stays visible over menus and redraws itself
 * every frame.
 */
export class TurnRenderSystem extends RenderSystem {
	@GameCoreService(World)
	private world!: World;

	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			turns: new Query({ allowlist: [TurnComponent] }),
			grids: new Query({ allowlist: [GridComponent] })
		};
	}

	public execute(): void {
		const turn = this.queries.turns.getSingleResult();
		const map = this.queries.grids.getSingleResult();

		if (turn === null || map === null || !this.assetStorage.hasSpritesheet(TurnHud.sheet)) {
			return;
		}

		const transforms = this.world.getSystem(TransformSystem) as TransformSystem;
		const origin = transforms.getWorldPosition(map);

		if (origin === null) {
			return;
		}

		const digits = turnDigits(turn.getComponent(TurnComponent).read().number);
		const size = TurnHud.glyph * TurnHud.scale;
		const step = size - TurnHud.kerning;
		const digitsWidth = step * (digits.length - 1) + size;

		const graphics = this.display.getLayer("ui");
		graphics.imageSmoothing();

		const label = i18n(TurnHud.labelKey);
		graphics.fontStyle(TurnHud.labelFont);
		const labelWidth = Math.ceil(graphics.measureText(label).width);

		const width = TurnHud.padding * 2 + labelWidth + TurnHud.labelGap + digitsWidth;
		const height = TurnHud.padding * 2 + size;

		const plateX = origin.x + TurnHud.inset;
		const plateY = origin.y + TurnHud.inset;

		graphics.fillColor(TurnHud.plate).fillRoundRectangle(new Rectangle(plateX, plateY, width, height), 4);

		const y = plateY + TurnHud.padding;

		// Sit the label on the optical centre of the digit block rather than the
		// em-box centre - pixel fonts otherwise read high (see UIRenderSystem).
		const labelSize = parseInt(TurnHud.labelFont.size ?? "16", 10);
		const labelBaseline = Math.round(y + size / 2 + (labelSize * TurnHud.labelCapRatio) / 2);

		graphics.textStyle({ align: TextAlign.LEFT, baseline: TextBaseline.ALPHABETIC }).fillColor(TurnHud.label);
		graphics.fillText(label, plateX + TurnHud.padding, labelBaseline);

		const x = plateX + TurnHud.padding + labelWidth + TurnHud.labelGap;

		for (const [index, frame] of digits.entries()) {
			graphics.drawTile(TurnHud.sheet, frame, x + index * step, y, TurnHud.scale);
		}
	}
}
