/* global process, console */
// Reports where the locale tables and the code disagree. Run from the repo root:
//   node .claude/skills/i18n-sync/check.mjs
// Exit code 1 when anything needs fixing. Read-only.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const localeDir = join(root, "src/game/i18n");
const sourceDir = join(root, "src");

const walk = (dir, out = []) => {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) walk(path, out);
		else if (/\.ts$/.test(entry.name)) out.push(path);
	}
	return out;
};

// One flat table per locale; a duplicate key is caught by the LocaleCatalog spec, not here.
const locales = Object.fromEntries(
	readdirSync(localeDir)
		.filter((name) => name.endsWith(".json"))
		.map((name) => [name.replace(/\.json$/, ""), JSON.parse(readFileSync(join(localeDir, name), "utf8"))])
);
const localeNames = Object.keys(locales).sort();
const allKeys = new Set(localeNames.flatMap((locale) => Object.keys(locales[locale])));

// What the code asks for. A literal `i18n("a.b")` is exact; a template
// `i18n(\`a.${x}\`)` is a prefix and covers every key under it; a constant fed
// to i18n() is found by its own string literal elsewhere in the same file.
const literal = new Set();
const prefixes = new Set();
const uses = new Map(); // key -> files

for (const file of walk(sourceDir)) {
	if (file.includes(`${join("src", "game", "i18n")}`)) continue;
	const text = readFileSync(file, "utf8");
	const where = relative(root, file).replaceAll("\\", "/");

	for (const match of text.matchAll(/i18n\(\s*"([^"]+)"/g)) {
		literal.add(match[1]);
		uses.set(match[1], [...(uses.get(match[1]) ?? []), where]);
	}
	// A dotted template literal anywhere - `terrain.${terrain}` may be built into a
	// variable before it reaches i18n().
	for (const match of text.matchAll(/`([a-z][a-zA-Z0-9]*\.(?:[a-zA-Z0-9]+\.)*)\$\{/g)) {
		prefixes.add(match[1]);
	}
	// Any other dotted string literal that happens to be a defined key counts as a use
	// (a KEY constant, a Record of keys, a label: () => i18n(x) indirection).
	for (const match of text.matchAll(/"([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)"/g)) {
		if (allKeys.has(match[1])) {
			literal.add(match[1]);
			uses.set(match[1], [...new Set([...(uses.get(match[1]) ?? []), where])]);
		}
	}
}

const placeholders = (text) => [...text.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]).sort();

const issues = [];

// 1. Parity between the locale files.
for (const locale of localeNames) {
	const missing = [...allKeys].filter((key) => !(key in locales[locale])).sort();
	if (missing.length) issues.push({ kind: "missing-in-locale", locale, keys: missing });
}

// 2. Used in code, defined nowhere.
const undefinedKeys = [...literal].filter((key) => !allKeys.has(key)).sort();
if (undefinedKeys.length) issues.push({ kind: "used-not-defined", keys: undefinedKeys.map((key) => `${key}  (${uses.get(key)?.join(", ")})`) });

// 3. Defined, never referenced - by literal or by a template prefix.
const orphaned = [...allKeys].filter((key) => !literal.has(key) && ![...prefixes].some((prefix) => key.startsWith(prefix))).sort();
if (orphaned.length) issues.push({ kind: "defined-not-used", keys: orphaned });

// 4. Placeholders that differ between locales - a {unit} in en but not in de.
for (const key of allKeys) {
	const sets = localeNames.filter((locale) => key in locales[locale]).map((locale) => `${locale}:{${placeholders(locales[locale][key]).join(",")}}`);
	if (new Set(sets.map((entry) => entry.slice(entry.indexOf(":")))).size > 1) issues.push({ kind: "placeholder-mismatch", keys: [`${key}  ${sets.join(" ")}`] });
}

// 5. Non-string or nested values - the parser rejects them.
for (const locale of localeNames) {
	const bad = Object.entries(locales[locale])
		.filter(([, value]) => typeof value !== "string")
		.map(([key]) => key);
	if (bad.length) issues.push({ kind: "non-string-value", locale, keys: bad });
}

console.info(
	`locales: ${localeNames.map((locale) => `${locale} (${Object.keys(locales[locale]).length})`).join(", ")}; keys used in src: ${literal.size} literal, ${prefixes.size} prefixes [${[...prefixes].join(", ")}]`
);

if (issues.length === 0) {
	console.info("in sync");
	process.exit(0);
}

for (const issue of issues) {
	console.info(`\n${issue.kind}${issue.locale ? ` (${issue.locale})` : ""}:`);
	for (const key of issue.keys) console.info(`  ${key}`);
}
process.exit(1);
