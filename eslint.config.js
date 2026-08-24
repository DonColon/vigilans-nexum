import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default [
	{
		ignores: ["dist/**", "coverage/**", "node_modules/**", "graphify-out/**"]
	},
	js.configs.recommended,
	{
		files: ["src/**/*.ts", "test/**/*.ts"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module"
			},
			globals: {
				...globals.browser
			}
		},
		plugins: {
			"@typescript-eslint": tsPlugin,
			prettier: prettierPlugin
		},
		rules: {
			...tsPlugin.configs["eslint-recommended"].overrides[0].rules,
			...tsPlugin.configs.recommended.rules,
			...prettierConfig.rules,
			// Diagnostics are allowed, stray debug logs are not.
			"no-console": ["error", { allow: ["warn", "error", "info", "table"] }],
			"prettier/prettier": "error",
			"no-var": "off",
			"@typescript-eslint/no-explicit-any": "off",
			// A leading underscore marks a binding that is deliberately unused,
			// e.g. parameters kept to satisfy an abstract signature.
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_"
				}
			]
		}
	}
];
