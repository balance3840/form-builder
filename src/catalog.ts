import { FormField, flattenFields, isLayoutType, toModelKey, uid, uniqueModelKey } from './generator';
import { inContentLanguage, t, tOr } from './i18n';
import { options } from './host';

export type Category = 'Text' | 'Choice' | 'Date & time' | 'Rating' | 'Media' | 'Content' | 'Layout' | 'Structure';

export type FieldTypeDef = {
  key: string;
  label: string;
  description: string;
  category: Category;
  icon: string;
  /** Defaults for a freshly added field of this type. */
  make: () => Partial<FormField>;
  /** Only recognised in existing forms, not offered in the palette (e.g. the old plain phone input). */
  hidden?: boolean;
};

const yesNoOptions = () =>
  [1, 2, 3].map(n => {
    const label = t('fields.default.option', { n });
    return { label, value: label };
  });

/** Ready-made Likert scales; the points are numbered 1…n so answers can be averaged. */
export const LIKERT_SCALES: Record<string, string[]> = {
  agreement5: ['stronglyDisagree', 'disagree', 'neutral', 'agree', 'stronglyAgree'],
  agreement7: ['stronglyDisagree', 'disagree', 'somewhatDisagree', 'neither', 'somewhatAgree', 'agree', 'stronglyAgree'],
  satisfaction: ['veryDissatisfied', 'dissatisfied', 'neutral', 'satisfied', 'verySatisfied'],
  frequency: ['never', 'rarely', 'sometimes', 'often', 'always'],
  importance: ['notImportant', 'slightlyImportant', 'moderatelyImportant', 'veryImportant', 'extremelyImportant'],
  likelihood: ['veryUnlikely', 'unlikely', 'neutral', 'likely', 'veryLikely'],
};
export const likertPoints = (scale: string) => inContentLanguage(() => (LIKERT_SCALES[scale] || LIKERT_SCALES.agreement5).map((key, i) => ({ label: tOr(`fields.likert.${key}`, key), value: i + 1 })));
/** Faces for a Likert scale of `count` points, unhappy to happy (the same as the form's own defaults). */
const LIKERT_FACES = ['😡', '😠', '🙁', '😐', '🙂', '😀', '😍'];
export const likertEmoji = (i: number, count: number) => LIKERT_FACES[count > 1 ? Math.round((i * (LIKERT_FACES.length - 1)) / (count - 1)) : 3];
/** The red → green color of point `i` of `count`, as #rrggbb (what "gradient" shows, to start a custom color from). */
export const likertGradient = (i: number, count: number) => {
  const h = (count > 1 ? Math.round((i * 120) / (count - 1)) : 60) / 360, s = 0.68, l = 0.44;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};
const likertRows = () => [1, 2, 3].map(n => ({ label: t('fields.default.statement', { n }), value: `s${n}` }));

/** Default texts of new fields are written in the form's language (`createField` runs `make` in it; templates build them `inEnglish`). */
const answer = () => t('fields.default.typeAnswer');

