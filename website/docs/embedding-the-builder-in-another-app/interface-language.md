---
title: "Interface language"
sidebar_position: 7
---

The builder's own interface follows the browser's language (or the person's last choice in the top bar). An embedding
app can choose it, add languages or change some words:

```ts
mountFormBuilder(el, {
  locale: 'da',                                         // 'en' | 'es' | 'da' | 'sv' | 'pt' | a code added below
  locales: { de: { name: 'Deutsch', messages: { 'topbar.undo': 'Rückgängig' /* … */ } } },
  hideLocalePicker: true,                               // the host app decides
  onLocaleChange: code => saveUserPreference(code),
});
builder.update({ locale: 'sv' });
```

Missing words fall back to English. To contribute a language to the project, see [src/i18n/README.md](https://github.com/balance3840/form-builder/blob/main/src/i18n/README.md)
and check it with `npm run i18n:check`.
