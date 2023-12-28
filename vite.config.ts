/// <reference types="vite/client" />

import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	root: "src",
	publicDir: "src/assets",
	build: {
    	outDir: "../dist"
  	},
	plugins: [
		tsconfigPaths()
	]
});
