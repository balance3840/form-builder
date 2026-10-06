/**
 * English, the source language: every key exists here. Bundled (the other languages load on demand).
 * To add an area of the interface, add `locales/en/<area>.json` and list it below.
 */
import common from './locales/en/common.json';
import lib from './locales/en/lib.json';
import topbar from './locales/en/topbar.json';
import canvas from './locales/en/canvas.json';
import palette from './locales/en/palette.json';
import fields from './locales/en/fields.json';
import templates from './locales/en/templates.json';
import preview from './locales/en/preview.json';
import fieldInspector from './locales/en/fieldInspector.json';
import blocks from './locales/en/blocks.json';
import logic from './locales/en/logic.json';
import design from './locales/en/design.json';
import settings from './locales/en/settings.json';
import languages from './locales/en/languages.json';
import security from './locales/en/security.json';
import translate from './locales/en/translate.json';
import code from './locales/en/code.json';
import store from './locales/en/store.json';

const AREAS = { common, lib, topbar, canvas, palette, fields, templates, preview, fieldInspector, blocks, logic, design, settings, languages, security, translate, code, store };

type Areas = typeof AREAS;
type PluralForm = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
/** `items_one` / `items_other` are both looked up as `items` (with a `count`). */
type Base<K extends string> = K extends `${infer B}_${PluralForm}` ? B | K : K;

/** Every interface text key, e.g. `'topbar.undo'`. */
export type MessageKey = { [A in keyof Areas]: `${A & string}.${Base<keyof Areas[A] & string>}` }[keyof Areas];

export const en: { [key: string]: string } = {};
Object.entries(AREAS).forEach(([area, messages]) => Object.entries(messages as { [key: string]: string }).forEach(([key, text]) => (en[`${area}.${key}`] = text)));
