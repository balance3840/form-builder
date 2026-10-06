import { isKeyLocked } from './templateLease';
import { signal, computed, effect } from '@preact/signals';
import { FormColumn, FormDocument, FormField, FormFooter, FormTheme, childLists, deepClone, filterConditions, flattenConditions, flattenFields, isContainer, isLayoutType, loadDocument, logicRules, mapConditions, toModelKey, uid, uniqueModelKey, withChildList } from './generator';
import { createField } from './catalog';
import { availableLanguages } from './generator';
import { dirty, embedded, options, restrictionFor, scheduleAutosave, setDocumentReader, withDefaultSpamProtection } from './host';
import { DEFAULT_LOCALE, inContentLanguage, inEnglish, locale, setContentLanguage, t } from './i18n';

export type Tab = 'build' | 'design' | 'translate' | 'preview' | 'code';

const STORAGE_KEY = 'form-builder:document:v1';

/** A new form, written in the interface language (which then is also the form's language). */
export const emptyDoc = (): FormDocument => withDefaultSpamProtection({
  version: 2,
  title: t('store.untitledForm'),
  description: '',
  fields: [],
  theme: { preset: 'indigo' },
  settings: { submitButtonText: t('store.submit') },
  action: {},
  ...(locale.value !== DEFAULT_LOCALE ? { i18n: { defaultLanguage: locale.value, languages: [locale.value], detect: true, switcher: 'none' } } : {}),
});

function loadSaved(): FormDocument | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // goes through the loader so documents saved by older versions are upgraded (e.g. per-field widths -> rows)
    return parsed && Array.isArray(parsed.fields) ? loadDocument(parsed).doc : null;
  } catch (e) {
    return null;
  }
}

const saved = loadSaved();
export const hasSavedDoc = !!saved;

export const doc = signal<FormDocument>(saved || emptyDoc());
export const selectedId = signal<string | null>(null);
setDocumentReader(() => doc.value);
export const tab = signal<Tab>('build');
export const toast = signal<{ message: string; id: number } | null>(null);
export const showTemplates = signal<boolean>(!saved);

/** The questions the form had when it was opened: the ones that can already have answers. */
let openedModels = new Set<string>();
/** The field waiting for a yes before it is removed (a question that can have responses). */
export const removalAsk = signal<string | null>(null);
/** Opens the "add a field" picker. `dest` says where the new field goes. */
export const showAddMenu = signal<{ dest: Dest } | null>(null);
export const savedAt = signal<number>(0);

const past = signal<FormDocument[]>([]);
const future = signal<FormDocument[]>([]);
export const canUndo = computed(() => past.value.length > 0);
export const canRedo = computed(() => future.value.length > 0);

/* ------------------------------------------------------------------- tree */

/** `root`, or the id of a column, a section or a repeating group (the lists a field can live in). */
export type ListId = string;
export type Dest = { list: ListId; index: number } | { beside: string; side: 'left' | 'right' };

export const ROOT: ListId = 'root';

/** Every field of the form, including the ones inside sections and repeating groups. */
export const allFields = (fields: FormField[]) => flattenFields(fields, false, true);

export function findField(fields: FormField[], id: string | null): FormField | null {
  if (!id) return null;
  return allFields(fields).find(f => f.id === id) || null;
}

export type Location = {
  list: ListId;
  index: number;
  /** The block that owns the list (a row, section or repeating group), null for the top level. */
  parent: FormField | null;
  siblings: FormField[];
  /** Set when the field sits in a column of a row. */
  row: FormField | null;
  column: FormColumn | null;
};

