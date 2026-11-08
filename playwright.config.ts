import { defineConfig, devices } from "@playwright/test";

/**
 * The smoke test: the production build, minified as it ships, opened in a real
 * browser. It catches what the unit specs cannot see because they never bundle
 * or minify - a renamed class, an asset missing from dist, a crash on start.
 *
 * Run `npm run build` first; `npm run test:smoke` serves dist with `vite preview`.
 */
export default defineConfig({
	testDir: "test/smoke",
	testMatch: "**/*.smoke.ts",
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL: "http://localhost:4173",
		trace: "retain-on-failure",
		screenshot: "only-on-failure"
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: "npx vite preview --port 4173 --strictPort",
		url: "http://localhost:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 60_000
	}
});
