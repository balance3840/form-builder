export type FormField = { type: string; id: string; model?: string; label?: string; [key: string]: any };
export type FormDocument = {
  version: number;
  title?: string;
  description?: string;
  fields: FormField[];
  theme?: { [key: string]: any };
  settings?: { [key: string]: any };
  action?: { [key: string]: any };
  i18n?: { [key: string]: any };
  footer?: { [key: string]: any };
};
export type PrefillSource = { key: string; label: string; group?: string; kind?: 'text' | 'email' | 'tel' | 'date' | 'number' | 'list'; example?: string };
export type PrefillData = { [key: string]: any };

/** How the host limits one kind of field for this form: 'blocked' cannot be added, 'warning' can but is marked. */
export type FieldRestriction = { level: 'blocked' | 'warning'; reason: string };

export type BuilderOptions = {
  document?: FormDocument | null;
  /** Kinds of fields the host limits for this form, by field-list key (`signature`, `email`, `phone`, `address`, `file`…). */
  fieldRestrictions?: { [typeKey: string]: FieldRestriction };
  prefillSources?: PrefillSource[];
  onChange?: (document: FormDocument) => void;
  onSave?: (document: FormDocument) => void | Promise<void>;
  saveLabel?: string;
  autosave?: boolean | number;
  shareUrl?: string;
  hideEmbed?: boolean;
  offerTemplates?: boolean;
  /** Country new phone fields start with, as a two-letter code (`'dk'` for +45). Default: the one of the form's language. Fields already in the form keep theirs. */
  defaultPhoneCountry?: string;
  /** Offer exactly these templates (ids). Default: every general template; `inspection`, `lease` and `waitingList` are only offered when listed here. */
  templateIds?: string[];
  /** Limit the general templates to these groups: 'general' | 'feedback' | 'events' | 'work' | 'education' | 'health' | 'business' | 'property'. Ignored when `templateIds` is given. */
  templateCategories?: string[];
  startTemplate?: string;
  /** The form already has responses: removing a question that was there when it was opened asks first. Default false. */
  hasResponses?: boolean;
  hideActionSettings?: boolean;
  hideCaptchaSettings?: boolean;
  hideScriptSettings?: boolean;
  /** Open your own code editor (e.g. Monaco) for “Custom code”: resolve with the new code, or null to cancel. */
  editCode?: (code: string, info: { title: string; reference: string; typings: string }) => Promise<string | null | undefined>;
  hideExport?: boolean;
  hideTitleInput?: boolean;
  hideBrand?: boolean;
  /** Interface language: 'en', 'es', 'da', 'sv', 'pt' or one added with `locales`; anything else falls back to English. Default: last choice, else the browser's. */
  locale?: string;
  /** Add interface languages or change words of one: `{ de: { name: 'Deutsch', messages: { 'topbar.undo': 'Rückgängig' } } }`. */
  locales?: { [code: string]: { name?: string; messages: { [key: string]: string } } };
  /** Hide the interface language picker. Default false. */
  hideLocalePicker?: boolean;
  /** Called when the person picks another interface language. */
  onLocaleChange?: (locale: string) => void;
  /** Start in the 'simple' view (the settings most forms need) or 'advanced'. Default: last choice, else 'simple'. */
  view?: 'simple' | 'advanced';
  /** Offer the Simple / Advanced switch. Default true; false keeps everyone in the simple view. */
  allowAdvancedView?: boolean;
  /** Called when the person switches view. */
  onViewChange?: (view: 'simple' | 'advanced') => void;
  /** The host runs spam protection itself (keys on its server): the builder shows an on / off switch, on for new forms unless `defaultOn: false`. */
  spamProtection?: { provider: 'turnstile' | 'hcaptcha' | 'recaptcha' | 'recaptcha3' | 'honeypot'; defaultOn?: boolean };
  /** Stores a picture or video the form shows and resolves to its public address (images up to 5 MB). */
  uploadFile?: (file: File, kind: 'image' | 'video') => Promise<string>;
  /** Or: an address the file is POSTed to (multipart `file` + `kind`), answering JSON `{ url }` or `{ data: { url } }`. */
  uploadUrl?: string;
  uploadHeaders?: { [name: string]: string };
};

export type FormBuilderHandle = {
  getDocument: () => FormDocument;
  setDocument: (document: FormDocument | null) => void;
  update: (options: Partial<BuilderOptions>) => void;
  markSaved: () => void;
  save: () => Promise<boolean>;
  importDocument: (input: unknown) => { ok: true; notes: string[] } | { ok: false; error: string };
  destroy: () => void;
};

export function mountFormBuilder(element: HTMLElement, options?: BuilderOptions): FormBuilderHandle;
export function applyPrefill(doc: FormDocument, data: PrefillData): { doc: FormDocument; values: { [model: string]: any } };
export function prefillFields(doc: FormDocument): { field: FormField; key: string }[];
export function prefillKeys(doc: FormDocument): string[];
export function prefillValues(doc: FormDocument, data: PrefillData): { [model: string]: any };

/** Adds an interface language, or changes words of one, for every builder on the page. Keys are `<area>.<key>`, e.g. 'topbar.undo'. */
export function registerLocale(code: string, messages: { [key: string]: string }, name?: string): void;
/** The interface languages available (built in, plus registered ones). */
export function availableLocales(): { code: string; name: string }[];
/** HTML to put a published form on any website: an <iframe> that (with `autoHeight`, default) takes the form's height. */
export function iframeSnippet(url: string, title: string, options?: { autoHeight?: boolean; height?: number }): string;