export function locate(fields: FormField[], id: string): Location | null {
  const walk = (list: FormField[], listId: ListId, parent: FormField | null): Location | null => {
    const index = list.findIndex(f => f.id === id);
    if (index >= 0) {
      const inRow = !!parent && isContainer(parent);
      return { list: listId, index, parent, siblings: list, row: inRow ? parent : null, column: inRow ? (parent!.columns || []).find(c => c.id === listId) || null : null };
    }
    for (const field of list) {
      for (const child of childLists(field)) {
        const hit = walk(child.fields, child.id, field);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(fields, ROOT, null);
}

/** The block that owns list `listId` (null for the top level). */
export function listOwner(fields: FormField[], listId: ListId): FormField | null {
  if (listId === ROOT) return null;
  return allFields(fields).find(f => childLists(f).some(l => l.id === listId)) || null;
}

export type Kind = 'leaf' | 'row' | 'section' | 'repeater' | 'tabs' | 'modal';
export const kindOf = (field: { type: string }): Kind => (field.type === 'columns' ? 'row' : field.type === 'section' ? 'section' : field.type === 'repeater' ? 'repeater' : field.type === 'tabs' ? 'tabs' : field.type === 'modal' ? 'modal' : 'leaf');
export type ListKind = 'root' | 'column' | 'section' | 'repeater' | 'tab' | 'modal';
export const listKindOf = (owner: FormField | null): ListKind =>
  !owner ? 'root' : owner.type === 'columns' ? 'column' : owner.type === 'section' ? 'section' : owner.type === 'tabs' ? 'tab' : owner.type === 'modal' ? 'modal' : 'repeater';

/** What a list can hold: rows, tabs and repeating groups go anywhere except inside a column; sections only at the top level; dialogs anywhere but a column or another dialog. */
export function accepts(kind: Kind, list: ListKind): boolean {
  if (kind === 'leaf') return true;
  if (kind === 'section') return list === 'root';
  if (kind === 'modal') return list !== 'column' && list !== 'modal'; // a dialog can sit in an item, so it sees that item's answers
  return list !== 'column';
}

export const selectedField = computed(() => findField(doc.value.fields, selectedId.value));

/** Rebuilds only the branches that changed so unchanged fields keep their identity (cheap re-renders). */
function editTree(list: FormField[], id: string, fn: (f: FormField) => FormField | FormField[] | null): FormField[] {
  let changed = false;
  const out: FormField[] = [];
  for (const field of list) {
    if (field.id === id) {
      changed = true;
      const result = fn(field);
      if (result === null) continue;
      if (Array.isArray(result)) out.push(...result);
      else out.push(result);
      continue;
    }
    let next = field;
    for (const child of childLists(field)) {
      const edited = editTree(child.fields, id, fn);
      if (edited !== child.fields) next = withChildList(next, child.id, edited);
    }
    if (next !== field) changed = true;
    out.push(next);
  }
  return changed ? out : list;
}

/** Applies `fn` to the list `listId` (wherever it is). */
function editList(fields: FormField[], listId: ListId, fn: (list: FormField[]) => FormField[]): FormField[] {
  if (listId === ROOT) return fn(fields);
  let changed = false;
  const out = fields.map(field => {
    let next = field;
    for (const child of childLists(field)) {
      if (child.id === listId) next = withChildList(next, child.id, fn(child.fields));
      else {
        const inner = editList(child.fields, listId, fn);
        if (inner !== child.fields) next = withChildList(next, child.id, inner);
      }
    }
    if (next !== field) changed = true;
    return next;
  });
  return changed ? out : fields;
}

function insertInto(fields: FormField[], list: ListId, index: number, items: FormField[]): FormField[] {
  return editList(fields, list, target => {
    const at = Math.max(0, Math.min(index, target.length));
    return [...target.slice(0, at), ...items, ...target.slice(at)];
  });
}

/** Applies `fn` to every field, children first. Unchanged branches keep their identity. */
function mapTree(list: FormField[], fn: (f: FormField) => FormField): FormField[] {
  let changed = false;
  const out = list.map(field => {
    let next = field;
    for (const child of childLists(field)) {
      const inner = mapTree(child.fields, fn);
      if (inner !== child.fields) next = withChildList(next, child.id, inner);
    }
    const mapped = fn(next);
    if (mapped !== field) changed = true;
    return mapped;
  });
  return changed ? out : list;
}

const rowHasFields = (row: FormField) => (row.columns || []).some(c => c.fields.length);

/** Removes rows that just lost their last field. Rows the user left empty on purpose (to fill later) are kept. */
function cleanup(fields: FormField[], before: FormField[]): FormField[] {
  const hadFields = new Set(allFields(before).filter(f => isContainer(f) && rowHasFields(f)).map(f => f.id));
  const clean = (list: FormField[]): FormField[] => {
    let changed = false;
    const out: FormField[] = [];
    for (const field of list) {
      if (isContainer(field) && hadFields.has(field.id) && !rowHasFields(field)) {
        changed = true;
        continue;
      }
      let next = field;
      for (const child of childLists(field)) {
        const inner = clean(child.fields);
        if (inner !== child.fields) next = withChildList(next, child.id, inner);
      }
      if (next !== field) changed = true;
      out.push(next);
    }
    return changed ? out : list;
  };
  return clean(fields);
}

function newRow(spans: number[], fields: FormField[][] = []): FormField {
  return { type: 'columns', id: uid('row'), config: { align: 'start', justify: 'start' }, columns: spans.map((span, i) => ({ id: uid('col'), span, fields: fields[i] || [] })) };
}

/** Puts `item` at `dest`. For `beside`, the target and the new item become a two column row. */
function place(fields: FormField[], dest: Dest, item: FormField): FormField[] {
  if ('beside' in dest) {
    if (!findField(fields, dest.beside)) return fields;
    return editTree(fields, dest.beside, target => (dest.side === 'left' ? newRow([6, 6], [[item], [target]]) : newRow([6, 6], [[target], [item]])));
  }
  return insertInto(fields, dest.list, dest.index, [item]);
}

/**
 * Moves a destination up to the closest list that can hold `item` (e.g. a section dropped inside a column goes
 * after the row that holds that column). Returns null if the destination does not exist.
 */
function fitDest(fields: FormField[], dest: Dest, item: FormField): Dest | null {
  const kind = kindOf(item);
  if ('beside' in dest) {
    const where = locate(fields, dest.beside);
    if (!where) return null;
    if (kind === 'leaf' && !where.row) return dest;
    return fitDest(fields, { list: where.list, index: where.index + 1 }, item);
  }
  let current = dest;
  for (let guard = 0; guard < 8; guard++) {
    const owner = listOwner(fields, current.list);
    if (accepts(kind, listKindOf(owner))) return current;
    const where = owner && locate(fields, owner.id);
    if (!where) return { list: ROOT, index: fields.length };
    current = { list: where.list, index: where.index + 1 };
  }
  return { list: ROOT, index: fields.length };
}

const flat = () => allFields(doc.value.fields).filter(f => !isContainer(f));

/* ---------------------------------------------------------------- history */

let persistTimer: any;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    if (embedded.value) {
      dirty.value = true;
      options.value.onChange?.(doc.value);
      scheduleAutosave();
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc.value));
      savedAt.value = Date.now();
    } catch (e) {
      /* storage unavailable: the builder still works, it just does not autosave */
    }
  }, 300);
}

