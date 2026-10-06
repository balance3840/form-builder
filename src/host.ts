import { signal } from '@preact/signals';
import type { FormDocument, PrefillSource } from './generator';
import { registerLocale, setLocale } from './i18n';
import { onViewChange, setView, viewLocked } from './view';

/**
 * What an application embedding the builder can control. In the standalone app everything stays at its default
 * (autosave to localStorage, copy / download buttons, "send responses to" settings).
 */
/** How the host limits one kind of field for this form (see `fieldRestrictions`). */
export type FieldRestriction = {
  /** 'blocked': it cannot be added; 'warning': it can, but the person is told why to think twice. */
  level: 'blocked' | 'warning';
  /** Why, in the person's language: shown on hover in the field list and on the field's card. */
  reason: string;
};

export type BuilderOptions = {
  /** The form to edit. Without one the builder starts empty (and offers the templates). */
  document?: FormDocument | null;
  /**
   * Kinds of fields the host limits for this form, by field-list key (`signature`, `email`, `phone`, `address`, `file`…):
   * e.g. an anonymous survey cannot ask for a signature and warns about questions that say who someone is. They stay in
   * the field list, marked, with the reason on hover; fields already in the form get a badge.
   */
  fieldRestrictions?: { [typeKey: string]: FieldRestriction };
  /** Data the form can be auto-filled with: shown as an "Auto-fill from" choice on fields and as `{{tokens}}` for texts. */
  prefillSources?: PrefillSource[];
  /**
   * The form already has responses. Removing a question that was in the form when it was opened then asks first (the
   * answers stay with each response; only the summary and exports show them as removed). Default false.
   */
  hasResponses?: boolean;
  /** Called (debounced) after every edit. */
  onChange?: (document: FormDocument) => void;
  /** When set, the top bar gets a Save button that calls this (or, with `autosave`, it is called by itself). */
  onSave?: (document: FormDocument) => void | Promise<void>;
  saveLabel?: string;
  /**
   * Save by itself a moment after every edit instead of showing a Save button (like Typeform or Tally): `true` (after
   * 1.5 s without edits) or a delay in milliseconds. Needs `onSave`; the top bar shows “Saving…” / “Saved”.
   */
  autosave?: boolean | number;
  /** Where the form is published (the link people open). Used for the iframe embed code. */
  shareUrl?: string;
  /** Hide the Embed tab (the host offers sharing and embedding itself). Default false. */
  hideEmbed?: boolean;
  /** Show the template picker when the form is empty. Default true. */
  offerTemplates?: boolean;
  /** Country new phone fields start with, as a two-letter code (`'dk'` for +45). Default: the one of the form's language. Fields already in the form keep theirs. */
  defaultPhoneCountry?: string;
  /**
   * Offer exactly these templates (ids). Default: every general template. Templates made for one application
   * (`inspection`, `lease`, `waitingList`) are only offered when they are listed here.
   */
  templateIds?: string[];
  /** Limit the general templates to these groups: `general`, `feedback`, `events`, `work`, `education`, `health`, `business`, `property`. Ignored when `templateIds` is given. */
  templateCategories?: string[];
  /** Template to start from when `document` is empty. */
  startTemplate?: string;
  /** Hide the “Send responses to…” settings: the host decides where answers go. Default false. */
  hideActionSettings?: boolean;
  /** Hide the captcha settings: the host decides. Default false. */
  hideCaptchaSettings?: boolean;
  /** Hide the “Custom code” section (the form's own JavaScript, run in a sandbox). Default false. */
  hideScriptSettings?: boolean;
  /**
   * Open the host's own code editor (e.g. Monaco) for the custom code. Gets the code, a short reference and TypeScript declarations of the `form` object (for autocomplete); resolves
   * with the new code, or null when the person cancels. Without it the builder shows its own larger editor.
   */
  editCode?: (code: string, info: { title: string; reference: string; typings: string }) => Promise<string | null | undefined>;
  /** Hide Copy JSON / Download in the top bar. Default false. */
  hideExport?: boolean;
  /** Hide the title input of the top bar (the host shows its own). Default false. */
  hideTitleInput?: boolean;
  /** Hide the brand block. */
  hideBrand?: boolean;
  /**
   * Interface language: 'en', 'es', 'da', 'sv', 'pt' or one added with `locales` ('pt-BR' matches 'pt'; anything
   * else falls back to English). Without it: the person's last choice, else the browser's language. New blank forms
   * are written in this language too. (This is the builder's own language, not the languages of an existing form.)
   */
  locale?: string;
  /** Add interface languages or change words of one: `{ de: { name: 'Deutsch', messages: { 'topbar.undo': 'Rückgängig' } } }`. */
  locales?: { [code: string]: { name?: string; messages: { [key: string]: string } } };
  /** Hide the interface language picker of the top bar (the host app decides the language). Default false. */
  hideLocalePicker?: boolean;
  /** Called when the person picks another interface language in the top bar. */
  onLocaleChange?: (locale: string) => void;
  /**
   * Start in the 'simple' view (the settings most forms need) or the 'advanced' one (rules, logic, layout, technical
   * settings). Default: the person's last choice, else 'simple'.
   */
  view?: 'simple' | 'advanced';
  /** Offer the advanced view (the Simple / Advanced switch). Default true; false keeps everyone in the simple view. */
  allowAdvancedView?: boolean;
  /** Called when the person switches between the simple and the advanced view. */
  onViewChange?: (view: 'simple' | 'advanced') => void;
  /**
   * The host protects its forms against spam itself (e.g. with Cloudflare Turnstile, keys on its server). The builder
   * then shows a simple on / off switch that stores `settings.captcha: { provider }` (no key: the server adds it when it
   * serves the form, and checks the token). `defaultOn` (default true) switches it on for new forms.
   */
  spamProtection?: { provider: 'turnstile' | 'hcaptcha' | 'recaptcha' | 'recaptcha3' | 'honeypot'; defaultOn?: boolean };
  /**
   * Stores a picture or video the form shows (image block, logo, cover, picture choice, video) and resolves to its public
   * address. Without it, pictures are kept inside the form (up to 1 MB) and videos can only be linked.
   */
  uploadFile?: (file: File, kind: 'image' | 'video') => Promise<string>;
  /**
   * The simple alternative to `uploadFile`: an address the builder POSTs the file to (multipart, fields `file` and
   * `kind`), answering JSON with the public address as `url` (or `data.url`). `uploadHeaders` go with the request
   * (e.g. an authorization header). The standalone app takes it from VITE_UPLOAD_URL.
   */
  uploadUrl?: string;
  uploadHeaders?: { [name: string]: string };
};

