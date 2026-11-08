import { test, expect, suite } from "vitest";
import { AssetStorage } from "@/core/assets/AssetStorage";
import { ServiceRegistry } from "@/core/service/ServiceRegistry";
import { attackSpeed, computeStrike, doublesAt } from "@/game/combat/rules/CombatMath";
import { chapterNumber, parseCampaign } from "@/game/campaign/content/Campaigns";
import { GridComponent } from "@/game/map/components/GridComponent";
import { isPassable, Terrain } from "@/game/map/content/Terrain";
import { parseTileMapDocument, TileMapDocument } from "@/game/map/content/TileMapFormat";
import { attackableTiles, reachableTiles, tileKey } from "@/game/movement/rules/Pathfinding";
import { behaviourOnTurn, EnemyBehaviour } from "@/game/ai/content/Behaviours";
import { UnitData, UnitFaction } from "@/game/units/components/UnitComponent";
import { deploymentAsset, DeploymentDocument, DeploymentPlacement, parseDeployment, placementId } from "@/game/units/content/Deployments";
import { buildUnit, placedUnit, UnitDocument } from "@/game/units/content/UnitSheets";
import { Entity } from "@/core/ecs/Entity";
import { enemiesOf } from "@/game/units/rules/UnitLookup";
import campaignDocument from "@/assets/data/campaign/campaign.json";

/**
 * The three fights of chapter 1 as shipped: the campaign sheet, both maps and
 * the deployments. Whether the documents fit together, and that the numbers come
 * out the way the level is designed to play.
 */
