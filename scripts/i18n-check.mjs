#!/usr/bin/env node
/**
 * Checks the interface translations against English (src/i18n/locales/en).
 *
 *   npm run i18n:check            all languages
 *   npm run i18n:check -- sv pt   only these
 *
 * Reports per language: missing keys, keys English no longer has, and texts whose {placeholders} differ from
 * English. Missing keys only warn (they fall back to English); the other two fail the check.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales');
const PLURAL = /_(zero|one|two|few|many|other)$/;

function readLocale(code) {
  const out = {};
  for (const file of readdirSync(join(root, code)).filter(f => f.endsWith('.json'))) {
    const area = file.replace(/\.json$/, '');
    let messages;
    try {
      messages = JSON.parse(readFileSync(join(root, code, file), 'utf8'));
    } catch (e) {
      console.error(`✖ ${code}/${file}: invalid JSON (${e.message})`);
      process.exitCode = 1;
      continue;
    }
    for (const [key, text] of Object.entries(messages)) out[`${area}.${key}`] = text;
  }
  return out;
}

const placeholders = text => [...String(text).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
/** `items_one` may leave out `{count}` ("One item"), so plural forms are compared by the other placeholders. */
const comparable = (key, text) => (PLURAL.test(key) ? placeholders(text).split(',').filter(p => p && p !== 'count').join(',') : placeholders(text));

const en = readLocale('en');
const enBases = new Set(Object.keys(en).map(k => k.replace(PLURAL, '')));
const wanted = process.argv.slice(2);
const codes = readdirSync(root).filter(c => c !== 'en' && existsSync(join(root, c)) && (!wanted.length || wanted.includes(c)));

for (const code of codes) {
  const messages = readLocale(code);
  const missing = Object.keys(en).filter(k => !(k in messages) && !(PLURAL.test(k) && Object.keys(messages).some(m => m.replace(PLURAL, '') === k.replace(PLURAL, ''))));
  const extra = Object.keys(messages).filter(k => !(k in en) && !(PLURAL.test(k) && enBases.has(k.replace(PLURAL, ''))));
  const broken = Object.keys(messages).filter(k => {
    const source = en[k] ?? en[`${k.replace(PLURAL, '')}_other`];
    return source !== undefined && comparable(k, messages[k]) !== comparable(k, source);
  });
  const empty = Object.keys(messages).filter(k => !String(messages[k]).trim());
  const total = Object.keys(en).length;
  const ok = !extra.length && !broken.length;
  console.log(`${ok ? '✔' : '✖'} ${code}: ${total - missing.length}/${total} translated${missing.length ? `, ${missing.length} missing (English shown)` : ''}${extra.length ? `, ${extra.length} unknown` : ''}${broken.length ? `, ${broken.length} with wrong placeholders` : ''}${empty.length ? `, ${empty.length} empty` : ''}`);
  missing.forEach(k => console.log(`    missing      ${k}`));
  extra.forEach(k => console.log(`    unknown      ${k}  (not in English: remove or rename)`));
  broken.forEach(k => console.log(`    placeholders ${k}: "${messages[k]}"  vs English "${en[k] ?? en[`${k.replace(PLURAL, '')}_other`]}"`));
  empty.forEach(k => console.log(`    empty        ${k}`));
  if (!ok) process.exitCode = 1;
}

/* Template content: template-content/<code>.json against the English texts in template-content/en.json */
const templatesDir = join(root, '..', 'template-content');
const tokens = text => [...String(text).matchAll(/\{\{[^}]*\}\}|\{(?:count|value|draft):[\w.]+|\{\w+\}/g)].map(m => m[0]).sort().join(' ');
if (existsSync(join(templatesDir, 'en.json'))) {
  const source = JSON.parse(readFileSync(join(templatesDir, 'en.json'), 'utf8'));
  const tcodes = readdirSync(templatesDir).map(f => f.replace(/\.json$/, '')).filter(c => c !== 'en' && (!wanted.length || wanted.includes(c)));
  for (const code of tcodes) {
    const table = JSON.parse(readFileSync(join(templatesDir, `${code}.json`), 'utf8'));
    const missing = Object.keys(source).filter(k => !table[k]);
    const extra = Object.keys(table).filter(k => !(k.replace(/@[\w-]+$/, '') in source)); // `text@templateId` = a per-template translation
    const broken = Object.keys(table).filter(k => tokens(k.replace(/@[\w-]+$/, '')) !== tokens(table[k]));
    console.log(`${broken.length || extra.length ? '✖' : '✔'} ${code} templates: ${Object.keys(source).length - missing.length}/${Object.keys(source).length} translated${missing.length ? ` (${missing.length} stay in English)` : ''}`);
    missing.forEach(k => console.log(`    missing      ${k}`));
    extra.forEach(k => console.log(`    unknown      ${k}  (no template has this text any more)`));
    broken.forEach(k => console.log(`    tokens       "${table[k]}"  vs  "${k}"`));
    if (broken.length || extra.length) process.exitCode = 1;
  }
}
