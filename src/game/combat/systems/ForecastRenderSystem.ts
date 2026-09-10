import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { Query } from "@/core/ecs/Query";
import { Color } from "@/core/graphics/color/Color";
import { Graphics } from "@/core/graphics/rendering/Graphics";
import { FontStyleSettings } from "@/core/graphics/styles/text/FontStyle";
import { TextAlign, TextAlignType } from "@/core/graphics/styles/text/TextAlign";
import { i18n } from "@/core/i18n/I18n";
import { Line } from "@/core/math/geometry/Line";
import { Rectangle } from "@/core/math/geometry/Rectangle";
import { GameCoreService } from "@/core/service/GameCoreService";
import { GridComponent } from "@/game/map/components/GridComponent";
import { GridPositionComponent, GridPositionData } from "@/game/map/components/GridPositionComponent";
import { MapRenderSystem, MapView } from "@/game/map/systems/MapRenderSystem";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";
import { BattleForecast, CombatantForecast } from "@/game/combat/model/BattleForecast";
import { CombatTheme } from "@/game/combat/model/CombatTheme";
import { CombatSystem } from "@/game/combat/systems/CombatSystem";
import { ForecastComponent } from "@/game/combat/components/ForecastComponent";
import { drawPanel, drawText, uiAssetsReady } from "@/game/ui/model/UIPanel";
import { menuBeside } from "@/game/ui/model/UILayout";
import { UITheme } from "@/game/ui/model/UITheme";

/**
 * Draws the battle forecast: two stat columns - the attacker's on the left, the
 * target's counterattack on the right - with HP / damage / hit / crit down the
 * middle, an `x2` where a follow-up lands and `< >` around the attacker's weapon
 * when more than one is on offer. Runs after UIRenderSystem (which owns and
 * clears the "ui" layer) so it survives the frame.
 *
 * The panel is tucked against the tile being attacked, the same way a unit's
 * command menu is tucked against the unit - so the numbers land beside the two
 * units the player is looking at rather than across the map from them. It flips
 * to the other side of the tile, and is nudged inward, when it would run off the
 * screen (see `menuBeside`).
 *
 * The numbers are set in the menu font and everything that labels them - the
 * weapon names and the stat names down the middle - a step smaller in
 * `UITheme.subheading`, so the eye lands on the values first. The rest of the
 * hierarchy is carried by colour; see CombatTheme.
 */
export class ForecastRenderSystem extends MapRenderSystem {
	@GameCoreService(AssetStorage)
	private assetStorage!: AssetStorage;

	public initialize(): void {
		this.queries = {
			forecasts: new Query({ allowlist: [ForecastComponent] }),
			units: new Query({ allowlist: [UnitComponent, GridPositionComponent] }),
			grids: new Query({ allowlist: [GridComponent] })
		};
	}

	public execute(): void {
		const forecastEntity = this.queries.forecasts.getSingleResult();
		const view = this.mapView(this.queries.grids.getSingleResult());

		if (forecastEntity === null || view === null || !uiAssetsReady(this.assetStorage)) {
			return;
		}

		const data = forecastEntity.getComponent(ForecastComponent).read();

		// The panel only shows once a target is locked in; the `target` phase is
		// just the map cursor moving between enemies.
		if (data.phase !== "forecast") {
			return;
		}

		const attacker = this.unit(data.attackerId);
		const defender = this.unit(data.defenderId);

		if (attacker === null || defender === null) {
			return;
		}

		const attackerData = attacker.getComponent(UnitComponent).read();
		const weaponId = data.weaponIds[data.weaponIndex] ?? "";
		const weapon = attackerData.inventory.find((entry) => entry.id === weaponId)?.weapon ?? null;

		if (weapon === null) {
			return;
		}

		const defenderTile = defender.getComponent(GridPositionComponent).read();

		const forecast = CombatSystem.forecast(attackerData, attacker.getComponent(GridPositionComponent).read(), weapon, defender.getComponent(UnitComponent).read(), defenderTile, view.grid);

		this.render(this.display.getLayer("ui"), forecast, data.weaponIds.length > 1, view, defenderTile);
	}

	/** Top-left screen pixel of the tile being attacked - what the panel is tucked against. */
	private tileAnchor(view: MapView, tile: GridPositionData): { x: number; y: number } {
		return { x: view.origin.x + tile.column * view.cellSize, y: view.origin.y + tile.row * view.cellSize };
	}

	/** The unit with this id, out of the ones on the map right now. */
	private unit(id: string): Entity | null {
		return UnitSystem.byId(this.queries.units.getResult(), id);
	}