let lastKey = '';
let lastTime = 0;

/** Applies a new document and records history. Edits with the same `key` within a second collapse into one undo step. */
export function commit(next: FormDocument, key?: string) {
  const now = Date.now();
  const coalesce = !!key && key === lastKey && now - lastTime < 1000;
  if (!coalesce) past.value = [...past.value.slice(-99), doc.value];
  lastKey = key || '';
  lastTime = now;
  future.value = [];
  doc.value = next;
  persist();
}

export function undo() {
  if (!past.value.length) return;
  const previous = past.value[past.value.length - 1];
  future.value = [doc.value, ...future.value];
  past.value = past.value.slice(0, -1);
  doc.value = previous;
  lastKey = '';
  persist();
}

export function redo() {
  if (!future.value.length) return;
  const [next, ...rest] = future.value;
  past.value = [...past.value, doc.value];
  future.value = rest;
  doc.value = next;
  lastKey = '';
  persist();
}

export function notify(message: string) {
  const id = Date.now();
  toast.value = { message, id };
  setTimeout(() => {
    if (toast.value && toast.value.id === id) toast.value = null;
  }, 2200);
}

/* ----------------------------------------------------------------- fields */

const isAutoModel = (field: FormField) => {
  if (!field.model) return false;
  const base = toModelKey(field.label || field.checkboxLabel || '', '');
  return !!base && field.model.replace(/\d+$/, '') === base;
};

/** Rewrites every logic condition that points at `oldModel` to point at `newModel`. */
function renameInLogic(fields: FormField[], oldModel: string, newModel: string): FormField[] {
  return mapTree(fields, f => {
    const rules = logicRules(f);
    if (!rules.some(r => flattenConditions(r.conditions).some(c => c.field === oldModel))) return f;
    const next = rules.map(r => ({ ...r, conditions: mapConditions(r.conditions, c => (c.field === oldModel ? { ...c, field: newModel } : c)) }));
    return { ...f, logic: Array.isArray(f.logic) ? next : next[0] };
  });
}

