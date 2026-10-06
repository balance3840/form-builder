import { FormDocument, LANGUAGES, availableLanguages, collectTranslatables } from './generator';

/**
 * The form's texts as a JSON file to translate outside the builder (a translator, an AI), and reading it back.
 *
 * One row per text: its key, where it is in the form, the text in the form's own language, and one column per
 * language. A column for a language the form does not have yet adds that language on import.
 */

export const TRANSLATIONS_FORMAT = 'form-translations';

/** For whoever translates the file; written in English, like the rest of the file's structure. */
const INSTRUCTIONS =
  'Translate the "source" text of each row into every language column (ISO codes, e.g. "da", "es"). ' +
  'Keep "key" and "source" as they are. Keep placeholders such as {name}, {n} or {{answer}}, HTML tags and line breaks. ' +
  'Leave a value empty when unsure: empty values are not imported. To add a language, add its code to "languages" and a column with that code to every row.';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type Row = { key: string; context: string; source: string; [language: string]: string };
export type TranslationsFile = { format: string; version: number; form: string; sourceLanguage: string; languages: string[]; instructions: string; texts: Row[] };

export function exportTranslations(doc: FormDocument): TranslationsFile {
  const i18n = (doc.i18n || {}) as any;
  const all = availableLanguages(i18n);
  const source = all[0];
  const languages = all.slice(1);
  const translations = i18n.translations || {};
  return {
    format: TRANSLATIONS_FORMAT,
    version: 1,
    form: doc.title || '',
    sourceLanguage: source,
    languages,
    instructions: INSTRUCTIONS,
    texts: collectTranslatables(doc).map(item => {
      const row: Row = { key: item.key, context: item.group && item.label ? `${item.group} › ${item.label}` : item.group || item.label, source: item.source };
      languages.forEach(code => (row[code] = (translations[code] || {})[item.key] || ''));
      return row;
    }),
  };
}

export type ImportResult = {
  /** language => key => text, only texts this form has, never its own language */
  updates: { [language: string]: { [key: string]: string } };
  /** languages in the file the form does not have yet */
  newLanguages: string[];
  /** texts that are new or different from what the form has */
  imported: number;
  /** texts the form already had exactly like that */
  unchanged: number;
  /** keys this form does not have (it changed since the export) */
  unknown: number;
  /** imported texts that lost a placeholder of their source, like {name} */
  placeholders: string[];
};

const KNOWN = new Set(LANGUAGES.map(l => l.code.toLowerCase()));
const placeholdersOf = (text: string) => (text.match(/\{\{[^}]+\}\}|\{[^{}]+\}/g) || []).sort();

/**
 * Reads an exported file (or a plain `{ "da": { "<key>": "text" } }` object) against the form. Throws when the file
 * is not JSON or has no translations in a shape it knows.
 */
export function readTranslations(text: string, doc: FormDocument): ImportResult {
  if (text.length > MAX_FILE_BYTES) throw new Error('too-large');
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('unknown-shape');

  // rows of the exported file, or a plain object of languages
  const byLanguage: { [language: string]: { [key: string]: unknown } } = {};
  if (Array.isArray(data.texts)) {
    data.texts.forEach((row: any) => {
      if (!row || typeof row.key !== 'string') return;
      Object.keys(row).forEach(column => {
        if (['key', 'context', 'source'].includes(column)) return;
        (byLanguage[column] = byLanguage[column] || {})[row.key] = row[column];
      });
    });
  } else {
    Object.keys(data).forEach(column => {
      if (data[column] && typeof data[column] === 'object' && !Array.isArray(data[column])) byLanguage[column] = data[column];
    });
  }

  const own = availableLanguages((doc.i18n || {}) as any);
  const sourceLanguage = own[0];
  const items = collectTranslatables(doc);
  const sources = new Map(items.map(item => [item.key, item.source]));
  const current = ((doc.i18n || {}) as any).translations || {};
  const result: ImportResult = { updates: {}, newLanguages: [], imported: 0, unchanged: 0, unknown: 0, placeholders: [] };
  const unknownKeys = new Set<string>();

  Object.keys(byLanguage).forEach(column => {
    const code = own.find(c => c.toLowerCase() === column.toLowerCase()) || (KNOWN.has(column.toLowerCase()) ? LANGUAGES.find(l => l.code.toLowerCase() === column.toLowerCase())!.code : null);
    // not a language (another column someone added), or the form's own language (that is the source text)
    if (!code || code === sourceLanguage) return;
    Object.entries(byLanguage[column]).forEach(([key, value]) => {
      if (typeof value !== 'string' || !value.trim()) return;
      if (!sources.has(key)) {
        unknownKeys.add(key);
        return;
      }
      if ((current[code] || {})[key] === value) {
        result.unchanged++;
        return;
      }
      (result.updates[code] = result.updates[code] || {})[key] = value;
      result.imported++;
      if (placeholdersOf(sources.get(key)!).join() !== placeholdersOf(value).join()) result.placeholders.push(`${code}: ${sources.get(key)}`);
    });
    if (result.updates[code] && !own.includes(code)) result.newLanguages.push(code);
  });

  result.unknown = unknownKeys.size;
  if (!result.imported && !result.unchanged && !result.unknown && !Object.keys(byLanguage).length) throw new Error('unknown-shape');
  return result;
}
