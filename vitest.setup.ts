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
import hasanDuelDocument from "./src/assets/data/units/hasan-duel.unit.json";
import olderChildDocument from "./src/assets/data/units/older-child.unit.json";
import olderChildLeaderDocument from "./src/assets/data/units/older-child-leader.unit.json";
import bellumDuelDeployment from "./src/assets/data/deployments/bellum-duel.deployment.json";
import bellumDuelConversations from "./src/assets/data/conversations/bellum-duel.conversations.json";
import bellumDuelHouses from "./src/assets/data/houses/bellum-duel.houses.json";
import bellumDuelLocks from "./src/assets/data/locks/bellum-duel.locks.json";
import bellumBrawlDeployment from "./src/assets/data/deployments/bellum-brawl.deployment.json";
import bellumBrawlConversations from "./src/assets/data/conversations/bellum-brawl.conversations.json";
import bellumBrawlHouses from "./src/assets/data/houses/bellum-brawl.houses.json";
import bellumBrawlLocks from "./src/assets/data/locks/bellum-brawl.locks.json";
import marketSquareMap from "./src/assets/data/maps/market-square.tilemap.json";
import { specCampaign, specMap, specScenarios, specSmallMap } from "./test/support/SpecContent";
import bellumMarketMap from "./src/assets/data/maps/bellum-market.tilemap.json";
import bellumOrphanageMap from "./src/assets/data/maps/bellum-orphanage.tilemap.json";

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
// What the specs fight on - test/support/SpecContent.ts. The shipped campaign is
// read by test/game/campaign/Level01.spec.ts.
assetStorage.setJson("campaign", specCampaign);
assetStorage.setJson("map-spec", specMap);
assetStorage.setJson("map-spec-small", specSmallMap);
for (const [scenario, documents] of Object.entries(specScenarios)) {
	assetStorage.setJson(`deployment-${scenario}`, documents.deployment);
	assetStorage.setJson(`houses-${scenario}`, documents.houses);
	assetStorage.setJson(`locks-${scenario}`, documents.locks);
	assetStorage.setJson(`conversations-${scenario}`, documents.conversations);
}
assetStorage.setJson("unit-hasan-duel", hasanDuelDocument);
assetStorage.setJson("unit-older-child", olderChildDocument);
assetStorage.setJson("unit-older-child-leader", olderChildLeaderDocument);
assetStorage.setJson("deployment-bellum-duel", bellumDuelDeployment);
assetStorage.setJson("conversations-bellum-duel", bellumDuelConversations);
assetStorage.setJson("houses-bellum-duel", bellumDuelHouses);
assetStorage.setJson("locks-bellum-duel", bellumDuelLocks);
assetStorage.setJson("deployment-bellum-brawl", bellumBrawlDeployment);
assetStorage.setJson("conversations-bellum-brawl", bellumBrawlConversations);
assetStorage.setJson("houses-bellum-brawl", bellumBrawlHouses);
assetStorage.setJson("locks-bellum-brawl", bellumBrawlLocks);
assetStorage.setJson("map-market-square", marketSquareMap);
assetStorage.setJson("map-bellum-market", bellumMarketMap);
assetStorage.setJson("map-bellum-orphanage", bellumOrphanageMap);

// Seeded once here as well, so a spec that calls buildUnit directly - without
// ever going through the UnitsFeature - resolves its classes and weapons.
loadUnitCatalogs(assetStorage);
