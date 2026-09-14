import { Game } from "@/core/Game";
import { gameConfiguration } from "@/game.config";
import { AIFeature } from "@/game/ai";
import { CombatFeature } from "@/game/combat";
import { ExperienceFeature } from "@/game/experience";
import { ConvoyFeature } from "@/game/convoy";
import { StaffFeature } from "@/game/staff";
import { LocksFeature } from "@/game/locks";
import { MapFeature } from "@/game/map";
import { MovementFeature } from "@/game/movement";
import { OptionsFeature } from "@/game/options";
import { RosterFeature } from "@/game/roster";
import { StatusFeature } from "@/game/status";
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
const turn = new TurnFeature({ dependencies: [units] });
const combat = new CombatFeature({ dependencies: [units] });
const movement = new MovementFeature({ dependencies: [units, ui] });

game.install(new MapFeature());
game.install(ui);
game.install(units);
game.install(turn);
// The army list the global menu's "Units" row opens; needs the units on the map.
game.install(new RosterFeature({ dependencies: [units] }));
// The settings screen its "Options" row opens. It owns no map state of its own -
// the settings live on the OptionsService, which everything else reads.
game.install(new OptionsFeature());
// The battle forecast the "Attack" command opens; needs the units on the map.
game.install(combat);
// The staff list and target choice the "Staff" command opens; needs the units
// on the map and the UI feature for the list.
game.install(new StaffFeature({ dependencies: [units, ui] }));
// The experience a fight or a heal is worth, and the level it may reach: needs
// the units to hand the points to and the UI feature for the level-up notice.
// Installed after the combat and staff features it scores.
game.install(new ExperienceFeature({ dependencies: [units, ui] }));
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
// The locked doors and chests the "Door" and "Chest" commands open: needs the
// units carrying the keys and the convoy to catch a find that will not fit.
game.install(new LocksFeature({ dependencies: [units, convoy] }));
// Moving a unit needs the units on the map and the UI feature for its command
// menus - the install order and the dependencies both say so.
game.install(movement);
// The enemy-range overlay - one enemy on confirm, the whole army on the R
// button. It sits above the move flow on map:tileConfirmed, so it is installed
// after it; it only needs the units on the map.
game.install(new ThreatFeature({ dependencies: [units] }));
// Looking at a unit: the hover card beside whichever one the cursor rests on,
// and the unit sheet the info button (I / Q, Y / LB) opens over it. It only
// needs the units on the map.
game.install(new StatusFeature({ dependencies: [units] }));
// The enemy phase: what the other side does once the turn is handed to it. It
// walks and fights through the movement and combat features, so it is installed
// after both, and after the turn feature whose phases it acts in.
game.install(new AIFeature({ dependencies: [units, turn, combat, movement] }));
game.start();

// Dev-only handle so the loop can be driven by hand when rAF is throttled
// (browser automation, a backgrounded tab). Stripped from production builds.
if (import.meta.env.DEV) {
	(window as unknown as { game: Game }).game = game;
}
