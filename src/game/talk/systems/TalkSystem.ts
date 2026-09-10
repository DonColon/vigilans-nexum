import { Entity } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { TalkComponent, TalkData } from "@/game/talk/components/TalkComponent";
import { Conversation, conversationBetween } from "@/game/talk/model/Conversations";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { UnitSystem } from "@/game/units/systems/UnitSystem";

/**
 * Pure lookups over the scenario's conversations, kept off the components the
 * same way `UnitSystem` and `CombatSystem` are: no queries of its own, so the
 * movement feature can ask "is there anyone to talk to here?" without depending
 * on the talk feature itself.
 */
export class TalkSystem {
	/** The entity carrying the scenario's conversations, or null while no map is up. */
	public static inWorld(world: World): Entity | null {
		return world.getEntities().find((entity) => entity.hasComponent(TalkComponent)) ?? null;
	}

	/** The conversations still to be had - the ones nobody has used up yet. */
	public static remaining(talk: TalkData): Conversation[] {
		return talk.conversations.filter((conversation) => !talk.talked.includes(conversation.id));
	}

	/**
	 * Every conversation `unit` could start right now: one that has not happened
	 * yet, with the other party standing on an adjacent tile. In the order the
	 * units are on the map, which is the order the cursor steps through them.
	 *
	 * Both parties have to be on the map, but neither has to be unspent - being
	 * talked *to* costs the listener nothing - and neither has to be an ally,
	 * since a talk across the line is how a unit gets talked round.
	 */
	public static availableAll(talk: TalkData, units: readonly Entity[], unit: Entity): { conversation: Conversation; partner: Entity }[] {
		const unitId = unit.getComponent(UnitComponent).read().id;
		const remaining = TalkSystem.remaining(talk);

		return UnitSystem.beside(units, unit)
			.map((partner) => ({ conversation: conversationBetween(remaining, unitId, partner.getComponent(UnitComponent).read().id), partner }))
			.filter((entry): entry is { conversation: Conversation; partner: Entity } => entry.conversation !== null);
	}

	/** The first of those, or null when there is nobody to talk to. */
	public static available(talk: TalkData, units: readonly Entity[], unit: Entity): { conversation: Conversation; partner: Entity } | null {
		return TalkSystem.availableAll(talk, units, unit)[0] ?? null;
	}

	/** Whether `unit` has anyone beside it to talk to - what puts "Talk" on the command menu. */
	public static canTalk(talk: TalkData, units: readonly Entity[], unit: Entity): boolean {
		return TalkSystem.available(talk, units, unit) !== null;
	}
}
