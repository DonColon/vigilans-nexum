import "vitest-canvas-mock";
import { EventBus } from "./src/core/events/EventBus";
import { World } from "./src/core/ecs/World";
import { AssetStorage } from "./src/core/assets/AssetStorage";
import { loadUnitCatalogs } from "./src/game/units/content/UnitCatalog";
import classesDocument from "./src/assets/data/catalog/classes.json";
import weaponsDocument from "./src/assets/data/catalog/weapons.json";
import itemsDocument from "./src/assets/data/catalog/items.json";
import dardanDocument from "./src/assets/data/units/dardan.unit.json";
import eliraDocument from "./src/assets/data/units/elira.unit.json";
import hasanDocument from "./src/assets/data/units/hasan.unit.json";
import besnikDocument from "./src/assets/data/units/besnik.unit.json";
import teutaDocument from "./src/assets/data/units/teuta.unit.json";
import dardanNiveliDocument from "./src/assets/data/units/dardan-niveli.unit.json";
import hasanEyletmezDocument from "./src/assets/data/units/hasan-eyletmez.unit.json";
import maksimoAuditoreDocument from "./src/assets/data/units/maksimo-auditore.unit.json";
import ivanGrussinskinDocument from "./src/assets/data/units/ivan-grussinskin.unit.json";
import leonaKaoriDocument from "./src/assets/data/units/leona-kaori.unit.json";
import linaYukariDocument from "./src/assets/data/units/lina-yukari.unit.json";
import mikaelFlacoDocument from "./src/assets/data/units/mikael-flaco.unit.json";
import marvenCaminiDocument from "./src/assets/data/units/marven-camini.unit.json";
import banditDocument from "./src/assets/data/units/bandit.unit.json";
import ruffianDocument from "./src/assets/data/units/ruffian.unit.json";
import poacherDocument from "./src/assets/data/units/poacher.unit.json";
import banditChiefDocument from "./src/assets/data/units/bandit-chief.unit.json";
import bellumDeployment from "./src/assets/data/deployments/bellum.deployment.json";
import bellumConversations from "./src/assets/data/conversations/bellum.conversations.json";
import bellumHouses from "./src/assets/data/houses/bellum.houses.json";
import bellumLocks from "./src/assets/data/locks/bellum.locks.json";
import skirmishDeployment from "./src/assets/data/deployments/skirmish.deployment.json";
import fantasyMap from "./src/assets/data/maps/fantasy.tilemap.json";
import skirmishConversations from "./src/assets/data/conversations/skirmish.conversations.json";
import skirmishHouses from "./src/assets/data/houses/skirmish.houses.json";
import skirmishLocks from "./src/assets/data/locks/skirmish.locks.json";
import campaign from "./src/assets/data/campaign/campaign.json";
import riverDeployment from "./src/assets/data/deployments/river.deployment.json";
import riverMap from "./src/assets/data/maps/river.tilemap.json";
import riverConversations from "./src/assets/data/conversations/river.conversations.json";
import riverHouses from "./src/assets/data/houses/river.houses.json";
import riverLocks from "./src/assets/data/locks/river.locks.json";

new EventBus({
	history: {
		enabled: true,
		maxSize: 100
	}
});
new World();

/**
 * The game's content ships as JSON assets, fetched into AssetStorage by the
 * AssetLoader before the first state is entered. A test has no loader, so the
 * same documents are imported straight off disk and seeded here under the asset
 * ids `asset.manifest.ts` declares - the code under test then reads them exactly
 * as it does in the running game.
 *
 * Importing from `src/assets` (Vite's publicDir) is a test-only shortcut. The
 * app must never do it: the files are copied verbatim to the output root, so an
 * import would ship a second, bundled copy.
 */
const assetStorage = new AssetStorage();

assetStorage.setJson("catalog-classes", classesDocument);
assetStorage.setJson("catalog-weapons", weaponsDocument);
assetStorage.setJson("catalog-items", itemsDocument);
assetStorage.setJson("deployment-skirmish", skirmishDeployment);
assetStorage.setJson("unit-dardan", dardanDocument);
assetStorage.setJson("unit-elira", eliraDocument);
assetStorage.setJson("unit-hasan", hasanDocument);
assetStorage.setJson("unit-besnik", besnikDocument);
assetStorage.setJson("unit-teuta", teutaDocument);
assetStorage.setJson("unit-dardan-niveli", dardanNiveliDocument);
assetStorage.setJson("unit-hasan-eyletmez", hasanEyletmezDocument);
assetStorage.setJson("unit-maksimo-auditore", maksimoAuditoreDocument);
assetStorage.setJson("unit-ivan-grussinskin", ivanGrussinskinDocument);
assetStorage.setJson("unit-leona-kaori", leonaKaoriDocument);
assetStorage.setJson("unit-lina-yukari", linaYukariDocument);
assetStorage.setJson("unit-mikael-flaco", mikaelFlacoDocument);
assetStorage.setJson("unit-marven-camini", marvenCaminiDocument);
assetStorage.setJson("unit-bandit", banditDocument);
assetStorage.setJson("unit-ruffian", ruffianDocument);
assetStorage.setJson("unit-poacher", poacherDocument);
assetStorage.setJson("unit-bandit-chief", banditChiefDocument);
assetStorage.setJson("deployment-bellum", bellumDeployment);
assetStorage.setJson("conversations-bellum", bellumConversations);
assetStorage.setJson("houses-bellum", bellumHouses);
assetStorage.setJson("locks-bellum", bellumLocks);
assetStorage.setJson("map-fantasy", fantasyMap);
assetStorage.setJson("conversations-skirmish", skirmishConversations);
assetStorage.setJson("houses-skirmish", skirmishHouses);
assetStorage.setJson("locks-skirmish", skirmishLocks);
assetStorage.setJson("campaign", campaign);
assetStorage.setJson("deployment-river", riverDeployment);
assetStorage.setJson("map-river", riverMap);
assetStorage.setJson("conversations-river", riverConversations);
assetStorage.setJson("houses-river", riverHouses);
assetStorage.setJson("locks-river", riverLocks);

// Seeded once here as well, so a spec that calls buildUnit directly - without
// ever going through the UnitsFeature - resolves its classes and weapons.
loadUnitCatalogs(assetStorage);
