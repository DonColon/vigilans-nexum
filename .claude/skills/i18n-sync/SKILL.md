---
name: i18n-sync
description: Keeps the Vigilans Nexum interface strings in sync - the flat en.json / de.json tables under src/game/i18n against every i18n() call in src - by finding keys used but undefined, defined but unused, missing from one locale, or with placeholders that differ between locales, then adding the missing keys with a German and an English wording. Use whenever the user asks to add, translate, rename or clean up a label, menu row, message or any UI text, mentions a missing translation or a key showing up raw in the game, or after a feature has added i18n() calls; also use it to add a new language.
argument-hint: [key or feature to sync, or "audit"]
---

# Sync the interface strings

Arguments: `$ARGUMENTS` - a key, a feature name, or nothing / `audit` for the whole table.

## How strings work here

- Interface text goes through `i18n("dotted.key", { placeholder })` (`src/core/i18n/I18n.ts`) and lives in **one flat JSON table per locale** in `src/game/i18n/<locale>.json`; `en.json` and `de.json` today. Keys are `<feature>.<name>` (`menu.attack`, `visit.received`, `options.textSpeed.fast`), values are strings, placeholders are `{name}`. No nesting, no non-string values - the parser rejects both.
- A missing key comes back **as the key itself** - that is what a raw `roster.level` on screen means. There is no warning; the checker below is the only thing that notices.
- `LocaleCatalog.ts` globs the folder at build time: a new `<code>.json` is picked up with no registration. `test/core/i18n/LocaleCatalog.spec.ts` fails the build when the files disagree on their keys or a key is defined twice in one file.
- The active locale is picked from `navigator.languages` at startup, falling back to `de` (`game.config.ts` → `i18n.fallbackLocale`). The browser on this machine shows German; jsdom in the specs shows English. Assertions in specs therefore go through `i18n("key")`, never a literal.
- **Content is not interface text.** A unit's `name`, an item's `description`, a conversation page, a villager's line are `{ "de": ..., "en": ... }` inside the JSON documents under `src/assets/data` (see the `add-content` skill), not keys in these tables. If a string describes a *thing in the world*, it is content; if it names a *control or a message of the interface*, it is a key.
- Some keys are built at runtime: `` i18n(`roster.${stat}`) ``, `` `terrain.${terrain}` ``, `options.section.<section>`, `options.volume.<channel>`, `options.textSpeed.<speed>`, and constant maps like `OUTCOME_TITLE_KEY`. A key that a grep for its literal does not find may still be in use.

## Procedure

1. **Run the checker**: `node .claude/skills/i18n-sync/check.mjs` from the repo root. It reads every locale file and every `.ts` under `src` and reports, exit 1 on anything:
   - `missing-in-locale` - a key one file has and another lacks (this is what fails CI);
   - `used-not-defined` - an `i18n("...")` literal no table defines (shows raw in the game);
   - `defined-not-used` - a key no literal, dotted template prefix or key constant references (dead, or about to be used by code not yet written);
   - `placeholder-mismatch` - `{item}` in one locale, `{gegenstand}` in another (the caller fills by name, so the second stays unfilled);
   - `non-string-value`.
   Take the output as the worklist. Do not trust it blindly on `defined-not-used`: confirm each with a `Grep` for the key's last segment before touching it - a key referenced through a variable is not dead.

2. **Fix each finding** in **both** files, keeping the key order the same in each (new keys go next to their feature's others, not at the end):
   - Missing in a locale → add it with a proper translation, not a copy of the other language.
   - Used but undefined → add it in both. Wording: short, Fire Emblem register (imperative menu rows - `Angriff`, `Warten`; messages in plain present tense - `{unit} erhält: {item}`). Match the neighbouring keys' tone and capitalisation. German uses the formal register the existing strings use (`Ihr` / `Euch` in villager speech is content; interface messages are neutral).
   - Defined but unused → ask the user whether to delete it (list them); delete only on a yes. Never delete to make the checker green.
   - Placeholder mismatch → align the placeholder **names** to the code (`Grep` the call site for the params object), translate the words around them.
   Never rename a key without changing every call site in the same edit; never leave a value as `"TODO"` or the English text in `de.json` - if the German is uncertain, write the best wording and say so in the report.

3. **Run it again** until `in sync`, then `npx vitest run test/core/i18n` (parity and duplicate-key checks the build enforces) and `npm run lint` (the JSON is formatted by Prettier: tabs, one key per line).

4. **See the string** where it appears when the change is visible (`verify-in-browser` skill), especially for anything with a placeholder or that must fit a fixed-width panel (menu rows, the roster columns, the unit card): German is ~30 % longer than English and the panels are sized in pixels.

5. **Report**: keys added / changed / removed per locale, translations you were unsure of, orphans you left in place and why.

## Adding a language

Copy `en.json` to `src/game/i18n/<code>.json` (`<code>` is the BCP 47 primary tag the browser reports: `fr`, `it`, `sq`), translate every value, keep every key and placeholder. Run the checker - it treats every file in the folder alike - and the i18n specs. `detectLocale` matches an exact tag first and then its primary subtag, so `fr-CA` finds `fr`. Nothing else to register.

## Pitfalls that have bitten

- `de.json` and `en.json` are each ~110 lines; an edit that only touches one is the most common way this breaks, and it breaks in CI, not locally, unless the i18n specs run.
- Placeholders are filled by **name**; a translation that reorders them is fine, one that renames them is broken silently.
- The checker's regex finds `i18n("literal")`, dotted template prefixes (`` `x.${ ``) and any dotted string literal that is a defined key. A key built by concatenation (`"roster." + stat`) is invisible to it - write templates, not concatenation, so the tooling keeps working.
- A menu row's **id** (`ids` on `MenuComponent`, what `ui:menuConfirmed` reports) is not its label; only the label is a key. Do not put `i18n` keys in `ids`.
