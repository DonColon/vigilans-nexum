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
	},
	// The feature layering: a component knows only its own data shape (and the
	// content it is built from); a rule may read entities and several
	// components but never the screen; a system may reach anything. Enforced
	// here rather than remembered.
	{
		files: ["src/game/**/components/**/*.ts"],
		rules: {
			"@typescript-eslint/no-restricted-imports": [
				"error",
				{
					patterns: [
						{ group: ["@/core/ecs/Entity", "@/core/ecs/World"], message: "A component holds one data shape; anything that walks entities or the world is a rule (rules/).", allowTypeImports: true },
						{ group: ["@/game/*/rules/*", "@/game/*/view/*", "@/game/*/systems/*"], message: "A component imports only its data's vocabulary: other components' data types and content/.", allowTypeImports: true }
					]
				}
			]
		}
	},
	{
		files: ["src/game/**/rules/**/*.ts"],
		rules: {
			"@typescript-eslint/no-restricted-imports": [
				"error",
				{
					patterns: [{ group: ["@/game/*/view/*", "@/game/*/systems/*"], message: "A rule is pure game logic; the screen and the systems sit above it.", allowTypeImports: true }]
				}
			]
		}
	}
];