export const FIELD_TYPES: FieldTypeDef[] = [
  { key: 'shortText', label: 'Short text', description: 'A single line answer', category: 'Text', icon: 'text', make: () => ({ type: 'input', inputType: 'text', label: t('fields.type.shortText.label'), placeholder: answer(), validationType: 'string' }) },
  { key: 'longText', label: 'Long text', description: 'A paragraph answer', category: 'Text', icon: 'alignLeft', make: () => ({ type: 'textarea', label: t('fields.type.longText.label'), placeholder: answer(), validationType: 'string' }) },
  { key: 'email', label: 'Email', description: 'Validates the address', category: 'Text', icon: 'mail', make: () => ({ type: 'input', inputType: 'email', label: t('fields.type.email.label'), placeholder: t('fields.default.emailPlaceholder'), validationType: 'string', validations: [{ name: 'email', params: [] }] }) },
  { key: 'phone', label: 'Phone', description: 'Country code and number', category: 'Text', icon: 'phone', make: () => ({ type: 'phone', label: t('fields.default.phone'), validationType: 'string', validations: [{ name: 'phone', params: [] }] }) },
  { key: 'phoneText', label: 'Phone (plain text)', description: 'A phone number typed as text', category: 'Text', icon: 'phone', hidden: true, make: () => ({ type: 'input', inputType: 'tel', label: t('fields.default.phone'), validationType: 'string' }) },
  { key: 'number', label: 'Number', description: 'Numbers only', category: 'Text', icon: 'hash', make: () => ({ type: 'input', inputType: 'number', label: t('fields.type.number.label'), placeholder: '0', validationType: 'number' }) },
  { key: 'url', label: 'Website', description: 'A link, validated', category: 'Text', icon: 'link', make: () => ({ type: 'input', inputType: 'url', label: t('fields.type.url.label'), placeholder: 'https://', validationType: 'string', validations: [{ name: 'url', params: [] }] }) },
  { key: 'address', label: 'Address search', description: 'Live address suggestions', category: 'Text', icon: 'mapPin', make: () => ({ type: 'address', label: t('fields.default.address'), placeholder: t('fields.default.addressPlaceholder'), validationType: 'string', config: { provider: 'osm', countries: [], multiple: false, answer: 'text' } }) },
  { key: 'search', label: 'Custom search', description: 'Pick from any JSON API', category: 'Text', icon: 'search', make: () => ({ type: 'search', label: t('fields.default.search'), placeholder: t('fields.default.searchPlaceholder'), validationType: 'string', config: { multiple: false, source: { url: 'https://restcountries.com/v3.1/name/{q}?fields=name,cca2', labelKey: 'name.common', valueKey: 'cca2', minChars: 2 } } }) },
  { key: 'password', label: 'Password', description: 'Hidden characters', category: 'Text', icon: 'lock', make: () => ({ type: 'input', inputType: 'password', label: t('fields.type.password.label'), validationType: 'string' }) },

  { key: 'dropdown', label: 'Dropdown', description: 'Pick one from a list', category: 'Choice', icon: 'chevronSquare', make: () => ({ type: 'select', label: t('fields.type.dropdown.label'), placeholder: t('fields.default.selectOption'), validationType: 'string', options: yesNoOptions() }) },
  { key: 'radio', label: 'Single choice', description: 'Pick one, all visible', category: 'Choice', icon: 'circleDot', make: () => ({ type: 'radioGroup', label: t('fields.type.radio.label'), validationType: 'string', options: yesNoOptions() }) },
  { key: 'checkboxes', label: 'Multiple choice', description: 'Pick several', category: 'Choice', icon: 'checkSquare', make: () => ({ type: 'checkboxGroup', label: t('fields.type.checkboxes.label'), validationType: 'array', options: yesNoOptions() }) },
  { key: 'multiSelect', label: 'Multi-select', description: 'Compact list, pick several', category: 'Choice', icon: 'listChecks', make: () => ({ type: 'multiSelect', label: t('fields.type.multiSelect.label'), placeholder: t('fields.default.selectOptions'), validationType: 'array', options: yesNoOptions() }) },
  { key: 'yesNo', label: 'Yes / No', description: 'Two big buttons', category: 'Choice', icon: 'yesNo', make: () => ({ type: 'yesNo', label: t('fields.default.yesNo'), validationType: 'string' }) },
  { key: 'pictureChoice', label: 'Picture choice', description: 'Options with pictures', category: 'Choice', icon: 'image', make: () => ({ type: 'pictureChoice', label: t('fields.default.pictureChoice'), validationType: 'string', options: yesNoOptions(), config: { columns: 3 } }) },
  { key: 'toggle', label: 'Switch', description: 'On / off', category: 'Choice', icon: 'toggle', make: () => ({ type: 'toggle', label: t('fields.type.toggle.label'), validationType: 'boolean', defaultValue: false }) },
  { key: 'checkbox', label: 'Checkbox', description: 'A single tick, e.g. consent', category: 'Choice', icon: 'check', make: () => ({ type: 'input', inputType: 'checkbox', label: '', checkboxLabel: t('fields.default.agree'), validationType: 'boolean', defaultValue: false }) },
  { key: 'country', label: 'Country', description: 'Searchable country list', category: 'Choice', icon: 'globe', make: () => ({ type: 'countrySelect', label: t('fields.type.country.label'), placeholder: t('fields.default.searchCountry'), validationType: 'string' }) },

  { key: 'date', label: 'Date', description: 'Day picker', category: 'Date & time', icon: 'calendar', make: () => ({ type: 'input', inputType: 'date', label: t('fields.type.date.label'), validationType: 'date' }) },
  { key: 'time', label: 'Time', description: 'Time picker', category: 'Date & time', icon: 'clock', make: () => ({ type: 'input', inputType: 'time', label: t('fields.type.time.label'), validationType: 'string' }) },
  { key: 'dates', label: 'Multiple dates', description: 'Pick several days, e.g. availability', category: 'Date & time', icon: 'calendarDays', make: () => ({ type: 'dates', label: t('fields.default.dates'), validationType: 'array', config: { minDate: 'today' } }) },
  { key: 'dateRange', label: 'Date range', description: 'From one day to another', category: 'Date & time', icon: 'calendarRange', make: () => ({ type: 'dateRange', label: t('fields.default.dateRange'), validationType: 'object', config: { minDate: 'today' } }) },
  { key: 'month', label: 'Month', description: 'Pick a month and year', category: 'Date & time', icon: 'calendar', make: () => ({ type: 'month', label: t('fields.default.month'), validationType: 'string' }) },
  { key: 'week', label: 'Week', description: 'Pick a week of the year', category: 'Date & time', icon: 'calendarRange', make: () => ({ type: 'week', label: t('fields.default.week'), validationType: 'string' }) },
  { key: 'year', label: 'Year', description: 'Pick a year', category: 'Date & time', icon: 'calendar', make: () => ({ type: 'year', label: t('fields.default.year'), validationType: 'string' }) },
  { key: 'datetime', label: 'Date & time', description: 'Day and hour', category: 'Date & time', icon: 'calendarClock', make: () => ({ type: 'input', inputType: 'datetime-local', label: t('fields.default.dateTime'), validationType: 'string' }) },

  { key: 'rating', label: 'Star rating', description: '1 to 5 stars', category: 'Rating', icon: 'star', make: () => ({ type: 'rating', label: t('fields.default.rating'), validationType: 'number', config: { max: 5 } }) },
  { key: 'scale', label: 'Opinion scale', description: 'Pick a number, e.g. 1 to 10', category: 'Rating', icon: 'scale', make: () => ({ type: 'scale', label: t('fields.default.scale'), validationType: 'number', config: { min: 0, max: 10, minLabel: t('fields.default.notLikely'), maxLabel: t('fields.default.veryLikely') } }) },
  { key: 'nps', label: 'NPS', description: 'Net Promoter Score, 0 to 10', category: 'Rating', icon: 'gauge', make: () => ({ type: 'scale', label: t('fields.default.nps'), validationType: 'number', config: { min: 0, max: 10, nps: true, minLabel: t('fields.default.npsMin'), maxLabel: t('fields.default.npsMax') } }) },
  { key: 'likert', label: 'Likert scale', description: 'Agree or disagree, one or many statements', category: 'Rating', icon: 'likert', make: () => ({ type: 'likert', label: t('fields.default.likert'), validationType: 'object', options: likertPoints('agreement5'), config: { rows: likertRows() } }) },
  { key: 'ranking', label: 'Ranking', description: 'Put options in order of preference', category: 'Rating', icon: 'ranking', make: () => ({ type: 'ranking', label: t('fields.default.ranking'), validationType: 'array', options: yesNoOptions() }) },
  { key: 'slider', label: 'Slider', description: 'Drag to pick a value', category: 'Rating', icon: 'slider', make: () => ({ type: 'slider', label: t('fields.type.slider.label'), validationType: 'number', config: { min: 0, max: 100, step: 1, unit: '' } }) },

  { key: 'file', label: 'File upload', description: 'Drag and drop files', category: 'Media', icon: 'upload', make: () => ({ type: 'file', inputType: 'file', label: t('fields.default.upload'), placeholder: t('fields.default.anyDocument'), validationType: 'file', attributes: {} }) },
  { key: 'signature', label: 'Signature', description: 'Sign with finger, pen or mouse', category: 'Media', icon: 'signature', make: () => ({ type: 'signature', label: t('fields.type.signature.label'), validationType: 'string', config: { height: 160 } }) },
  { key: 'color', label: 'Colour', description: 'Colour picker', category: 'Media', icon: 'palette', make: () => ({ type: 'input', inputType: 'color', label: t('fields.type.color.label'), validationType: 'string', defaultValue: '#4f46e5' }) },

  { key: 'image', label: 'Image', description: 'Show a picture or logo', category: 'Content', icon: 'image', make: () => ({ type: 'image', config: { src: '', width: 'full', align: 'center' } }) },
  { key: 'video', label: 'Video', description: 'YouTube, Vimeo, Loom or a video file', category: 'Content', icon: 'play', make: () => ({ type: 'video', config: { url: '' } }) },
  { key: 'link', label: 'Link', description: 'A button or a link to a page', category: 'Content', icon: 'link', make: () => ({ type: 'link', label: t('fields.default.linkLabel'), config: { url: 'https://', style: 'button', newTab: true } }) },
  { key: 'icon', label: 'Icon & emoji', description: 'A big emoji or icon, with a title', category: 'Content', icon: 'smile', make: () => ({ type: 'icon', config: { emoji: '🎉', size: 'medium', align: 'center' } }) },
  { key: 'embed', label: 'Embed', description: 'A map, booking calendar or PDF', category: 'Content', icon: 'code', make: () => ({ type: 'embed', config: { url: '', height: 420 } }) },

  { key: 'heading', label: 'Heading', description: 'A section title', category: 'Layout', icon: 'heading', make: () => ({ type: 'heading', label: t('fields.default.sectionTitle'), config: { level: 'h2' } }) },
  { key: 'paragraph', label: 'Text block', description: 'Explain or instruct', category: 'Layout', icon: 'pilcrow', make: () => ({ type: 'paragraph', content: t('fields.default.paragraph') }) },
  { key: 'divider', label: 'Divider', description: 'A thin line', category: 'Layout', icon: 'minus', make: () => ({ type: 'divider' }) },
  { key: 'callout', label: 'Message box', description: 'A note: info, success or warning', category: 'Layout', icon: 'callout', make: () => ({ type: 'callout', label: t('fields.default.calloutTitle'), content: t('fields.default.calloutText'), config: { tone: 'info' } }) },
  { key: 'columns', label: 'Columns', description: 'Fields side by side', category: 'Layout', icon: 'columns', make: () => ({ type: 'columns', config: { align: 'start', justify: 'start' }, columns: [{ id: uid('col'), span: 6, fields: [] }, { id: uid('col'), span: 6, fields: [] }] }) },
  { key: 'pageBreak', label: 'Page break', description: 'Split into steps', category: 'Layout', icon: 'pageBreak', make: () => ({ type: 'pageBreak' }) },
  { key: 'thankYou', label: 'Thank-you page', description: 'What people see after sending', category: 'Layout', icon: 'party', make: () => ({ type: 'pageBreak', config: { ending: true } }) },

  { key: 'hidden', label: 'Hidden field', description: 'A value from the link or the system', category: 'Structure', icon: 'eyeOff', make: () => ({ type: 'hidden', label: t('fields.default.hidden'), validationType: 'string', config: { source: 'url' } }) },
  { key: 'section', label: 'Section', description: 'A titled card around fields', category: 'Structure', icon: 'panel', make: () => ({ type: 'section', label: t('fields.default.sectionTitle'), fields: [] }) },
  {
    key: 'repeater',
    label: 'Repeating group',
    description: 'People add several items, e.g. guests',
    category: 'Structure',
    icon: 'repeat',
    make: () => ({
      type: 'repeater',
      label: t('fields.default.items'),
      validationType: 'array',
      config: { layout: 'cards', itemLabel: t('fields.default.itemLabel'), addLabel: t('fields.default.addItem'), minItems: 1 },
      fields: [{ type: 'input', inputType: 'text', id: uid(), model: 'name', inputName: 'name', label: t('common.name'), validationType: 'string' }],
    }),
  },
  {
    key: 'tabs',
    label: 'Tabs',
    description: 'Switch between groups of fields',
    category: 'Structure',
    icon: 'tabs',
    make: () => ({ type: 'tabs', tabs: [{ id: uid('tab'), label: t('fields.default.tab', { n: 1 }), fields: [] }, { id: uid('tab'), label: t('fields.default.tab', { n: 2 }), fields: [] }] }),
  },
  {
    key: 'modal',
    label: 'Dialog',
    description: 'A pop-up form a button can open',
    category: 'Structure',
    icon: 'dialog',
    make: () => ({ type: 'modal', label: t('fields.default.dialogTitle'), fields: [], config: { confirmLabel: t('fields.default.confirm'), cancelLabel: t('common.cancel'), confirmActions: [] } }),
  },
  { key: 'button', label: 'Button', description: 'Runs actions: next step, set an answer…', category: 'Structure', icon: 'pointer', make: () => ({ type: 'button', label: t('fields.default.continue'), config: { variant: 'primary', actions: [{ type: 'next' }] } }) },
];

