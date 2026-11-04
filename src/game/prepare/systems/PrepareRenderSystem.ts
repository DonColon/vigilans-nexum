import { Query } from "@/core/ecs/Query";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { activeMap, tileToScreen } from "@/game/map/rules/ActiveMap";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { PrepareComponent, PrepareMode } from "@/game/prepare/components/PrepareComponent";
import { PrepareOverlayTheme } from "@/game/prepare/view/PrepareMenus";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitById, unitsInWorld } from "@/game/units/rules/UnitLookup";

/**
 * Washes the deploy tiles while the preparations screen is up, and lights the
 * tile of the unit picked up in formation. On the background layer between
 * the terrain art (14) and the units (18), with the seize marker: part of the
 * ground, under the tokens.
 */
export class PrepareRenderSystem extends MapRenderSystem {
	public initialize(): this {
		this.queries = {
			records: new Query({ allowlist: [PrepareComponent] })
		};

		return this;
	}

	public execute(): void {
		const record = this.queries.records.getSingleResult();
		const map = activeMap(this.world);

		if (record === null || map === null) {
			return;
		}

		const data = record.getComponent(PrepareComponent).read();

		if (data.mode === PrepareMode.DONE) {
			return;
		}

		const graphics = this.display.getLayer("background");
		const { cellSize } = map.getComponent(GridComponent).read();

		for (const slot of data.slots) {
			const origin = tileToScreen(this.world, slot.column, slot.row);

			if (origin === null) {
				continue;
			}

			const tile = new Rectangle(origin.x, origin.y, cellSize, cellSize);
			graphics.fillColor(PrepareOverlayTheme.slot).fillRectangle(tile);
			graphics
				.strokeColor(PrepareOverlayTheme.edge)
				.lineStyle({ width: 1 })
				.strokeRectangle(new Rectangle(origin.x + 1, origin.y + 1, cellSize - 2, cellSize - 2));
		}

		if (data.picked === "") {
			return;
		}

		const picked = unitById(unitsInWorld(this.world), data.picked);

		if (picked === null || !picked.hasComponent(UnitComponent)) {
			return;
		}

		const position = picked.getComponent(GridPositionComponent).read();
		const origin = tileToScreen(this.world, position.column, position.row);

		if (origin !== null) {
			graphics.fillColor(PrepareOverlayTheme.picked).fillRectangle(new Rectangle(origin.x, origin.y, cellSize, cellSize));
		}
	}
}
