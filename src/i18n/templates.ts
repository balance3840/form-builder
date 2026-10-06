/**
 * Templates are written once (mostly in English) and created in the interface language: a Spanish user picking
 * "Contact us" gets a Spanish form. Translations live in `template-content/<code>.json`, keyed by the template's
 * English text (or, for the few texts a template only has in another language, that text). A key `<text>@<template id>`
 * gives a text another translation in one template only.
 *
 * Languages a template already ships (the inspection report includes Danish) stay available as translations.
 */
import { FormDocument, availableLanguages, collectTranslatables, localizeDocument } from '../generator';
import { locale, templateTable } from '.';

type Dict = { [key: string]: string };
type I18n = { defaultLanguage?: string; languages?: string[]; detect?: boolean; switcher?: string; translations?: { [lang: string]: Dict } };

/** `templateId` lets a table give a text another meaning in one template: `"Floor@inspection": "Suelo"` wins over `"Floor"`. */
export function localizeTemplate(doc: FormDocument, templateId = '', language = locale.value, table: Dict = templateTable()): FormDocument {
  const i18n = (doc.i18n || {}) as I18n;
  const languages: string[] = availableLanguages(i18n as any);
  const source = languages[0];
  if (language === source) return doc;

  const items = collectTranslatables(doc);
  const own = i18n.translations || {};
  const english = (key: string, text: string) => (source === 'en' ? text : own.en?.[key]) || text;
  // The template's own translation wins, then the shared table, then the original text
  const target: Dict = {};
  const untranslated: string[] = [];
  items.forEach(item => {
    const en = english(item.key, item.source);
    const text = own[language]?.[item.key] || (language === 'en' ? own.en?.[item.key] : table[`${en}@${templateId}`] || table[en]);
    if (text) target[item.key] = text;
    // (texts a template only has in another language, like Danish floor names, stay as they are on purpose)
    else if (import.meta.env.DEV && (source === 'en' || own.en?.[item.key]) && /[a-z]/i.test(en.replace(/\{\{[^}]*\}\}/g, ''))) untranslated.push(en);
  });
  if (untranslated.length) console.info(`[form-builder] template texts without a ${language} translation (add them to src/i18n/template-content/):`, untranslated);

  const written = localizeDocument({ ...doc, i18n: { ...i18n, translations: { ...own, [language]: target } } } as FormDocument, language);

  // Single-language templates stay single-language; multi-language ones keep their other languages
  if (languages.length < 2) return { ...written, i18n: { ...i18n, defaultLanguage: language, languages: [language], translations: {} } };
  const sourceTexts: Dict = {};
  items.forEach(item => (sourceTexts[item.key] = item.source));
  const translations: { [lang: string]: Dict } = { ...own, [source]: { ...own[source], ...sourceTexts } };
  delete translations[language];
  return {
    ...written,
    i18n: { ...i18n, defaultLanguage: language, languages: [language, ...languages.filter(l => l !== language)], translations },
  };
}
