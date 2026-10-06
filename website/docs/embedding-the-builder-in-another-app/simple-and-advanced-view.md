---
title: "Simple and advanced view"
sidebar_position: 8
---

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
