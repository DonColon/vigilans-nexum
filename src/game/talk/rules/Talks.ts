import { Entity } from "@/core/ecs/Entity";
import { TalkComponent, TalkData } from "@/game/talk/components/TalkComponent";
import { Conversation, conversationBetween } from "@/game/talk/content/Conversations";
import { UnitComponent } from "@/game/units/components/UnitComponent";
import { unitsBeside } from "@/game/units/rules/UnitLookup";

/*
 * Who can talk to whom right now: the scenario's conversations held against
 * the units on the map. No queries of its own, so the movement feature can ask
 * "is there anyone to talk to here?" without depending on the talk feature.
 */

/** A conversation that can be started, and the unit on the other side of it. */
export interface AvailableTalk {
	conversation: Conversation;
	partner: Entity;
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
export function availableTalks(talk: TalkData, units: readonly Entity[], unit: Entity): AvailableTalk[] {
	const unitId = unit.getComponent(UnitComponent).read().id;
	const remaining = TalkComponent.remaining(talk);

	return unitsBeside(units, unit)
		.map((partner) => ({ conversation: conversationBetween(remaining, unitId, partner.getComponent(UnitComponent).read().id), partner }))
		.filter((entry): entry is AvailableTalk => entry.conversation !== null);
}

/** The first of those, or null when there is nobody to talk to. */
export function availableTalk(talk: TalkData, units: readonly Entity[], unit: Entity): AvailableTalk | null {
	return availableTalks(talk, units, unit)[0] ?? null;
}

/** Whether `unit` has anyone beside it to talk to - what puts "Talk" on the command menu. */
export function canTalk(talk: TalkData, units: readonly Entity[], unit: Entity): boolean {
	return availableTalk(talk, units, unit) !== null;
}
