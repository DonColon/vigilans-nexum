import { Query } from "@/core/ecs/Query";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { TextBaseline } from "@/core/graphics/styles/text/TextBaseline";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { terrainName, tileInfoRows, TileInfoHud, TILE_INFO_HEIGHT } from "@/game/map/model/TileInfoHud";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { GridSystem } from "@/game/map/systems/GridSystem";

/**
 * Draws the terrain readout in the map's top-left corner: the name of the tile
 * under the cursor and what it costs and gives. It follows the cursor, so it
 * changes as the player moves over the map.
 *
 * On the "ui" layer above UIRenderSystem (which owns and clears that layer), so
 * it stays readable over an open menu and redraws itself every frame - the same
 * place the turn counter sits, directly underneath it.
 */
export class TileInfoRenderSystem extends MapRenderSystem {
	public initialize(): void {
		this.queries = {
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] }),
			grids: new Query({ allowlist: [GridComponent] })
		};
	}

	public execute(): void {
		const cursor = this.queries.cursors.getSingleResult();
		const view = this.mapView(this.queries.grids.getSingleResult());

		if (cursor === null || view === null) {
			return;
		}

		const tile = cursor.getComponent(GridPositionComponent).read();
		const terrain = GridSystem.getTerrain(view.grid, tile.column, tile.row);

		// The cursor is off the map - there is nothing to say about the tile.
		if (terrain === null) {
			return;
		}

		const graphics = this.display.getLayer("ui");
		const name = terrainName(terrain);
		const rows = tileInfoRows(terrain);

		graphics.fontStyle(TileInfoHud.font);

		const labelWidth = Math.max(...rows.map((row) => Math.ceil(graphics.measureText(row.label).width)));
		const valueWidth = Math.max(...rows.map((row) => Math.ceil(graphics.measureText(row.value).width)));
		const nameWidth = Math.ceil(graphics.measureText(name).width);

		const width = Math.max(TileInfoHud.minWidth, TileInfoHud.padding * 2 + Math.max(nameWidth, labelWidth + TileInfoHud.labelGap + valueWidth));

		const plateX = view.origin.x + TileInfoHud.inset;
		const plateY = view.origin.y + TileInfoHud.inset;

		graphics.fillColor(TileInfoHud.plate).fillRoundRectangle(new Rectangle(plateX, plateY, width, TILE_INFO_HEIGHT), 4);

		const left = plateX + TileInfoHud.padding;
		const right = plateX + width - TileInfoHud.padding;

		let rowTop = plateY + TileInfoHud.padding;

		this.text(graphics, name, left, rowTop, TileInfoHud.name, TextAlign.LEFT);
		rowTop += TileInfoHud.lineHeight;

		for (const row of rows) {
			this.text(graphics, row.label, left, rowTop, TileInfoHud.label, TextAlign.LEFT);
			this.text(graphics, row.value, right, rowTop, row.muted ? TileInfoHud.muted : TileInfoHud.value, TextAlign.RIGHT);
			rowTop += TileInfoHud.lineHeight;
		}
	}

	/**
	 * One row of the plate, sat on the optical centre of its line rather than the
	 * em-box centre - pixel fonts otherwise read high (see UIRenderSystem).
	 */
	private text(graphics: Graphics, value: string, x: number, rowTop: number, color: Color, align: TextAlignType): void {
		const size = parseInt(TileInfoHud.font.size ?? "16", 10);
		const baseline = Math.round(rowTop + TileInfoHud.lineHeight / 2 + (size * TileInfoHud.capRatio) / 2);

		graphics.fontStyle(TileInfoHud.font).textStyle({ align, baseline: TextBaseline.ALPHABETIC }).fillColor(color);
		graphics.fillText(value, x, baseline);
	}
}
