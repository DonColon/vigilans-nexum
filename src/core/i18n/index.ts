export { i18n, getI18n, detectLocale, I18nService, DEFAULT_LOCALE } from "@/core/i18n/I18n";
export type { I18nOptions } from "@/core/i18n/I18n";

export { interpolate, placeholderNames, parseLocaleFile, findDuplicateKeys } from "@/core/i18n/Locale";
export type { LocaleParams, LocaleMessages, RawLocaleCatalog } from "@/core/i18n/Locale";

export { loadLocaleCatalog } from "@/core/i18n/LocaleCatalog";

export { localizedText } from "@/core/i18n/LocalizedText";
export type { LocalizedText } from "@/core/i18n/LocalizedText";

export { validateLocaleCatalog, assertLocaleCatalog } from "@/core/i18n/LocaleValidation";
export type { LocaleValidationResult, LocaleValidationIssue, LocaleIssueKind } from "@/core/i18n/LocaleValidation";
