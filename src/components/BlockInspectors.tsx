import { DataText } from './DataText';
import { useState } from 'preact/hooks';
import { FormField, createTranslator, flattenFields, isLayoutType } from '../generator';
import { Icon } from '../icons';
import { addTab, allFields, defaultLanguage, doc, moveTab, removeTab, renameTab, stepList, updateField } from '../store';
import { ImagePicker } from './DesignPanel';
import { Field, NumberInput, Segmented, Select, TextArea, TextInput, Toggle } from './ui';
import { rich, t } from '../i18n';

const configOf = (field: FormField) => field.config || {};

/** Edits one `config` property (removing it when it is empty / the default). */
function useConfig(field: FormField) {
  return (patch: { [key: string]: any }, key?: string) => {
    const next = { ...configOf(field), ...patch };
    Object.keys(next).forEach(k => (next[k] === undefined || next[k] === '') && delete next[k]);
    updateField(field.id, { config: next }, key || `config:${field.id}`);
  };
}

/* ------------------------------------------------------------------ step */

/** A page break starts a new step: this is where the step gets its title, description, picture and buttons. */
export function StepPanel({ field }: { field: FormField }) {
  const steps = stepList(doc.value);
  const index = steps.findIndex(s => s.id === field.id);
  const config = configOf(field);
  const set = useConfig(field);
  const settings = doc.value.settings || {};
  const builtIn = createTranslator(defaultLanguage.value, doc.value.i18n as any);
  return (
    <div class="stack">
      <div class="ui-hint">{t('blocks.stepIntro', { n: index + 1 })}</div>
      <Field label={t('blocks.stepTitle')} hint={t('blocks.stepTitleHint')}>
        <DataText value={field.label} exceptId={field.id} placeholder={t('blocks.stepN', { n: index + 1 })} onInput={v => updateField(field.id, { label: v || undefined })} />
      </Field>
      <Field label={t('blocks.stepDescription')} hint={t('blocks.stepDescriptionHint')}>
        <DataText value={field.helpText} exceptId={field.id} placeholder={t('common.optional')} onInput={v => updateField(field.id, { helpText: v || undefined })} />
      </Field>
      <Field label={t('blocks.stepImage')} hint={t('blocks.stepImageHint')}>
        <ImagePicker value={config.image} placeholder="https://…/picture.jpg" onChange={v => set({ image: v || undefined, alt: v ? config.alt : undefined })} />
      </Field>
      {config.image && (
        <Field label={t('fieldInspector.altText')} hint={t('fieldInspector.altTextHint')}>
          <TextInput value={config.alt} placeholder={t('common.optional')} onInput={v => set({ alt: v || undefined })} />
        </Field>
      )}
      <Field label={t('blocks.stepNext')} hint={t('blocks.stepNextHint')}>
        <TextInput value={config.nextLabel} placeholder={settings.nextButtonText || builtIn('ui.continue')} onInput={v => set({ nextLabel: v || undefined })} />
      </Field>
      <Toggle label={t('blocks.stepHideBack')} description={t('blocks.stepHideBackHint')} checked={!!config.hideBack} onChange={v => set({ hideBack: v || undefined })} />
    </div>
  );
}

/* --------------------------------------------------------------- section */