export function updateField(id: string, patch: Partial<FormField> | ((f: FormField) => Partial<FormField>), key?: string) {
  const current = findField(doc.value.fields, id);
  if (!current) return;
  let change: Partial<FormField> = { ...(typeof patch === 'function' ? patch(current) : patch) };

  // Keep the field key in sync with the label until the user picks their own key.
  if (!isLayoutType(current.type) && ('label' in change || 'checkboxLabel' in change) && !('model' in change) && isAutoModel(current)) {
    const nextLabel = (change.label !== undefined ? change.label : current.label) || (change.checkboxLabel !== undefined ? change.checkboxLabel : current.checkboxLabel) || '';
    const base = toModelKey(nextLabel, '');
    if (base) {
      const taken = new Set(flat().filter(f => f.id !== id).map(f => f.model));
      let model = base;
      let n = 2;
      while (taken.has(model)) model = `${base}${n++}`;
      change = { ...change, model, inputName: model };
    }
  }

  let fields = editTree(doc.value.fields, id, f => ({ ...f, ...change }));
  if (change.model !== undefined && change.model !== current.model && current.model) {
    fields = renameInLogic(fields, current.model, change.model);
  }
  commit({ ...doc.value, fields }, key || `field:${id}`);
}

/** Default destination: right after the selected block, else at the end. */
/** The page break that starts the thank-you page (shown after sending), if the form has one. */
export const isEnding = (f: FormField) => f.type === 'pageBreak' && !!(f.config && f.config.ending);
export const endingIndex = (fields: FormField[] = doc.value.fields) => fields.findIndex(isEnding);

function defaultDest(): Dest {
  const where = selectedId.value ? locate(doc.value.fields, selectedId.value) : null;
  if (where) return { list: where.list, index: where.index + 1 };
  // nothing selected: at the end of the form, which is before the thank-you page when there is one
  const ending = endingIndex();
  return { list: ROOT, index: ending >= 0 ? ending : doc.value.fields.length };
}

/** Adds the thank-you page at the end of the form with some content to start from, or selects it when it is there. */
export function addThankYouPage() {
  const at = endingIndex();
  if (at >= 0) {
    selectedId.value = doc.value.fields[at].id;
    return doc.value.fields[at];
  }
  const fields = doc.value.fields;
  const pageBreak = createField('thankYou', fields);
  const icon = createField('icon', fields);
  const heading = createField('heading', fields, { label: inContentLanguage(() => t('store.thankYouTitle')), config: { level: 'h2' } });
  const text = createField('paragraph', fields, { content: inContentLanguage(() => t('store.thankYouText')) });
  commit({ ...doc.value, fields: [...fields, pageBreak, icon, heading, text], settings: { ...(doc.value.settings || {}), afterSubmit: 'page' } });
  selectedId.value = pageBreak.id;
  return pageBreak;
}

export function addField(typeKey: string, dest?: Dest, overrides: Partial<FormField> = {}) {
  // the host does not allow this kind of field in this form (every way of adding one ends here)
  const restriction = restrictionFor(typeKey);
  if (restriction?.level === 'blocked') {
    notify(restriction.reason);
    return undefined;
  }
  if (typeKey === 'thankYou') return addThankYouPage();
  const field = createField(typeKey, doc.value.fields, overrides);
  const target = fitDest(doc.value.fields, dest || defaultDest(), field);
  if (!target) return field;
  const fields = place(doc.value.fields, target, field);
  commit({ ...doc.value, fields });
  selectedId.value = field.id;
  return field;
}

/** Removes a field; when the form has responses and the field was already in it, asks first. */
export function requestRemoveField(id: string) {
  const field = findField(doc.value.fields, id);
  if (field && options.value.hasResponses && allFields([field]).some(f => f.model && openedModels.has(f.model))) {
    removalAsk.value = id;
    return;
  }
  removeField(id);
}

