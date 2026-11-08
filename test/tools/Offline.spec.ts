import { test, expect, suite, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildVersion, CACHE_PREFIX, serviceWorkerSource, siteFiles } from "../../tools/offline";

/** The build step that makes the game playable offline: what it stores, and when its cache is renewed. */
suite("Offline Build Test Suite", () => {
	let dir: string;

	const file = (path: string, content: string) => {
		mkdirSync(join(dir, path, ".."), { recursive: true });
		writeFileSync(join(dir, path), content);
	};

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "vn-offline-"));
		file("index.html", "<html></html>");
		file("assets/index-ab12.js", "game");
		file("data/units/dardan.unit.json", "{}");
		file("sw.js", "old worker");
		file("assets/index-ab12.js.map", "{}");
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	test("Every file of the build is stored, as a site path - but not the worker itself or a source map", () => {
		expect(siteFiles(dir)).toStrictEqual(["/assets/index-ab12.js", "/data/units/dardan.unit.json", "/index.html"]);
	});

	test("The cache is renewed exactly when a file of the build changes", () => {
		const files = siteFiles(dir);
		const before = buildVersion(dir, files);

		expect(buildVersion(dir, files)).toBe(before);

		file("data/units/dardan.unit.json", '{ "level": 2 }');
		expect(buildVersion(dir, files)).not.toBe(before);
	});

	test("The worker names its cache for the build and stores the start page with the files", () => {
		const source = serviceWorkerSource("abc123", ["/index.html", "/assets/index-ab12.js"]);

		expect(source).toContain(`const CACHE = "${CACHE_PREFIX}abc123";`);
		expect(source).toContain('const FILES = ["/","/index.html","/assets/index-ab12.js"];');
		// Old versions' caches go when the new worker takes over.
		expect(source).toContain("caches.delete(key)");
	});
});
