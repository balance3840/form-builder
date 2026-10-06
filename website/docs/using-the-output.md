---
title: "Using the output"
sidebar_position: 5
---

Download the JSON and give it to the component:

```js
document.querySelector('re-form-generator').schema = await (await fetch('form.json')).json();
```

or use **JSON → Embed** to copy a ready-made HTML snippet.
