import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { RenderSystem } from "@/core/ecs/RenderSystem";
import { Display } from "@/core/graphics/Display";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { TurnHud, turnDigits } from "@/game/turn/model/TurnHud";

/**
 * Draws the turn counter in the top-left corner from `kenney-1bit` digit tiles.
 * On the "ui" layer above UIRenderSystem (which owns and clears that layer), so
 * it stays visible over menus and redraws itself every frame.
 */
export class TurnRenderSystem extends RenderSystem {
	@GameCoreService(Display)
	private display!: Display;

	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			turns: new Query({ allowlist: [TurnComponent] })
		};
	}

	public execute(): void {
		const turn = this.queries.turns.getSingleResult();

		if (turn === null || !this.assetStorage.hasSpritesheet(TurnHud.sheet)) {
			return;
		}

		const digits = turnDigits(turn.getComponent(TurnComponent).read().number);
		const size = TurnHud.glyph * TurnHud.scale;
		const step = size - TurnHud.kerning;

		const width = TurnHud.padding * 2 + step * (digits.length - 1) + size;
		const height = TurnHud.padding * 2 + size;

		const graphics = this.display.getLayer("ui");
		graphics.imageSmoothing();

		graphics.fillColor(TurnHud.plate).fillRoundRectangle(new Rectangle(TurnHud.margin, TurnHud.margin, width, height), 4);

		const x = TurnHud.margin + TurnHud.padding;
		const y = TurnHud.margin + TurnHud.padding;

		for (const [index, frame] of digits.entries()) {
			graphics.drawTile(TurnHud.sheet, frame, x + index * step, y, TurnHud.scale);
		}
	}
}
