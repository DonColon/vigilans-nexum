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
		// Vitest 4 removed poolOptions in favour of top-level settings. Kept to one
		// file at a time as before, since vitest.setup.ts seeds process-wide
		// singletons into the ServiceRegistry.
		pool: "threads",
		fileParallelism: false,
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
