import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		setupFiles: ["./vitest.setup.ts"],
		environment: "jsdom",
		environmentOptions: {
			jsdom: {
				resources: "usable"
			}
		},
		deps: {
			optimizer: {
				web: {
					include: ["vitest-canvas-mock"]
				}
			}
		},
		// Spec files run in parallel. vitest.setup.ts seeds singletons into the
		// ServiceRegistry, but with `isolate` (the default) every file gets its own
		// module graph and so its own registry - the files never share them. Do not
		// turn `isolate` off without making the specs reset that registry first.
		pool: "threads",
		coverage: {
			provider: "istanbul",
			// lcov is what SonarCloud reads, see sonar-project.properties.
			reporter: ["text", "html", "lcov"]
		}
	},
	// Replaces the vite-tsconfig-paths plugin, see vite.config.ts.
	resolve: {
		tsconfigPaths: true
	}
});
