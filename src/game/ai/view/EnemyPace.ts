/*
 * The enemy phase's timing: the beats between what its units do, so the
 * player can follow who is moving and where. The walk itself runs at the
 * movement feature's pace (`WALK_STEP_MS`) and the fight at the combat
 * feature's - these are only the pauses around them.
 */

/** Milliseconds the cursor rests on an enemy before it moves - long enough for the eye to find it. */
export const ENEMY_FOCUS_MS = 400;

/** Milliseconds an enemy stands at its destination before it swings. */
export const ENEMY_AIM_MS = 250;
