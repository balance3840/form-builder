# Interface languages

The builder's own interface (buttons, panels, hints…) is translated here. This is separate from the
languages of the *forms* people build, which live in each form's `i18n` block.

Built in: **English** (source), **Español**, **Dansk**, **Svenska**, **Português (Brasil)**.

## How it works

```
src/i18n/
  index.ts          t(), tOr(), rich(), setLocale(), registerLocale(), language detection
  en.ts             bundles English and derives the `MessageKey` type from it
  labels.ts         names for lists that come from the generator (rules, operators, providers, themes)
  locales/
    en/             one JSON file per area of the interface: topbar.json, canvas.json, fieldInspector.json…
    es/ da/ sv/ pt/ same files, same keys
```

- A key is `<file>.<key>`: `"undo"` in `locales/en/topbar.json` is `t('topbar.undo')`.
- English is the source of truth and is bundled. Every other language is found automatically
  (any `locales/<code>/` folder) and loaded only when someone picks it.
- A key missing in a language falls back to English, so a partial translation never breaks anything.
- The language name in the picker comes from the browser (`Intl.DisplayNames`), so `sv` shows as "Svenska".
- The starting language is: the `locale` option of `mountFormBuilder`, then `?lang=xx` in the URL, then the
  person's last choice, then the browser's languages (`pt-BR` matches `pt`), then English.

## Adding a language

1. Copy `locales/en/` to `locales/<code>/` (a BCP 47 code: `de`, `fr`, `pt-PT`, `nb`…).
2. Translate the **values** (never the keys). Keep every `{placeholder}` exactly as it is.
3. Optionally translate the templates: copy `template-content/en.json` to `template-content/<code>.json` and translate the values.
4. Run `npm run i18n:check` to see missing keys, leftovers and broken placeholders.
5. That's it: the language appears in the picker in the top bar.

You can also translate only part of the files; the rest stays in English until someone finishes it.

## Templates

Templates are written once in English and created in the person's interface language. Their translations are in
`template-content/<code>.json`: the keys are the English texts (the full list is `template-content/en.json`), the
values the translation. `"Floor@inspection": "Suelo"` gives a text another translation in one template only.
Texts without a translation stay in English; in development the browser console lists them.
Languages a template already ships (the inspection report has Danish) stay in the form as translations.

When a template's text changes, add the new English text to `template-content/en.json` and its translations to the
other files. `npm run i18n:check` checks them too.

## Adding or changing texts (for developers)

- Add the English text to the right `locales/en/<area>.json` and use it with `t('<area>.<key>')`. The key is
  type checked, so a typo fails `npm run typecheck`.
- Then add the same key to the other languages (or leave it: they fall back to English, and
  `npm run i18n:check` lists what is missing).
- Name keys after what they are, in camelCase: `addQuestion`, `requiredHint`, `deleteConfirm`.
- Placeholders: `t('canvas.movedTo', { name })` with `"Moved to {name}"`.
- Plurals: give `_one` / `_other` variants (and `_few`, `_many`… where the language needs them) and pass
  `count`: `t('translate.missing', { count: 3 })` with `"missing_one": "{count} missing", "missing_other": …`.
- Text with markup inside: `rich('settings.forceHint', { code: <code>language="es"</code> })` with
  `"forceHint": "Add {code} to the tag to force a language."`. Never split a sentence into several keys:
  word order differs between languages.
- Text built when the module loads (constants) is read once, in English: translate it where it is shown
  (call `t()` inside the component, or turn the constant into a function).
- Templates are built `inEnglish()` and then translated as a whole with `localizeTemplate()` (see Templates above).

## Embedding: choosing or adding languages

```ts
mountFormBuilder(el, {
  locale: 'es',                       // start in Spanish (default: the browser's language)
  locales: {                          // add a language, or change some words of one
    de: { name: 'Deutsch', messages: { 'topbar.undo': 'Rückgängig', /* … */ } },
    es: { messages: { 'topbar.save': 'Publicar' } },
  },
  hideLocalePicker: true,             // the host app decides the language
});
builder.update({ locale: 'da' });     // switch later
```
