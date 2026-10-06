---
title: "Auto-fill"
sidebar_position: 9
---

Give the builder a list of `prefillSources` and every field gets an **Auto-fill from…** choice (stored as
`field.config.prefill`, with `config.prefillLock` to make the value read-only). Texts can use `{{key}}` tokens, e.g. a
description of `{{contact.address}}`. When the form is opened, the host calls `applyPrefill(document, data)` from
`@restrella/form-generator` and renders the returned `doc` with the returned `values` as the generator's `model`.