	private render(graphics: Graphics, forecast: BattleForecast, canCycle: boolean, view: MapView, defenderTile: GridPositionData): void {
		const viewport = this.display.getViewportDimension();
		const { width, padding, rowHeight: row, headerGap } = CombatTheme;

		const rows = 6; // name, weapon, HP, Dmg, Hit, Crit
		const height = padding * 2 + rows * row + headerGap;

		const box = menuBeside(viewport, this.tileAnchor(view, defenderTile), width, height, view.cellSize);
		const { x, y } = box.getPosition();

		drawPanel(graphics, this.assetStorage, new Rectangle(x, y, width, height));

		const centreX = x + width / 2;

		// Fire Emblem tints each half of the forecast in that combatant's faction colour.
		const inset = UITheme.nineSlice.corner / 2;
		graphics.fillColor(CombatTheme.factionWash[forecast.attacker.faction]).fillRectangle(new Rectangle(x + inset, y + inset, centreX - x - inset, height - 2 * inset));
		graphics.fillColor(CombatTheme.factionWash[forecast.defender.faction]).fillRectangle(new Rectangle(centreX, y + inset, x + width - inset - centreX, height - 2 * inset));

		const leftName = x + width * CombatTheme.columnCentre;
		const rightName = x + width * (1 - CombatTheme.columnCentre);
		const leftValue = centreX - CombatTheme.valueGap;
		const rightValue = centreX + CombatTheme.valueGap;

		let rowTop = y + padding;
		const centreOf = (top: number) => top + row / 2;

		// First name only, then the weapon.
		this.text(graphics, firstName(forecast.attacker.name), leftName, centreOf(rowTop), CombatTheme.factionHeading[forecast.attacker.faction], TextAlign.CENTER, UITheme.name);
		this.text(graphics, firstName(forecast.defender.name), rightName, centreOf(rowTop), CombatTheme.factionHeading[forecast.defender.faction], TextAlign.CENTER, UITheme.name);
		rowTop += row;

		// The name sits in the middle of its column and the chevrons either side of
		// it, at a fixed distance - so cycling swaps the name without shuffling them.
		const weaponCentreY = centreOf(rowTop);
		this.text(graphics, forecast.attacker.weaponName, leftName, weaponCentreY, canCycle ? CombatTheme.accent : CombatTheme.label, TextAlign.CENTER, UITheme.subheading);

		if (canCycle) {
			this.text(graphics, "<", leftName - CombatTheme.cycleGap, weaponCentreY, CombatTheme.accent, TextAlign.CENTER, UITheme.subheading);
			this.text(graphics, ">", leftName + CombatTheme.cycleGap, weaponCentreY, CombatTheme.accent, TextAlign.CENTER, UITheme.subheading);
		}

		const defends = forecast.defender.attacks > 0;
		this.text(graphics, defends ? forecast.defender.weaponName : "--", rightName, weaponCentreY, defends ? CombatTheme.label : CombatTheme.muted, TextAlign.CENTER, UITheme.subheading);
		rowTop += row;

		graphics
			.strokeColor(CombatTheme.label)
			.lineStyle({ width: 1 })
			.drawLine(new Line(x + padding, rowTop, x + width - padding, rowTop));
		rowTop += headerGap;

		const columns = { centreX, leftValue, rightValue };

		this.statRow(graphics, i18n("forecast.hp"), `${forecast.attacker.hp}`, `${forecast.defender.hp}`, centreOf(rowTop), columns);
		rowTop += row;

		this.damageRow(graphics, forecast, centreOf(rowTop), columns);
		rowTop += row;

		this.statRow(graphics, i18n("forecast.hit"), `${forecast.attacker.hit}%`, defends ? `${forecast.defender.hit}%` : "--", centreOf(rowTop), columns);
		rowTop += row;

		this.statRow(graphics, i18n("forecast.crit"), `${forecast.attacker.crit}%`, defends ? `${forecast.defender.crit}%` : "--", centreOf(rowTop), columns);
	}

	private statRow(graphics: Graphics, label: string, attackerValue: string, defenderValue: string, centreY: number, columns: { centreX: number; leftValue: number; rightValue: number }): void {
		this.text(graphics, label, columns.centreX, centreY, CombatTheme.label, TextAlign.CENTER, UITheme.subheading);
		this.text(graphics, attackerValue, columns.leftValue, centreY, attackerValue === "--" ? CombatTheme.muted : CombatTheme.value, TextAlign.RIGHT);
		this.text(graphics, defenderValue, columns.rightValue, centreY, defenderValue === "--" ? CombatTheme.muted : CombatTheme.value, TextAlign.LEFT);
	}

	private damageRow(graphics: Graphics, forecast: BattleForecast, centreY: number, columns: { centreX: number; leftValue: number; rightValue: number }): void {
		this.text(graphics, i18n("forecast.damage"), columns.centreX, centreY, CombatTheme.label, TextAlign.CENTER, UITheme.subheading);

		this.text(
			graphics,
			this.damageText(forecast.attacker),
			columns.leftValue,
			centreY,
			this.lethal(forecast.attacker, forecast.defender.hp) ? CombatTheme.lethal : CombatTheme.value,
			TextAlign.RIGHT
		);

		if (forecast.defender.attacks === 0) {
			this.text(graphics, "--", columns.rightValue, centreY, CombatTheme.muted, TextAlign.LEFT);
			return;
		}

		this.text(
			graphics,
			this.damageText(forecast.defender),
			columns.rightValue,
			centreY,
			this.lethal(forecast.defender, forecast.attacker.hp) ? CombatTheme.lethal : CombatTheme.value,
			TextAlign.LEFT
		);
	}

	private damageText(side: CombatantForecast): string {
		return side.attacks > 1 ? `${side.damage} x2` : `${side.damage}`;
	}

	private lethal(side: CombatantForecast, targetHp: number): boolean {
		return side.damage * Math.max(1, side.attacks) >= targetHp;
	}

	private text(graphics: Graphics, value: string, x: number, centreY: number, color: Color, align: TextAlignType, font: FontStyleSettings = UITheme.menu): void {
		drawText(graphics, value, x, centreY, { font, color, align });
	}
}

/** "Dardan Niveli" -> "Dardan". The forecast only has room for the given name. */
function firstName(name: string): string {
	return name.split(/\s+/)[0] ?? name;
}
