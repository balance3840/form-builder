# Form visual builder

**[📖 Read the documentation → balance3840.github.io/form-builder/](https://balance3840.github.io/form-builder/)**


A visual editor for forms that writes the [form-generator](https://github.com/balance3840/form-generator) v2 JSON under the hood.
Built for people who do not want to touch JSON: drag fields in, tweak them in a side panel, restyle the form, preview it on a phone, and hand over the result.

## Features

- **Drag and drop** 25 field types (text, email, dropdown, single / multiple choice, rating, opinion scale, slider, file upload, dates, country, headings, page breaks…). Click to add, drag to reorder, duplicate, delete, undo / redo (Ctrl/Cmd+Z).
- **WYSIWYG canvas** that renders the real generator, so what you build is what people see. **Rows and columns** like Notion or Tally: drag a field to the left or right edge of another to create columns, stack several fields in a column, pick a layout (1/2 + 1/2, 1/3 + 2/3, 3 equal…) and align rows (top / middle / bottom, left / center / right).
- **Inspector** per field: question, help text, options editor (with bulk edit), validation with custom messages, width, **conditional logic** ("show this when…"), advanced field keys.
- **Multi-step forms** with a *Page break* block, an automatic progress bar and optional step titles. With the *Step list* layout (advanced view) you can add progress rings per step, a back link at the top of the list (with "Saved 5 minutes ago" via `{saved}`) and buttons under the steps (send, next step or an event for your page).
- **Address search** with friendly settings: pick a provider (OpenStreetMap by default; Google Places, Mapbox, Geoapify, Denmark's official register with your own key; or your own service), countries, city, what is saved, and a **Test it** box. Own services can also search **step by step** (street → number → floor and door).
- **Search & pick** field: live autocomplete against any JSON endpoint (OpenStreetMap addresses and countries presets), single or multiple with chips. Inputs can have a text before/after (e.g. "m²"), and rows accept custom column widths.
- **Choice fields**: pre-selected options (single and multiple), option groups, options per row, and an "Other…" option with a text box. In the advanced view each radio / checkbox option has a **More** area for a badge ("Most used"), a description, a logo, a "Read more" link and help behind a "?"; the field settings add **Show at first** (only the first few options, the rest behind "Show more options") and every question can get a **Tooltip**.
- **Design**: 8 themes, colours, fonts, roundness, input style, spacing, button style, custom CSS, with a live preview.
- **Preview** on desktop / tablet / phone; submit it to see the data it produces.
- **JSON tab**: the form *is* the JSON. Edit it live, copy it, download it, or get an embed snippet / standalone HTML page.
- **App-like flows**: *Sections* (titled cards), *Repeating groups* (guests, rooms, items… as cards or a table, with "Add" choices that pre-fill an item, nested groups, a "Done" chip), *Buttons* with an action list (next step, go to a step, set an answer, add an item, send, open a link, tell your own code), *Message boxes*, *Signatures*, choice cards with descriptions, and a **step list** layout with ticks for finished steps, "Save and exit" and drafts kept in the browser.
- **Dialogs, tabs and item pages**: pop-up forms (add / edit an item, set a value on every item, sign), tabs inside a step, repeating items as small cards with a ⋮ menu, a Done button and drag to reorder, opened as their own page with a Back link, choices that come from the items of another group, numbered cards that unlock step by step.
- **Rules**: any number of rules per field or block: show, hide, disable, only enable, or make required, based on other answers (inside a repeating group they can use the other fields of the same item, and the number of items).
- **Multi-language** (like Typeform): add languages, translate every text side by side in the **Translate** tab with progress per language (or **Export** them as a JSON file for a translator or an AI and **Import** the result: one row per text with its key, where it is, the original and a column per language; a new language column adds that language, empty values and texts no longer in the form are skipped, and one Undo takes the import back), auto-detect the visitor's browser language, an optional flag / dropdown switcher, or force one with `language="es"`. Buttons and default error messages are built in for 9 languages. In **JSON → Embed** you can export for all languages, force one on the page (`language="es"`), or get a smaller single-language copy.
- **Spam protection**: Cloudflare Turnstile, hCaptcha, Google reCAPTCHA v2 / v3, or a keyless honeypot, with the provider test keys one click away and a copy-paste server check. Address API keys come with a restriction checklist and a generated **Cloudflare Worker proxy** to keep the key off the page.
- **Interface in several languages**: English, Español, Dansk, Svenska and Português (Portugal), picked from the top bar or the browser's language. Adding a language is adding a folder of JSON files: see [src/i18n/README.md](src/i18n/README.md).
- **Import / migrate**: paste a **v1** schema and get a converted v2 form plus a report of every change.
- **Templates**: about 40 ready-made forms with search and groups (see [Templates](#templates)), and autosave to the browser.

## Installation

```bash
npm install @restrella/form-builder @restrella/form-generator
```

`@restrella/form-generator` is a peer dependency. Then mount the builder in any page, see
[Embedding the builder](#embedding-the-builder-in-another-app).

## Templates

A searchable picker with about 40 ready-made forms in eight groups. Each one is a normal form you can change
completely, and each is translated into every interface language.

| Group (`templateCategories`) | Templates |
| --- | --- |
| `general` | `contact`, `support`, `bug`, `newsletter`, `quote`, `appointment`, `suggestion` |
| `feedback` | `feedback`, `survey`, `nps`, `product`, `website`, `feature` |
| `events` | `event`, `rsvp`, `workshop`, `webinar`, `volunteer` |
| `work` | `job`, `timeoff`, `expense`, `onboarding`, `employeeSurvey` |
| `education` | `course`, `courseEvaluation`, `permissionSlip` |
| `health` | `patientIntake`, `waiver` |
| `business` | `order`, `return`, `donation`, `membership` |
| `property` | `maintenance`, `report`, `visitor`, `parking`, `moving` |

Three more are made for one kind of application and are **not** offered unless you list them in `templateIds`:

| Id | What it is |
| --- | --- |
| `inspection` | A multi-step property inspection: step list, repeating people / rooms / meters / keys, a table per room, rules and signatures (Danish translation included) |
| `lease` | Fills in the official Danish lease contract (Typeformular A). Set `settings.pdf` to `lease-a10`; the PDF itself is made by your server |
| `waitingList` | A sign-up form whose answers use fixed names (`first_name`, `mail`, `phone`…). Some choices (`config.optionsFrom: "platform"`) must be filled in by your application when the form is served |

Choose what your people see with two options of `mountFormBuilder`:

```ts
mountFormBuilder(el, {
  templateCategories: ['general', 'feedback'],   // only these groups (default: all of them)
  templateIds: ['inspection', 'blank'],          // or exactly these templates, specific ones included
});
```

## Using the output

Download the JSON and give it to the component:

```js
document.querySelector('re-form-generator').schema = await (await fetch('form.json')).json();
```

or use **JSON → Embed** to copy a ready-made HTML snippet.

## Embedding the builder in another app

The builder is also a library, `@restrella/form-builder`. It draws itself inside a **shadow root**, so its styles and
your page's styles never touch each other.

```ts
import { mountFormBuilder } from '@restrella/form-builder';

const builder = mountFormBuilder(document.getElementById('host')!, {
  document: savedDocument,                 // the v2 JSON, or nothing for a new form
  prefillSources: [{ key: 'contact.phone', label: 'Phone', group: 'Primary contact', kind: 'tel' }],
  defaultPhoneCountry: 'dk',               // optional: new phone fields start with +45 (default: the form's language)
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

### Interface language

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

Missing words fall back to English. To contribute a language to the project, see [src/i18n/README.md](src/i18n/README.md)
and check it with `npm run i18n:check`.

### Simple and advanced view

The builder has a **Simple / Advanced** switch in the top bar (remembered per person; new people start in Simple).
Every field type is available in both. The simple view shows what most forms need (question, help text, options,
required, each type's essentials) and keeps validation rules, conditional logic, layout, field keys, auto-fill, detailed
design, spam protection, endpoints and the JSON tab for the advanced view. Settings made in the advanced view stay in
the form; the simple view tells when a field has some ("This field also has: 2 validation rules, conditional logic").

```ts
mountFormBuilder(el, {
  view: 'simple',              // or 'advanced'; default: the person's last choice
  allowAdvancedView: false,    // keep everyone in the simple view (no switch)
  onViewChange: view => savePreference(view),
});
```

### Auto-fill

Give the builder a list of `prefillSources` and every field gets an **Auto-fill from…** choice (stored as
`field.config.prefill`, with `config.prefillLock` to make the value read-only). Texts can use `{{key}}` tokens, e.g. a
description of `{{contact.address}}`. When the form is opened, the host calls `applyPrefill(document, data)` from
`@restrella/form-generator` and renders the returned `doc` with the returned `values` as the generator's `model`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) to run the project locally and for the release process.

## License

[MIT](LICENSE)
