import { ScheduledSystem } from "@/core/ecs/ScheduledSystem";

/** Runs in the render schedule - drawing, never writing game state. */
export abstract class RenderSystem extends ScheduledSystem {}
