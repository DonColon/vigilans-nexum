import { clamp } from "@/core/math/utils/Clamp";

/**
 * Picking one unit out of several with the map cursor - the step a trade and a
 * talk both open with, and the same shape the battle forecast uses to cycle its
 * targets. The fields sit inline on whichever component owns the flow; these
 * helpers work on anything carrying them.
 */
export interface PartnerChoice {
	/** Unit ids of everyone in reach, in the order the cursor steps through them. */
	partnerIds: string[];
	/** Index into `partnerIds` of the one being pointed at. */
	partnerIndex: number;
	/** Resolved current partner - `partnerIds[partnerIndex]`, kept in step by the driving system. */
	partnerId: string;
	/** Tile the map cursor returns to when the flow is backed out of. */
	restoreColumn: number;
	restoreRow: number;
}

/** The partner one step along the list, wrapping around its ends. Unchanged when there is nobody to cycle to. */
export function cyclePartner(choice: PartnerChoice, step: number): Pick<PartnerChoice, "partnerIndex" | "partnerId"> {
	if (choice.partnerIds.length < 2) {
		return { partnerIndex: choice.partnerIndex, partnerId: choice.partnerId };
	}

	const partnerIndex = (choice.partnerIndex + step + choice.partnerIds.length) % choice.partnerIds.length;

	return { partnerIndex, partnerId: choice.partnerIds[partnerIndex] };
}

/** Snaps the index back inside the list and resolves the id from it - what keeps the two fields honest. */
export function reconcilePartner(choice: PartnerChoice): Pick<PartnerChoice, "partnerIndex" | "partnerId"> {
	if (choice.partnerIds.length === 0) {
		return { partnerIndex: choice.partnerIndex, partnerId: choice.partnerId };
	}

	const partnerIndex = clamp(choice.partnerIndex, 0, choice.partnerIds.length - 1);

	return { partnerIndex, partnerId: choice.partnerIds[partnerIndex] };
}

/** Whether the two fields already say what `reconcilePartner` would make them say. */
export function isPartnerResolved(choice: PartnerChoice): boolean {
	const resolved = reconcilePartner(choice);

	return resolved.partnerIndex === choice.partnerIndex && resolved.partnerId === choice.partnerId;
}