export const embedded = signal(false);

/** The element the builder is drawn in (inside a shadow root when embedded). Used where `document` cannot see in. */
let root: HTMLElement | null = null;
export const rootElement = () => root;
export const setRootElement = (element: HTMLElement | null) => {
  root = element;
};
export const options = signal<BuilderOptions>({});
export const prefillSources = signal<PrefillSource[]>([]);
export const saving = signal(false);
export const dirty = signal(false);
/** The last save failed (shown in the top bar; the builder tries again by itself, and on the next edit). */
export const saveFailed = signal(false);
/**
 * What to tell people about the failed save. Only the host decides this text (the message of what `onSave` throws),
 * so nothing technical from a server ever reaches the screen; without one the builder says something neutral.
 */
export const saveError = signal('');

let retryTimer: any;
let retryDelay = 0;
function scheduleRetry() {
  clearTimeout(retryTimer);
  retryDelay = Math.min(retryDelay ? retryDelay * 2 : 5000, 60000);
  retryTimer = setTimeout(() => {
    if (dirty.value && !saving.value) saveNow();
  }, retryDelay);
}

let getDocument: () => FormDocument = () => ({ version: 2, fields: [] });
/** The store tells the host module how to read the current document (the store imports this module, not the other way round). */
export const setDocumentReader = (read: () => FormDocument) => {
  getDocument = read;
};

