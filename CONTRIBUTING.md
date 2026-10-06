# Contributing

## Run it locally

Requires Node 18 or newer. The builder uses the generator package, which `package.json` links from the sibling folder
(`file:../form-generator`), so clone both repositories side by side:

```bash
# once, build the generator
cd form-generator && npm install && npm run build

cd ../form-builder
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/
npm run build:lib    # the npm package in dist-lib/ (npm run watch:lib while you work)
npm run typecheck
npm run i18n:check   # interface and template translations
```

To try your build in another project, link both packages there:
`npm link ../form-generator ../form-builder`.

## How it fits together

```
form-generator/   web component (Stencil) + schema, theme and v1 -> v2 migration utilities
form-builder/     this app (Vite + Preact + signals)
  src/store.ts        the document, history (undo/redo), autosave, all mutations
  src/catalog.ts      field types shown in the palette and their defaults
  src/components/     palette, canvas, inspector, design panel, preview, JSON / import
  src/templates/      the template picker's forms, one file per group
  src/generator.ts    the only place that imports the generator package
```

The state is a single v2 document. Every edit produces a new document; fields that did not change keep the same object, so only the edited card re-renders.

## Adding a template

Write a `Template` in `src/templates/<group>.ts` (see `helpers.ts` for the small builders), add its name and description
to `src/i18n/locales/en/templates.json` and every English text to `src/i18n/template-content/en.json`, then translate
them in the other files (see [src/i18n/README.md](src/i18n/README.md)). `npm run i18n:check` checks the files.

## Translations

See [src/i18n/README.md](src/i18n/README.md).

## Documentation site

The documentation is built from `README.md` with [Docusaurus](https://docusaurus.io) in `website/`:

```bash
cd website
npm install
npm run split   # rebuilds the pages (website/docs) from the README. Edit the README, not website/docs
npm start       # local preview
npm run build   # static site in website/build
```

Pushes to `main` publish it to GitHub Pages (`.github/workflows/docs.yml`). To keep the docs of a release when you
start changing them for the next one: `npm run docs:version -- 0.3`, then list the version in
`website/docusaurus.config.mjs`.

## Releasing

Pushing a version tag publishes to npm and creates a GitHub release (`.github/workflows/release.yml`). Pull requests
and pushes to `main` are built by `ci.yml`.

```bash
npm version 0.3.0          # bumps package.json and creates the tag v0.3.0
git push --follow-tags
```

The tag must match the `package.json` version. Versions with a suffix (`0.3.0-beta.1`) are published under that npm tag
(`beta`) and marked as pre-releases; plain versions get `latest`. Release `@restrella/form-generator` first when the
builder needs a new version of it.
