/// <reference types="vite/client" />

import { defineConfig } from "vite";
import { offline } from "./tools/offline";

export default defineConfig({
	root: "src",
	// Resolved relative to `root`, so this is src/assets. Its contents are copied
	// verbatim to the root of outDir: asset bundles are fetched by AssetLoader at
	// runtime and must keep stable, unhashed URLs.
	publicDir: "assets",
	// Writes dist/sw.js, which stores the whole build so the game plays offline.
	plugins: [offline()],
	build: {
		outDir: "../dist",
		// outDir lives outside root, so Vite will not clear it unless asked.
		emptyOutDir: true
	},
	// Nothing at runtime depends on a class's `name`, so the minifier may rename
	// freely: systems, commands and features are looked up by the class itself,
	// services by the id their @GameCoreService declares, components and states
	// by their static type. The smoke test (test/smoke) runs the minified build.
	//
	// Vite 8 reads the `@/*` aliases straight from tsconfig.json, which replaces
	// the vite-tsconfig-paths plugin.
	resolve: {
		tsconfigPaths: true
	}
});