let again = false;
/** Saves the current document through `onSave` now. Resolves to false when there is no `onSave` or it failed. */
export async function saveNow(): Promise<boolean> {
  const save = options.value.onSave;
  if (!save) return false;
  if (saving.value) {
    // a save is running: save once more when it ends, with what was edited meanwhile
    again = true;
    return new Promise(resolve => {
      const stop = saving.subscribe(busy => {
        if (!busy) {
          stop();
          resolve(!saveFailed.value);
        }
      });
    });
  }
  saving.value = true;
  dirty.value = false;
  try {
    await save(getDocument());
    saveFailed.value = false;
    saveError.value = '';
    retryDelay = 0;
    clearTimeout(retryTimer);
  } catch (e) {
    dirty.value = true;
    saveFailed.value = true;
    saveError.value = e instanceof Error && e.message ? e.message.slice(0, 160) : '';
    if (options.value.autosave) scheduleRetry();
  } finally {
    saving.value = false;
  }
  if (again) {
    again = false;
    return saveNow();
  }
  return !saveFailed.value;
}

let autosaveTimer: any;
/** After an edit: with `autosave`, save a moment later (every new edit restarts the wait). */
export function scheduleAutosave() {
  const { autosave, onSave } = options.value;
  if (!autosave || !onSave) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveNow(), typeof autosave === 'number' ? autosave : 1500);
}

/** Saves now if there are edits waiting (e.g. before publishing or leaving the page). */
export async function flushSave(): Promise<boolean> {
  clearTimeout(autosaveTimer);
  return dirty.value || saving.value ? saveNow() : true;
}

/** Largest pictures and videos people can upload (when the host stores them) and pictures kept inside the form. */
export const MAX_IMAGE_UPLOAD = 5 * 1024 * 1024;
export const MAX_VIDEO_UPLOAD = 50 * 1024 * 1024;
export const MAX_INLINE_IMAGE = 1024 * 1024;

/** Whether pictures and videos can be stored outside the form (the host's storage or an upload address). */
export const canUpload = () => !!(options.value.uploadFile || uploadAddress());
const uploadAddress = () => options.value.uploadUrl || (import.meta.env && (import.meta.env.VITE_UPLOAD_URL as string)) || '';

/** Stores a file with the host and resolves to its public address. */
export async function uploadMedia(file: File, kind: 'image' | 'video'): Promise<string> {
  if (options.value.uploadFile) return options.value.uploadFile(file, kind);
  const body = new FormData();
  body.append('file', file);
  body.append('kind', kind);
  const response = await fetch(uploadAddress(), { method: 'POST', body, headers: options.value.uploadHeaders || {} });
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);
  const json = await response.json();
  const url = (json && (json.url || (json.data && json.data.url))) || '';
  if (!url) throw new Error('The upload answer has no url');
  return url;
}

/** A new form gets spam protection switched on when the host asks for it. */
export function withDefaultSpamProtection(d: FormDocument): FormDocument {
  const sp = options.value.spamProtection;
  if (!sp || sp.defaultOn === false || (d.settings && d.settings.captcha)) return d;
  return { ...d, settings: { ...(d.settings || {}), captcha: { provider: sp.provider } } };
}

export function applyOptions(next: BuilderOptions) {
  const previous = options.value;
  options.value = next;
  prefillSources.value = next.prefillSources || [];
  if (next.locales && next.locales !== previous.locales) Object.entries(next.locales).forEach(([code, l]) => registerLocale(code, l.messages || {}, l.name));
  if (next.locale && next.locale !== previous.locale) setLocale(next.locale, { remember: false });
  viewLocked.value = next.allowAdvancedView === false;
  onViewChange(next.onViewChange);
  if (viewLocked.value) setView('simple', { remember: false });
  else if (next.view && next.view !== previous.view) setView(next.view, { remember: false });
}

/** How the host limits this kind of field, if it does. */
export function restrictionFor(typeKey: string): FieldRestriction | undefined {
  return options.value.fieldRestrictions?.[typeKey];
}
