/**
 * Reports what a frame of the game loop threw. The loop keeps running after an
 * error, so the same one may recur every frame: each message is told once, not
 * sixty times a second. Told means logged to the console and handed to the
 * page's error listeners through `reportError` - which is where the game shows
 * it to a player on a phone, who has no console to look at.
 */
export class FrameErrorReporter {
	private readonly reported = new Set<string>();

	/** Reports `error`, unless one with the same message was already; returns whether it was. */
	public report(error: unknown): boolean {
		const message = error instanceof Error ? error.message : String(error);

		if (this.reported.has(message)) {
			return false;
		}

		this.reported.add(message);
		console.error("A frame failed:", error);

		if (typeof reportError === "function") {
			reportError(error);
		}

		return true;
	}
}
