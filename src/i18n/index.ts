/**
 * Translations of the builder's own interface (not of the forms: those live in `doc.i18n`).
 *
 * Every language is a folder in `./locales/<code>/` with one JSON file per area of the interface
 * (`topbar.json`, `fieldInspector.json`…). English is the source: its files define every key. Other languages
 * are discovered automatically and loaded on demand; a missing key falls back to English. See `./README.md`.
 *
 *   t('topbar.undo')                       -> "Undo"
 *   t('canvas.fieldsSelected', { count })  -> picks `fieldsSelected_one` / `fieldsSelected_other` by plural rules
 *   rich('settings.forceHint', { code: <code>language="es"</code> })  -> text with elements in it (JSX)
 */
import { signal } from '@preact/signals';
import type { ComponentChild } from 'preact';
import { en, type MessageKey } from './en';

export type { MessageKey } from './en';
export type Messages = { [key: string]: string };

/** Lazy loaders for every `locales/<code>/<area>.json` except English (which is bundled). */
const LOADERS = import.meta.glob(['./locales/*/*.json', '!./locales/en/*.json'], { import: 'default' }) as Record<string, () => Promise<Messages>>;

const fileCodes = Array.from(new Set(Object.keys(LOADERS).map(path => path.split('/')[2])));

/** Template content per language: `template-content/<code>.json` maps a template's English text (the keys of `en.json`) to its translation. */
const TEMPLATE_LOADERS = import.meta.glob(['./template-content/*.json', '!./template-content/en.json'], { import: 'default' }) as Record<string, () => Promise<Messages>>;
const templateTables: Record<string, Messages> = {};

async function loadTemplateTable(code: string) {
  const loader = TEMPLATE_LOADERS[`./template-content/${code}.json`];
  if (loader && !templateTables[code]) templateTables[code] = await loader().catch(() => ({}));
}

/** The template texts of the interface language, keyed by their English text (empty for English). */
export const templateTable = (): Messages => templateTables[locale.value] || {};

/** Languages added at runtime (`registerLocale`, or the `locales` option of `mountFormBuilder`). */
const registered: Record<string, { name?: string; messages: Messages }> = {};
const loaded: Record<string, Messages> = { en };

export const DEFAULT_LOCALE = 'en';
const STORAGE_KEY = 'form-builder:locale';

/** The interface language in use. */
export const locale = signal(DEFAULT_LOCALE);
/** The messages of `locale` merged over English. Reading it in a component re-renders that component on a switch. */
const active = signal<Messages>(en);

/** The native name of a language, e.g. "Español", from the browser's own language data. */
export function localeName(code: string): string {
  if (registered[code]?.name) return registered[code].name!;
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) || code;
    return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch (e) {
    return code;
  }
}

/** Every interface language available, English first. */
export function availableLocales(): { code: string; name: string }[] {
  const codes = Array.from(new Set([DEFAULT_LOCALE, ...fileCodes, ...Object.keys(registered)]));
  return codes.map(code => ({ code, name: localeName(code) })).sort((a, b) => (a.code === DEFAULT_LOCALE ? -1 : b.code === DEFAULT_LOCALE ? 1 : a.name.localeCompare(b.name)));
}

/** The best available interface language for a list of wishes ('pt-BR' matches 'pt'), or undefined. */
export function matchLocale(wanted: readonly (string | null | undefined)[]): string | undefined {
  const codes = availableLocales().map(l => l.code);
  const lower = codes.map(c => c.toLowerCase());
  for (const raw of wanted) {
    if (!raw) continue;
    const w = raw.toLowerCase();
    const exact = lower.indexOf(w);
    if (exact >= 0) return codes[exact];
    const base = lower.indexOf(w.split('-')[0]);
    if (base >= 0) return codes[base];
    // Norwegian readers understand Danish better than English
    if (/^(nb|nn|no)\b/.test(w) && lower.includes('da')) return 'da';
  }
  return undefined;
}

async function loadMessages(code: string): Promise<Messages> {
  if (code === DEFAULT_LOCALE) return { ...en, ...registered[code]?.messages };
  if (!loaded[code]) {
    const files = Object.keys(LOADERS).filter(path => path.split('/')[2] === code);
    const parts = await Promise.all(files.map(path => LOADERS[path]().then(messages => ({ area: path.split('/')[3].replace(/\.json$/, ''), messages }))));
    const merged: Messages = {};
    parts.forEach(({ area, messages }) => Object.entries(messages || {}).forEach(([key, text]) => text && (merged[`${area}.${key}`] = text)));
    loaded[code] = merged;
  }
  return { ...en, ...loaded[code], ...registered[code]?.messages };
}

let switchId = 0;

