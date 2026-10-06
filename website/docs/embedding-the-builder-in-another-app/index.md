---
title: "Embedding the builder in another app"
sidebar_position: 6
slug: /embedding-the-builder-in-another-app
---

The builder is also a library, `@restrella/form-builder`. It draws itself inside a **shadow root**, so its styles and
your page's styles never touch each other.

```ts
import { mountFormBuilder } from '@restrella/form-builder';

const builder = mountFormBuilder(document.getElementById('host')!, {
  document: savedDocument,                 // the v2 JSON, or nothing for a new form
  prefillSources: [{ key: 'contact.phone', label: 'Phone', group: 'Primary contact', kind: 'tel' }],
  defaultPhoneCountry: 'dk',               // optional: new phone fields start with +45 (default: the form's language)
  hostChoicesHint: 'The choices come from your list…',  // optional: what to say on questions whose choices your app fills in
  templateCategories: ['general', 'feedback'], // optional: limit the template picker to some groups (or list `templateIds`)
  onSave: async doc => { await api.save(doc); builder.markSaved(); },
  autosave: true,                          // optional: save by itself after edits, no Save button. On failure throw an Error:
                                           // its message is shown to people (keep it plain), and the builder retries by itself
  onChange: doc => { /* every edit, debounced */ },
  hideActionSettings: true,                // the host decides where answers go
  hideCaptchaSettings: true,
  hideScriptSettings: false,               // true hides “Custom code” (the form's own JavaScript, run in a sandbox)
  editCode: (code, { title, reference }) => openMyEditor(code), // optional: your own editor for the larger view; resolve with the code or null. Without it the builder opens Monaco (from cdn.jsdelivr.net, a text box when that is blocked)
  hideExport: true,
});
// builder.getDocument() · builder.setDocument(doc) · builder.update({...}) · builder.save() · builder.destroy()
```

The host element needs a height. `@restrella/form-generator` is a peer dependency: install it next to the builder.