export const CATEGORIES: Category[] = ['Text', 'Choice', 'Date & time', 'Rating', 'Media', 'Content', 'Layout', 'Structure'];

/** The fields most forms are made of, shown first in the palette (like "Basic" / "Popular" blocks in other form builders). */
export const POPULAR_FIELDS = ['shortText', 'longText', 'email', 'phone', 'radio', 'checkboxes', 'dropdown', 'date', 'yesNo', 'rating', 'file', 'heading'];
/** CSS class suffix of a category, for its color in the palette. */
export const categoryClass = (category: Category) => `cat-${CATEGORY_KEYS[category]}`;

const CATEGORY_KEYS: Record<Category, string> = { Text: 'text', Choice: 'choice', 'Date & time': 'dateTime', Rating: 'rating', Media: 'media', Content: 'content', Layout: 'layout', Structure: 'structure' };

/** The name of a field type, a short description and its palette group, in the interface language. */
export const fieldTypeLabel = (def: FieldTypeDef) => tOr(`fields.type.${def.key}.label`, def.label);
export const fieldTypeDescription = (def: FieldTypeDef) => tOr(`fields.type.${def.key}.description`, def.description);
export const categoryLabel = (category: Category) => tOr(`fields.category.${CATEGORY_KEYS[category]}`, category);