export function removeField(id: string) {
  const fields = doc.value.fields;
  const removed = findField(fields, id);
  if (!removed) return;
  if (isEnding(removed)) {
    // the thank-you page goes as a whole (undo brings it back); after sending, the message is shown again
    commit({ ...doc.value, fields: fields.slice(0, endingIndex(fields)), settings: { ...(doc.value.settings || {}), afterSubmit: 'message' } });
    if (selectedId.value === id) selectedId.value = null;
    return;
  }
  // what the contract cannot do without (its required fields) stays; optional ones, like the ready-made terms, can go
  if (allFields([removed]).some(f => isKeyLocked(f, doc.value.settings) && ((f.validations || []).some(v => v.name === 'required') || Number(f.config?.minItems) > 0))) return notify(t('fieldInspector.keyLockedDelete'));
  const gone = new Set(allFields([removed]).map(f => f.model).filter(Boolean) as string[]);
  let next = editTree(fields, id, () => null);
  next = cleanup(next, fields);
  // drop logic conditions that pointed to removed fields
  const strip = (list: FormField[]) =>
    mapTree(list, f => {
      const rules = logicRules(f);
      if (!rules.some(r => flattenConditions(r.conditions).some(c => gone.has(c.field)))) return f;
      const kept = rules.map(r => ({ ...r, conditions: filterConditions(r.conditions, c => !gone.has(c.field)) })).filter(r => r.conditions.length);
      const out = { ...f };
      if (!kept.length) delete out.logic;
      else out.logic = Array.isArray(f.logic) ? kept : kept[0];
      return out;
    });
  commit({ ...doc.value, fields: gone.size ? strip(next) : next });
  selectedId.value = null;
}

function cloneWithNewIds(field: FormField, taken: Set<string>): FormField {
  const copy = deepClone(field);
  // Inside a repeating group the keys and rules are relative to the item, so they stay as they are; only the ids change.
  const refresh = (f: FormField, top: boolean, inItem: boolean): FormField => {
    const next: FormField = { ...f, id: uid(isContainer(f) ? 'row' : 'f') };
    if (!inItem) delete next.logic;
    const childInItem = inItem || next.type === 'repeater' || next.type === 'modal';
    if (isContainer(next)) {
      next.columns = (next.columns || []).map(c => ({ ...c, id: uid('col'), fields: c.fields.map(x => refresh(x, false, childInItem)) }));
    } else if (next.type === 'tabs') {
      next.tabs = (next.tabs || []).map(t => ({ ...t, id: uid('tab'), fields: t.fields.map(x => refresh(x, false, childInItem)) }));
    } else if (next.type === 'section' || next.type === 'repeater' || next.type === 'modal') {
      next.fields = (next.fields || []).map(x => refresh(x, false, childInItem));
    }
    if (!isLayoutType(next.type) && !inItem) {
      next.model = uniqueModelKey(next.model || 'field', taken);
      taken.add(next.model);
      next.inputName = next.model;
    }
    if (top && next.label && !isContainer(next)) next.label = inContentLanguage(() => t('store.copyOf', { label: next.label }));
    return next;
  };
  return refresh(copy, true, false);
}

export function duplicateField(id: string) {
  const fields = doc.value.fields;
  const source = findField(fields, id);
  const where = locate(fields, id);
  if (!source || !where) return;
  const clone = cloneWithNewIds(source, new Set(flat().map(f => f.model as string)));
  // a copy is a new answer: nothing outside the form reads it
  allFields([clone]).forEach(f => delete f.keyLocked);
  commit({ ...doc.value, fields: insertInto(fields, where.list, where.index + 1, [clone]) });
  selectedId.value = clone.id;
}

/** Moves a block to `dest` (or to the closest place that can hold it: a section never goes inside a column…). */
export function moveField(id: string, dest: Dest) {
  const fields = doc.value.fields;
  const item = findField(fields, id);
  const from = locate(fields, id);
  if (!item || !from) return;
  if ('beside' in dest && dest.beside === id) return;
  // never into itself
  const inside = new Set(allFields([item]).flatMap(f => childLists(f).map(l => l.id)));
  if (!('beside' in dest) && inside.has(dest.list)) return;
  if ('beside' in dest && allFields([item]).some(f => f.id === dest.beside)) return;
  const fitted = fitDest(fields, dest, item);
  if (!fitted) return;

  let target = fitted;
  if (!('beside' in target) && target.list === from.list && from.index < target.index) {
    target = { ...target, index: target.index - 1 }; // removing the item shifts later indexes
  }
  if (!('beside' in target) && target.list === from.list && target.index === from.index) return; // dropped where it was

  let next = editTree(fields, id, () => null);
  next = place(next, target, item);
  next = cleanup(next, fields);
  commit({ ...doc.value, fields: next });
  selectedId.value = id;
}

export function nudgeField(id: string, delta: number) {
  const where = locate(doc.value.fields, id);
  if (!where) return;
  const size = where.siblings.length;
  const to = where.index + delta;
  if (to < 0 || to >= size) return;
  moveField(id, { list: where.list, index: delta > 0 ? to + 1 : to });
}