/** Switches the interface language (unknown codes fall back to the closest match, then English). */
export async function setLocale(code: string, { remember = true } = {}): Promise<void> {
  const next = matchLocale([code]) || DEFAULT_LOCALE;
  const id = ++switchId;
  const [messages] = await Promise.all([loadMessages(next).catch(() => en), loadTemplateTable(next)]);
  if (id !== switchId) return; // a later switch won
  active.value = messages;
  locale.value = next;
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      /* storage blocked */
    }
  }
}

/**
 * Adds a language, or changes words of an existing one, at runtime. `messages` uses full keys
 * (`'topbar.undo': 'Deshacer'`); anything missing falls back to the file translations, then English.
 */
export function registerLocale(code: string, messages: Messages, name?: string) {
  registered[code] = { name: name || registered[code]?.name, messages: { ...registered[code]?.messages, ...messages } };
  if (locale.value === code) setLocale(code, { remember: false });
}

/** The language to start with: an explicit wish, then `?lang=`, then the last choice, then the browser languages. */
export function initialLocale(preferred?: string | null): string {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    /* storage blocked */
  }
  let fromUrl: string | null = null;
  try {
    fromUrl = new URLSearchParams(location.search).get('lang');
  } catch (e) {
    /* no location */
  }
  return matchLocale([preferred, fromUrl, stored, ...(typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [])]) || DEFAULT_LOCALE;
}

/* ---------------------------------------------------------------- lookups */

type Params = { [name: string]: string | number | null | undefined };

/** English only, while building content that must not depend on the interface language (templates). */
let forceEnglish = 0;
export function inEnglish<T>(fn: () => T): T {
  forceEnglish++;
  try {
    return fn();
  } finally {
    forceEnglish--;
  }
}

/**
 * Texts the builder writes INTO the form (a new field's question, "Option 1", a new step's title, the thank-you
 * page) are form content: they belong in the form's own language, not the interface's. A builder used in Spanish
 * that edits an English form adds "Option 1", not "Opción 1". `setContentLanguage` is called by the store whenever
 * the form's main language changes; a language the builder has no translation of falls back to English.
 */
let contentCode = DEFAULT_LOCALE;
let contentMessages: Messages = en;
let contentDepth = 0;

export async function setContentLanguage(code: string | undefined) {
  const next = matchLocale([code]) || DEFAULT_LOCALE;
  contentCode = next;
  const messages = await loadMessages(next).catch(() => en);
  if (contentCode === next) contentMessages = messages;
}

/** Runs `fn` with `t()` answering in the form's language (see `setContentLanguage`). */
export function inContentLanguage<T>(fn: () => T): T {
  contentDepth++;
  try {
    return fn();
  } finally {
    contentDepth--;
  }
}

const pluralRules: Record<string, Intl.PluralRules> = {};
function pluralOf(count: number): string {
  const code = forceEnglish ? DEFAULT_LOCALE : contentDepth ? contentCode : locale.value;
  try {
    return (pluralRules[code] ||= new Intl.PluralRules(code)).select(count);
  } catch (e) {
    return count === 1 ? 'one' : 'other';
  }
}

function lookup(key: string, params?: Params): string | undefined {
  const messages = forceEnglish ? en : contentDepth ? contentMessages : active.value;
  if (params && typeof params.count === 'number') {
    const form = pluralOf(params.count);
    const plural = messages[`${key}_${form}`] ?? messages[`${key}_other`] ?? en[`${key}_${form}`] ?? en[`${key}_other`];
    if (plural !== undefined) return plural;
  }
  return messages[key] ?? en[key];
}

const fill = (text: string, params?: Params) => (params ? text.replace(/\{(\w+)\}/g, (all: string, name: string) => (params[name] === undefined || params[name] === null ? all : String(params[name]))) : text);

/** The interface text for `key`, with `{name}` placeholders filled from `params`. */
export function t(key: MessageKey, params?: Params): string {
  const text = lookup(key, params);
  return text === undefined ? key : fill(text, params);
}

/**
 * For keys built at runtime (e.g. per validation rule or provider id that the generator may add to later):
 * the translation when there is one, otherwise `fallback`.
 */
export function tOr(key: string, fallback: string, params?: Params): string {
  const text = lookup(key, params);
  return fill(text === undefined ? fallback : text, params);
}

/** Like `t`, but placeholders can be elements: returns a list of children for JSX. */
export function rich(key: MessageKey, params: { [name: string]: ComponentChild }): ComponentChild[] {
  const text = lookup(key, typeof params.count === 'number' ? (params as Params) : undefined) ?? key;
  return text.split(/(\{\w+\})/g).map(part => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return name && name in params ? params[name] : part;
  });
}
