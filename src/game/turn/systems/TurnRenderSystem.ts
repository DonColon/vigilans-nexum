import { AssetStorage } from "@/core/assets/AssetStorage";
import { Query } from "@/core/ecs/Query";
import { TextAlign } from "@/core/graphics/styles/text/TextAlign";
import { TextBaseline } from "@/core/graphics/styles/text/TextBaseline";
import { i18n } from "@/core/i18n/I18n";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { hudOnRight, hudPlateX, TILE_INFO_BOTTOM } from "@/game/map/view/TileInfoHud";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { TurnComponent } from "@/game/turn/components/TurnComponent";
import { TurnHud, turnDigits } from "@/game/turn/view/TurnHud";

/**
 * Draws the turn counter from `kenney-1bit` digit tiles, in the screen's top-left
 * corner under the terrain readout (see TileInfoHud). On the "ui" layer above
 * UIRenderSystem (which owns and clears that layer), so it stays visible over
 * menus and redraws itself every frame.
 */
export class TurnRenderSystem extends MapRenderSystem {
	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): this {
		this.queries = {
			turns: new Query({ allowlist: [TurnComponent] }),
			grids: new Query({ allowlist: [GridComponent] }),
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] })
		};

		return this;
	}

	public execute(): void {
		const turn = this.queries.turns.getSingleResult();
		const view = this.mapView(this.queries.grids.getSingleResult());
		const cursor = this.queries.cursors.getSingleResult()?.getComponent(GridPositionComponent).read() ?? null;

		if (turn === null || view === null || !this.assetStorage.hasSpritesheet(TurnHud.sheet)) {
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

		// At least as wide as the terrain readout above, so the two plates share a right edge.
		const width = Math.max(TurnHud.minWidth, TurnHud.paddingX * 2 + labelWidth + TurnHud.labelGap + digitsWidth);
		const height = TurnHud.padding * 2 + size;

		const onRight = cursor !== null && hudOnRight({ x: view.origin.x + cursor.column * view.cellSize, y: view.origin.y + cursor.row * view.cellSize }, view.cellSize);
		const plateX = hudPlateX(this.display.getViewportDimension().width, width, onRight);
		// Tucked under the terrain readout, which holds the top of the corner. Its
		// height is fixed, so this never shifts as the cursor moves.
		const plateY = TILE_INFO_BOTTOM;

		graphics.fillColor(TurnHud.plate).fillRoundRectangle(new Rectangle(plateX, plateY, width, height), TurnHud.radius);

		const y = plateY + TurnHud.padding;

		// Sit the label on the optical centre of the digit block rather than the
		// em-box centre - pixel fonts otherwise read high (see UIRenderSystem).
		const labelSize = parseInt(TurnHud.labelFont.size ?? "16", 10);
		const labelBaseline = Math.round(y + size / 2 + (labelSize * TurnHud.labelCapRatio) / 2);

		graphics.textStyle({ align: TextAlign.LEFT, baseline: TextBaseline.ALPHABETIC }).fillColor(TurnHud.label);
		graphics.fillText(label, plateX + TurnHud.paddingX, labelBaseline);

		// The digits keep to the right edge, so the count sits where the readout's values do.
		const x = plateX + width - TurnHud.paddingX - digitsWidth;

		for (const [index, frame] of digits.entries()) {
			graphics.drawTile(TurnHud.sheet, frame, x + index * step, y, TurnHud.scale);
		}
	}
}
