import "vitest-canvas-mock";
import { EventSystem } from "./src/core/events/EventSystem";
import { World } from "./src/core/ecs/World";
import { AssetStorage } from "./src/core/assets/AssetStorage";
import { loadUnitCatalogs } from "./src/game/units/model/UnitCatalog";
import classesDocument from "./src/assets/data/catalog/classes.json";
import weaponsDocument from "./src/assets/data/catalog/weapons.json";
import itemsDocument from "./src/assets/data/catalog/items.json";
import dardanDocument from "./src/assets/data/units/dardan.unit.json";
import eliraDocument from "./src/assets/data/units/elira.unit.json";
import hasanDocument from "./src/assets/data/units/hasan.unit.json";
import besnikDocument from "./src/assets/data/units/besnik.unit.json";
import skirmishDeployment from "./src/assets/data/deployments/skirmish.deployment.json";
import fantasyMap from "./src/assets/data/maps/fantasy.tilemap.json";
import skirmishConversations from "./src/assets/data/conversations/skirmish.conversations.json";
import skirmishHouses from "./src/assets/data/houses/skirmish.houses.json";

new EventSystem({
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
assetStorage.setJson("map-fantasy", fantasyMap);
assetStorage.setJson("conversations-skirmish", skirmishConversations);
assetStorage.setJson("houses-skirmish", skirmishHouses);

// Seeded once here as well, so a spec that calls buildUnit directly - without
// ever going through the UnitsFeature - resolves its classes and weapons.
loadUnitCatalogs(assetStorage);
