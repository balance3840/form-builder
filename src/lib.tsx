import { render } from 'preact';
import './generator';
import { App } from './App';
import { BuilderOptions, applyOptions, dirty, embedded, flushSave, options as optionsSignal, setRootElement } from './host';
import { doc, loadExternal, relocalizeUntouchedDoc, replaceDoc, showTemplates } from './store';
import { templateDocument } from './components/Templates';
import { loadDocument } from './generator';
import { initialLocale, setLocale } from './i18n';
import type { FormDocument } from './generator';
import css from './styles.css?inline';

export type { BuilderOptions, FieldRestriction } from './host';
export type { FormDocument, FormField, PrefillSource, PrefillData } from './generator';
export { applyPrefill, prefillFields, prefillKeys, prefillValues } from './generator';
export { registerLocale, availableLocales } from './i18n';
export { iframeSnippet } from './io';

export type FormBuilderHandle = {
  /** The form as it is in the editor right now. */
  getDocument: () => FormDocument;
  /** Replaces the form in the editor (and clears undo history). */
  setDocument: (document: FormDocument | null) => void;
  /** Changes options (callbacks, prefill sources…) without losing the editor state. */
  update: (options: Partial<BuilderOptions>) => void;
  /** Tell the builder the current document is saved (clears “Unsaved changes”). */
  markSaved: () => void;
  /** Saves now (through `onSave`) when there are edits waiting; resolves to false when that failed. */
  save: () => Promise<boolean>;
  /**
   * Replaces the form with an imported one (a v2 document, or a v1 schema that is converted). Undoable, and saved like
   * any edit. Returns what the conversion changed, or why the file could not be used.
   */
  importDocument: (input: unknown) => { ok: true; notes: string[] } | { ok: false; error: string };
  destroy: () => void;
};

/**
 * A host that always starts a new form from the same template (`startTemplate`) gets it instead of an empty form. It
 * counts as the form as it was loaded: nothing is saved until the person changes something.
 */
function startFromTemplate() {
  const id = optionsSignal.value.startTemplate;
  if (!id || doc.value.fields.length) return;
  const template = templateDocument(id);
  if (!template) return;
  doc.value = template;
  showTemplates.value = false;
}

const FONT_LINK_ID = 'fb-inter-font';

/** The builder's font. Fonts are shared by the whole page, so one link serves the shadow root too. */
function ensureFont() {
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

/**
 * Mounts the visual form builder into `element`. The element should have a height (the builder fills it).
 * It is drawn inside a shadow root, so its styles and the host page's styles never touch each other.
 * Only one builder can be mounted at a time.
 */
export function mountFormBuilder(element: HTMLElement, options: BuilderOptions = {}): FormBuilderHandle {
  ensureFont();
  embedded.value = true;
  applyOptions(options);
  // A language chosen by the host app wins (unsupported -> English); otherwise the person's last choice or the browser's
  const languageReady = setLocale(options.locale || initialLocale(), { remember: false });
  loadExternal(options.document, options.offerTemplates !== false);

  const shadow = element.shadowRoot || element.attachShadow({ mode: 'open' });
  shadow.innerHTML = '';
  const style = document.createElement('style');
  style.textContent = css;
  const root = document.createElement('div');
  root.className = 'fb-root';
  shadow.append(style, root);
  setRootElement(root);
  let destroyed = false;
  // Wait for the interface language (a small file) so the first paint is already translated
  languageReady.finally(() => {
    if (destroyed) return;
    relocalizeUntouchedDoc();
    startFromTemplate();
    render(<App />, root);
  });

  return {
    getDocument: () => doc.value,
    setDocument: next => {
      loadExternal(next, optionsSignal.value.offerTemplates !== false);
      startFromTemplate();
    },
    update: patch => applyOptions({ ...optionsSignal.value, ...patch }),
    markSaved: () => {
      dirty.value = false;
    },
    save: () => flushSave(),
    importDocument: input => {
      try {
        const parsed = typeof input === 'string' ? JSON.parse(input) : input;
        const { doc: loaded, notes } = loadDocument(parsed);
        replaceDoc(loaded);
        return { ok: true, notes };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    destroy: () => {
      destroyed = true;
      render(null, root);
      shadow.innerHTML = '';
      setRootElement(null);
      embedded.value = false;
    },
  };
}