suite("Level 01 Test Suite", () => {
	const assets = ServiceRegistry.get<AssetStorage>(AssetStorage.name);
	const map = parseTileMapDocument(assets.getJson<TileMapDocument>("map-market-square"));
	const grid = GridComponent.fromTileMap(map, 32);
	const terrain = (column: number, row: number) => GridComponent.terrainAt(grid, column, row);

	const sheet = (scenario: string) => parseDeployment(assets.getJson(deploymentAsset(scenario))) as DeploymentDocument;
	const place = (placement: DeploymentPlacement): UnitData => placedUnit(buildUnit(assets.getJson<UnitDocument>(`unit-${placement.unit}`)), placement);
	const placed = (scenario: string, id: string) => place(sheet(scenario).units.find((placement) => placementId(placement) === id) as DeploymentPlacement);

	suite("The campaign", () => {
		test("All three fights are chapter 1, and they are the whole campaign", () => {
			const campaign = parseCampaign(campaignDocument);

			expect(campaign.chapters.map((chapter) => chapter.id)).toStrictEqual(["bellum-duel", "bellum-brawl", "bellum-soldier"]);
			expect(chapterNumber(campaign, "bellum-duel")).toBe(1);
			expect(chapterNumber(campaign, "bellum-brawl")).toBe(1);
			expect(chapterNumber(campaign, "bellum-soldier")).toBe(1);
			expect(chapterNumber(campaign, "nowhere")).toBe(0);
		});

		test("The first entry cannot continue a chapter", () => {
			expect(() => parseCampaign({ ...campaignDocument, chapters: [{ ...campaignDocument.chapters[1] }] })).toThrow(/continues/);
		});
	});

	suite("The market square", () => {
		test("Is the Tiled map at its full size, with the park, the crate and the town hall where they were drawn", () => {
			expect(map).toMatchObject({ columns: 31, rows: 31 });
			expect(terrain(15, 12)).toBe(Terrain.TREE); // a tree of the park
			expect(terrain(14, 12)).toBe(Terrain.BUSH); // a bush
			expect(terrain(15, 15)).toBe(Terrain.PLAIN); // the park's grass
			expect(terrain(13, 11)).toBe(Terrain.PLAIN); // the plaza ring, drawn as empty cells
			expect(terrain(15, 1)).toBe(Terrain.WALL); // an empty cell inside the town hall's roof
			expect(terrain(15, 5)).toBe(Terrain.WALL); // the town hall
			expect(terrain(9, 24)).toBe(Terrain.FORT); // the fruit crate
		});
	});

	for (const scenario of ["bellum-duel", "bellum-brawl"]) {
		suite(`The ${scenario} deployment`, () => {
			const { units, preparations, objective } = sheet(scenario);

			test("Everyone stands on open ground on a tile of their own, and the army is fixed", () => {
				for (const placement of units) {
					expect(isPassable(terrain(placement.column, placement.row) as (typeof Terrain)[keyof typeof Terrain]), placementId(placement)).toBe(true);
				}

				expect(new Set(units.map((placement) => tileKey(placement.column, placement.row))).size).toBe(units.length);
				expect(preparations).toBe(false);
			});

			test("Its target is on the map, on the enemy's side", () => {
				const target = units.find((placement) => placementId(placement) === objective?.target) as DeploymentPlacement;

				expect(place(target).faction).toBe(UnitFaction.ENEMY);
			});

			test("Every fighter can walk to every other", () => {
				const [first, ...rest] = units.filter((placement) => placement.spectator !== true);
				const reached = new Set(reachableTiles(grid, { column: first.column, row: first.row }, 10_000, new Set()).map((tile) => tileKey(tile.column, tile.row)));

				for (const placement of rest) {
					expect(reached.has(tileKey(placement.column, placement.row)), placementId(placement)).toBe(true);
				}
			});
		});
	}

	suite("The duel", () => {
		const dardan = placed("bellum-duel", "dardan-niveli");
		const hasan = placed("bellum-duel", "hasan-duel");
		const strike = (attacker: UnitData, weapon: UnitData["weapon"], defender: UnitData, ground: (typeof Terrain)[keyof typeof Terrain]) =>
			computeStrike({ attacker, attackerWeapon: weapon as NonNullable<UnitData["weapon"]>, defender, defenderWeapon: defender.weapon, defenderTerrain: ground });

		test("Dardan carries the piece of wood readied and three stones, under their story names", () => {
			expect(dardan.inventory.map((entry) => [entry.id, entry.uses])).toStrictEqual([
				["bronze-sword", 45],
				["bronze-bow", 3]
			]);
			expect(dardan.weapon?.id ?? dardan.inventory[0].id).toBe("bronze-sword");
			expect(dardan.inventory[0].equipped).toBe(true);
			expect(dardan.inventory[1].weapon?.might).toBe(4);
			expect(dardan.inventory[0].name).not.toBe("Bronze Sword");
		});

		suite("The park", () => {
			const park = GridComponent.confinedTo(grid, sheet("bellum-duel").area ?? []);
			const inside = (column: number, row: number) => GridComponent.inPlay(park, column, row);

			test("Is the octagon inside the kerb, and everything else is out of play and shut", () => {
				expect(inside(15, 15)).toBe(true);
				expect(inside(14, 12)).toBe(true);
				expect(inside(12, 14)).toBe(true);
				expect(inside(13, 12)).toBe(false); // the corner beyond the bush
				expect(inside(11, 15)).toBe(false);
				expect(inside(15, 19)).toBe(false);
				expect(GridComponent.terrainAt(park, 13, 12)).toBe(Terrain.WALL);
				expect(GridComponent.terrainAt(park, 15, 11)).toBe(Terrain.WALL);
				expect(GridComponent.terrainAt(park, 14, 12)).toBe(Terrain.BUSH);
				expect(GridComponent.terrainAt(park, 15, 15)).toBe(Terrain.PLAIN);
			});

			test("Nobody can walk out of it, however far they go", () => {
				const reach = reachableTiles(park, { column: 13, row: 15 }, 10_000, new Set());

				expect(reach.length).toBeGreaterThan(20);
				expect(reach.every((tile) => inside(tile.column, tile.row))).toBe(true);
			});

			test("Not even a reach overlay shows beyond it", () => {
				const reach = reachableTiles(park, { column: 13, row: 15 }, dardan.stats.movement, new Set());

				expect(attackableTiles(park, reach, 1, 3).every((tile) => inside(tile.column, tile.row))).toBe(true);
			});

			test("The duellists stand inside it, and the friends watch from beyond the trees", () => {
				for (const placement of sheet("bellum-duel").units) {
					expect(inside(placement.column, placement.row), placementId(placement)).toBe(placement.spectator !== true);
				}
			});

			test("Dardan can reach a bush on the first turn, and throw from it", () => {
				const reach = reachableTiles(park, { column: 13, row: 15 }, dardan.stats.movement, new Set());

				expect(reach.some((tile) => tile.column === 12 && tile.row === 14)).toBe(true);
				expect(dardan.inventory[1].weapon?.maxRange).toBe(3);
			});
		});

		test("Hasan hits harder and has more HP; Dardan is quicker - and the fight can be won in a few turns", () => {
			expect(hasan.stats.hp).toBeGreaterThan(dardan.stats.hp);
			expect(hasan.stats.strength).toBeGreaterThan(dardan.stats.strength);
			expect(dardan.stats.speed).toBeGreaterThan(hasan.stats.speed);

			const stone = strike(dardan, dardan.inventory[1].weapon, hasan, Terrain.PLAIN);
			const wood = strike(dardan, dardan.inventory[0].weapon, hasan, Terrain.PLAIN);
			const inBush = strike(hasan, hasan.weapon, dardan, Terrain.BUSH);
			const onGrass = strike(hasan, hasan.weapon, dardan, Terrain.PLAIN);

			expect(stone).toMatchObject({ damage: 5, hit: 90 });
			expect(wood).toMatchObject({ damage: 4, hit: 100 });
			expect(onGrass).toMatchObject({ damage: 5, hit: 91 });
			expect(inBush).toMatchObject({ damage: 4, hit: 71 });

			// Three stones and two taps fell him, and four of his hits in a bush do not fell Dardan.
			expect(3 * stone.damage + 2 * wood.damage).toBeGreaterThanOrEqual(hasan.stats.hp - 1);
			expect(4 * inBush.damage).toBeLessThan(dardan.stats.hp);
		});
	});

	suite("The brawl", () => {
		suite("The market", () => {
			const market = GridComponent.confinedTo(grid, sheet("bellum-brawl").area ?? []);
			const inside = (column: number, row: number) => GridComponent.inPlay(market, column, row);

			test("Is the seventeen tiles square around the park, and everything else is out of play and shut", () => {
				expect(inside(7, 7)).toBe(true);
				expect(inside(23, 23)).toBe(true);
				expect(inside(6, 15)).toBe(false);
				expect(inside(24, 15)).toBe(false);
				expect(inside(15, 6)).toBe(false);
				expect(inside(15, 24)).toBe(false);
				expect(GridComponent.terrainAt(market, 15, 6)).toBe(Terrain.WALL);
			});

			test("Both armies stand inside it, and every fighter can walk to every other without leaving it", () => {
				const [first, ...rest] = sheet("bellum-brawl").units;
				const reach = reachableTiles(market, { column: first.column, row: first.row }, 10_000, new Set());
				const reached = new Set(reach.map((tile) => tileKey(tile.column, tile.row)));

				expect(reach.every((tile) => inside(tile.column, tile.row))).toBe(true);

				for (const placement of [first, ...rest]) {
					expect(inside(placement.column, placement.row), placementId(placement)).toBe(true);
					expect(reached.has(tileKey(placement.column, placement.row)), placementId(placement)).toBe(true);
				}
			});
		});

		test("The enemy's weapons are the level's: slats and sticks, the stones and the leader's plank", () => {
			const weaponOf = (id: string) => placed("bellum-brawl", id).weapon?.type;

			expect(weaponOf("older-child-1")).toBe("lance");
			expect(weaponOf("older-child-2")).toBe("lance");
			expect(weaponOf("older-child-3")).toBe("sword");
			expect(weaponOf("older-child-4")).toBe("sword");
			expect(weaponOf("stone-girl")).toBe("bow");
			expect(weaponOf("blond-leader")).toBe("axe");
			expect(placed("bellum-brawl", "blond-leader")).toMatchObject({ level: 2, stats: expect.objectContaining({ hp: 20, strength: 6, speed: 6, defense: 5 }) });
		});

		test("The leader holds his post through turn 2 and charges from turn 3", () => {
			const leader = sheet("bellum-brawl").units.find((placement) => placement.id === "blond-leader") as DeploymentPlacement;

			expect(leader.behaviour).toBe("hold");
			expect(behaviourOnTurn(EnemyBehaviour.HOLD, leader.chargeFromTurn as number, 2)).toBe(EnemyBehaviour.HOLD);
			expect(behaviourOnTurn(EnemyBehaviour.HOLD, leader.chargeFromTurn as number, 3)).toBe(EnemyBehaviour.CHARGE);
			expect(behaviourOnTurn(EnemyBehaviour.HOLD, 0, 99)).toBe(EnemyBehaviour.HOLD);
		});

		test("A placement's name goes on the map in the player's language, and the weapon goes under it", () => {
			const stones = placed("bellum-brawl", "stone-girl");

			expect(["Steinwerferin", "Stone-Thrower"]).toContain(stones.name);
			expect(stones.weapon?.name).toBe(stones.inventory[0].name);
		});
	});

	suite("The soldier", () => {
		const orphanage = parseTileMapDocument(assets.getJson<TileMapDocument>("map-bellum-orphanage-war"));
		const yard = GridComponent.confinedTo(GridComponent.fromTileMap(orphanage, 32), sheet("bellum-soldier").area ?? []);
		const inside = (column: number, row: number) => GridComponent.inPlay(yard, column, row);
		const { units } = sheet("bellum-soldier");

		test("The yard and its gate are in play, and the burning map around them is not", () => {
			expect(orphanage).toMatchObject({ columns: 31, rows: 17 });
			expect(inside(8, 2)).toBe(true);
			expect(inside(22, 12)).toBe(true);
			expect(inside(15, 13)).toBe(true); // the gate
			expect(inside(14, 13)).toBe(false); // the fence beside it
			expect(inside(15, 14)).toBe(false); // the road beyond
			expect(inside(7, 8)).toBe(false); // the wall
		});

		test("Fire shuts a tile whatever burns on it, and the well and the house are no ground either", () => {
			expect(GridComponent.terrainAt(yard, 15, 9)).toBe(Terrain.PLAIN);
			expect(GridComponent.terrainAt(yard, 16, 8)).toBe(Terrain.BUSH); // a bush that has not caught
			expect(GridComponent.terrainAt(yard, 17, 8)).toBe(Terrain.FIRE); // the one beside it has
			expect(GridComponent.terrainAt(yard, 14, 10)).toBe(Terrain.FIRE); // burning grass
			expect(GridComponent.terrainAt(yard, 14, 11)).toBe(Terrain.PLAIN); // the open way to the soldier's left
			expect(GridComponent.terrainAt(yard, 12, 10)).toBe(Terrain.WATER); // the well
			expect(GridComponent.terrainAt(yard, 15, 6)).toBe(Terrain.WALL); // the orphanage
			expect(GridComponent.terrainAt(yard, 15, 13)).toBe(Terrain.PLAIN);
		});

		test("The children stand before the house, the soldier before the gate, and they can walk to one another", () => {
			const soldier = units.find((placement) => placement.unit === "red-soldier") as DeploymentPlacement;
			const children = units.filter((placement) => placement !== soldier);
			const reach = reachableTiles(yard, { column: soldier.column, row: soldier.row }, 10_000, new Set());
			const reached = new Set(reach.map((tile) => tileKey(tile.column, tile.row)));

			expect(soldier).toMatchObject({ column: 15, row: 12 });
			expect(children).toHaveLength(6);
			expect(reach.every((tile) => inside(tile.column, tile.row))).toBe(true);
			expect(new Set(units.map((placement) => tileKey(placement.column, placement.row))).size).toBe(units.length);

			for (const child of children) {
				expect(place(child).faction, placementId(child)).toBe(UnitFaction.PLAYER);
				expect(reached.has(tileKey(child.column, child.row)), placementId(child)).toBe(true);
			}
		});

		test("Everyone carries the level's weapon, and Dardan can use his dagger", () => {
			const weaponOf = (id: string) => placed("bellum-soldier", id).weapon;

			expect(weaponOf("dardan-niveli")).toMatchObject({ id: "bronze-knife", type: "knife", might: 2, name: expect.stringMatching(/Rostiger Dolch|Rusty Dagger/) });
			expect(weaponOf("hasan-eyletmez")?.type).toBe("sword");
			expect(weaponOf("maksimo-auditore")?.type).toBe("lance");
			expect(weaponOf("leona-kaori")?.type).toBe("lance");
			expect(weaponOf("ivan-grussinskin")?.type).toBe("bow");
			expect(weaponOf("lina-yukari")?.type).toBe("bow");
		});

		test("He is a slow Armored Knight: no child is struck twice in one fight, and every child at full health survives one blow", () => {
			const soldier = placed("bellum-soldier", "red-soldier");
			const children = units.filter((placement) => placement.unit !== "red-soldier").map(place);

			expect(soldier).toMatchObject({ className: "armored-knight", weapon: expect.objectContaining({ id: "iron-lance" }), stats: expect.objectContaining({ speed: 6, movement: 4 }) });

			for (const child of children) {
				const blow = computeStrike({
					attacker: soldier,
					attackerWeapon: soldier.weapon as NonNullable<UnitData["weapon"]>,
					defender: child,
					defenderWeapon: child.weapon,
					defenderTerrain: Terrain.PLAIN
				});

				expect(doublesAt(soldier, soldier.weapon, attackSpeed(child, child.weapon)), child.id).toBe(false);
				expect(blow.damage, child.id).toBeLessThan(child.stats.hp);
			}
		});

		test("He is the boss: no child's blow counts for much, and his fell a child in two", () => {
			const soldier = placed("bellum-soldier", "red-soldier");
			const hasan = placed("bellum-soldier", "hasan-eyletmez");
			const lina = placed("bellum-soldier", "lina-yukari");
			const onGround = (attacker: UnitData, defender: UnitData) =>
				computeStrike({ attacker, attackerWeapon: attacker.weapon as NonNullable<UnitData["weapon"]>, defender, defenderWeapon: defender.weapon, defenderTerrain: Terrain.PLAIN });

			expect(soldier).toMatchObject({ boss: true, level: 13, faction: UnitFaction.ENEMY, stats: expect.objectContaining({ hp: 27, strength: 11, defense: 9 }) });
			expect(onGround(hasan, soldier).damage).toBeLessThanOrEqual(1);
			expect(onGround(lina, soldier).damage).toBe(0);
			expect(2 * onGround(soldier, lina).damage).toBeGreaterThanOrEqual(lina.stats.hp);
		});
	});

	suite("Spectators", () => {
		test("Leave the fight's side altogether: neither army is up against them", () => {
			const leona = placed("bellum-duel", "leona-kaori");
			const unit = (data: UnitData) => ({ getComponent: () => ({ read: () => data }) }) as unknown as Entity;
			const units = [unit(leona), unit(placed("bellum-duel", "dardan-niveli")), unit(placed("bellum-duel", "hasan-duel"))];

			expect(leona.faction).toBe(UnitFaction.NEUTRAL);
			expect(enemiesOf(units, UnitFaction.ENEMY)).toHaveLength(1);
			expect(enemiesOf(units, UnitFaction.PLAYER)).toHaveLength(1);
		});
	});

	test("A pack with no entries, or a part-used item with no uses, is a mistake in the sheet", () => {
		const document = { format: "vigilans-deployment", version: 1, map: "market-square" };

		expect(() => parseDeployment({ ...document, units: [{ unit: "bandit", column: 1, row: 1, pack: [] }] })).toThrow(/pack/);
		expect(() => parseDeployment({ ...document, units: [{ unit: "bandit", column: 1, row: 1, pack: [{ item: "bronze-bow", uses: 0 }] }] })).toThrow(/uses/);
	});
});
