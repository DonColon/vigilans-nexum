import { AssetStorage } from "@/core/assets/AssetStorage";
import { Entity } from "@/core/ecs/Entity";
import { GameFeature, GameFeatureConfig } from "@/core/GameFeature";
import { I18nService } from "@/core/i18n/I18n";
import { GameCoreService } from "@/core/service/GameCoreService";
import { DialogClosedEvent, TalkRequestedEvent } from "@/game.events";
import { talkCommands } from "@/game/talk/commands/TalkCommands";
import { TalkChoiceComponent } from "@/game/talk/components/TalkChoiceComponent";
import { TalkComponent } from "@/game/talk/components/TalkComponent";
import { Conversation, ConversationsDocument, conversationBetween, conversationDialog, parseConversations } from "@/game/talk/model/Conversations";
import { TalkState } from "@/game/talk/states/TalkState";
import { TalkChoiceSystem } from "@/game/talk/systems/TalkChoiceSystem";
import { TalkSystem } from "@/game/talk/systems/TalkSystem";
import { DialogState } from "@/game/ui/states/DialogState";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/** Asset id of the conversation sheet this battle is scripted with. */
const CONVERSATIONS_ASSET = "conversations-skirmish";

/**
 * Fire Emblem's "Talk": two units the scenario has written a conversation for
 * can speak when they stand next to each other.
 *
 *  - On `map:ready` the scenario's conversation sheet is read out of the asset
 *    bundle onto a [[TalkComponent]], which also tracks which ones have already
 *    happened. The [[MovementFeature]] asks [[TalkSystem]] whether there is
 *    anyone to talk to, and only then offers the command.
 *  - `talk:requested` opens [[TalkState]]: the map cursor moves onto the unit
 *    that would be spoken to and any direction steps between the others in
 *    reach, the way the trade screen picks its partner. `talk:confirmed` settles
 *    it and the conversation plays.
 *  - The conversation runs in the ordinary textbox - one page per page, the name
 *    above the box changing as the two go back and forth, and the box itself
 *    holding the top of the screen for whoever opened it and the bottom for
 *    whoever answers, the way Radiant Dawn stages a two-hander.
 *  - The pair is struck off when the box closes, so a talk happens once. Talking
 *    is free: `talk:finished` puts the unit's command menu back and it still has
 *    its turn.
 *
 * Who may talk to whom is content, not code - see
 * `src/assets/data/conversations`.
 */
export class TalkFeature extends GameFeature {
	@GameCoreService(AssetStorage)
	private assets!: AssetStorage;

	@GameCoreService(I18nService)
	private i18n!: I18nService;

	private talk: Entity | null = null;

	/** The conversation on screen right now, so its pair can be struck off when the box closes. */
	private playing: { conversationId: string; unitId: string; partnerId: string } | null = null;

	constructor(config: GameFeatureConfig = {}) {
		super({
			components: [TalkComponent, TalkChoiceComponent],
			states: [TalkState],
			commands: [...talkCommands],
			// Alongside MenuSystem / ForecastSystem in the update phase.
			systems: [{ system: TalkChoiceSystem, priority: 10 }],
			...config
		});
	}

	protected onInstall(): void {
		this.subscribe("map:ready", () => this.open());
		this.subscribe("map:closed", () => this.close());
		this.subscribe("talk:requested", (event) => this.onRequested(event));
		this.subscribe("talk:confirmed", (event) => this.play(event.unitId, event.partnerId));
		this.subscribe("ui:dialogClosed", (event) => this.onDialogClosed(event));
	}

	protected onUninstall(): void {
		this.close();
	}

	private open(): void {
		this.close();

		this.talk = this.world.createEntity();
		this.talk.addComponent(TalkComponent, { conversations: this.conversations(), talked: [] });
	}

	private close(): void {
		this.playing = null;

		if (this.talk) {
			this.world.unregisterEntity(this.talk);
			this.talk = null;
		}
	}

	/** The scenario's conversation sheet, or none at all when it is not in the bundle. */
	private conversations(): Conversation[] {
		try {
			return parseConversations(this.assets.getJson<ConversationsDocument>(CONVERSATIONS_ASSET));
		} catch (error) {
			console.error(`Conversation sheet "${CONVERSATIONS_ASSET}" could not be read:`, error);
			return [];
		}
	}

	/**
	 * "Talk" was chosen: open the choice, with the map cursor on the first unit
	 * in reach. The player points at whoever they mean and `talk:confirmed` comes
	 * back here to play it - the same step the trade screen opens with, including
	 * when there is only one to point at, so the command always shows who it is
	 * about to act on before it acts.
	 */
	private onRequested(event: TalkRequestedEvent): void {
		if (this.talk === null) {
			return;
		}

		const units = UnitSystem.inWorld(this.world);
		const unit = UnitSystem.byId(units, event.unitId);

		if (unit === null) {
			return;
		}

		const available = TalkSystem.availableAll(this.talk.getComponent(TalkComponent).read(), units, unit);

		if (available.length === 0) {
			return;
		}

		const partnerIds = available.map((entry) => entry.partner.getComponent(UnitComponent).read().id);
		const requestedIndex = partnerIds.indexOf(event.partnerId);
		const tile = UnitSystem.tileOf(unit);

		this.stateManager.getState(TalkState).request({
			unitId: event.unitId,
			partnerIds,
			partnerIndex: requestedIndex >= 0 ? requestedIndex : 0,
			restoreColumn: tile.column,
			restoreRow: tile.row
		});
		this.stateManager.push(TalkState);
	}

	/** Opens the textbox on the conversation these two have, if they still have one. */
	private play(unitId: string, partnerId: string): void {
		if (this.talk === null) {
			return;
		}

		const component = this.talk.getComponent(TalkComponent);
		const conversation = conversationBetween(TalkSystem.remaining(component.read()), unitId, partnerId);

		if (conversation === null) {
			return;
		}

		this.playing = { conversationId: conversation.id, unitId, partnerId };

		this.stateManager.getState(DialogState).request(conversationDialog(conversation, this.i18n.getLocale(), this.i18n.getFallbackLocale(), (unitId) => this.nameOf(unitId)));
		this.stateManager.push(DialogState);
	}

	/**
	 * The textbox closed. Strike the pair off - a talk happens once - and say so,
	 * which is what puts the unit's command menu back.
	 */
	private onDialogClosed(event: DialogClosedEvent): void {
		const playing = this.playing;

		if (playing === null || this.talk === null || event.dialog !== `talk-${playing.conversationId}`) {
			return;
		}

		this.playing = null;

		const component = this.talk.getComponent(TalkComponent);
		const data = component.read();

		component.update({ ...data, talked: [...data.talked, playing.conversationId] });

		this.events.dispatch("talk:finished", { unitId: playing.unitId, partnerId: playing.partnerId, conversationId: playing.conversationId });
	}

	/** The name on a unit's sheet, for the label above the textbox. */
	private nameOf(unitId: string): string | null {
		const unit = UnitSystem.byId(UnitSystem.inWorld(this.world), unitId);

		return unit === null ? null : unit.getComponent(UnitComponent).read().name;
	}
}
