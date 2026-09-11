import { Game } from "@/core/Game";
import { gameConfiguration } from "@/game.config";
import { CombatFeature } from "@/game/combat";
import { ConvoyFeature } from "@/game/convoy";
import { MapFeature } from "@/game/map";
import { MovementFeature } from "@/game/movement";
import { TalkFeature } from "@/game/talk";
import { ThreatFeature } from "@/game/threat";
import { TradeFeature } from "@/game/trade";
import { TurnFeature } from "@/game/turn";
import { UIFeature } from "@/game/ui";
import { UnitsFeature } from "@/game/units";
import { VisitFeature } from "@/game/visit";

const game = new Game(gameConfiguration);

const ui = new UIFeature({ demo: false });
const units = new UnitsFeature();

game.install(new MapFeature());
game.install(ui);
game.install(units);
game.install(new TurnFeature({ dependencies: [units] }));
// The battle forecast the "Attack" command opens; needs the units on the map.
game.install(new CombatFeature({ dependencies: [units] }));
// The conversations the "Talk" command plays; needs the units on the map and
// the UI feature for the textbox they are shown in.
game.install(new TalkFeature({ dependencies: [units, ui] }));
// The trade screen the "Trade" command opens; needs the units on the map.
game.install(new TradeFeature({ dependencies: [units] }));
// The army convoy, which takes anything a unit is handed and has no room for.
// Installed before the visit feature, which is the only thing handing gifts out
// so far and waits on its answer.
const convoy = new ConvoyFeature({ dependencies: [units, ui] });
game.install(convoy);
// The houses the "Visit" command knocks at: it opens their doors on the map at
// the top of the battle, needs the units to hand anything over to and the
// convoy to catch what will not fit.
game.install(new VisitFeature({ dependencies: [units, convoy] }));
// Moving a unit needs the units on the map and the UI feature for its command
// menus - the install order and the dependencies both say so.
game.install(new MovementFeature({ dependencies: [units, ui] }));
// The enemy-range overlay - one enemy on confirm, the whole army on the R
// button. It sits above the move flow on map:tileConfirmed, so it is installed
// after it; it only needs the units on the map.
game.install(new ThreatFeature({ dependencies: [units] }));
game.start();

// Dev-only handle so the loop can be driven by hand when rAF is throttled
// (browser automation, a backgrounded tab). Stripped from production builds.
if (import.meta.env.DEV) {
	(window as unknown as { game: Game }).game = game;
}
