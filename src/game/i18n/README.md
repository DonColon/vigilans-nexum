# Translations

One flat `[locale].json` per language, mapping a technical key to display text:

```json
{
	"menu.wait": "Warten",
	"terrain.inspect": "Feld {column}, {row} - {terrain}. Bewegungskosten: {cost}."
}
```

- Keys are dotted technical names, values are strings. No nesting, no non-string
  values - the parser rejects both.
- Placeholders are `{name}`; the caller fills them via `i18n("key", { name: ... })`.

The engine that loads and validates these lives in `@/core/i18n`. `LocaleCatalog.ts`
there globs this folder at build time, so a new file is picked up automatically -
no registration.

## Adding a language

Drop in `src/game/i18n/<code>.json` with **every** key the other files define.
`test/core/i18n/LocaleCatalog.spec.ts` runs `validateLocaleCatalog` against these
files and fails CI if a key is missing from one file or defined twice in the same
file.

The active locale is chosen from the browser language at startup, falling back to
`GameConfiguration.i18n.fallbackLocale` (see `src/game.config.ts`).
