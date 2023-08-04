import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

import { terser } from "rollup-plugin-terser";
import copy from "rollup-plugin-copy";


const source = "src";
const destination = "dist";

const files = [
	"assets",
	"index.html",
	"index.css",
	"manifest.json"
];

const targets = files.map(file => `${source}/${file}`)
		.map(asset => ({ src: asset, dest: destination }));


export default [{
	input: `${source}/index.ts`,
	output: {
		file: `${destination}/bundle.min.js`,
		format: 'umd',
		sourcemap: true
	},
	plugins: [
		typescript(),
		resolve(),
		commonjs(),
		terser(),
		copy({ targets })
	]
}];