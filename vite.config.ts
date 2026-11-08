/// <reference types="vite/client" />

import { defineConfig } from "vite";

export default defineConfig({
	root: "src",
	// Resolved relative to `root`, so this is src/assets. Its contents are copied
	// verbatim to the root of outDir: asset bundles are fetched by AssetLoader at
	// runtime and must keep stable, unhashed URLs.
	publicDir: "assets",
	build: {
		outDir: "../dist",
		// outDir lives outside root, so Vite will not clear it unless asked.
		emptyOutDir: true,
		rolldownOptions: {
			output: {
				// Systems, commands, features and services are looked up by class name
				// at runtime; minified identifiers would break those lookups (every
				// command would register as "" and the second one throw). Persisted ids
				// (components, states) do not rely on this - they declare a static type.
				// Vite 8 builds with Rolldown and minifies with Oxc: the old
				// `esbuild.keepNames` no longer reaches the build, this does.
				keepNames: true
			}
		}
	},
	// Vite 8 reads the `@/*` aliases straight from tsconfig.json, which replaces
	// the vite-tsconfig-paths plugin.
	resolve: {
		tsconfigPaths: true
	}
});
