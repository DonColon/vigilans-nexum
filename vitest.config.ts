import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

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
		poolOptions: {
			threads: {
				singleThread: true
			}
		},
		coverage: {
			provider: "istanbul"
		}
	},
	plugins: [tsconfigPaths()]
});
