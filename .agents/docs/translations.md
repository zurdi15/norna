# Translations

User-facing strings must be translatable. Norna ships English and Spanish.

- Frontend: strings in `frontend/src/i18n/lang/en.json` and `es-ES.json`. Every new key goes into both, in the same commit: neutral Spanish, informal "tú", short and plain (no "successfully"). In components: `const {t} = useI18n()`, then `t('your.key')`; elsewhere `translate('your.key')` from `@/i18n`.
- Keep each file's formatting (en.json: 2 spaces, es-ES.json: tabs). When several agents may write them at once, add keys through a merging script rather than by hand.
- `mage check:translations` fails on keys the code uses but `en.json` lacks, and on keys `en.json` has but nothing uses. Delete dead keys from both files.
- Before adding a new string, check if a string with the same value already exists. If it does, use the existing key.
- API (mostly notifications): source strings in `pkg/i18n/lang/en.json`, `i18n.T(lang, "your.key", params...)`. The backend follows upstream, whose translations come from Crowdin.