/* -------------------------------------------------------------------- rows */

export const ROW_PRESETS: { id: string; label: string; spans: number[] }[] = [
  { id: '6-6', label: '1/2 + 1/2', spans: [6, 6] },
  { id: '4-8', label: '1/3 + 2/3', spans: [4, 8] },
  { id: '8-4', label: '2/3 + 1/3', spans: [8, 4] },
  { id: '3-9', label: '1/4 + 3/4', spans: [3, 9] },
  { id: '9-3', label: '3/4 + 1/4', spans: [9, 3] },
  { id: '4-4-4', get label() { return t('store.equalColumns', { count: 3 }); }, spans: [4, 4, 4] },
  { id: '3-6-3', label: '1/4 + 1/2 + 1/4', spans: [3, 6, 3] },
  { id: '3-3-3-3', get label() { return t('store.equalColumns', { count: 4 }); }, spans: [3, 3, 3, 3] },
  { id: '6', get label() { return t('store.halfWidth'); }, spans: [6] },
  { id: '8', get label() { return t('store.fractionWidth', { fraction: '2/3' }); }, spans: [8] },
  { id: '4', get label() { return t('store.fractionWidth', { fraction: '1/3' }); }, spans: [4] },
];

/** Changes the column layout of a row. Extra columns' fields are appended to the last remaining column. */
export function setRowSpans(rowId: string, spans: number[]) {
  const row = findField(doc.value.fields, rowId);
  if (!row || !isContainer(row)) return;
  const old = row.columns || [];
  const columns: FormColumn[] = spans.map((span, i) => ({ id: old[i] ? old[i].id : uid('col'), span, fields: old[i] ? old[i].fields : [] }));
  const overflow = old.slice(spans.length).flatMap(c => c.fields);
  if (overflow.length) columns[columns.length - 1] = { ...columns[columns.length - 1], fields: [...columns[columns.length - 1].fields, ...overflow] };
  const fields = editTree(doc.value.fields, rowId, f => ({ ...f, columns }));
  commit({ ...doc.value, fields });
}

export function setRowConfig(rowId: string, patch: { [key: string]: any }) {
  updateField(rowId, f => ({ config: { ...(f.config || {}), ...patch } }), `row:${rowId}`);
}

/** Wraps a field that is not in a row yet in a new row with the given columns (the field goes in the first column). */
export function wrapInRow(fieldId: string, spans: number[]) {
  const where = locate(doc.value.fields, fieldId);
  const field = findField(doc.value.fields, fieldId);
  if (!where || !field || where.row) return;
  const row = newRow(spans, [[field]]);
  commit({ ...doc.value, fields: editTree(doc.value.fields, fieldId, () => row) });
  selectedId.value = fieldId;
}

/** Turns the contents of a row back into normal full width fields. */
export function unwrapRow(rowId: string) {
  const row = findField(doc.value.fields, rowId);
  if (!row || !isContainer(row)) return;
  const children = (row.columns || []).flatMap(c => c.fields);
  commit({ ...doc.value, fields: editTree(doc.value.fields, rowId, () => children) });
  selectedId.value = children[0] ? children[0].id : null;
}

/** Moves a field out of its row, right below it. */
export function moveOutOfRow(fieldId: string) {
  const where = locate(doc.value.fields, fieldId);
  if (!where || !where.row) return;
  const rowWhere = locate(doc.value.fields, where.row.id);
  if (!rowWhere) return;
  moveField(fieldId, { list: rowWhere.list, index: rowWhere.index + 1 });
}

/* -------------------------------------------------------------- languages */

type I18n = { defaultLanguage?: string; languages?: string[]; detect?: boolean; switcher?: 'none' | 'flags' | 'dropdown'; translations?: { [lang: string]: { [key: string]: string } } };

const i18nOf = (): I18n => (doc.value.i18n || {}) as I18n;

/** All languages of the form, default first. */
export const formLanguages = computed(() => availableLanguages(doc.value.i18n as any));
export const defaultLanguage = computed(() => formLanguages.value[0]);
/** The languages that need translations (everything except the default). */
export const targetLanguages = computed(() => formLanguages.value.slice(1));
// texts the builder adds to the form (a new question, "Option 1", a step title) are written in the form's language
effect(() => {
  setContentLanguage(defaultLanguage.value);
});

function commitI18n(next: I18n, key?: string) {
  commit({ ...doc.value, i18n: next }, key);
}

