import { ScheduledSystem } from "@/core/ecs/ScheduledSystem";

/** Runs in the update schedule, before the sync systems - the game's logic clock. */
export abstract class UpdateSystem extends ScheduledSystem {}
