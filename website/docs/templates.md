---
title: "Templates"
sidebar_position: 4
---

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