export function addLanguage(code: string) {
  const current = i18nOf();
  const languages = availableLanguages(current as any);
  if (languages.includes(code)) return;
  commitI18n({
    detect: true,
    switcher: 'none',
    ...current,
    defaultLanguage: languages[0],
    languages: [...languages, code],
    translations: { ...(current.translations || {}), [code]: (current.translations || {})[code] || {} },
  });
}

export function removeLanguage(code: string) {
  const current = i18nOf();
  const languages = availableLanguages(current as any);
  if (languages[0] === code) return;
  const translations = { ...(current.translations || {}) };
  delete translations[code];
  const remaining = languages.filter(l => l !== code);
  commitI18n({ ...current, languages: remaining, translations, ...(remaining.length < 2 ? { switcher: 'none' as const } : {}) });
}

/** The language the form content is written in. Existing translations are kept. */
export function setDefaultLanguage(code: string) {
  const current = i18nOf();
  const rest = availableLanguages(current as any).filter(l => l !== code);
  commitI18n({ detect: true, switcher: 'none', ...current, defaultLanguage: code, languages: [code, ...rest] });
}

export function setI18nOption(patch: Partial<I18n>) {
  commitI18n({ detect: true, switcher: 'none', ...i18nOf(), ...patch }, 'i18n-option');
}

export function setTranslation(language: string, key: string, value: string) {
  const current = i18nOf();
  const translations = { ...(current.translations || {}) };
  const dict = { ...(translations[language] || {}) };
  if (value === '') delete dict[key];
  else dict[key] = value;
  translations[language] = dict;
  commitI18n({ ...current, translations }, `tr:${language}:${key}`);
}

/** Applies translations read from a file in one step (one undo), adding the languages the form did not have yet. */
export function importTranslations(updates: { [language: string]: { [key: string]: string } }) {
  const current = i18nOf();
  const languages = availableLanguages(current as any);
  const translations = { ...(current.translations || {}) };
  Object.entries(updates).forEach(([language, dict]) => {
    translations[language] = { ...(translations[language] || {}), ...dict };
  });
  const added = Object.keys(updates).filter(code => !languages.includes(code));
  commitI18n({
    ...(added.length ? { detect: true, switcher: 'none' } : {}),
    ...current,
    defaultLanguage: languages[0],
    languages: [...languages, ...added],
    translations,
  });
}

/** Fills every empty translation of `language` with the default-language text (a starting point to edit). */
export function copySourceToEmpty(language: string, entries: { key: string; source: string }[]) {
  const current = i18nOf();
  const dict = { ...((current.translations || {})[language] || {}) };
  entries.forEach(e => {
    if (!dict[e.key]) dict[e.key] = e.source;
  });
  commitI18n({ ...current, translations: { ...(current.translations || {}), [language]: dict } });
}

/* -------------------------------------------------------------- doc level */

export function setMeta(patch: Partial<FormDocument>, key = 'meta') {
  commit({ ...doc.value, ...patch }, key);
}
export function setTheme(patch: Partial<FormTheme>, key = 'theme') {
  commit({ ...doc.value, theme: { ...(doc.value.theme || {}), ...patch } }, key);
}
export function replaceTheme(theme: FormTheme) {
  commit({ ...doc.value, theme });
}
export function setFooter(patch: Partial<FormFooter>, key = 'footer') {
  const footer: { [key: string]: any } = { ...(doc.value.footer || {}), ...patch };
  Object.keys(footer).forEach(k => (footer[k] === '' || footer[k] === undefined) && delete footer[k]);
  commit({ ...doc.value, footer: footer as FormFooter }, key);
}
export function setSettings(patch: { [key: string]: any }, key = 'settings') {
  commit({ ...doc.value, settings: { ...(doc.value.settings || {}), ...patch } }, key);
}
export function setAction(patch: { [key: string]: any }, key = 'action') {
  const action = { ...(doc.value.action || {}), ...patch };
  Object.keys(action).forEach(k => (action[k] === '' || action[k] === undefined) && delete action[k]);
  commit({ ...doc.value, action }, key);
}

/** Used by the host application: puts a document in the editor and forgets the history. */
export function loadExternal(next: FormDocument | null | undefined, offerTemplates: boolean) {
  past.value = [];
  future.value = [];
  lastKey = '';
  doc.value = next && Array.isArray(next.fields) ? loadDocument(next).doc : emptyDoc();
  selectedId.value = null;
  tab.value = 'build';
  dirty.value = false;
  openedModels = new Set(allFields(doc.value.fields).map(f => f.model).filter(Boolean) as string[]);
  showTemplates.value = offerTemplates && !(doc.value.fields || []).length;
}

