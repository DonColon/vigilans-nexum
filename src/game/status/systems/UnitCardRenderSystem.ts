import { Query } from "@/core/ecs/Query";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { TextBaseline } from "@/core/graphics/styles/text/TextBaseline";
import { GameStateManager } from "@/core/GameStateManager";
import { Polygon } from "@/core/math/geometry/Polygon";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { Vector2D } from "@/core/math/geometry/Vector2D";
import { GameCoreService } from "@/core/service/GameCoreService";
import { CursorComponent } from "@/game/map/components/CursorComponent";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent } from "@/game/map/components/GridPositionComponent";
import { MapState } from "@/game/map/states/MapState";
import { MapRenderSystem } from "@/game/map/systems/MapRenderSystem";
import { WalkComponent } from "@/game/movement/components/WalkComponent";
import { UnitCard, unitCardLines, unitCardPlacement } from "@/game/status/model/UnitCard";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitTheme } from "@/game/units/model/UnitTheme";
import { drawUnitToken } from "@/game/units/model/UnitToken";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Draws the hover card over whichever unit the map cursor is resting on - a
 * speech bubble above its head, an arrow down to the token: its name, class
 * and level, an HP bar with the numbers, and the weapon it has readied. It
 * follows the cursor, so it changes as the player moves over
 * the map, and it is up whenever the map itself is what the player is driving
 * - a picked-up unit's range included - and never over a menu, a forecast or
 * a screen pushed on top: those have the unit's numbers on them already, or
 * the player's eyes elsewhere.
 *
 * Nothing is drawn while a unit walks a move: input is locked, the token is
 * between tiles, and a card sat at its destination would give the move away
 * before it lands.
 *
 * On the "ui" layer right after UIRenderSystem (which owns and clears that
 * layer), below the corner HUDs - which it can sit next to but never needs to
 * cover.
 */
export class UnitCardRenderSystem extends MapRenderSystem {
	@GameCoreService(GameStateManager)
	private stateManager!: GameStateManager;

	public initialize(): void {
		this.queries = {
			cursors: new Query({ allowlist: [CursorComponent, GridPositionComponent] }),
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] }),
			walks: new Query({ allowlist: [WalkComponent] }),
			grids: new Query({ allowlist: [GridComponent] })
		};
	}

	public execute(): void {
		if (!(this.stateManager.peek() instanceof MapState) || this.queries.walks.getResult().length > 0) {
			return;
		}

		const cursor = this.queries.cursors.getSingleResult();
		const view = this.mapView(this.queries.grids.getSingleResult());

		if (cursor === null || view === null) {
			return;
		}

		const tile = cursor.getComponent(GridPositionComponent).read();
		const unit = UnitSystem.unitAt(this.queries.units.getResult(), tile.column, tile.row);

		if (unit === null) {
			return;
		}

		const sheet = unit.getComponent(UnitComponent).read();
		const lines = unitCardLines(sheet);

		const { origin, cellSize } = view;
		const tileRect = new Rectangle(origin.x + tile.column * cellSize, origin.y + tile.row * cellSize, cellSize, cellSize);
		const { box: card, below, anchorX } = unitCardPlacement(tileRect, this.display.getViewportDimension());

		const graphics = this.display.getLayer("ui");
		const { x, y } = card.getPosition();

		graphics.fillColor(UnitCard.plate).fillRoundRectangle(card, UnitCard.radius);
		this.renderArrow(graphics, card, below, anchorX);

		// The token on the left, centred on the name and class lines beside it.
		const tokenX = x + UnitCard.padding + UnitCard.tokenRadius;
		const tokenY = y + UnitCard.padding + UnitCard.lineHeight;

		drawUnitToken(graphics, sheet.faction, sheet.weapon?.type ?? null, new Vector2D(tokenX, tokenY), UnitCard.tokenRadius);

		const left = x + UnitCard.padding + 2 * UnitCard.tokenRadius + UnitCard.tokenGap;
		const right = x + card.getWidth() - UnitCard.padding;

		let rowTop = y + UnitCard.padding;

		this.text(graphics, lines.name, left, rowTop, UnitCard.name, TextAlign.LEFT);
		rowTop += UnitCard.lineHeight;

		this.text(graphics, lines.classLine, left, rowTop, UnitCard.label, TextAlign.LEFT);
		rowTop += UnitCard.lineHeight;

		// The HP row: the numbers on the right, the bar filling what is left of the line.
		graphics.fontStyle(UnitCard.font);
		const hpWidth = Math.ceil(graphics.measureText(lines.hp).width);
		const barWidth = right - hpWidth - UnitCard.padding - (x + UnitCard.padding);

		this.renderBar(graphics, x + UnitCard.padding, Math.round(rowTop + UnitCard.lineHeight / 2 - UnitCard.barHeight / 2), barWidth, lines.hpRatio, UnitTheme.faction[sheet.faction].body);
		this.text(graphics, lines.hp, right, rowTop, UnitCard.value, TextAlign.RIGHT);
		rowTop += UnitCard.lineHeight;

		this.text(graphics, lines.weapon, x + UnitCard.padding, rowTop, lines.unarmed ? UnitCard.muted : UnitCard.value, TextAlign.LEFT);
	}

	/**
	 * The arrow from the plate to the token: a small triangle off the bottom edge
	 * pointing down at the tile - or off the top edge pointing up, when the card
	 * had to go under the unit. Filled in the plate colour so the two read as one
	 * bubble; its base overlaps the plate by a pixel so no seam shows.
	 */
	private renderArrow(graphics: Graphics, card: Rectangle, below: boolean, anchorX: number): void {
		const { width, height } = UnitCard.arrow;
		const { y } = card.getPosition();
		const base = below ? y + 1 : y + card.getHeight() - 1;
		const tip = below ? y - height : y + card.getHeight() + height;

		graphics.fillColor(UnitCard.plate).fillPolygon(new Polygon([new Vector2D(anchorX - width / 2, base), new Vector2D(anchorX + width / 2, base), new Vector2D(anchorX, tip)]));
	}

	/** The HP bar: a dark border, the empty track, then the faction-coloured fill - the token's own bar, wider. */
	private renderBar(graphics: Graphics, x: number, y: number, width: number, ratio: number, fill: Color): void {
		if (width <= 0) {
			return;
		}

		graphics.fillColor(UnitCard.barOutline).fillRectangle(new Rectangle(x - 1, y - 1, width + 2, UnitCard.barHeight + 2));
		graphics.fillColor(UnitCard.track).fillRectangle(new Rectangle(x, y, width, UnitCard.barHeight));

		const filled = Math.round(width * ratio);

		if (filled > 0) {
			graphics.fillColor(fill).fillRectangle(new Rectangle(x, y, filled, UnitCard.barHeight));
		}
	}

	/**
	 * One row of the card, sat on the optical centre of its line rather than the
	 * em-box centre - pixel fonts otherwise read high (see TileInfoRenderSystem).
	 */
	private text(graphics: Graphics, value: string, x: number, rowTop: number, color: Color, align: TextAlignType): void {
		const size = parseInt(UnitCard.font.size ?? "16", 10);
		const baseline = Math.round(rowTop + UnitCard.lineHeight / 2 + (size * UnitCard.capRatio) / 2);

		graphics.fontStyle(UnitCard.font).textStyle({ align, baseline: TextBaseline.ALPHABETIC }).fillColor(color);
		graphics.fillText(value, x, baseline);
	}
}
