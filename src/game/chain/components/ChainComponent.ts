import { Component } from "@/core/ecs/Component";
import { JsonSchema } from "@/core/ecs/JsonSchema";

export interface ChainData extends JsonSchema {
	/** Id of the Special enemy carrying the shield. */
	targetId: string;
	/** Points left on the shield bar; 0 once a chain has broken it. */
	shield: number;
	/** Points on the full bar. */
	maxShield: number;
	/** Units that have already attacked this turn, and so cannot join a chain. */
	struck: string[];
	/** Units still to strike in the running chain, in order. */
	strikers: string[];
	/** Id of the unit whose strike is being fought right now, or "" between strikes. */
	current: string;
}

/**
 * The shield of the battle's Special enemy and the chain attack against it. One
 * instance, created with the map when the deployment sheet gives a placement a
 * `shield`. Only the Chapter 1 form of the rule exists so far: ordinary attacks
 * stop at the bar's last point, and the chain's first strike breaks it.
 */
export class ChainComponent extends Component<ChainData> {
	public static readonly type = "chain";

	/** A full bar on `targetId`, with no chain running. */
	public static of(targetId: string, shield: number): ChainData {
		return { targetId, shield, maxShield: shield, struck: [], strikers: [], current: "" };
	}

	/** The bar after `hits` landed strikes: worn down, but never below its last point. */
	public static wear(chain: ChainData, hits: number): ChainData {
		return { ...chain, shield: chain.shield <= 1 ? chain.shield : Math.max(1, chain.shield - hits) };
	}

	/** Whether the bar stands at its last point, where the chain is offered. */
	public static atLastPoint(chain: ChainData): boolean {
		return chain.shield === 1;
	}

	/** Whether a chain has started and has not finished yet. */
	public static isRunning(chain: ChainData): boolean {
		return chain.strikers.length > 0 || chain.current !== "";
	}
}
