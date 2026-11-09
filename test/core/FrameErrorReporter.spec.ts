import { test, expect, suite, beforeEach, afterEach, vi } from "vitest";
import { FrameErrorReporter } from "@/core/FrameErrorReporter";

/** What the game loop does with an error a frame threw, now that it runs on after one. */
suite("Frame Error Reporter Test Suite", () => {
	let logged: ReturnType<typeof vi.spyOn>;
	let reported: unknown[];
	const original = globalThis.reportError;

	beforeEach(() => {
		logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
		reported = [];
		globalThis.reportError = (error: unknown) => reported.push(error);
	});

	afterEach(() => {
		logged.mockRestore();
		globalThis.reportError = original;
	});

	test("An error is logged and handed to the page's error listeners", () => {
		const error = new Error("a frame failed");

		expect(new FrameErrorReporter().report(error)).toBe(true);
		expect(logged).toHaveBeenCalledWith("A frame failed:", error);
		expect(reported).toStrictEqual([error]);
	});

	test("An error that recurs every frame is told once, not sixty times a second", () => {
		const reporter = new FrameErrorReporter();

		reporter.report(new Error("the same"));
		expect(reporter.report(new Error("the same"))).toBe(false);
		expect(reporter.report(new Error("another"))).toBe(true);

		expect(reported).toHaveLength(2);
		expect(logged).toHaveBeenCalledTimes(2);
	});

	test("Something thrown that is not an Error is told by its text", () => {
		const reporter = new FrameErrorReporter();

		reporter.report("a string");
		expect(reporter.report("a string")).toBe(false);
		expect(reported).toStrictEqual(["a string"]);
	});

	test("Without reportError in the browser it still logs", () => {
		globalThis.reportError = undefined as unknown as typeof reportError;

		expect(new FrameErrorReporter().report(new Error("old browser"))).toBe(true);
		expect(logged).toHaveBeenCalledTimes(1);
	});
});