export function SectionSettings({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  return (
    <div class="stack">
      <Field label={t('blocks.title')}>
        <TextInput value={field.label} placeholder={t('blocks.sectionTitlePlaceholder')} onInput={v => updateField(field.id, { label: v })} />
      </Field>
      <Field label={t('blocks.description')}>
        <TextInput value={field.helpText} placeholder={t('common.optional')} onInput={v => updateField(field.id, { helpText: v || undefined })} />
      </Field>
      <div class="row-gap two">
        <Field label={t('blocks.numberBadge')} hint={t('blocks.numberBadgeHint')}>
          <TextInput value={config.badge} placeholder={t('common.none')} onInput={v => set({ badge: v || undefined })} />
        </Field>
        <Field label={t('blocks.look')}>
          <Segmented
            value={config.style === 'plain' ? 'plain' : 'card'}
            onChange={v => set({ style: v === 'card' ? undefined : v })}
            options={[
              { value: 'card', label: t('blocks.lookCard') },
              { value: 'plain', label: t('blocks.lookPlain') },
            ]}
          />
        </Field>
      </div>
      <Field label={t('blocks.helpIconText')} hint={t('blocks.helpIconTextHint')}>
        <TextInput value={config.tooltip} placeholder={t('common.optional')} onInput={v => set({ tooltip: v || undefined })} />
      </Field>
      <Toggle label={t('blocks.collapsible')} description={t('blocks.collapsibleHint')} checked={!!config.collapsible} onChange={v => set({ collapsible: v || undefined, startCollapsed: v ? config.startCollapsed : undefined })} />
      {config.collapsible && <Toggle label={t('blocks.startCollapsed')} checked={!!config.startCollapsed} onChange={v => set({ startCollapsed: v || undefined })} />}
      <div class="ui-hint">{t('blocks.sectionTip')}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ tabs */

export function TabsSettings({ field }: { field: FormField }) {
  const set = useConfig(field);
  const tabs = field.tabs || [];
  return (
    <div class="stack">
      <Field label={t('blocks.look')}>
        <Segmented
          value={(field.config && field.config.style) === 'pills' ? 'pills' : 'line'}
          onChange={v => set({ style: v === 'line' ? undefined : v })}
          options={[
            { value: 'line', label: t('blocks.tabsUnderlined') },
            { value: 'pills', label: t('blocks.tabsPills') },
          ]}
        />
      </Field>
      <div class="ui-hint">{t('blocks.tabsHint')}</div>
      {tabs.map((tab, i) => (
        <div class="preset-head" key={tab.id}>
          <TextInput value={tab.label} placeholder={t('blocks.tabN', { n: i + 1 })} onInput={v => renameTab(field.id, tab.id, v)} />
          <button class="icon-btn" aria-label={t('blocks.moveLeft')} disabled={i === 0} onClick={() => moveTab(field.id, tab.id, -1)}>
            <Icon name="up" size={14} />
          </button>
          <button class="icon-btn" aria-label={t('blocks.moveRight')} disabled={i === tabs.length - 1} onClick={() => moveTab(field.id, tab.id, 1)}>
            <Icon name="down" size={14} />
          </button>
          <button class="icon-btn danger" aria-label={t('blocks.removeTab')} disabled={tabs.length < 2} onClick={() => removeTab(field.id, tab.id)}>
            <Icon name="trash" size={14} />
          </button>
        </div>
      ))}
      <div>
        <button class="btn ghost small" onClick={() => addTab(field.id)}>
          <Icon name="plus" size={14} /> {t('blocks.addTab')}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- dialog */

export function ModalSettings({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  return (
    <div class="stack">
      <div class="ui-hint">{t('blocks.dialogIntro')}</div>
      <Field label={t('blocks.title')}>
        <TextInput value={field.label} placeholder={t('blocks.dialogTitlePlaceholder')} onInput={v => updateField(field.id, { label: v })} />
      </Field>
      <div class="row-gap two">
        <Field label={t('blocks.confirmButton')}>
          <TextInput value={config.confirmLabel} placeholder={t('blocks.confirm')} onInput={v => set({ confirmLabel: v || undefined })} />
        </Field>
        <Field label={t('blocks.cancelButton')}>
          <TextInput value={config.cancelLabel} placeholder={t('common.cancel')} onInput={v => set({ cancelLabel: v || undefined })} />
        </Field>
      </div>
    </div>
  );
}

export function ModalActions({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  return (
    <ActionsEditor
      actions={Array.isArray(config.confirmActions) ? config.confirmActions : []}
      onChange={next => set({ confirmActions: next.length ? next : undefined }, `confirm:${field.id}`)}
      intro={t('blocks.dialogActionsIntro')}
    />
  );
}

/* ------------------------------------------------------------ truncate */

/** "Cut long text short" for a text block / message box: after N lines or characters, with a "View more" button or a tooltip. */
export function TruncateSettings({ field }: { field: FormField }) {
  const truncate = configOf(field).truncate as { by?: string; limit?: number; mode?: string } | undefined;
  const set = useConfig(field);
  const by = truncate ? truncate.by || 'lines' : 'off';
  return (
    <div class="stack">
      <Field label={t('fieldInspector.truncate')} hint={t('fieldInspector.truncateHint')}>
        <Segmented
          value={by}
          onChange={v => set({ truncate: v === 'off' ? undefined : { by: v, limit: truncate?.limit || (v === 'lines' ? 5 : 300), mode: truncate?.mode || 'viewMore' } })}
          options={[
            { value: 'off', label: t('fieldInspector.truncateOff') },
            { value: 'lines', label: t('fieldInspector.truncateLines') },
            { value: 'characters', label: t('fieldInspector.truncateChars') },
          ]}
        />
      </Field>
      {truncate && (
        <>
          <Field label={t('fieldInspector.truncateLimit')}>
            <NumberInput value={truncate.limit} min={1} onInput={v => set({ truncate: { ...truncate, limit: v } })} />
          </Field>
          <Segmented
            value={truncate.mode || 'viewMore'}
            onChange={v => set({ truncate: { ...truncate, mode: v } })}
            options={[
              { value: 'viewMore', label: t('fieldInspector.truncateViewMore') },
              { value: 'tooltip', label: t('fieldInspector.truncateTooltip') },
            ]}
          />
        </>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- callout */

export function CalloutSettings({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  return (
    <div class="stack">
      <Field label={t('blocks.calloutType')}>
        <Segmented
          value={config.tone || 'info'}
          onChange={v => set({ tone: v === 'info' ? undefined : v })}
          options={[
            { value: 'info', label: t('blocks.toneInfo') },
            { value: 'success', label: t('blocks.toneSuccess') },
            { value: 'warning', label: t('blocks.toneWarning') },
            { value: 'danger', label: t('blocks.toneError') },
          ]}
        />
      </Field>
      <Field label={t('blocks.title')}>
        <DataText value={field.label} placeholder={t('common.optional')} onInput={v => updateField(field.id, { label: v || undefined })} />
      </Field>
      <Field label={t('blocks.text')} hint={t('blocks.textHint')}>
        <DataText multiline rows={3} value={field.content} onInput={v => updateField(field.id, { content: v || undefined })} />
      </Field>
      <TruncateSettings field={field} />
      <div class="ui-hint">{t('blocks.calloutTip')}</div>
    </div>
  );
}

/* ------------------------------------------------------------- signature */

export function SignatureSettings({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  const dialog = config.mode === 'dialog';
  return (
    <div class="stack">
      <Field label={t('blocks.howSign')}>
        <Segmented
          value={dialog ? 'dialog' : 'inline'}
          onChange={v => set({ mode: v === 'dialog' ? 'dialog' : undefined })}
          options={[
            { value: 'inline', label: t('blocks.signInline') },
            { value: 'dialog', label: t('blocks.signDialog') },
          ]}
        />
      </Field>
      {dialog ? (
        <Field label={t('blocks.buttonText')}>
          <TextInput value={config.signLabel} placeholder={t('blocks.signPlaceholder')} onInput={v => set({ signLabel: v || undefined })} />
        </Field>
      ) : (
        <>
          <Field label={t('blocks.signHint')}>
            <TextInput value={config.hint} placeholder={t('blocks.signHerePlaceholder')} onInput={v => set({ hint: v || undefined })} />
          </Field>
          <Field label={t('blocks.heightPx')}>
            <NumberInput value={config.height} placeholder="160" min={80} max={400} onInput={v => set({ height: v })} />
          </Field>
        </>
      )}
      <div class="ui-hint">{t('blocks.signatureSaved')}</div>
    </div>
  );
}

/* -------------------------------------------------------------- repeater */

type Preset = { label: string; description?: string; values?: { [key: string]: any } };

function PresetEditor({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  const presets: Preset[] = Array.isArray(config.presets) ? config.presets : [];
  const [openJson, setOpenJson] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [bad, setBad] = useState(false);
  const save = (next: Preset[]) => set({ presets: next.length ? next : undefined }, `presets:${field.id}`);
  const edit = (i: number, patch: Partial<Preset>) => save(presets.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= presets.length) return;
    const next = [...presets];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  };
  return (
    <div class="stack">
      <div class="ui-hint">{t('blocks.presetsIntro')}</div>
      {presets.map((p, i) => (
        <div class="preset-card" key={i}>
          <div class="preset-head">
            <TextInput value={p.label} placeholder={t('blocks.choiceName')} onInput={v => edit(i, { label: v })} />
            <button class="icon-btn" aria-label={t('common.moveUp')} disabled={i === 0} onClick={() => move(i, -1)}>
              <Icon name="up" size={14} />
            </button>
            <button class="icon-btn" aria-label={t('common.moveDown')} disabled={i === presets.length - 1} onClick={() => move(i, 1)}>
              <Icon name="down" size={14} />
            </button>
            <button class="icon-btn danger" aria-label={t('blocks.removeChoice')} onClick={() => save(presets.filter((_, idx) => idx !== i))}>
              <Icon name="trash" size={14} />
            </button>
          </div>
          <TextInput value={p.description} placeholder={t('blocks.shortDescription')} onInput={v => edit(i, { description: v || undefined })} />
          <button
            class="link-btn"
            onClick={() => {
              setOpenJson(openJson === i ? null : i);
              setDraft(JSON.stringify(p.values || {}, null, 2));
              setBad(false);
            }}
          >
            {t(openJson === i ? 'blocks.hidePrefilled' : 'blocks.editPrefilled')}
            {p.values && Object.keys(p.values).length ? ` (${Object.keys(p.values).length})` : ''}
          </button>
          {openJson === i && (
            <>
              <TextArea
                mono
                rows={6}
                value={draft}
                onInput={v => {
                  setDraft(v);
                  try {
                    const parsed = JSON.parse(v || '{}');
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                      setBad(false);
                      edit(i, { values: Object.keys(parsed).length ? parsed : undefined });
                    } else setBad(true);
                  } catch (e) {
                    setBad(true);
                  }
                }}
              />
              <div class={`ui-hint ${bad ? 'bad' : ''}`}>{bad ? t('blocks.invalidJson') : t('blocks.presetJsonHint')}</div>
            </>
          )}
        </div>
      ))}
      <div>
        <button class="btn ghost small" onClick={() => save([...presets, { label: t('blocks.choiceN', { n: presets.length + 1 }) }])}>
          <Icon name="plus" size={14} /> {t('blocks.addChoice')}
        </button>
      </div>
    </div>
  );
}

export function RepeaterSettings({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  const layout = config.layout === 'table' ? 'table' : config.layout === 'grid' ? 'grid' : 'cards';
  const table = layout === 'table';
  // yes/no answers directly inside the group
  const flags = (field.fields || []).flatMap(f => flattenFields([f], true)).filter(f => f.type === 'toggle' || (f.type === 'input' && f.inputType === 'checkbox'));
  return (
    <div class="stack">
      <Field label={t('blocks.title')}>
        <TextInput value={field.label} placeholder={t('blocks.repeaterTitlePlaceholder')} onInput={v => updateField(field.id, { label: v || undefined })} />
      </Field>
      <Field label={t('blocks.helpText')}>
        <TextInput value={field.helpText} placeholder={t('common.optional')} onInput={v => updateField(field.id, { helpText: v || undefined })} />
      </Field>
      <Field label={t('blocks.shownAs')}>
        <Segmented
          value={layout}
          onChange={v => set({ layout: v === 'cards' ? undefined : v })}
          options={[
            { value: 'cards', label: t('blocks.layoutCards') },
            { value: 'grid', label: t('blocks.layoutGrid') },
            { value: 'table', label: t('blocks.layoutTable') },
          ]}
        />
      </Field>
      <div class="ui-hint">
        {table
          ? t('blocks.layoutTableHint')
          : layout === 'grid'
            ? t('blocks.layoutGridHint')
            : t('blocks.layoutCardsHint')}
      </div>
      {layout === 'grid' && (
        <Field label={t('blocks.cardsPerRow')}>
          <Segmented value={config.columns || 2} onChange={v => set({ columns: v === 2 ? undefined : v })} options={[1, 2, 3, 4].map(n => ({ value: n, label: String(n) }))} />
        </Field>
      )}
      {!table && (
        <Field label={t('blocks.itemTitle')} hint={t('blocks.itemTitleHint')}>
          <TextInput value={config.itemLabel} placeholder={t('blocks.itemTitlePlaceholder')} onInput={v => set({ itemLabel: v || undefined })} />
        </Field>
      )}
      {!table && (
        <Field label={t('blocks.itemSummary')} hint={t('blocks.itemSummaryHint')}>
          <TextInput value={config.itemMeta} placeholder={t('common.optional')} onInput={v => set({ itemMeta: v || undefined })} />
        </Field>
      )}
      {!table && flags.length > 0 && (
        <Field label={t('blocks.doneField')} hint={t('blocks.doneFieldHint')}>
          <Select value={config.doneField || ''} placeholder={t('common.none')} onChange={v => set({ doneField: v || undefined })} options={flags.map(f => ({ value: f.model, label: f.label || f.checkboxLabel || f.model || '' }))} />
        </Field>
      )}
      <Field label={t('blocks.addButtonText')}>
        <TextInput value={config.addLabel} placeholder={t('common.add')} onInput={v => set({ addLabel: v || undefined })} />
      </Field>
      <Field label={t('blocks.addButtonLook')}>
        <Segmented
          value={config.addStyle === 'dashed' ? 'dashed' : 'button'}
          onChange={v => set({ addStyle: v === 'button' ? undefined : v })}
          options={[
            { value: 'button', label: t('blocks.addTextLink') },
            { value: 'dashed', label: t('blocks.addDashed') },
          ]}
        />
      </Field>
      <Field label={t('blocks.emptyMessage')}>
        <TextInput value={config.emptyText} placeholder={t('common.optional')} onInput={v => set({ emptyText: v || undefined })} />
      </Field>
    </div>
  );
}

const MENU_ITEMS = [
  { key: 'edit', label: () => t('common.edit') },
  { key: 'duplicate', label: () => t('common.duplicate') },
  { key: 'up', label: () => t('common.moveUp') },
  { key: 'down', label: () => t('common.moveDown') },
  { key: 'remove', label: () => t('common.remove') },
];

/** How items are added and opened: in the list, in a dialog or as a page; plus the ⋮ menu and drag to reorder. */
export function RepeaterBehavior({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  const table = config.layout === 'table';
  const grid = config.layout === 'grid';
  const open = config.itemOpen || (grid ? 'modal' : 'inline');
  const menu: string[] | null = Array.isArray(config.itemMenu) ? config.itemMenu : null;
  const compact = grid || open !== 'inline';
  return (
    <div class="stack">
      {!table && (
        <Field label={t('blocks.openingItem')} hint={open === 'page' ? t('blocks.openPageHint') : open === 'modal' ? t('blocks.openModalHint') : t('blocks.openInlineHint')}>
          <Segmented
            value={open}
            onChange={v => set({ itemOpen: v === (grid ? 'modal' : 'inline') ? undefined : v })}
            options={[
              { value: 'inline', label: t('blocks.openInline') },
              { value: 'modal', label: t('blocks.openModal') },
              { value: 'page', label: t('blocks.openPage') },
            ]}
          />
        </Field>
      )}
      <Field label={t('blocks.addingItem')} hint={config.addMode === 'modal' ? t('blocks.addModalHint') : t('blocks.addInlineHint')}>
        <Segmented
          value={config.addMode === 'modal' ? 'modal' : 'inline'}
          onChange={v => set({ addMode: v === 'modal' ? 'modal' : undefined })}
          options={[
            { value: 'inline', label: t('blocks.addInline') },
            { value: 'modal', label: t('blocks.addModal') },
          ]}
        />
      </Field>
      {config.addMode === 'modal' && (
        <Field label={t('blocks.dialogAsks')} hint={config.dialogContent === 'marked' ? t('blocks.dialogAsksMarkedHint') : t('blocks.dialogAsksAllHint')}>
          <Segmented
            value={config.dialogContent === 'marked' ? 'marked' : 'all'}
            onChange={v => set({ dialogContent: v === 'marked' ? 'marked' : undefined })}
            options={[
              { value: 'all', label: t('blocks.dialogAsksAll') },
              { value: 'marked', label: t('blocks.dialogAsksMarked') },
            ]}
          />
        </Field>
      )}
      {config.addMode === 'modal' && Array.isArray(config.presets) && config.presets.length > 0 && (
        <>
          <Field label={t('blocks.typePickerLabel')} hint={t('blocks.typePickerLabelHint')}>
            <TextInput value={config.presetLabel} placeholder={t('blocks.typePlaceholder')} onInput={v => set({ presetLabel: v || undefined })} />
          </Field>
          <Toggle label={t('blocks.offerOther')} description={t('blocks.offerOtherHint')} checked={config.presetCustom !== false} onChange={v => set({ presetCustom: v ? undefined : false })} />
          {config.presetCustom !== false && (
            <Field label={t('blocks.otherEntryText')}>
              <TextInput value={config.presetCustomLabel} placeholder={t('blocks.otherPlaceholder')} onInput={v => set({ presetCustomLabel: v || undefined })} />
            </Field>
          )}
        </>
      )}
      <Field label={t('blocks.uniqueNames')} hint={t('blocks.uniqueNamesHint')}>
        <Select value={config.uniqueKey || ''} placeholder={t('common.off')} onChange={v => set({ uniqueKey: v || undefined, presetNameKey: v || undefined })} options={(field.fields || []).flatMap(f => flattenFields([f], true)).filter(f => f.type === 'input' && (f.inputType || 'text') === 'text' && f.model).map(f => ({ value: f.model, label: f.label || f.model || '' }))} />
      </Field>
      {(config.addMode === 'modal' || open === 'modal') && (
        <>
          <Field label={t('blocks.addTitle')}>
            <TextInput value={config.addTitle} placeholder={config.addLabel || t('common.add')} onInput={v => set({ addTitle: v || undefined })} />
          </Field>
          <div class="row-gap two">
            <Field label={t('blocks.confirmButton')}>
              <TextInput value={config.confirmLabel} placeholder={t('blocks.addSavePlaceholder')} onInput={v => set({ confirmLabel: v || undefined })} />
            </Field>
            <Field label={t('blocks.cancelButton')}>
              <TextInput value={config.cancelLabel} placeholder={t('common.cancel')} onInput={v => set({ cancelLabel: v || undefined })} />
            </Field>
          </div>
          <Field label={t('blocks.editTitle')} hint={t('blocks.editTitleHint')}>
            <TextInput value={config.editTitle} placeholder={t('common.optional')} onInput={v => set({ editTitle: v || undefined })} />
          </Field>
        </>
      )}
      {open === 'page' && (
        <Field label={t('blocks.backLinkText')}>
          <TextInput value={config.backLabel} placeholder={t('common.back')} onInput={v => set({ backLabel: v || undefined })} />
        </Field>
      )}
      <Field label={t('blocks.itemMenu')} hint={menu ? undefined : compact ? t('blocks.itemMenuDefaultHint') : t('blocks.itemMenuOffHint')}>
        <div class="default-checks">
          {MENU_ITEMS.map(m => (
            <label class="default-check" key={m.key}>
              <input
                type="checkbox"
                checked={menu ? menu.includes(m.key) : compact}
                onChange={e => {
                  const base = menu || (compact ? MENU_ITEMS.map(x => x.key) : []);
                  const on = (e.target as HTMLInputElement).checked;
                  const next = MENU_ITEMS.map(x => x.key).filter(k => (k === m.key ? on : base.includes(k)));
                  set({ itemMenu: next }, `menu:${field.id}`);
                }}
              />
              <span>{m.label()}</span>
            </label>
          ))}
        </div>
      </Field>
      {compact && <Toggle label={t('common.dragToReorder')} description={t('blocks.dragToReorderHint')} checked={config.sortable !== false} onChange={v => set({ sortable: v ? undefined : false })} />}
    </div>
  );
}

export function RepeaterLimits({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  const table = config.layout === 'table';
  const inline = !config.itemOpen || config.itemOpen === 'inline';
  return (
    <div class="stack">
      <div class="row-gap two">
        <Field label={t('blocks.atLeast')}>
          <NumberInput value={config.minItems} placeholder="0" min={0} onInput={v => set({ minItems: v || undefined })} />
        </Field>
        <Field label={t('blocks.atMost')}>
          <NumberInput value={config.maxItems} placeholder={t('blocks.noLimit')} min={1} onInput={v => set({ maxItems: v })} />
        </Field>
      </div>
      <div class="ui-hint">{t('blocks.limitsHint')}</div>
      <Toggle label={t('blocks.allowAdd')} checked={config.allowAdd !== false} onChange={v => set({ allowAdd: v ? undefined : false })} />
      <Toggle label={t('blocks.allowRemove')} checked={config.allowRemove !== false} onChange={v => set({ allowRemove: v ? undefined : false })} />
      {!table && inline && config.layout !== 'grid' && <Toggle label={t('blocks.itemsCollapsible')} description={t('blocks.itemsCollapsibleHint')} checked={!!config.collapsible} onChange={v => set({ collapsible: v || undefined, startCollapsed: v ? config.startCollapsed : undefined })} />}
      {!table && inline && config.layout !== 'grid' && config.collapsible && <Toggle label={t('blocks.startCollapsed')} checked={!!config.startCollapsed} onChange={v => set({ startCollapsed: v || undefined })} />}
    </div>
  );
}

export function RepeaterPresets({ field }: { field: FormField }) {
  return <PresetEditor field={field} />;
}

/* ---------------------------------------------------------------- button */

const ACTION_TYPES = (): { value: string; label: string }[] => [
  { value: 'next', label: t('blocks.action_next') },
  { value: 'back', label: t('blocks.action_back') },
  { value: 'goto', label: t('blocks.action_goto') },
  { value: 'set', label: t('blocks.action_set') },
  { value: 'setAll', label: t('blocks.action_setAll') },
  { value: 'add', label: t('blocks.action_add') },
  { value: 'openModal', label: t('blocks.action_openModal') },
  { value: 'closeItem', label: t('blocks.action_closeItem') },
  { value: 'submit', label: t('blocks.action_submit') },
  { value: 'link', label: t('blocks.action_link') },
  { value: 'emit', label: t('blocks.action_emit') },
  { value: 'saveDraft', label: t('blocks.action_saveDraft') },
  { value: 'exit', label: t('blocks.action_exit') },
  { value: 'reset', label: t('blocks.action_reset') },
];

type Action = { type: string; [key: string]: any };

function JsonValues({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [text, setText] = useState(value ? JSON.stringify(value) : '');
  const [bad, setBad] = useState(false);
  return (
    <>
      <TextInput
        mono
        value={text}
        placeholder='{"units": ["{unit}"]}'
        onInput={v => {
          setText(v);
          if (!v.trim()) {
            setBad(false);
            return onChange(undefined);
          }
          try {
            const parsed = JSON.parse(v);
            setBad(false);
            onChange(parsed);
          } catch (e) {
            setBad(true);
          }
        }}
      />
      <div class={`ui-hint ${bad ? 'bad' : ''}`}>{bad ? t('blocks.invalidJson') : t('blocks.jsonValuesHint')}</div>
    </>
  );
}

function ActionRow({ action, index, count, onChange, onRemove, onMove }: { action: Action; index: number; count: number; onChange: (a: Action) => void; onRemove: () => void; onMove: (d: number) => void }) {
  const steps = stepList(doc.value);
  const all = allFields(doc.value.fields);
  const fields = all.filter(f => !isLayoutType(f.type) && f.model && f.type !== 'repeater');
  const repeaters = all.filter(f => f.type === 'repeater');
  const modals = all.filter(f => f.type === 'modal');
  const target = fields.find(f => f.model === action.field);
  const choices = target && target.options && target.options.length ? target.options : null;
  // groups, and the groups inside them (“rooms › units” reaches the units of every room)
  const groupChoices = repeaters.flatMap(r => [
    { value: r.model as string, label: r.label || r.model || '', owner: r },
    ...flattenFields(r.fields || [], true).filter(f => f.type === 'repeater').map(n => ({ value: `${r.model}.${n.model}`, label: t('blocks.nestedGroupAll', { group: r.label || r.model, nested: n.label || n.model }), owner: n })),
  ]);
  const group = (groupChoices.find(g => g.value === action.field) || { owner: undefined as FormField | undefined }).owner;
  const groupKeys = group ? flattenFields(group.fields || [], true).filter(f => !isLayoutType(f.type) && f.model && f.type !== 'repeater') : [];
  const keyField = groupKeys.find(f => f.model === action.key);
  const keyChoices = keyField && keyField.options && keyField.options.length ? keyField.options : null;
  const patch = (p: Partial<Action>) => onChange({ ...action, ...p });
  return (
    <div class="action-row">
      <span class="action-num">{index + 1}</span>
      <div class="action-body">
        <Select
          value={action.type}
          onChange={v =>
            onChange({
              type: v,
              ...(v === 'goto' ? { step: steps[0] ? steps[0].id : 'start' } : {}),
              ...(v === 'set' ? { field: fields[0] ? fields[0].model : '', value: '' } : {}),
              ...(v === 'add' || v === 'setAll' ? { field: repeaters[0] ? repeaters[0].model : '' } : {}),
              ...(v === 'openModal' ? { modal: modals[0] ? modals[0].id : '' } : {}),
            })
          }
          options={ACTION_TYPES()}
        />
        {action.type === 'next' && <div class="ui-hint">{t('blocks.nextHint')}</div>}
        {action.type === 'goto' && (
          <>
            <Select value={action.step} onChange={v => patch({ step: v })} options={steps.map(s => ({ value: s.id, label: `${s.index}. ${s.title}` }))} />
            <Toggle label={t('blocks.checkStepFirst')} checked={!!action.validate} onChange={v => patch({ validate: v || undefined })} />
          </>
        )}
        {action.type === 'set' && (
          <>
            <Select value={action.field} placeholder={t('blocks.chooseField')} onChange={v => patch({ field: v, value: '' })} options={fields.map(f => ({ value: f.model, label: f.label || f.checkboxLabel || f.model || '' }))} />
            {choices ? (
              <Select value={String(action.value ?? '')} placeholder={t('blocks.chooseValue')} onChange={v => patch({ value: v })} options={choices.map((o: { value: any; label: string }) => ({ value: String(o.value), label: o.label }))} />
            ) : target && (target.type === 'toggle' || (target.type === 'input' && target.inputType === 'checkbox')) ? (
              <Select value={String(action.value ?? '')} placeholder={t('blocks.chooseValue')} onChange={v => patch({ value: v === 'true' })} options={[{ value: 'true', label: t('blocks.onTicked') }, { value: 'false', label: t('common.off') }]} />
            ) : (
              <TextInput value={action.value} placeholder={t('blocks.valueOrDraft')} onInput={v => patch({ value: v })} />
            )}
          </>
        )}
        {action.type === 'setAll' && (
          <>
            <Select value={action.field} placeholder={t('blocks.chooseGroup')} onChange={v => patch({ field: v, key: '' })} options={groupChoices.map(g => ({ value: g.value, label: g.label }))} />
            <Select value={action.key} placeholder={t('blocks.whichAnswer')} onChange={v => patch({ key: v, value: '' })} options={groupKeys.map(f => ({ value: f.model, label: f.label || f.model || '' }))} />
            <TextInput value={action.value} placeholder={t('blocks.newValueOrDraft')} onInput={v => patch({ value: v })} />
            {keyChoices && <div class="ui-hint">{t('blocks.setAllValuesHint', { values: keyChoices.map((o: { value: any }) => String(o.value)).join(', ') })}</div>}
          </>
        )}
        {action.type === 'add' && (
          <>
            <Select value={action.field} placeholder={t('blocks.chooseGroup')} onChange={v => patch({ field: v })} options={repeaters.map(f => ({ value: f.model, label: f.label || f.model || '' }))} />
            <JsonValues value={action.values} onChange={v => patch({ values: v })} />
          </>
        )}
        {action.type === 'openModal' && (
          <>
            <Select value={action.modal} placeholder={modals.length ? t('blocks.chooseDialog') : t('blocks.addDialogFirst')} onChange={v => patch({ modal: v })} options={modals.map(f => ({ value: f.id, label: f.label || t('blocks.dialog') }))} />
            <JsonValues value={action.values} onChange={v => patch({ values: v })} />
          </>
        )}
        {action.type === 'link' && (
          <>
            <TextInput value={action.url} placeholder="https://…" onInput={v => patch({ url: v })} />
            <Toggle label={t('blocks.newTab')} checked={!!action.newTab} onChange={v => patch({ newTab: v || undefined })} />
          </>
        )}
        {action.type === 'emit' && (
          <>
            <TextInput mono value={action.name} placeholder="my-event" onInput={v => patch({ name: v.replace(/\s+/g, '-') })} />
            <div class="ui-hint">{rich('blocks.emitHint', { code: <code>addEventListener('formAction', e =&gt; e.detail.name)</code> })}</div>
          </>
        )}
        {action.type === 'submit' && <div class="ui-hint">{t('blocks.submitHint')}</div>}
      </div>
      <div class="action-tools">
        <button class="icon-btn" aria-label={t('common.moveUp')} disabled={index === 0} onClick={() => onMove(-1)}>
          <Icon name="up" size={13} />
        </button>
        <button class="icon-btn" aria-label={t('common.moveDown')} disabled={index === count - 1} onClick={() => onMove(1)}>
          <Icon name="down" size={13} />
        </button>
        <button class="icon-btn danger" aria-label={t('blocks.removeAction')} onClick={onRemove}>
          <Icon name="x" size={13} />
        </button>
      </div>
    </div>
  );
}

/** A list of actions: used by buttons and by the confirm step of a dialog. */
export function ActionsEditor({ actions, onChange, intro }: { actions: Action[]; onChange: (next: Action[]) => void; intro: string }) {
  return (
    <div class="stack">
      <div class="ui-hint">{intro}</div>
      {!actions.length && <div class="ui-hint warn">{t('blocks.noActions')}</div>}
      {actions.map((a, i) => (
        <ActionRow
          key={i}
          action={a}
          index={i}
          count={actions.length}
          onChange={next => onChange(actions.map((x, idx) => (idx === i ? next : x)))}
          onRemove={() => onChange(actions.filter((_, idx) => idx !== i))}
          onMove={d => {
            const j = i + d;
            const next = [...actions];
            [next[i], next[j]] = [next[j], next[i]];
            onChange(next);
          }}
        />
      ))}
      <Select value="" placeholder={t('blocks.addAction')} options={ACTION_TYPES()} onChange={v => v && onChange([...actions, { type: v, ...(v === 'goto' ? { step: 'start' } : {}) }])} />
    </div>
  );
}

export function ButtonSettings({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  return (
    <div class="stack">
      <Field label={t('blocks.buttonText')} hint={t('blocks.buttonTextHint')}>
        <TextInput value={field.label} placeholder={t('blocks.buttonPlaceholder')} onInput={v => updateField(field.id, { label: v })} />
      </Field>
      <Field label={t('blocks.style')}>
        <Segmented
          value={config.variant || 'primary'}
          onChange={v => set({ variant: v === 'primary' ? undefined : v })}
          options={[
            { value: 'primary', label: t('blocks.variant_primary') },
            { value: 'outline', label: t('blocks.variant_outline') },
            { value: 'secondary', label: t('blocks.variant_secondary') },
            { value: 'ghost', label: t('blocks.variant_ghost') },
            { value: 'danger', label: t('blocks.variant_danger') },
          ]}
        />
      </Field>
      <div class="row-gap two">
        <Field label={t('blocks.size')}>
          <Segmented
            value={config.size || 'normal'}
            onChange={v => set({ size: v === 'normal' ? undefined : v })}
            options={[
              { value: 'normal', label: t('blocks.sizeNormal') },
              { value: 'large', label: t('blocks.sizeLarge') },
            ]}
          />
        </Field>
        <Field label={t('blocks.position')}>
          <Select
            value={config.align || 'start'}
            onChange={v => set({ align: v === 'start' ? undefined : v })}
            options={[
              { value: 'start', label: t('blocks.alignLeft') },
              { value: 'center', label: t('blocks.alignCenter') },
              { value: 'end', label: t('blocks.alignRight') },
              { value: 'stretch', label: t('blocks.alignStretch') },
            ]}
          />
        </Field>
      </div>
      <Field label={t('blocks.icon')}>
        <Select
          value={config.icon || ''}
          placeholder={t('common.none')}
          onChange={v => set({ icon: v || undefined })}
          options={[
            { value: 'arrow-right', label: t('blocks.iconArrowRight') },
            { value: 'arrow-left', label: t('blocks.iconArrowLeft') },
            { value: 'plus', label: t('blocks.iconPlus') },
            { value: 'check', label: t('blocks.iconCheck') },
            { value: 'download', label: t('common.download') },
          ]}
        />
      </Field>
      <Field label={t('blocks.helpText')}>
        <TextInput value={field.helpText} placeholder={t('common.optional')} onInput={v => updateField(field.id, { helpText: v || undefined })} />
      </Field>
    </div>
  );
}

export function ButtonActions({ field }: { field: FormField }) {
  const config = configOf(field);
  const set = useConfig(field);
  return (
    <ActionsEditor
      actions={Array.isArray(config.actions) ? config.actions : []}
      onChange={next => set({ actions: next.length ? next : undefined }, `actions:${field.id}`)}
      intro={t('blocks.buttonActionsIntro')}
    />
  );
}