export function replaceDoc(next: FormDocument) {
  commit(next);
  selectedId.value = null;
}

/** The blank form made before the interface language had loaded: write it again in that language. */
export function relocalizeUntouchedDoc() {
  const d = doc.value;
  const pristine = !past.value.length && !d.fields.length && !d.i18n && inEnglish(() => d.title === t('store.untitledForm') && d.settings?.submitButtonText === t('store.submit'));
  if (pristine) doc.value = emptyDoc();
}

export function resetDoc() {
  replaceDoc(emptyDoc());
}

/* -------------------------------------------------------------------- tabs */

export function addTab(blockId: string) {
  const block = findField(doc.value.fields, blockId);
  if (!block || block.type !== 'tabs') return;
  const tabs = [...(block.tabs || []), { id: uid('tab'), label: inContentLanguage(() => t('store.tabN', { n: (block.tabs || []).length + 1 })), fields: [] }];
  updateField(blockId, { tabs });
}

export function renameTab(blockId: string, tabId: string, label: string) {
  const block = findField(doc.value.fields, blockId);
  if (!block) return;
  updateField(blockId, { tabs: (block.tabs || []).map(t => (t.id === tabId ? { ...t, label } : t)) }, `tab:${tabId}`);
}

export function removeTab(blockId: string, tabId: string) {
  const block = findField(doc.value.fields, blockId);
  if (!block || (block.tabs || []).length < 2) return;
  const gone = (block.tabs || []).find(t => t.id === tabId);
  // the fields of a removed tab are kept: they move into the previous tab
  const tabs = (block.tabs || []).filter(t => t.id !== tabId);
  if (gone && gone.fields.length) {
    const at = Math.max(0, (block.tabs || []).findIndex(t => t.id === tabId) - 1);
    tabs[at] = { ...tabs[at], fields: [...tabs[at].fields, ...gone.fields] };
  }
  updateField(blockId, { tabs });
}

export function moveTab(blockId: string, tabId: string, delta: number) {
  const block = findField(doc.value.fields, blockId);
  if (!block) return;
  const tabs = [...(block.tabs || [])];
  const i = tabs.findIndex(t => t.id === tabId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= tabs.length) return;
  [tabs[i], tabs[j]] = [tabs[j], tabs[i]];
  updateField(blockId, { tabs });
}

/** The steps of the form (the first one, then one per page break) for pickers: `start` is the id of the first step. */
export function stepList(d: FormDocument): { id: string; title: string; index: number }[] {
  const out = [{ id: 'start', title: (d.settings && d.settings.firstStepTitle) || t('store.stepN', { n: 1 }), index: 1 }];
  d.fields.forEach(f => {
    if (f.type === 'pageBreak') out.push({ id: f.id, title: f.label || t('store.stepN', { n: out.length + 1 }), index: out.length + 1 });
  });
  return out;
}

/** The blocks that contain `id`, outermost first. */
export function ancestorsOf(fields: FormField[], id: string): FormField[] {
  const path: FormField[] = [];
  const walk = (list: FormField[], trail: FormField[]): boolean => {
    for (const field of list) {
      if (field.id === id) {
        path.push(...trail);
        return true;
      }
      for (const child of childLists(field)) if (walk(child.fields, [...trail, field])) return true;
    }
    return false;
  };
  walk(fields, []);
  return path;
}

/**
 * Fields that can be referenced from a logic condition on `fieldId`: anything above it that holds a value. A field inside
 * a repeating group can use the other fields of the same item, but outside the group only the group itself (its item count).
 */
export function logicSources(fieldId: string): FormField[] {
  const all = allFields(doc.value.fields);
  const index = all.findIndex(f => f.id === fieldId);
  const mine = new Set(ancestorsOf(doc.value.fields, fieldId).filter(f => f.type === 'repeater' || f.type === 'modal').map(f => f.id));
  return all
    .slice(0, index < 0 ? all.length : index)
    .filter(f => !isLayoutType(f.type) && f.model)
    .filter(f => ancestorsOf(doc.value.fields, f.id).every(a => (a.type !== 'repeater' && a.type !== 'modal') || mine.has(a.id)));
}
