import { ScheduledSystem } from "@/core/ecs/ScheduledSystem";

/** Runs in the sync schedule, after every update system - reconciling what they wrote. */
export abstract class SyncSystem extends ScheduledSystem {}