export const typeDefFor = (field: FormField): FieldTypeDef => {
  const t = field.type;
  const it = field.inputType;
  if (t === 'scale' && field.config && field.config.nps) return FIELD_TYPES.find(def => def.key === 'nps')!;
  if (t === 'pageBreak' && field.config && field.config.ending) return FIELD_TYPES.find(def => def.key === 'thankYou')!;
  const match = FIELD_TYPES.find(def => {
    const made = def.make();
    if (made.type !== t) return false;
    if (t === 'input') return made.inputType === (it || 'text');
    return true;
  });
  return match || FIELD_TYPES[0];
};

export function createField(key: string, existing: FormField[], overrides: Partial<FormField> = {}): FormField {
  const def = FIELD_TYPES.find(d => d.key === key) || FIELD_TYPES[0];
  // the starting texts are form content: in the form's language, not the interface's
  const base = { ...inContentLanguage(def.make), ...overrides } as FormField;
  const field = { ...base, id: uid() } as FormField;
  // new phone fields start with the host's country (e.g. +45) instead of the one of the form's language
  const phoneCountry = options.value.defaultPhoneCountry;
  if (field.type === 'phone' && phoneCountry && !field.config?.defaultCountry) field.config = { ...(field.config || {}), defaultCountry: phoneCountry.toLowerCase() };
  if (!isLayoutType(field.type)) {
    const taken = new Set(flattenFields(existing, true, true).map(f => f.model).filter(Boolean) as string[]);
    field.model = uniqueModelKey(toModelKey(field.label || field.checkboxLabel || def.label, def.key), taken);
    field.inputName = field.model;
  }
  return field;
}

export const hasPlaceholder = (f: FormField) => ['input', 'textarea', 'select', 'multiSelect', 'countrySelect', 'search', 'address', 'phone'].includes(f.type) && f.inputType !== 'checkbox' && f.inputType !== 'color';
export const hasOptions = (f: FormField) => ['select', 'multiSelect', 'radioGroup', 'checkboxGroup', 'ranking', 'pictureChoice'].includes(f.type);
export const canRequire = (f: FormField) => !isLayoutType(f.type);
