import { useState } from 'preact/hooks';
import { ADDRESS_PROVIDERS, COUNTRIES, FormField, addressSource, flattenFields, runSearch, rulesFor, RuleParam, RuleSpec, effectiveValidationType, isContainer, isLayoutType, logicRules, rowLayout } from '../generator';
import { Icon } from '../icons';
import { LIKERT_SCALES, canRequire, fieldTypeDescription, fieldTypeLabel, hasOptions, hasPlaceholder, likertEmoji, likertGradient, likertPoints, typeDefFor } from '../catalog';
import { ROW_PRESETS, notify, allFields, ancestorsOf, doc, duplicateField, locate, logicSources, moveOutOfRow, requestRemoveField, selectedId, setRowConfig, setRowSpans, unwrapRow, updateField, wrapInRow } from '../store';
import { SEARCH_EXAMPLES } from '../addressSources';
import { ProxyHelp } from './SecurityHelp';
import { ButtonActions, ButtonSettings, CalloutSettings, ModalActions, ModalSettings, RepeaterBehavior, RepeaterLimits, RepeaterPresets, RepeaterSettings, SectionSettings, SignatureSettings, StepPanel, TabsSettings } from './BlockInspectors';
import { MAX_VIDEO_UPLOAD, canUpload, prefillSources, uploadMedia } from '../host';
import { Logic } from './LogicEditor';
import { isKeyLocked } from '../templateLease';
import { ColorInput, Field, NumberInput, Section, Segmented, Select, TextArea, TextInput, Toggle } from './ui';
import { safeEmbedUrl, toModelKey, videoSource } from '../generator';
import { ImagePicker } from './DesignPanel';
import { InlineTranslations } from './TranslatePane';
import { IconButtonPicker, IconPicker } from './IconPicker';
import { DataText } from './DataText';
import { advancedView, setView, viewLocked } from '../view';
import { MessageKey, inContentLanguage, locale, rich, t, tOr } from '../i18n';
import { providerDescription, providerKeyHelp, providerLabel, ruleHint, ruleLabel } from '../i18n/labels';

type Rule = { name: string; params?: any[] };

const optionName = (n: number) => t('fieldInspector.optionN', { n });
/** A new option's text: form content, so in the form's language. */
const newOptionName = (n: number) => inContentLanguage(() => optionName(n));

const yesNo = () => [
  { label: newOptionName(1), value: newOptionName(1) },
  { label: newOptionName(2), value: newOptionName(2) },
];

/** A country's name in the interface language (the list itself is in English). */
const countryName = (code: string, fallback: string) => {
  try {
    return new Intl.DisplayNames([locale.value], { type: 'region' }).of(code.toUpperCase()) || fallback;
  } catch (e) {
    return fallback;
  }
};


const getRule = (field: FormField, name: string): Rule | undefined => (field.validations || []).find(r => r.name === name);

function setRule(field: FormField, name: string, params: any[] | null): Rule[] {
  const others = (field.validations || []).filter(r => r.name !== name);
  if (params === null) return others;
  // keep a stable order: required first
  const next = [...others, { name, params }];
  return next.sort((a, b) => (a.name === 'required' ? -1 : b.name === 'required' ? 1 : 0));
}

const trimParams = (params: any[]) => {
  const copy = [...params];
  while (copy.length && (copy[copy.length - 1] === undefined || copy[copy.length - 1] === '')) copy.pop();
  return copy;
};

/* ------------------------------------------------------------------ sections */

function Question({ field }: { field: FormField }) {
  const set = (patch: Partial<FormField>, key?: string) => updateField(field.id, patch, key);
  const isHeading = field.type === 'heading';
  const isParagraph = field.type === 'paragraph';
  const isSingleCheck = field.type === 'input' && field.inputType === 'checkbox';
  if (field.type === 'divider') {
    return <div class="ui-hint pad">{t('fieldInspector.dividerHint')}</div>;
  }
  if (field.type === 'pageBreak') {
    return (
      <div class="stack">
        <div class="ui-hint">{t('fieldInspector.pageBreakHint')}</div>
        <Field label={t('fieldInspector.stepTitle')} hint={t('fieldInspector.stepTitleHint')}>
          <TextInput value={field.label} placeholder={t('common.optional')} onInput={v => set({ label: v || undefined })} />
        </Field>
      </div>
    );
  }
  return (
    <div class="stack">
      {isParagraph ? (
        <Field label={t('fieldInspector.text')}>
          <DataText multiline rows={4} exceptId={field.id} value={field.content} onInput={v => set({ content: v })} />
        </Field>
      ) : (
        <>
          {isSingleCheck ? (
            <Field label={t('fieldInspector.checkboxText')} hint={t('fieldInspector.checkboxTextHint')}>
              <DataText exceptId={field.id} value={field.checkboxLabel} onInput={v => set({ checkboxLabel: v })} />
            </Field>
          ) : (
            <Field label={isHeading ? t('fieldInspector.title') : t('fieldInspector.question')}>
              <DataText exceptId={field.id} value={field.label} onInput={v => set({ label: v })} />
            </Field>
          )}
          <Field label={isHeading ? t('fieldInspector.subtitle') : t('fieldInspector.helpText')} hint={isHeading ? undefined : t('fieldInspector.helpTextHint')}>
            <DataText exceptId={field.id} value={field.helpText} placeholder={t('common.optional')} onInput={v => set({ helpText: v || undefined })} />
          </Field>
          {/* `tooltip`: more help behind a "?" next to the question (advanced) */}
          {(advancedView.value || field.tooltip) && !isLayoutType(field.type) && !['hidden', 'repeater'].includes(field.type) && !isSingleCheck && (
            <Field label={t('fieldInspector.tooltip')} hint={t('fieldInspector.tooltipHint')}>
              <TextArea rows={2} value={field.tooltip} placeholder={t('common.optional')} onInput={v => set({ tooltip: v || undefined }, `tooltip:${field.id}`)} />
            </Field>
          )}
        </>
      )}
      {hasPlaceholder(field) && (
        <Field label={t('fieldInspector.placeholder')}>
          <TextInput value={field.placeholder} placeholder={t('common.optional')} onInput={v => set({ placeholder: v || undefined })} />
        </Field>
      )}
    </div>
  );
}

/** How many extras (badge, description, logo, link, help) an option has. */
const optionExtras = (o: any) => ['badge', 'description', 'image', 'help'].filter(k => o[k]).length + (o.link && (o.link.url || o.link.label) ? 1 : 0);

/** `option` with `patch` applied; emptied properties are removed. */
function withPatch<T extends { [k: string]: any }>(option: T, patch: { [k: string]: any }): T {
  const next: { [k: string]: any } = { ...option, ...patch };
  Object.keys(patch).forEach(k => next[k] === undefined && delete next[k]);
  return next as T;
}

/** The extras of one radio / checkbox option: badge, second line, logo, "Read more" link and help behind a "?". */
function OptionExtras({ option, cards, onChange }: { option: any; cards: boolean; onChange: (patch: { [k: string]: any }) => void }) {
  const link = option.link || {};
  const setLink = (patch: { label?: string; url?: string }) => {
    const next = { ...link, ...patch };
    onChange({ link: next.label || next.url ? { label: next.label || '', url: next.url || '' } : undefined });
  };
  const badUrl = !!link.url && !/^https?:\/\/\S+$/i.test(String(link.url).trim());
  return (
    <div class="option-extras stack tight">
      <Field label={t('fieldInspector.optionBadge')} hint={t('fieldInspector.optionBadgeHint')}>
        <TextInput value={option.badge} placeholder={t('common.optional')} onInput={v => onChange({ badge: v || undefined })} />
      </Field>
      {!cards && (
        <Field label={t('fieldInspector.optionSecondLine')} hint={t('fieldInspector.optionSecondLineHint')}>
          <TextInput value={option.description} placeholder={t('common.optional')} onInput={v => onChange({ description: v || undefined })} />
        </Field>
      )}
      <Field label={t('fieldInspector.optionLogo')} hint={t('fieldInspector.optionLogoHint')}>
        <ImagePicker value={option.image} placeholder="https://…/logo.png" onChange={v => onChange({ image: v || undefined, imageAlt: v ? option.imageAlt : undefined })} />
      </Field>
      {option.image && (
        <Field label={t('fieldInspector.altText')} hint={t('fieldInspector.altTextHint')}>
          <TextInput value={option.imageAlt} placeholder={t('common.optional')} onInput={v => onChange({ imageAlt: v || undefined })} />
        </Field>
      )}
      <Field label={t('fieldInspector.optionLinkText')}>
        <TextInput value={link.label} placeholder={t('fieldInspector.optionLinkPlaceholder')} onInput={v => setLink({ label: v })} />
      </Field>
      <Field label={t('fieldInspector.optionLinkUrl')} hint={badUrl ? t('fieldInspector.optionLinkInvalid') : t('fieldInspector.optionLinkUrlHint')}>
        <TextInput value={link.url} placeholder="https://" onInput={v => setLink({ url: v.trim() })} />
      </Field>
      <Field label={t('fieldInspector.optionHelp')} hint={t('fieldInspector.optionHelpHint')}>
        <TextArea rows={2} value={option.help} placeholder={t('common.optional')} onInput={v => onChange({ help: v || undefined })} />
      </Field>
    </div>
  );
}

type LogoPosition = 'left' | 'right' | 'top' | 'bottom';

/** A small sketch of one choice for each place the logo can go: the logo in the accent colour, the name and its second line in grey. */
const LOGO_SKETCH: { [p in LogoPosition]: { logo: [number, number]; name: [number, number, number]; desc: [number, number] } } = {
  left: { logo: [4, 5], name: [17, 7, 19], desc: [4, 15] },
  right: { logo: [26, 5], name: [4, 7, 19], desc: [4, 15] },
  top: { logo: [4, 3], name: [4, 12, 22], desc: [4, 18] },
  bottom: { logo: [4, 15], name: [4, 4, 22], desc: [4, 10] },
};

/** Where the options' logos go, picked from four sketches (shown when an option has a logo). */
function LogoPositionPicker({ value, onChange }: { value: LogoPosition; onChange: (v: LogoPosition) => void }) {
  const labels: { [p in LogoPosition]: string } = { left: t('fieldInspector.logoLeft'), right: t('fieldInspector.logoRight'), top: t('fieldInspector.logoTop'), bottom: t('fieldInspector.logoBottom') };
  return (
    <div class="logo-positions" role="radiogroup" aria-label={t('fieldInspector.logoPosition')}>
      {(Object.keys(LOGO_SKETCH) as LogoPosition[]).map(position => {
        const { logo, name, desc } = LOGO_SKETCH[position];
        return (
          <button type="button" key={position} role="radio" aria-checked={value === position} class={value === position ? 'active' : ''} onClick={() => onChange(position)}>
            <svg viewBox="0 0 40 24" width="40" height="24" aria-hidden="true">
              <rect x={logo[0]} y={logo[1]} width="10" height="6" rx="1.5" class="sketch-logo" />
              <rect x={name[0]} y={name[1]} width={name[2]} height="3" rx="1.5" class="sketch-name" />
              <rect x={desc[0]} y={desc[1]} width="26" height="2.5" rx="1.25" class="sketch-desc" />
            </svg>
            <span>{labels[position]}</span>
          </button>
        );
      })}
    </div>
  );
}

function OptionsEditor({ field }: { field: FormField }) {
  const [bulk, setBulk] = useState(false);
  const [showValues, setShowValues] = useState(false);
  const [showGroups, setShowGroups] = useState(() => (field.options || []).some((o: any) => o.group));
  const options: { label: string; value: any; group?: string }[] = field.options || [];
  const multiChoice = field.type === 'checkboxGroup' || field.type === 'multiSelect';
  const cards = (field.type === 'radioGroup' || field.type === 'checkboxGroup') && !!(field.config && field.config.optionStyle === 'cards');
  // radio and checkbox options can say more (badge, logo, link, help): one option's extras are open at a time
  const [moreOf, setMoreOf] = useState<number | null>(null);
  const richChoices = (field.type === 'radioGroup' || field.type === 'checkboxGroup') && advancedView.value;
  const set = (next: { label: string; value: any; group?: string }[]) => {
    const patch: Partial<FormField> = { options: next };
    // keep the pre-selected value(s) pointing at the right options when options are renamed, removed or replaced
    if (field.defaultValue !== undefined && field.defaultValue !== null) {
      const remap = (v: any) => {
        const at = options.findIndex(o => String(o.value) === String(v));
        if (at < 0) return undefined;
        if (next.includes(options[at])) return v; // untouched (or only moved)
        if (next.length === options.length) return next[at].value; // edited in place
        return next.some(o => String(o.value) === String(v)) ? v : undefined; // removed / bulk edit
      };
      const current = field.defaultValue;
      if (Array.isArray(current)) {
        const kept = current.map(remap).filter(v => v !== undefined);
        patch.defaultValue = kept.length ? kept : undefined;
      } else {
        patch.defaultValue = remap(current);
      }
    }
    updateField(field.id, patch, `options:${field.id}`);
  };
  const selectedValues: any[] = Array.isArray(field.defaultValue) ? field.defaultValue : [];
  const toggleDefault = (value: any, on: boolean) => {
    const rest = selectedValues.filter(v => String(v) !== String(value));
    const next = on ? [...rest, value] : rest;
    updateField(field.id, { defaultValue: next.length ? next : undefined });
  };

  const setLabel = (i: number, label: string) => {
    const next = options.map((o, idx) => {
      if (idx !== i) return o;
      // keep value in sync with the label unless the user customised it
      const synced = String(o.value) === String(o.label);
      return { ...o, label, value: synced ? label : o.value };
    });
    set(next);
  };

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= options.length) return;
    const next = [...options];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  // the choices can come from the items of a repeating group (e.g. the units of this room), or of the groups inside it
  // (“rooms › units” takes the units of every room, listed under the room's name)
  const from = field.config && field.config.optionsFrom;
  const repeaters = allFields(doc.value.fields).filter(f => f.type === 'repeater' && !flattenFields(f.fields || [], false, true).some(c => c.id === field.id));
  const groups = repeaters.flatMap(r => [
    { value: r.model as string, label: r.label || r.model || '', owner: r, parent: null as FormField | null },
    ...flattenFields(r.fields || [], true).filter(f => f.type === 'repeater').map(n => ({ value: `${r.model}.${n.model}`, label: t('fieldInspector.nestedGroupAll', { group: r.label || r.model, nested: n.label || n.model }), owner: n, parent: r as FormField | null })),
  ]);
  const group = from && groups.find(g => g.value === from.field);
  const keysOf = (f: FormField | null | undefined) => (f ? flattenFields(f.fields || [], true).filter(c => !isLayoutType(c.type) && c.model && c.type !== 'repeater') : []);
  const groupKeys = keysOf(group && group.owner);
  const parentKeys = keysOf(group && group.parent);
  const setFrom = (next: { field: string; labelKey: string; groupKey?: string } | undefined) => updateField(field.id, { config: { ...(field.config || {}), optionsFrom: next }, options: next ? [] : options.length ? options : yesNo() }, `from:${field.id}`);
  const fromBlock = (groups.length > 0 || from) && (
    <div class="stack">
      <Toggle
        label={t('fieldInspector.fromGroup')}
        description={t('fieldInspector.fromGroupHint')}
        checked={!!from}
        onChange={on => setFrom(on ? { field: groups[0].value, labelKey: (keysOf(groups[0].owner)[0] || { model: 'name' }).model as string } : undefined)}
      />
      {from && (
        <>
          <div class="row-gap two">
            <Field label={t('fieldInspector.group')}>
              <Select value={from.field} onChange={v => setFrom({ field: v, labelKey: from.labelKey })} options={groups.map(g => ({ value: g.value, label: g.label }))} />
            </Field>
            <Field label={t('fieldInspector.useAnswerOf')}>
              <Select value={from.labelKey} onChange={v => setFrom({ ...from, labelKey: v })} options={groupKeys.map(f => ({ value: f.model, label: f.label || f.model || '' }))} />
            </Field>
          </div>
          {parentKeys.length > 0 && (
            <Field label={t('fieldInspector.listUnder')} hint={t('fieldInspector.listUnderHint')}>
              <Select value={from.groupKey || ''} placeholder={t('fieldInspector.listUnderNothing')} onChange={v => setFrom({ ...from, groupKey: v || undefined })} options={parentKeys.map(f => ({ value: f.model, label: f.label || f.model || '' }))} />
            </Field>
          )}
          {field.type === 'checkboxGroup' && <Toggle label={t('fieldInspector.searchBox')} description={t('fieldInspector.searchBoxHint')} checked={!!(field.config && field.config.searchable)} onChange={v => updateField(field.id, { config: { ...(field.config || {}), searchable: v || undefined } })} />}
        </>
      )}
    </div>
  );
  if (from) return fromBlock;

  const adv = advancedView.value;
  return (
    <div class="stack">
      {adv && fromBlock}
      {bulk ? (
        <Field label={t('fieldInspector.onePerLine')}>
          <TextArea
            rows={7}
            value={options.map(o => o.label).join('\n')}
            onInput={v =>
              set(
                v.split('\n').map(line => {
                  // an option that is still there keeps its value and everything else it has (group, description, badge…)
                  const existing = options.find(o => o.label === line);
                  return existing ? { ...existing, label: line } : { label: line, value: line };
                }),
              )
            }
          />
        </Field>
      ) : (
        <div class="option-list">
          {options.map((o, i) => (
            <div class={`option-row ${richChoices && moreOf === i ? 'is-open' : ''}`} key={i}>
              <div class="option-order">
                <button class="icon-btn tiny" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('common.moveUp')}>
                  <Icon name="up" size={12} />
                </button>
                <button class="icon-btn tiny" disabled={i === options.length - 1} onClick={() => move(i, 1)} aria-label={t('common.moveDown')}>
                  <Icon name="down" size={12} />
                </button>
              </div>
              <div class="option-main">
                <input class="ui-input" value={o.label} placeholder={optionName(i + 1)} onInput={e => setLabel(i, (e.target as HTMLInputElement).value)} />
 {field.type === 'pictureChoice' && (
                  <div class="option-image">
                    <ImagePicker compact value={(o as any).image} placeholder={t('fieldInspector.optionImage')} onChange={v => set(options.map((x, idx) => (idx === i ? { ...x, image: v || undefined } : x)))} />
                  </div>
                )}
                {cards && <input class="ui-input option-desc" value={(o as any).description || ''} placeholder={t('fieldInspector.optionDescription')} onInput={e => set(options.map((x, idx) => (idx === i ? { ...x, description: (e.target as HTMLInputElement).value || undefined } : x)))} />}
                {richChoices && (
                  <button class={`link-btn option-more-btn ${optionExtras(o) ? 'has-extras' : ''}`} aria-expanded={moreOf === i} aria-label={t('fieldInspector.optionMoreFor', { name: o.label || optionName(i + 1) })} onClick={() => setMoreOf(moreOf === i ? null : i)}>
                    <Icon name={moreOf === i ? 'chevronDown' : 'chevronRight'} size={12} />
                    {t('fieldInspector.optionMore')}
                    {optionExtras(o) > 0 && <span class="option-more-count">{optionExtras(o)}</span>}
                  </button>
                )}
                {richChoices && moreOf === i && <OptionExtras option={o} cards={cards} onChange={patch => set(options.map((x, idx) => (idx === i ? withPatch(x, patch) : x)))} />}
              </div>
              {showGroups && <input class="ui-input group-input" value={o.group || ''} placeholder={t('fieldInspector.group')} title={t('fieldInspector.optionGroupHint')} onInput={e => set(options.map((x, idx) => (idx === i ? { ...x, group: (e.target as HTMLInputElement).value || undefined } : x)))} />}
              {showValues && <input class="ui-input mono value-input" value={String(o.value)} title={t('fieldInspector.storedValue')} onInput={e => set(options.map((x, idx) => (idx === i ? { ...x, value: (e.target as HTMLInputElement).value } : x)))} />}
              <button class="icon-btn" onClick={() => set(options.filter((_, idx) => idx !== i))} aria-label={t('fieldInspector.removeOption')}>
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <button class="btn ghost small" onClick={() => set([...options, { label: newOptionName(options.length + 1), value: newOptionName(options.length + 1) }])}>
            <Icon name="plus" size={14} /> {t('fieldInspector.addOption')}
          </button>
        </div>
      )}
      <div class="row-gap">
        <button class="link-btn" onClick={() => setBulk(!bulk)}>
          {bulk ? t('fieldInspector.backToList') : t('fieldInspector.bulkEdit')}
        </button>
        {adv && !bulk && (
          <button class="link-btn" onClick={() => setShowValues(!showValues)}>
            {showValues ? t('fieldInspector.hideValues') : t('fieldInspector.editValues')}
          </button>
        )}
        {adv && !bulk && field.type === 'select' && (
          <button class="link-btn" onClick={() => setShowGroups(!showGroups)}>
            {showGroups ? t('fieldInspector.hideGroups') : t('fieldInspector.groupOptions')}
          </button>
        )}
      </div>
      {multiChoice && options.length > 0 && (
        <Field label={t('fieldInspector.preselected')} hint={t('fieldInspector.preselectedHint')}>
          <div class="default-checks">
            {options.map((o, i) => (
              <label class="default-check" key={i}>
                <input type="checkbox" checked={selectedValues.some(v => String(v) === String(o.value))} onChange={e => toggleDefault(o.value, (e.target as HTMLInputElement).checked)} />
                <span>{o.label || optionName(i + 1)}</span>
              </label>
            ))}
          </div>
        </Field>
      )}
      {(field.type === 'select' || field.type === 'radioGroup' || (field.type === 'pictureChoice' && !field.config?.multiple)) && (
        <Field label={t('fieldInspector.preselected')}>
          <Select value={field.defaultValue === undefined ? '' : String(field.defaultValue)} placeholder={t('fieldInspector.nothing')} options={options.map(o => ({ value: o.value, label: o.label }))} onChange={v => updateField(field.id, { defaultValue: v === '' ? undefined : (options.find(o => String(o.value) === v) || { value: v }).value })} />
        </Field>
      )}
    </div>
  );
}

/** Endpoint settings for a field that searches your own JSON API (used by "Custom search" and by an address field with a custom provider). */
function CustomSource({ field }: { field: FormField }) {
  const config = field.config || {};
  const source = config.source || {};
  const setConfig = (patch: { [k: string]: any }) => updateField(field.id, { config: { ...(field.config || {}), ...patch } });
  const setSource = (patch: { [k: string]: any }) => setConfig({ source: { ...source, ...patch } });
  const preset = SEARCH_PRESETS.find(p => p.source.url === source.url);
  return (
    <div class="stack">
      {(
        <Field label={t('fieldInspector.startFromExample')}>
          <Select
            value={preset ? preset.id : 'custom'}
            onChange={v => {
              const chosen = SEARCH_PRESETS.find(p => p.id === v);
              if (chosen) setConfig({ source: { ...chosen.source } });
            }}
            options={[...SEARCH_PRESETS.map(p => ({ value: p.id, label: tOr(`fieldInspector.searchExample.${p.id}`, p.label) })), { value: 'custom', label: t('fieldInspector.ownEndpoint') }]}
          />
        </Field>
      )}
      <Field label={t('fieldInspector.endpointUrl')} hint={t('fieldInspector.endpointUrlHint')}>
        <TextInput mono value={source.url} placeholder="https://api.example.com/search?q={q}" onInput={v => setSource({ url: v })} />
      </Field>
      <div class="grid2">
        <Field label={t('fieldInspector.resultsPath')} hint={t('fieldInspector.resultsPathHint')}>
          <TextInput mono value={source.resultsPath} placeholder="items" onInput={v => setSource({ resultsPath: v || undefined })} />
        </Field>
        <Field label={t('fieldInspector.minChars')}>
          <NumberInput min={1} max={10} value={source.minChars ?? 2} onInput={v => setSource({ minChars: v || 2 })} />
        </Field>
        <Field label={t('fieldInspector.textToShow')}>
          <TextInput mono value={source.labelKey} placeholder="name" onInput={v => setSource({ labelKey: v || undefined })} />
        </Field>
        <Field label={t('fieldInspector.valueToStore')}>
          <TextInput mono value={source.valueKey} placeholder="id" onInput={v => setSource({ valueKey: v || undefined })} />
        </Field>
      </div>
      <Field label={t('fieldInspector.labelTemplate')} hint={t('fieldInspector.labelTemplateHint')}>
        <TextInput mono value={source.labelTemplate} placeholder="{street} {number}, {zip} {city}" onInput={v => setSource({ labelTemplate: v || undefined })} />
      </Field>
      <details class="v1-extra">
        <summary>{t('fieldInspector.advancedRequest')}</summary>
        <div class="stack pad-top">
          <Field label={t('fieldInspector.method')}>
            <Segmented value={source.method || 'GET'} onChange={v => setSource({ method: v === 'GET' ? undefined : v })} options={[{ value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' }]} />
          </Field>
          <JsonField label={t('fieldInspector.headers')} hint={t('fieldInspector.headersHint')} value={source.headers} onChange={v => setSource({ headers: v })} />
          {source.method === 'POST' && <JsonField label={t('fieldInspector.body')} hint={t('fieldInspector.bodyHint')} value={source.body} onChange={v => setSource({ body: v })} />}
        </div>
      </details>
      <MultipleToggle field={field} />
    </div>
  );
}

/** A textarea that keeps the last valid JSON and tells you when what you typed is not valid. */
function JsonField({ label, hint, value, onChange }: { label: string; hint?: string; value: any; onChange: (v: any) => void }) {
  const [text, setText] = useState(value ? JSON.stringify(value, null, 2) : '');
  const [error, setError] = useState(false);
  return (
    <Field label={label} hint={error ? t('fieldInspector.invalidJson') : hint}>
      <TextArea
        mono
        rows={4}
        value={text}
        onInput={v => {
          setText(v);
          if (!v.trim()) {
            setError(false);
            onChange(undefined);
            return;
          }
          try {
            onChange(JSON.parse(v));
            setError(false);
          } catch (e) {
            setError(true);
          }
        }}
      />
    </Field>
  );
}

function MultipleToggle({ field }: { field: FormField }) {
  const config = field.config || {};
  return (
    <Toggle
      label={field.type === 'address' ? t('fieldInspector.allowSeveralAddresses') : t('fieldInspector.allowSeveral')}
      description={t('fieldInspector.allowSeveralHint')}
      checked={!!config.multiple}
      onChange={v => updateField(field.id, { config: { ...config, multiple: v || undefined }, validationType: v ? 'array' : 'string', defaultValue: undefined })}
    />
  );
}

/** A tiny search box to try the field's endpoint (and a key) right in the settings. */
function TestIt({ field }: { field: FormField }) {
  const [text, setText] = useState('');
  const [state, setState] = useState<{ busy?: boolean; error?: string; items?: string[] } | null>(null);
  const run = async () => {
    if (!text.trim()) return;
    setState({ busy: true });
    const config = field.config || {};
    const source = field.type === 'address' ? addressSource(config, 'en') : config.source || {};
    const outcome = await runSearch(source, text.trim());
    setState({ error: outcome.error, items: outcome.items.slice(0, 5).map(i => i.label) });
  };
  return (
    <div class="test-it">
      <div class="image-picker">
        <TextInput value={text} placeholder={t('fieldInspector.tryPlaceholder')} onInput={setText} />
        <button class="btn small" disabled={!text.trim() || !!(state && state.busy)} onClick={run}>
          {state && state.busy ? t('fieldInspector.searching') : t('fieldInspector.test')}
        </button>
      </div>
      {state && state.error && <div class="test-error">{state.error}</div>}
      {state && state.items && !state.error && (state.items.length ? <ul class="test-results">{state.items.map((t, i) => <li key={i}>{t}</li>)}</ul> : <div class="ui-hint">{t('fieldInspector.noResults')}</div>)}
    </div>
  );
}

/** Friendly settings for an address field: where from, which countries, which city, what is saved. */
/** A list of countries as chips with flags, plus a picker to add one. `value` holds country codes ("dk"). */
function CountryChips({ value, onChange, placeholder }: { value: string[]; onChange: (codes: string[]) => void; placeholder?: string }) {
  const codes = (value || []).map(c => String(c).toLowerCase());
  const nameOf = (code: string) => countryName(code, (COUNTRIES.find((c: any) => c.code === code) || { name: code.toUpperCase() }).name);
  const left = COUNTRIES.filter((c: any) => !codes.includes(c.code))
    .map((c: any) => ({ value: c.code, label: countryName(c.code, c.name) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, locale.value));
  return (
    <div class="stack tight">
      {codes.length > 0 && (
        <div class="country-chips">
          {codes.map(code => (
            <span class="country-chip" key={code}>
              <img src={`https://flagcdn.com/20x15/${code}.png`} alt="" width="20" height="15" />
              {nameOf(code)}
              <button class="icon-btn tiny" aria-label={t('fieldInspector.removeNamed', { name: nameOf(code) })} onClick={() => onChange(codes.filter(c => c !== code))}>
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <Select value="" placeholder={placeholder || (codes.length ? t('fieldInspector.addCountry') : t('fieldInspector.chooseCountry'))} options={left} onChange={v => v && onChange([...codes, v])} />
    </div>
  );
}

function AddressSettings({ field }: { field: FormField }) {
  const config = field.config || {};
  const provider = config.provider || 'osm';
  const info = ADDRESS_PROVIDERS.find(p => p.id === provider) || ADDRESS_PROVIDERS[0];
  const countries: string[] = config.countries || [];
  const setConfig = (patch: { [k: string]: any }) => updateField(field.id, { config: { ...config, ...patch } });
  return (
    <div class="stack">
      <Field label={t('fieldInspector.addressSource')} hint={providerDescription(info)}>
        <Select
          value={provider}
          onChange={v => setConfig({ provider: v, ...(v === 'custom' && !config.source ? { source: { url: '', minChars: 3 } } : {}) })}
          options={ADDRESS_PROVIDERS.map(p => ({ value: p.id, label: providerLabel(p) }))}
        />
      </Field>

      {info.needsKey && (
        <Field label={t('fieldInspector.apiKey')} hint={providerKeyHelp(info)}>
          <TextInput mono value={config.apiKey} placeholder={t('fieldInspector.pasteKey')} onInput={v => setConfig({ apiKey: v.trim() || undefined })} />
          {info.keyUrl && (
            <a class="link-btn" href={info.keyUrl} target="_blank" rel="noreferrer">
              {t('fieldInspector.getKey')}
            </a>
          )}
        </Field>
      )}
      {info.needsKey && (
        <div class="callout key-warning">
          {rich('fieldInspector.keyWarning', { restrict: <strong>{t('fieldInspector.keyWarningRestrict')}</strong> })}
          <div class="pad-top">
            <ProxyHelp field={field} />
          </div>
        </div>
      )}

      {provider === 'custom' ? (
        <CustomSource field={field} />
      ) : (
        <>
          {info.countries && (
            <Field label={t('fieldInspector.country')} hint={countries.length ? undefined : t('fieldInspector.countryHint')}>
              <CountryChips value={countries} onChange={codes => setConfig({ countries: codes })} />
            </Field>
          )}
          <Field label={t('fieldInspector.city')} hint={t('fieldInspector.cityHint')}>
            <TextInput value={config.city} placeholder={t('fieldInspector.cityPlaceholder')} onInput={v => setConfig({ city: v || undefined })} />
          </Field>
          <MultipleToggle field={field} />
        </>
      )}

      <Field label={t('fieldInspector.whatSaved')} hint={config.answer === 'id' ? t('fieldInspector.savedIdHint') : config.answer === 'both' ? t('fieldInspector.savedBothHint') : t('fieldInspector.savedTextHint')}>
        <Segmented
          value={config.answer || 'text'}
          onChange={v => setConfig({ answer: v })}
          options={[
            { value: 'text', label: t('fieldInspector.savedText') },
            { value: 'id', label: t('fieldInspector.savedId') },
            { value: 'both', label: t('fieldInspector.savedBoth') },
          ]}
        />
      </Field>

      <Field label={t('fieldInspector.tryIt')}>
        <TestIt field={field} />
      </Field>
    </div>
  );
}

/** Phone: the country it starts with. Which countries are allowed is a validation rule ("Only from these countries"). */
function PhoneSettings({ field }: { field: FormField }) {
  const config = field.config || {};
  const setConfig = (patch: { [k: string]: any }) => updateField(field.id, { config: { ...config, ...patch } });
  const options = COUNTRIES.map((c: any) => ({ value: c.code, label: `${countryName(c.code, c.name)} (${c.dialCode})` })).sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, locale.value));
  return (
    <div class="stack">
      <Field label={t('fieldInspector.phoneDefaultCountry')} hint={advancedView.value ? t('fieldInspector.phoneDefaultCountryHint') : t('fieldInspector.phoneDefaultCountryHintSimple')}>
        <Select value={config.defaultCountry || ''} options={[{ value: '', label: t('fieldInspector.phoneAutomatic') }, ...options]} onChange={v => setConfig({ defaultCountry: v || undefined })} />
      </Field>
      {advancedView.value && (
        <Field label={t('fieldInspector.look')}>
          <Segmented
            value={config.phoneStyle === 'separate' ? 'separate' : 'inline'}
            onChange={v => setConfig({ phoneStyle: v === 'separate' ? 'separate' : undefined })}
            options={[
              { value: 'inline', label: t('fieldInspector.phoneInline') },
              { value: 'separate', label: t('fieldInspector.phoneSeparate') },
            ]}
          />
        </Field>
      )}
      <div class="ui-hint">{t('fieldInspector.phoneSavedAs')}</div>
    </div>
  );
}

/** A plain list of texts (Likert statements and points): reorder, rename, remove, add, or edit as lines. */
function TextList({ items, onChange, addLabel, placeholder, extra }: { items: { label: string; value: any }[]; onChange: (labels: string[], from: { label: string; value: any }[][]) => void; addLabel: string; placeholder: (n: number) => string; extra?: (item: any, i: number) => any }) {
  const [bulk, setBulk] = useState(false);
  const labels = items.map(i => i.label);
  // `from[i]` is the item the i-th label came from (if any), so values survive renaming and reordering
  const write = (next: string[], from: ({ label: string; value: any } | undefined)[]) => onChange(next, from.map(f => (f ? [f] : [])));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const order = items.map((_, k) => k);
    [order[i], order[j]] = [order[j], order[i]];
    write(order.map(k => labels[k]), order.map(k => items[k]));
  };
  return (
    <div class="stack tight">
      {bulk ? (
        <TextArea rows={6} value={labels.join('\n')} onInput={v => {
          const lines = v.split('\n');
          write(lines, lines.map((line, i) => items.find(o => o.label === line) || items[i]));
        }} />
      ) : (
        <div class="option-list">
          {items.map((item, i) => (
            <div class="option-row" key={i}>
              <div class="option-order">
                <button class="icon-btn tiny" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('common.moveUp')}>
                  <Icon name="up" size={12} />
                </button>
                <button class="icon-btn tiny" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t('common.moveDown')}>
                  <Icon name="down" size={12} />
                </button>
              </div>
              <div class="option-main">
                <input class="ui-input" value={item.label} placeholder={placeholder(i + 1)} onInput={e => write(labels.map((l, k) => (k === i ? (e.target as HTMLInputElement).value : l)), items)} />
                {extra && extra(item, i)}
              </div>
              <button class="icon-btn" disabled={items.length <= 1} onClick={() => write(labels.filter((_, k) => k !== i), items.filter((_, k) => k !== i))} aria-label={t('common.remove')}>
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
          <button class="btn ghost small" onClick={() => write([...labels, placeholder(items.length + 1)], [...items, undefined])}>
            <Icon name="plus" size={14} /> {addLabel}
          </button>
        </div>
      )}
      <div class="row-gap">
        <button class="link-btn" onClick={() => setBulk(!bulk)}>
          {bulk ? t('fieldInspector.backToList') : t('fieldInspector.bulkEdit')}
        </button>
      </div>
    </div>
  );
}

/** Likert: one question or a table of statements, the answer scale (agree…disagree, never…always…) and how the points look. */
function LikertSettings({ field }: { field: FormField }) {
  const config = field.config || {};
  const rows: { label: string; value: any }[] = config.rows || [];
  const points: any[] = field.options || [];
  const table = rows.length > 0;
  const style: string = ['buttons', 'emoji', 'images'].includes(config.style) ? config.style : 'dots';
  const colorMode: string = config.colorMode === 'gradient' ? 'gradient' : points.some(p => p.color) ? 'custom' : config.accent ? 'accent' : 'theme';
  const set = (patch: Partial<FormField>) => updateField(field.id, patch, `likert:${field.id}`);
  const setConfig = (patch: Record<string, any>) => {
    const next = { ...config, ...patch };
    Object.keys(next).forEach(k => next[k] === undefined && delete next[k]);
    set({ config: next });
  };
  const setRows = (next: { label: string; value: any }[]) => set({ config: { ...config, rows: next }, validationType: next.length ? 'object' : 'number', defaultValue: undefined });
  // faces and custom colors are written into the points, so each can be edited
  const dressed = (list: any[], st: string, mode: string) =>
    list.map((p, i) => {
      const q = { ...p };
      if (st === 'emoji' && !q.emoji) q.emoji = likertEmoji(i, list.length);
      if (mode === 'custom' && !q.color) q.color = likertGradient(i, list.length);
      return q;
    });
  const setPoints = (list: any[]) => set({ options: dressed(list, style, colorMode), defaultValue: undefined });
  const setPoint = (i: number, patch: Record<string, any>) => {
    const list = points.map((p, k) => {
      if (k !== i) return p;
      const q = { ...p, ...patch };
      Object.keys(q).forEach(key => q[key] === undefined && delete q[key]);
      return q;
    });
    set({ options: list, defaultValue: undefined });
  };
  const setStyle = (v: string) => {
    const next = { ...config, style: v === 'dots' ? undefined : v };
    if (!next.style) delete next.style;
    set({ config: next, options: dressed(points, v, colorMode) });
  };
  const setColorMode = (v: string) => {
    const next = { ...config };
    delete next.colorMode;
    delete next.accent;
    if (v === 'gradient') next.colorMode = 'gradient';
    if (v === 'accent') next.accent = '#4f46e5';
    const plain = points.map(({ color, ...p }) => (v === 'custom' && color ? { ...p, color } : p));
    set({ config: next, options: dressed(plain, style, v) });
  };
  // which ready-made scale the points are (by their labels), or "custom"
  const scaleId = Object.keys(LIKERT_SCALES).find(id => {
    const preset = likertPoints(id);
    return preset.length === points.length && preset.every((p, i) => p.label === points[i].label);
  }) || 'custom';
  return (
    <div class="stack">
      <Field label={t('fieldInspector.likertFormat')}>
        <Segmented
          value={table ? 'table' : 'single'}
          onChange={v => setRows(v === 'table' ? inContentLanguage(() => [1, 2, 3].map(n => ({ label: t('fields.default.statement', { n }), value: `s${n}` }))) : [])}
          options={[
            { value: 'single', label: t('fieldInspector.likertSingle') },
            { value: 'table', label: t('fieldInspector.likertTable') },
          ]}
        />
      </Field>
      {table && (
        <Field label={t('fieldInspector.likertStatements')} hint={t('fieldInspector.likertStatementsHint')}>
          <TextList
            items={rows}
            addLabel={t('fieldInspector.likertAddStatement')}
            placeholder={n => t('fields.default.statement', { n })}
            onChange={(labels, from) => {
              const taken = new Set<string>();
              setRows(
                labels.map((label, i) => {
                  const kept = from[i][0];
                  let value = kept ? String(kept.value) : toModelKey(label, `s${i + 1}`);
                  while (taken.has(value)) value = `${value}_${i + 1}`;
                  taken.add(value);
                  return { label, value };
                }),
              );
            }}
          />
        </Field>
      )}
      <Field label={t('fieldInspector.likertScale')}>
        <Select
          value={scaleId}
          options={[...Object.keys(LIKERT_SCALES).map(id => ({ value: id, label: t(`fieldInspector.likertScales.${id}` as MessageKey) })), ...(scaleId === 'custom' ? [{ value: 'custom', label: t('fieldInspector.likertCustom') }] : [])]}
          onChange={v => v !== 'custom' && setPoints(likertPoints(v))}
        />
      </Field>
      <Field label={t('fieldInspector.likertStyle')}>
        <Segmented
          value={style}
          onChange={setStyle}
          options={[
            { value: 'dots', label: t('fieldInspector.likertStyleDots') },
            { value: 'buttons', label: t('fieldInspector.likertStyleButtons') },
            { value: 'emoji', label: t('fieldInspector.likertStyleEmoji') },
            { value: 'images', label: t('fieldInspector.likertStyleImages') },
          ]}
        />
      </Field>
      <Field label={t('fieldInspector.likertColor')}>
        <Select
          value={colorMode}
          onChange={setColorMode}
          options={[
            { value: 'theme', label: t('fieldInspector.likertColorTheme') },
            { value: 'accent', label: t('fieldInspector.likertColorAccent') },
            { value: 'gradient', label: t('fieldInspector.likertColorGradient') },
            { value: 'custom', label: t('fieldInspector.likertColorCustom') },
          ]}
        />
      </Field>
      {colorMode === 'accent' && <ColorInput value={config.accent || '#4f46e5'} label={t('fieldInspector.likertAccent')} onChange={v => setConfig({ accent: v })} />}
      <Field label={t('fieldInspector.likertPoints')} hint={t('fieldInspector.likertPointsHint')}>
        <TextList
          items={points}
          addLabel={t('fieldInspector.likertAddPoint')}
          placeholder={n => String(n)}
          onChange={(labels, from) => setPoints(labels.map((label, i) => ({ ...(from[i][0] || {}), label, value: i + 1 })))}
          extra={(item, i) => (
            <div class="likert-point-look">
              {style === 'emoji' && <input class="ui-input emoji-input" value={item.emoji || ''} placeholder={likertEmoji(i, points.length)} aria-label={t('fieldInspector.likertEmoji')} onInput={e => setPoint(i, { emoji: (e.target as HTMLInputElement).value.trim() || undefined })} />}
              {style === 'images' && <ImagePicker compact value={item.image} placeholder={t('fieldInspector.optionImage')} onChange={v => setPoint(i, { image: v || undefined })} />}
              {colorMode === 'custom' && <input type="color" class="likert-color-input" value={item.color || '#888888'} title={t('fieldInspector.likertPointColor')} onInput={e => setPoint(i, { color: (e.target as HTMLInputElement).value })} />}
            </div>
          )}
        />
      </Field>
      {!table && (
        <Field label={t('fieldInspector.likertLabels')}>
          <Segmented
            value={config.labels === 'ends' || config.labels === 'none' ? config.labels : 'all'}
            onChange={v => setConfig({ labels: v === 'all' ? undefined : v })}
            options={[
              { value: 'all', label: t('fieldInspector.likertLabelsAll') },
              { value: 'ends', label: t('fieldInspector.likertLabelsEnds') },
              { value: 'none', label: t('fieldInspector.likertLabelsNone') },
            ]}
          />
        </Field>
      )}
      {style !== 'buttons' && <Toggle label={t('fieldInspector.likertNumbers')} description={t('fieldInspector.likertNumbersHint')} checked={!!config.showNumbers} onChange={v => setConfig({ showNumbers: v || undefined })} />}
    </div>
  );
}

/** The old plain phone input: offer the field with the country picker instead. */
function UpgradePhone({ field }: { field: FormField }) {
  return (
    <div class="callout">
      <div>{t('fieldInspector.phoneUpgrade')}</div>
      <button
        class="btn small pad-top"
        onClick={() =>
          updateField(field.id, {
            type: 'phone',
            inputType: undefined,
            placeholder: undefined,
            validations: [...(field.validations || []).filter(r => ['required', 'matches', 'sameAs', 'notSameAs'].includes(r.name)), { name: 'phone', params: [] }],
          })
        }
      >
        {t('fieldInspector.phoneUpgradeButton')}
      </button>
    </div>
  );
}

function TypeSettings({ field }: { field: FormField }) {
  const config = field.config || {};
  const setConfig = (patch: { [k: string]: any }) => updateField(field.id, { config: { ...config, ...patch } });
  const set = (patch: Partial<FormField>) => updateField(field.id, patch);

  if (field.type === 'input' && field.inputType === 'tel') return <UpgradePhone field={field} />;
  switch (field.type) {
    case 'phone':
      return <PhoneSettings field={field} />;
    case 'dates':
      return <DatesSettings field={field} />;
    case 'dateRange':
      return <DateLimits config={config} setConfig={setConfig} />;
    case 'yesNo':
      return (
        <div class="stack">
          <div class="grid2">
            <Field label={t('fieldInspector.yesLabel')}>
              <TextInput value={config.yesLabel} placeholder={t('common.yes')} onInput={v => setConfig({ yesLabel: v || undefined })} />
            </Field>
            <Field label={t('fieldInspector.noLabel')}>
              <TextInput value={config.noLabel} placeholder={t('common.no')} onInput={v => setConfig({ noLabel: v || undefined })} />
            </Field>
          </div>
          {advancedView.value && <Toggle label={t('fieldInspector.autoAdvance')} description={t('fieldInspector.autoAdvanceHint')} checked={!!config.autoAdvance} onChange={v => setConfig({ autoAdvance: v || undefined })} />}
        </div>
      );
    case 'month':
    case 'week':
    case 'year':
      return (
        <div class="stack">
          <Toggle label={t('fieldInspector.allowSeveral')} checked={!!config.multiple} onChange={v => updateField(field.id, { config: { ...config, multiple: v || undefined }, validationType: v ? 'array' : 'string', defaultValue: undefined })} />
          <DateLimits config={config} setConfig={setConfig} closedDays={false} />
        </div>
      );
    case 'pictureChoice':
      return (
        <div class="stack">
          <Toggle label={t('fieldInspector.severalPictures')} checked={!!config.multiple} onChange={v => updateField(field.id, { config: { ...config, multiple: v || undefined }, validationType: v ? 'array' : 'string', defaultValue: undefined })} />
          <Field label={t('fieldInspector.perRow')}>
            <Segmented value={config.columns || 3} onChange={v => setConfig({ columns: v })} options={[2, 3, 4].map(n => ({ value: n, label: String(n) }))} />
          </Field>
          {advancedView.value && !config.multiple && <Toggle label={t('fieldInspector.autoAdvance')} description={t('fieldInspector.autoAdvanceHint')} checked={!!config.autoAdvance} onChange={v => setConfig({ autoAdvance: v || undefined })} />}
        </div>
      );
    case 'likert':
      return <LikertSettings field={field} />;
    case 'ranking':
      return (
        <Field label={t('fieldInspector.rankLimit')} hint={t('fieldInspector.rankLimitHint')}>
          <NumberInput min={1} max={(field.options || []).length || undefined} value={config.rankLimit} placeholder={t('fieldInspector.rankAll')} onInput={v => setConfig({ rankLimit: v || undefined })} />
        </Field>
      );
    case 'rating':
      return (
        <div class="stack">
          <Field label={t('fieldInspector.stars')}>
            <Segmented value={config.max || 5} onChange={v => setConfig({ max: v })} options={[3, 5, 7, 10].map(n => ({ value: n, label: String(n) }))} />
          </Field>
          <Field label={t('fieldInspector.starSize')} hint={config.size === 'full' ? t('fieldInspector.starSizeFullHint') : undefined}>
            <Segmented
              value={config.size || 'medium'}
              onChange={v => setConfig({ size: v === 'medium' ? undefined : v })}
              options={[
                { value: 'small', label: t('fieldInspector.starSizeSmall') },
                { value: 'medium', label: t('fieldInspector.starSizeMedium') },
                { value: 'large', label: t('fieldInspector.starSizeLarge') },
                { value: 'full', label: t('fieldInspector.starSizeFull') },
              ]}
            />
          </Field>
        </div>
      );
    case 'scale':
      return (
        <div class="stack">
          {config.nps && <div class="ui-hint">{t('fieldInspector.npsHint')}</div>}
          {config.nps && <Toggle label={t('fieldInspector.npsColours')} description={t('fieldInspector.npsColoursHint')} checked={config.nps !== 'plain'} onChange={v => setConfig({ nps: v ? true : 'plain' })} />}
          <div class="grid2" hidden={!!config.nps}>
            <Field label={t('fieldInspector.from')}>
              <Segmented value={config.min ?? 1} onChange={v => setConfig({ min: v })} options={[{ value: 0, label: '0' }, { value: 1, label: '1' }]} />
            </Field>
            <Field label={t('fieldInspector.to')}>
              <NumberInput min={2} max={20} value={config.max ?? 10} onInput={v => setConfig({ max: v ?? 10 })} />
            </Field>
          </div>
          <Field label={t('fieldInspector.leftLabel')}>
            <TextInput value={config.minLabel} placeholder={t('fieldInspector.leftLabelPlaceholder')} onInput={v => setConfig({ minLabel: v })} />
          </Field>
          <Field label={t('fieldInspector.rightLabel')}>
            <TextInput value={config.maxLabel} placeholder={t('fieldInspector.rightLabelPlaceholder')} onInput={v => setConfig({ maxLabel: v })} />
          </Field>
        </div>
      );
    case 'slider':
      return (
        <div class="stack">
          <div class="grid2">
            <Field label={t('fieldInspector.minimum')}>
              <NumberInput value={config.min ?? 0} onInput={v => setConfig({ min: v ?? 0 })} />
            </Field>
            <Field label={t('fieldInspector.maximum')}>
              <NumberInput value={config.max ?? 100} onInput={v => setConfig({ max: v ?? 100 })} />
            </Field>
            <Field label={t('fieldInspector.step')}>
              <NumberInput min={0} value={config.step ?? 1} onInput={v => setConfig({ step: v || 1 })} />
            </Field>
            <Field label={t('fieldInspector.unit')}>
              <TextInput value={config.unit} placeholder={t('fieldInspector.unitPlaceholder')} onInput={v => setConfig({ unit: v })} />
            </Field>
          </div>
        </div>
      );
    case 'file': {
      const accept = (field.attributes && field.attributes.accept) || '';
      return (
        <div class="stack">
          <Field label={t('fieldInspector.allowedFiles')} hint={t('fieldInspector.allowedFilesHint')}>
            <Select
              value={accept}
              onChange={v => set({ attributes: { ...(field.attributes || {}), ...(v ? { accept: v } : { accept: undefined }) } })}
              options={[
                { value: '', label: t('fieldInspector.anyFile') },
                { value: 'image/*', label: t('fieldInspector.images') },
                { value: '.pdf', label: 'PDF' },
                { value: '.pdf,.doc,.docx', label: t('fieldInspector.documents') },
                { value: '.csv,.xls,.xlsx', label: t('fieldInspector.spreadsheets') },
                { value: 'video/*', label: t('fieldInspector.videos') },
              ]}
            />
          </Field>
          <Toggle label={t('fieldInspector.severalFiles')} checked={!!(field.attributes && field.attributes.multiple)} onChange={v => set({ attributes: { ...(field.attributes || {}), multiple: v || undefined } })} />
          {advancedView.value && <Toggle label={t('fieldInspector.previews')} description={t('fieldInspector.previewsHint')} checked={!!config.preview} onChange={v => setConfig({ preview: v || undefined })} />}
          {advancedView.value && (
          <Field label={t('fieldInspector.look')}>
            <Segmented
              value={config.fileStyle === 'block' ? 'block' : config.compact ? 'button' : 'area'}
              onChange={v => setConfig({ fileStyle: v === 'block' ? 'block' : undefined, compact: v === 'button' ? true : undefined })}
              options={[
                { value: 'area', label: t('fieldInspector.dropArea') },
                { value: 'button', label: t('fieldInspector.smallButton') },
                { value: 'block', label: t('fieldInspector.wideButton') },
              ]}
            />
          </Field>
          )}
          {advancedView.value && (
          <Field label={t('fieldInspector.uploadText')} hint={t('fieldInspector.uploadTextHint')}>
            <div class="stack tight">
              <TextInput value={config.title} placeholder={t('fieldInspector.clickToUpload')} onInput={v => setConfig({ title: v || undefined })} />
              <TextInput value={config.subTitle} placeholder={t('fieldInspector.dragDrop')} onInput={v => setConfig({ subTitle: v || undefined })} />
              <TextInput value={field.placeholder} placeholder={t('fieldInspector.uploadHint')} onInput={v => set({ placeholder: v || undefined })} />
            </div>
          </Field>
          )}
        </div>
      );
    }
    case 'heading':
      return (
        <Field label={t('fieldInspector.size')}>
          <Segmented value={config.level || 'h2'} onChange={v => setConfig({ level: v })} options={[{ value: 'h2', label: t('fieldInspector.large') }, { value: 'h3', label: t('fieldInspector.small') }]} />
        </Field>
      );
    case 'countrySelect':
      return (
        <div class="stack">
          <Toggle label={t('fieldInspector.dialCodes')} description={t('fieldInspector.dialCodesHint')} checked={!!field.showDialCode} onChange={v => set({ showDialCode: v })} />
          <Field label={t('fieldInspector.submittedValue')} hint={t('fieldInspector.submittedValueHint')}>
            <Segmented
              value={field.modelValueKey || 'code'}
              onChange={v => set({ modelValueKey: v === 'code' ? undefined : v, defaultValue: undefined })}
              options={[
                { value: 'code', label: t('fieldInspector.countryCode') },
                { value: 'name', label: t('common.name') },
                { value: 'dialCode', label: t('fieldInspector.dialCode') },
              ]}
            />
          </Field>
        </div>
      );
    case 'radioGroup':
    case 'checkboxGroup':
      if (!advancedView.value)
        return (
          <div class="stack">
            <Toggle label={t('fieldInspector.addOther')} description={t('fieldInspector.addOtherHint')} checked={!!config.allowOther} onChange={v => setConfig({ allowOther: v || undefined })} />
            {config.allowOther && (
              <Field label={t('fieldInspector.otherLabel')}>
                <TextInput value={config.otherLabel} placeholder={t('fieldInspector.other')} onInput={v => setConfig({ otherLabel: v || undefined })} />
              </Field>
            )}
          </div>
        );
      return (
        <div class="stack">
          <Field label={t('fieldInspector.look')} hint={({ cards: t('fieldInspector.lookCardsHint'), plain: t('fieldInspector.lookPlainHint'), chips: t('fieldInspector.lookChipsHint') } as { [key: string]: string })[config.optionStyle || ''] || t('fieldInspector.lookBoxesHint')}>
            <Segmented
              value={config.optionStyle === 'cards' ? 'cards' : config.optionStyle === 'chips' ? 'chips' : config.optionStyle === 'plain' ? 'plain' : 'list'}
              onChange={v => setConfig({ optionStyle: v === 'list' ? undefined : v })}
              options={[
                { value: 'list', label: t('fieldInspector.lookBoxes') },
                { value: 'plain', label: t('fieldInspector.lookPlain') },
                { value: 'cards', label: t('fieldInspector.lookCards') },
                { value: 'chips', label: t('fieldInspector.lookChips') },
              ]}
            />
          </Field>
          {field.type === 'radioGroup' && <Toggle label={t('fieldInspector.autoAdvance')} description={t('fieldInspector.autoAdvanceHint')} checked={!!config.autoAdvance} onChange={v => setConfig({ autoAdvance: v || undefined })} />}
          <Field label={t('fieldInspector.perRow')} hint={t('fieldInspector.perRowHint')}>
            <Segmented value={config.optionColumns || 1} onChange={v => setConfig({ optionColumns: v === 1 ? undefined : v })} options={[1, 2, 3, 4].map(n => ({ value: n, label: String(n) }))} />
          </Field>
          <Field label={t('fieldInspector.visibleOptions')} hint={t('fieldInspector.visibleOptionsHint')}>
            <NumberInput min={1} step={1} value={config.visibleOptions} placeholder={t('fieldInspector.visibleOptionsAll')} onInput={v => setConfig({ visibleOptions: v && v >= 1 ? Math.floor(v) : undefined })} />
          </Field>
          {(field.options || []).some((o: any) => o && o.image) && (
            <Field label={t('fieldInspector.logoPosition')}>
              <LogoPositionPicker value={(['right', 'top', 'bottom'].includes(config.imagePosition) ? config.imagePosition : 'left') as LogoPosition} onChange={v => setConfig({ imagePosition: v === 'left' ? undefined : v })} />
            </Field>
          )}
          <Toggle label={t('fieldInspector.addOther')} description={t('fieldInspector.addOtherHint')} checked={!!config.allowOther} onChange={v => setConfig({ allowOther: v || undefined })} />
          {config.allowOther && (
            <Field label={t('fieldInspector.otherLabel')}>
              <TextInput value={config.otherLabel} placeholder={t('fieldInspector.other')} onInput={v => setConfig({ otherLabel: v || undefined })} />
            </Field>
          )}
        </div>
      );
    case 'textarea': {
      const rows = (field.attributes && field.attributes.rows) || 4;
      const truncate = config.truncate as { by?: string; limit?: number; mode?: string } | undefined;
      const by = truncate ? truncate.by || 'lines' : 'off';
      const setTruncate = (next: { by?: string; limit?: number; mode?: string } | undefined) => setConfig({ truncate: next });
      return (
        <>
          <Field label={t('fieldInspector.height')}>
            <Segmented
              value={rows}
              onChange={v => set({ attributes: { ...(field.attributes || {}), rows: v } })}
              options={[
                { value: 2, label: t('fieldInspector.small') },
                { value: 4, label: t('fieldInspector.medium') },
                { value: 8, label: t('fieldInspector.large') },
              ]}
            />
          </Field>
          <Field label={t('fieldInspector.truncate')} hint={t('fieldInspector.truncateHint')}>
            <Segmented
              value={by}
              onChange={v => setTruncate(v === 'off' ? undefined : { by: v, limit: truncate?.limit || (v === 'lines' ? 5 : 300), mode: truncate?.mode || 'viewMore' })}
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
                <NumberInput value={truncate.limit} min={1} onInput={v => setTruncate({ ...truncate, limit: v })} />
              </Field>
              <Segmented
                value={truncate.mode || 'viewMore'}
                onChange={v => setTruncate({ ...truncate, mode: v })}
                options={[
                  { value: 'viewMore', label: t('fieldInspector.truncateViewMore') },
                  { value: 'tooltip', label: t('fieldInspector.truncateTooltip') },
                ]}
              />
            </>
          )}
        </>
      );
    }
    case 'search':
      return <CustomSource field={field} />;
    case 'address':
      if (!advancedView.value && (config.provider || 'osm') !== 'custom')
        return (
          <Field label={t('fieldInspector.country')} hint={(config.countries || []).length ? undefined : t('fieldInspector.countryHint')}>
            <CountryChips value={config.countries || []} onChange={codes => setConfig({ countries: codes })} />
          </Field>
        );
      return <AddressSettings field={field} />;
    case 'input':
      if (!['checkbox', 'color'].includes(field.inputType || 'text')) {
        const affixes = (
          <div class="grid2">
            {(['prefix', 'suffix'] as const).map(side => {
              const iconKey = side === 'prefix' ? 'prefixIcon' : 'suffixIcon';
              // an emoji goes into the text; an icon is shown before the text
              const pick = (next: { emoji?: string; icon?: string; iconNode?: any }) =>
                next.emoji ? setConfig({ [side]: `${config[side] || ''}${next.emoji}` }) : setConfig({ [iconKey]: next.iconNode, [`${iconKey}Name`]: next.icon });
              return (
                <Field key={side} label={side === 'prefix' ? t('fieldInspector.textBefore') : t('fieldInspector.textAfter')}>
                  <div class="input-with-icon">
                    <IconButtonPicker label={t('fieldInspector.addIconOrEmoji')} value={{ icon: config[`${iconKey}Name`], iconNode: config[iconKey] }} onChange={pick} />
                    <TextInput value={config[side]} placeholder={side === 'prefix' ? t('fieldInspector.prefixPlaceholder') : t('fieldInspector.suffixPlaceholder')} onInput={v => setConfig({ [side]: v || undefined })} />
                  </div>
                </Field>
              );
            })}
          </div>
        );
        const by = config.suffixBy;
        const siblings = logicSources(field.id).filter(f => f.options && f.options.length);
        const source = by && siblings.find(f => f.model === by.field);
        const extras = (
          <>
            <Toggle label={t('fieldInspector.plainText')} description={t('fieldInspector.plainTextHint')} checked={!!config.plain} onChange={v => setConfig({ plain: v || undefined })} />
            {siblings.length > 0 && (
              <Toggle
                label={t('fieldInspector.suffixBy')}
                description={t('fieldInspector.suffixByHint')}
                checked={!!by}
                onChange={v => setConfig({ suffixBy: v ? { field: siblings[siblings.length - 1].model, values: {} } : undefined })}
              />
            )}
            {by && (
              <div class="stack">
                <Select value={by.field} onChange={v => setConfig({ suffixBy: { field: v, values: {} } })} options={siblings.map(f => ({ value: f.model, label: f.label || f.model || '' }))} />
                {source &&
                  (source.options || []).map((o: any) => (
                    <div class="condition" key={String(o.value)}>
                      <span class="ui-hint grow">{o.label}</span>
                      <TextInput value={(by.values || {})[String(o.value)]} placeholder={t('fieldInspector.suffixText')} onInput={v => setConfig({ suffixBy: { ...by, values: { ...(by.values || {}), [String(o.value)]: v } } })} />
                    </div>
                  ))}
              </div>
            )}
          </>
        );
        if (field.inputType !== 'number')
          return (
            <div class="stack">
              {affixes}
              {extras}
            </div>
          );
        return (
          <div class="stack">
            {affixes}
            {extras}
            <Field label={t('fieldInspector.step')} hint={t('fieldInspector.numberStepHint')}>
              <NumberInput min={0} value={field.attributes && field.attributes.step} placeholder="1" onInput={v => set({ attributes: { ...(field.attributes || {}), step: v || undefined } })} />
            </Field>
          </div>
        );
      }
      return null;
    case 'select':
      return (
        <Field label={t('fieldInspector.look')}>
          <Segmented
            value={config.selectStyle === 'pill' ? 'pill' : 'dropdown'}
            onChange={v => setConfig({ selectStyle: v === 'pill' ? 'pill' : undefined })}
            options={[
              { value: 'dropdown', label: t('fieldInspector.dropdown') },
              { value: 'pill', label: t('fieldInspector.buttonLike') },
            ]}
          />
        </Field>
      );
    case 'multiSelect':
      return null;
    default:
      return null;
  }
}

function DefaultValue({ field }: { field: FormField }) {
  const set = (patch: Partial<FormField>) => updateField(field.id, patch);
  const config = field.config || {};
  if (field.type === 'toggle' || (field.type === 'input' && field.inputType === 'checkbox')) {
    return <Toggle label={field.type === 'toggle' ? t('fieldInspector.onByDefault') : t('fieldInspector.tickedByDefault')} checked={!!field.defaultValue} onChange={v => set({ defaultValue: v })} />;
  }

  if (field.type === 'yesNo') {
    return (
      <Field label={t('fieldInspector.preselected')}>
        <Select value={field.defaultValue === undefined ? '' : String(field.defaultValue)} placeholder={t('fieldInspector.nothing')} options={[{ value: 'yes', label: t('common.yes') }, { value: 'no', label: t('common.no') }]} onChange={v => set({ defaultValue: v || undefined })} />
      </Field>
    );
  }

  if (field.type === 'likert' && !(config.rows || []).length) {
    return (
      <Field label={t('fieldInspector.preselected')}>
        <Select value={field.defaultValue === undefined ? '' : String(field.defaultValue)} placeholder={t('fieldInspector.nothing')} options={(field.options || []).map((o: any) => ({ value: o.value, label: o.label }))} onChange={v => set({ defaultValue: v === '' ? undefined : Number(v) })} />
      </Field>
    );
  }

  if (field.type === 'countrySelect') {
    const key = field.modelValueKey || 'code';
    return (
      <Field label={t('fieldInspector.defaultCountry')}>
        <Select
          value={field.defaultValue ?? ''}
          placeholder={t('common.none')}
          options={COUNTRIES.map((c: any) => ({ value: c[key], label: countryName(c.code, c.name) })).sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, locale.value))}
          onChange={v => set({ defaultValue: v || undefined })}
        />
      </Field>
    );
  }

  if (field.type === 'rating' || field.type === 'scale' || field.type === 'slider') {
    const min = field.type === 'rating' ? 0 : config.min ?? (field.type === 'scale' ? 1 : 0);
    const max = field.type === 'rating' ? config.max || 5 : config.max ?? (field.type === 'scale' ? 10 : 100);
    return (
      <Field label={field.type === 'slider' ? t('fieldInspector.startingValue') : t('fieldInspector.preselectedValue')} hint={field.type === 'slider' ? undefined : t('fieldInspector.preselectedValueHint')}>
        <NumberInput min={min} max={max} value={field.defaultValue} placeholder={field.type === 'slider' ? String(min) : t('common.none')} onInput={v => set({ defaultValue: v })} />
      </Field>
    );
  }

  if (field.type === 'input' && field.inputType === 'color') {
    return <ColorInput label={t('fieldInspector.defaultColour')} value={(field.defaultValue as string) || '#4f46e5'} onChange={v => set({ defaultValue: v })} />;
  }

  const simple = field.type === 'input' || field.type === 'textarea';
  if (!simple) return null;
  const nativeTypes = ['number', 'date', 'time', 'datetime-local', 'month', 'week'];
  const type = field.inputType && nativeTypes.includes(field.inputType) ? field.inputType : 'text';
  return (
    <Field label={t('fieldInspector.defaultValue')}>
      <TextInput
        type={type}
        value={field.defaultValue}
        placeholder={t('common.optional')}
        onInput={v => set({ defaultValue: v === '' ? undefined : field.inputType === 'number' ? Number(v) : v })}
      />
    </Field>
  );
}


/** “Auto-fill from…”: the host application knows data (the user, the account…) and the field says which piece it wants. */
function AutoFill({ field }: { field: FormField }) {
  const sources = prefillSources.value;
  if (!sources.length || !field.model) return null;
  const isList = field.type === 'repeater';
  const choices = sources.filter(s => (isList ? s.kind === 'list' : s.kind !== 'list'));
  if (!choices.length) return null;
  const config = field.config || {};
  const chosen = typeof config.prefill === 'string' ? config.prefill : '';
  const setConfig = (patch: { [key: string]: any }) => {
    const next: { [key: string]: any } = { ...config, ...patch };
    Object.keys(next).forEach(k => (next[k] === undefined || next[k] === '' || next[k] === false) && delete next[k]);
    updateField(field.id, { config: next });
  };
  const known = choices.some(s => s.key === chosen);
  const groups = Array.from(new Set(choices.map(s => s.group || '')));
  return (
    <>
      <Field label={t('fieldInspector.autoFill')} hint={isList ? t('fieldInspector.autoFillListHint') : t('fieldInspector.autoFillHint')}>
        <div class="ui-select">
          <select value={chosen} onChange={e => setConfig({ prefill: (e.target as HTMLSelectElement).value || undefined, prefillLock: (e.target as HTMLSelectElement).value ? config.prefillLock : undefined })}>
            <option value="">{t('fieldInspector.autoFillNothing')}</option>
            {chosen && !known && <option value={chosen}>{chosen}</option>}
            {groups.map(group => (
              <optgroup key={group} label={group || t('fieldInspector.other')}>
                {choices.filter(s => (s.group || '') === group).map(s => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Icon name="chevronDown" size={14} />
        </div>
      </Field>
      {chosen && !isList && <Toggle label={t('fieldInspector.lockValue')} description={t('fieldInspector.lockValueHint')} checked={!!config.prefillLock} onChange={v => setConfig({ prefillLock: v })} />}
    </>
  );
}

const SEARCH_PRESETS = SEARCH_EXAMPLES;

/** Values of the `autocomplete` attribute offered; their names are `fieldInspector.autocomplete.<value>`. */
const AUTOCOMPLETE = [
  'off',
  'name',
  'given-name',
  'family-name',
  'email',
  'tel',
  'organization',
  'street-address',
  'address-level2',
  'postal-code',
  'country-name',
  'bday',
  'username',
  'new-password',
  'current-password',
  'one-time-code',
];

/** Ready-made patterns; their names are `fieldInspector.pattern.<key>`. */
const PATTERN_PRESETS = [
  { value: '^[A-Za-zÀ-ÿ\\s\'-]+$', key: 'letters' },
  { value: '^[0-9]+$', key: 'digits' },
  { value: '^[A-Za-z0-9]+$', key: 'lettersDigits' },
  { value: '^\\S+$', key: 'noSpaces' },
  { value: '^\\+?[0-9\\s().-]{6,20}$', key: 'phone' },
];
const CUSTOM = '__custom';

/** Which rules make sense for this field: the generator decides per kind of input (a phone number gets phone rules, a dropdown none). */
const applicableSpecs = (field: FormField): RuleSpec[] => rulesFor(field).filter(spec => spec.name !== 'required');

function ParamInput({ kind, value, type, field, onChange }: { kind: RuleParam; value: any; type: string; field: FormField; onChange: (v: any) => void }) {
  switch (kind) {
    case 'field': {
      // other fields that hold a value (same kind of answer as this one where it matters)
      const others = doc.value.fields.filter(f => f.id !== field.id && !isLayoutType(f.type) && f.model && f.type !== 'file');
      return <Select value={value ?? ''} placeholder={t('fieldInspector.chooseField')} options={others.map(f => ({ value: f.model, label: f.label || f.checkboxLabel || (f.model as string) }))} onChange={onChange} />;
    }
    case 'countries':
      return <CountryChips value={Array.isArray(value) ? value : []} onChange={onChange} />;
    case 'number':
      return <NumberInput value={value} onInput={v => onChange(v === undefined ? '' : v)} />;
    case 'date':
      return <TextInput type="date" value={value} onInput={onChange} />;
    case 'list':
      return (
        <TextInput
          value={Array.isArray(value) ? value.join(', ') : ''}
          placeholder={t('fieldInspector.listPlaceholder')}
          onInput={v =>
            onChange(
              v
                .split(',')
                .map(x => x.trim())
                .filter(Boolean)
                .map(x => (type === 'number' ? Number(x) : x)),
            )
          }
        />
      );
    case 'regex': {
      const preset = PATTERN_PRESETS.find(p => p.value === value);
      const mode = value === undefined || value === '' ? '' : preset ? preset.value : CUSTOM;
      return (
        <div class="stack tight">
          <Select value={mode} placeholder={t('fieldInspector.choosePattern')} options={[...PATTERN_PRESETS.map(p => ({ value: p.value, label: t(`fieldInspector.pattern.${p.key}` as MessageKey) })), { value: CUSTOM, label: t('fieldInspector.customPattern') }]} onChange={v => onChange(v === CUSTOM ? '^.+$' : v)} />
          {mode === CUSTOM && <TextInput mono value={value} placeholder="^[0-9]{5}$" onInput={onChange} />}
        </div>
      );
    }
    default:
      return <TextInput value={value} onInput={onChange} />;
  }
}

function RuleRow({ field, spec, rule, onChange, onRemove }: { field: FormField; spec: RuleSpec; rule: Rule; onChange: (params: any[]) => void; onRemove: () => void }) {
  const type = effectiveValidationType(field);
  const params = rule.params || [];
  const count = spec.params.length;
  const message = params[count];
  const write = (values: any[], msg: any) => onChange(trimParams([...values, msg]));
  const values = spec.params.map((_, i) => params[i]);
  return (
    <div class="rule">
      <div class="rule-head">
        <span class="rule-name">{ruleLabel(spec)}</span>
        {spec.hint && <span class="ui-hint">{ruleHint(spec)}</span>}
        <div class="grow" />
        <button class="icon-btn" aria-label={t('fieldInspector.removeNamed', { name: ruleLabel(spec) })} onClick={onRemove}>
          <Icon name="x" size={14} />
        </button>
      </div>
      {spec.params.map((kind, i) => (
        <ParamInput key={i} kind={kind} type={type} field={field} value={values[i]} onChange={v => write(values.map((x, idx) => (idx === i ? v : x)), message)} />
      ))}
      <TextInput value={message} placeholder={t('fieldInspector.customError')} onInput={v => write(values, v)} />
    </div>
  );
}

function Validation({ field }: { field: FormField }) {
  const required = getRule(field, 'required');
  const rules = field.validations || [];
  const apply = (next: Rule[]) => updateField(field.id, { validations: next }, `validation:${field.id}`);
  const isTick = field.type === 'input' && field.inputType === 'checkbox';
  const specs = applicableSpecs(field);
  const active = specs.filter(spec => getRule(field, spec.name));
  const addable = specs.filter(spec => !getRule(field, spec.name));
  // rules in the schema that the builder has no UI for (custom or from an older schema) stay untouched
  const unknown = rules.filter(r => r.name !== 'required' && !specs.some(s => s.name === r.name));

  if (!advancedView.value) {
    // simple view: "Required" to switch, the other rules listed (they keep working; they are edited in the advanced view)
    const others = rules.filter(r => r.name !== 'required');
    const nameOf = (r: Rule) => {
      const spec = specs.find(sp => sp.name === r.name);
      return spec ? ruleLabel(spec) : r.name;
    };
    return (
      <div class="stack">
        <Toggle
          label={isTick ? t('fieldInspector.mustBeTicked') : t('fieldInspector.required')}
          description={isTick ? t('fieldInspector.mustBeTickedHint') : t('fieldInspector.requiredHint')}
          checked={!!required}
          onChange={v => apply(setRule(field, 'required', v ? [] : null))}
        />
        {others.length > 0 && (
          <div class="rules-summary">
            <div class="ui-hint">{t('fieldInspector.alsoChecked')}</div>
            <ul>
              {others.map((r, i) => (
                <li key={i}>
                  <Icon name="check" size={13} /> {nameOf(r)}
                </li>
              ))}
            </ul>
            {!viewLocked.value && (
              <button class="link-btn" onClick={() => setView('advanced')}>
                {t('fieldInspector.editRules')}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const defaults = (spec: RuleSpec) =>
    spec.params.map(kind => (kind === 'number' ? (spec.name === 'maxFileSize' ? 10 : spec.name === 'maxFiles' ? 5 : spec.name === 'max' || spec.name === 'lessThan' ? 100 : 1) : kind === 'regex' ? PATTERN_PRESETS[0].value : kind === 'list' || kind === 'countries' ? [] : ''));

  return (
    <div class="stack">
      <Toggle
        label={isTick ? t('fieldInspector.mustBeTicked') : t('fieldInspector.required')}
        description={isTick ? t('fieldInspector.mustBeTickedHint') : t('fieldInspector.requiredHint')}
        checked={!!required}
        onChange={v => apply(setRule(field, 'required', v ? [] : null))}
      />
      {required && (
        <Field label={t('fieldInspector.missingMessage')} hint={t('fieldInspector.missingMessageHint')}>
          <TextInput value={required.params && required.params[0]} placeholder={t('fieldInspector.missingPlaceholder')} onInput={v => apply(setRule(field, 'required', trimParams([v])))} />
        </Field>
      )}

      {active.map(spec => {
        const rule = getRule(field, spec.name)!;
        return <RuleRow key={spec.name} field={field} spec={spec} rule={rule} onChange={params => apply(setRule(field, spec.name, params))} onRemove={() => apply(setRule(field, spec.name, null))} />;
      })}

      {addable.length > 0 && (
        <Select
          value=""
          placeholder={t('fieldInspector.addRule')}
          options={addable.map(spec => ({ value: spec.name, label: ruleLabel(spec) }))}
          onChange={name => {
            const spec = addable.find(s => s.name === name);
            if (spec) apply(setRule(field, spec.name, defaults(spec)));
          }}
        />
      )}

      {unknown.length > 0 && (
        <div class="ui-hint">
          {t('fieldInspector.unknownRules', { names: unknown.map(r => r.name).join(', ') })}
        </div>
      )}
    </div>
  );
}

function PresetBars({ spans }: { spans: number[] }) {
  return (
    <span class="preset-bars">
      {spans.map((span, i) => (
        <i key={i} style={{ flex: span }} />
      ))}
    </span>
  );
}

/** Layout options for a normal field: put it in columns, or take it out of the row it is in. */
function LayoutSection({ field }: { field: FormField }) {
  const where = locate(doc.value.fields, field.id);
  if (where && where.row) {
    const row = where.row;
    return (
      <div class="stack">
        <div class="ui-hint">
          {t('fieldInspector.inRow', { count: (row.columns || []).length })}
        </div>
        <div class="row-gap">
          <button class="btn small" onClick={() => (selectedId.value = row.id)}>
            <Icon name="columns" size={14} /> {t('fieldInspector.editRow')}
          </button>
          <button class="btn ghost small" onClick={() => moveOutOfRow(field.id)}>
            {t('fieldInspector.moveOutOfRow')}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div class="stack">
      <div class="ui-hint">{t('fieldInspector.layoutHint')}</div>
      <div class="preset-list">
        {ROW_PRESETS.filter(p => ['6-6', '4-8', '8-4', '4-4-4', '6', '4'].includes(p.id)).map(p => (
          <button key={p.id} class="preset-btn" title={p.label} onClick={() => wrapInRow(field.id, p.spans)}>
            <PresetBars spans={p.spans} />
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Free column widths, e.g. "9, 3" (out of 12). Applied when the text is valid. */
function CustomWidths({ rowId, spans }: { rowId: string; spans: number[] }) {
  const [text, setText] = useState(spans.join(', '));
  const key = spans.join(', ');
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setText(key);
  }
  const parsed = text.split(/[,\s]+/).filter(Boolean).map(Number);
  const valid = parsed.length >= 1 && parsed.length <= 6 && parsed.every(n => Number.isInteger(n) && n >= 1 && n <= 12) && parsed.reduce((a, b) => a + b, 0) <= 12;
  return (
    <Field label={t('fieldInspector.customWidths')} hint={valid ? t('fieldInspector.customWidthsHint') : t('fieldInspector.customWidthsInvalid')}>
      <TextInput
        mono
        value={text}
        onInput={setText}
        onBlur={() => {
          if (valid && parsed.join(', ') !== key) setRowSpans(rowId, parsed);
          else setText(key);
        }}
      />
    </Field>
  );
}

/** Inspector for a row of columns. */
function RowInspector({ field }: { field: FormField }) {
  const layout = rowLayout(field);
  const key = layout.spans.join('-');
  const config = field.config || {};
  const narrow = layout.total < 12;
  const adv = advancedView.value;
  return (
    <div class="inspector-body">
      <div class="inspector-title">
        <span class="type-chip">
          <Icon name="columns" size={16} />
        </span>
        <div class="grow">
          <div class="inspector-name">{t('fieldInspector.columns')}</div>
          <div class="ui-hint">{t('fieldInspector.columnsHint')}</div>
        </div>
        <button class="icon-btn" title={t('common.duplicate')} onClick={() => duplicateField(field.id)}>
          <Icon name="copy" size={16} />
        </button>
        <button class="icon-btn danger" title={t('fieldInspector.deleteRow')} onClick={() => requestRemoveField(field.id)}>
          <Icon name="trash" size={16} />
        </button>
      </div>

      <Section title={t('fieldInspector.columnLayout')} icon="columns">
        <div class="stack">
          <div class="preset-list">
            {ROW_PRESETS.map(p => (
              <button key={p.id} class={`preset-btn ${p.id === key ? 'active' : ''}`} title={p.label} onClick={() => setRowSpans(field.id, p.spans)}>
                <PresetBars spans={p.spans} />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
          {adv && <CustomWidths rowId={field.id} spans={layout.spans} />}
          <div class="ui-hint">{t('fieldInspector.columnLayoutHint')}</div>
        </div>
      </Section>

      {adv && (
      <Section title={t('fieldInspector.alignment')} icon="alignMiddle">
        <div class="stack">
          <Field label={t('fieldInspector.vertical')} hint={t('fieldInspector.verticalHint')}>
            <Segmented
              value={config.align || 'start'}
              onChange={v => setRowConfig(field.id, { align: v })}
              options={[
                { value: 'start', label: t('fieldInspector.top') },
                { value: 'center', label: t('fieldInspector.middle') },
                { value: 'end', label: t('fieldInspector.bottom') },
                { value: 'stretch', label: t('fieldInspector.stretch') },
              ]}
            />
          </Field>
          <Field label={t('fieldInspector.horizontal')} hint={narrow ? t('fieldInspector.horizontalNarrowHint') : t('fieldInspector.horizontalHint')}>
            <Segmented
              value={config.justify || 'start'}
              onChange={v => setRowConfig(field.id, { justify: v })}
              options={[
                { value: 'start', label: t('fieldInspector.left') },
                { value: 'center', label: t('fieldInspector.center') },
                { value: 'end', label: t('fieldInspector.right') },
              ]}
            />
          </Field>
        </div>
      </Section>
      )}

      {adv ? (
      <Section title={t('fieldInspector.rules')} icon="zap" defaultOpen={!!field.logic} badge={logicRules(field).length}>
        <Logic field={field} />
      </Section>
      ) : null}

      <Section title={t('fieldInspector.row')} icon="settings" defaultOpen={false}>
        {ancestorsOf(doc.value.fields, field.id).some(a => a.type === 'repeater') && (
          <div class="stack">
            <Toggle label={t('fieldInspector.dialogOnly')} description={t('fieldInspector.dialogOnlyRowHint')} checked={!!(field.config && field.config.dialogOnly)} onChange={v => setRowConfig(field.id, { dialogOnly: v || undefined, ...(v ? { hideInDialog: undefined } : {}) })} />
            <Toggle label={t('fieldInspector.notInDialog')} description={t('fieldInspector.notInDialogRowHint')} checked={!!(field.config && field.config.hideInDialog)} onChange={v => setRowConfig(field.id, { hideInDialog: v || undefined, ...(v ? { dialogOnly: undefined } : {}) })} />
          </div>
        )}
        <button class="btn small" onClick={() => unwrapRow(field.id)}>
          <Icon name="ungroup" size={14} /> {t('fieldInspector.ungroup')}
        </button>
      </Section>
    </div>
  );
}

function Advanced({ field }: { field: FormField }) {
  const set = (patch: Partial<FormField>) => updateField(field.id, patch);
  const inGroup = ancestorsOf(doc.value.fields, field.id).some(a => a.type === 'repeater');
  return (
    <div class="stack">
      {!isLayoutType(field.type) && (
        <Field label={t('fieldInspector.fieldKey')} hint={isKeyLocked(field, doc.value.settings) ? t('fieldInspector.keyLocked') : t('fieldInspector.fieldKeyHint')}>
          <TextInput mono disabled={isKeyLocked(field, doc.value.settings)} value={field.model} onInput={v => set({ model: v.replace(/[^\w.-]/g, ''), inputName: v.replace(/[^\w.-]/g, '') })} />
        </Field>
      )}
      {!isLayoutType(field.type) && (
        <>
          <Toggle label={t('fieldInspector.hiddenField')} description={t('fieldInspector.hiddenFieldHint')} checked={field.visible === false} onChange={v => set({ visible: v ? false : undefined })} />
          <Toggle label={t('fieldInspector.disabled')} checked={!!field.disabled} onChange={v => set({ disabled: v || undefined })} />
          {(field.type === 'input' || field.type === 'textarea') && <Toggle label={t('fieldInspector.readOnly')} checked={!!field.readonly} onChange={v => set({ readonly: v || undefined })} />}
        </>
      )}
      {(field.type === 'input' || field.type === 'textarea') && !['checkbox', 'color', 'date', 'time', 'datetime-local', 'month', 'week'].includes(field.inputType || '') && (
        <Field label={t('fieldInspector.browserAutofill')} hint={t('fieldInspector.browserAutofillHint')}>
          <Select
            value={(field.attributes && field.attributes.autocomplete) || ''}
            placeholder={t('fieldInspector.browserDefault')}
            onChange={v => set({ attributes: { ...(field.attributes || {}), autocomplete: v || undefined } })}
            options={AUTOCOMPLETE.map(value => ({ value, label: t(`fieldInspector.autocomplete.${value}` as MessageKey) }))}
          />
        </Field>
      )}
      {inGroup && (
        <>
          <Toggle label={t('fieldInspector.dialogOnly')} description={t('fieldInspector.dialogOnlyHint')} checked={!!(field.config && field.config.dialogOnly)} onChange={v => set({ config: { ...(field.config || {}), dialogOnly: v || undefined, ...(v ? { hideInDialog: undefined } : {}) } })} />
          <Toggle label={t('fieldInspector.notInDialog')} description={t('fieldInspector.notInDialogHint')} checked={!!(field.config && field.config.hideInDialog)} onChange={v => set({ config: { ...(field.config || {}), hideInDialog: v || undefined, ...(v ? { dialogOnly: undefined } : {}) } })} />
        </>
      )}
      <Field label={t('fieldInspector.cssClass')}>
        <TextInput mono value={field.inputWrapperClass} placeholder={t('common.optional')} onInput={v => set({ inputWrapperClass: v || undefined })} />
      </Field>
    </div>
  );
}

/* ---------------------------------------------------------------------- main */

/** The advanced settings a field uses, in words ("2 validation rules", "conditional logic"…). */
function advancedInUse(field: FormField): string[] {
  const out: string[] = [];
  const config = field.config || {};
  // (validation rules are listed in the Validation section itself)
  if (logicRules(field).length) out.push(t('fieldInspector.inUseLogic'));
  if (field.visible === false) out.push(t('fieldInspector.inUseHidden'));
  if (field.disabled || field.readonly) out.push(t('fieldInspector.inUseLocked'));
  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '' && field.defaultValue !== false && !(Array.isArray(field.defaultValue) && !field.defaultValue.length)) out.push(t('fieldInspector.inUseDefault'));
  if (config.prefill) out.push(t('fieldInspector.inUsePrefill'));
  if (config.optionsFrom) out.push(t('fieldInspector.inUseOptionsFrom'));
  if (field.className || config.prefix || config.suffix || config.suffixBy || config.plain || config.visibleOptions || config.imagePosition) out.push(t('fieldInspector.inUseLook'));
  if (field.tooltip) out.push(t('fieldInspector.inUseTooltip'));
  if ((field.type === 'radioGroup' || field.type === 'checkboxGroup') && (field.options || []).some((o: any) => o.badge || o.image || o.link || o.help || (o.description && config.optionStyle !== 'cards'))) out.push(t('fieldInspector.inUseOptionExtras'));
  return out;
}

/** In the simple view: what this field has that only the advanced view shows, and a way there. */
function AdvancedNote({ field }: { field: FormField }) {
  if (advancedView.value || viewLocked.value) return null;
  const used = advancedInUse(field);
  return (
    <div class="advanced-note">
      {used.length > 0 && (
        <div class="advanced-note-used">
          <Icon name="info" size={14} />
          <span>{t('fieldInspector.inUse', { list: used.join(', ') })}</span>
        </div>
      )}
      <button class="link-btn" onClick={() => setView('advanced')}>
        {t('fieldInspector.showAdvanced')}
      </button>
    </div>
  );
}

function Title({ field, name, description, icon }: { field: FormField; name: string; description: string; icon: string }) {
  return (
    <div class="inspector-title">
      <span class="type-chip">
        <Icon name={icon} size={16} />
      </span>
      <div class="grow">
        <div class="inspector-name">{name}</div>
        <div class="ui-hint">{description}</div>
      </div>
      <button class="icon-btn" title={t('common.duplicate')} onClick={() => duplicateField(field.id)}>
        <Icon name="copy" size={16} />
      </button>
      <button class="icon-btn danger" title={field.type === 'section' || field.type === 'repeater' ? t('fieldInspector.deleteAll') : t('common.delete')} onClick={() => requestRemoveField(field.id)}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}

/** Image, video, link, icon & emoji, embed: what they show and how. */
function ContentSettings({ field }: { field: FormField }) {
  const config = field.config || {};
  const setConfig = (patch: { [k: string]: any }) => updateField(field.id, { config: { ...config, ...patch } }, `content:${field.id}`);
  const set = (patch: Partial<FormField>) => updateField(field.id, patch, `content:${field.id}`);
  const adv = advancedView.value;
  const align = (fallback: string) => (
    <Field label={t('fieldInspector.alignment')}>
      <Segmented
        value={config.align || fallback}
        onChange={v => setConfig({ align: v })}
        options={[
          { value: 'left', label: t('fieldInspector.left') },
          { value: 'center', label: t('fieldInspector.center') },
          { value: 'right', label: t('fieldInspector.right') },
        ]}
      />
    </Field>
  );
  const caption = (
    <Field label={t('fieldInspector.caption')}>
      <DataText value={config.caption} placeholder={t('common.optional')} onInput={v => setConfig({ caption: v || undefined })} />
    </Field>
  );

  if (field.type === 'image')
    return (
      <div class="stack">
        <Field label={t('fieldInspector.image')} hint={t('fieldInspector.imageHint')}>
          <ImagePicker value={config.src} placeholder="https://…/picture.jpg" onChange={v => setConfig({ src: v || '' })} />
        </Field>
        <Field label={t('fieldInspector.altText')} hint={t('fieldInspector.altTextHint')}>
          <TextInput value={config.alt} placeholder={t('common.optional')} onInput={v => setConfig({ alt: v || undefined })} />
        </Field>
        {caption}
        <Field label={t('fieldInspector.size')}>
          <Segmented
            value={config.width || 'full'}
            onChange={v => setConfig({ width: v })}
            options={[
              { value: 'small', label: t('fieldInspector.small') },
              { value: 'medium', label: t('fieldInspector.medium') },
              { value: 'full', label: t('fieldInspector.fullWidth') },
            ]}
          />
        </Field>
        {align('center')}
        {adv && <Toggle label={t('fieldInspector.roundedCorners')} checked={config.rounded !== false} onChange={v => setConfig({ rounded: v ? undefined : false })} />}
        {adv && (
          <Field label={t('fieldInspector.imageLink')} hint={t('fieldInspector.imageLinkHint')}>
            <TextInput value={config.link} placeholder="https://" onInput={v => setConfig({ link: v || undefined })} />
          </Field>
        )}
      </div>
    );

  if (field.type === 'video') {
    // an uploaded file is played as a file whatever its address looks like (`config.file`)
    const known = config.file || videoSource(config.url);
    return (
      <div class="stack">
        <Field label={t('fieldInspector.videoUrl')} hint={config.url && !known ? t('fieldInspector.videoUnknown') : t('fieldInspector.videoHint')}>
          <div class="stack tight">
            <TextInput value={config.file ? '' : config.url} placeholder={config.file ? t('fieldInspector.videoUploaded') : 'https://www.youtube.com/watch?v=…'} onInput={v => setConfig({ url: v.trim(), file: undefined })} />
            {canUpload() && <VideoUpload onDone={url => setConfig({ url, file: true })} />}
          </div>
        </Field>
        {config.url && known && <VideoPreview src={config.file ? { kind: 'file', src: config.url } : (known as { kind: 'iframe' | 'file'; src: string })} />}
        {caption}
      </div>
    );
  }

  if (field.type === 'link')
    return (
      <div class="stack">
        <Field label={t('fieldInspector.linkText')}>
          <DataText value={field.label} onInput={v => set({ label: v })} />
        </Field>
        <Field label={t('fieldInspector.linkUrl')} hint={t('fieldInspector.linkUrlHint')}>
          <TextInput value={config.url} placeholder="https://" onInput={v => setConfig({ url: v.trim() })} />
        </Field>
        <Field label={t('fieldInspector.look')}>
          <Segmented
            value={config.style === 'text' ? 'text' : 'button'}
            onChange={v => setConfig({ style: v })}
            options={[
              { value: 'button', label: t('fieldInspector.linkButton') },
              { value: 'text', label: t('fieldInspector.linkTextStyle') },
            ]}
          />
        </Field>
        {align('left')}
        <Toggle label={t('fieldInspector.newTab')} description={t('fieldInspector.newTabHint')} checked={config.newTab !== false} onChange={v => setConfig({ newTab: v })} />
      </div>
    );

  if (field.type === 'icon') {
    const isIcon = !config.emoji && (config.iconNode || config.icon);
    return (
      <div class="stack">
        <Field label={t('fieldInspector.iconOrEmoji')}>
          <IconPicker
            value={{ emoji: config.emoji, icon: config.icon, iconNode: config.iconNode }}
            onChange={next => setConfig({ emoji: next.emoji, icon: next.icon, iconNode: next.iconNode })}
          />
        </Field>
        {isIcon && (
          <Field label={t('fieldInspector.iconColour')}>
            <div class="stack tight">
              <Segmented
                value={config.color ? 'own' : 'accent'}
                onChange={v => setConfig({ color: v === 'own' ? config.color || '#4f46e5' : undefined })}
                options={[
                  { value: 'accent', label: t('fieldInspector.accentColour') },
                  { value: 'own', label: t('fieldInspector.ownColour') },
                ]}
              />
              {config.color && <ColorInput label={t('fieldInspector.iconColour')} value={config.color} onChange={v => setConfig({ color: v })} />}
            </div>
          </Field>
        )}
        <Field label={t('fieldInspector.size')}>
          <Segmented
            value={config.size || 'medium'}
            onChange={v => setConfig({ size: v })}
            options={[
              { value: 'small', label: t('fieldInspector.small') },
              { value: 'medium', label: t('fieldInspector.medium') },
              { value: 'large', label: t('fieldInspector.large') },
            ]}
          />
        </Field>
        <Field label={t('fieldInspector.title')}>
          <DataText value={field.label} placeholder={t('common.optional')} onInput={v => set({ label: v || undefined })} />
        </Field>
        <Field label={t('fieldInspector.text')}>
          <DataText value={field.helpText} placeholder={t('common.optional')} onInput={v => set({ helpText: v || undefined })} />
        </Field>
        {align('center')}
      </div>
    );
  }

  // embed
  const bad = config.url && !safeEmbedUrl(config.url);
  return (
    <div class="stack">
      <Field label={t('fieldInspector.embedUrl')} hint={bad ? t('fieldInspector.embedHttps') : t('fieldInspector.embedHint')}>
        <TextInput value={config.url} placeholder="https://calendly.com/…" onInput={v => setConfig({ url: v.trim() })} />
      </Field>
      <Field label={t('fieldInspector.height')}>
        <NumberInput min={120} max={1200} value={config.height ?? 420} onInput={v => setConfig({ height: v || 420 })} />
      </Field>
      {caption}
    </div>
  );
}

/** Weekday names in the interface language, Monday first (index = JS weekday 0–6). */
const weekdays = () =>
  [1, 2, 3, 4, 5, 6, 0].map(d => {
    let name = String(d);
    try {
      name = new Date(2024, 0, 7 + d).toLocaleDateString(locale.value, { weekday: 'short' }).replace('.', '');
    } catch (e) {
      /* keep the number */
    }
    return { day: d, name };
  });

/** Earliest / latest day and the weekdays that cannot be picked (calendar fields). */
function DateLimits({ config, setConfig, closedDays = true }: { config: { [k: string]: any }; setConfig: (patch: { [k: string]: any }) => void; closedDays?: boolean }) {
  const minMode = !config.minDate ? 'any' : config.minDate === 'today' ? 'today' : 'date';
  const maxMode = !config.maxDate ? 'none' : /^\+\d+$/.test(String(config.maxDate)) ? 'days' : 'date';
  const off: number[] = config.disabledWeekdays || [];
  return (
    <div class="stack">
      <Field label={t('fieldInspector.earliestDay')}>
        <div class="stack tight">
          <Segmented
            value={minMode}
            onChange={v => setConfig({ minDate: v === 'any' ? undefined : v === 'today' ? 'today' : new Date().toISOString().slice(0, 10) })}
            options={[
              { value: 'any', label: t('fieldInspector.anyDay') },
              { value: 'today', label: t('fieldInspector.fromToday') },
              { value: 'date', label: t('fieldInspector.aDate') },
            ]}
          />
          {minMode === 'date' && <TextInput type="date" value={config.minDate} onInput={v => setConfig({ minDate: v || undefined })} />}
        </div>
      </Field>
      <Field label={t('fieldInspector.latestDay')}>
        <div class="stack tight">
          <Segmented
            value={maxMode}
            onChange={v => setConfig({ maxDate: v === 'none' ? undefined : v === 'days' ? '+60' : new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10) })}
            options={[
              { value: 'none', label: t('fieldInspector.noLimit') },
              { value: 'days', label: t('fieldInspector.daysAhead') },
              { value: 'date', label: t('fieldInspector.aDate') },
            ]}
          />
          {maxMode === 'days' && (
            <div class="row-gap">
              <NumberInput min={1} max={730} value={Number(String(config.maxDate).slice(1))} onInput={v => setConfig({ maxDate: `+${v || 1}` })} />
              <span class="ui-hint">{t('fieldInspector.daysFromToday')}</span>
            </div>
          )}
          {maxMode === 'date' && <TextInput type="date" value={config.maxDate} onInput={v => setConfig({ maxDate: v || undefined })} />}
        </div>
      </Field>
      {closedDays && (
      <Field label={t('fieldInspector.closedDays')} hint={t('fieldInspector.closedDaysHint')}>
        <div class="weekday-chips">
          {weekdays().map(({ day, name }) => {
            const closed = off.includes(day);
            return (
              <button key={day} class={`weekday-chip ${closed ? 'closed' : ''}`} aria-pressed={closed} onClick={() => setConfig({ disabledWeekdays: closed ? off.filter(d => d !== day) : [...off, day] })}>
                {name}
              </button>
            );
          })}
        </div>
      </Field>
      )}
    </div>
  );
}

/** Multiple dates: limits, how many days, and optional time slots per day. */
function DatesSettings({ field }: { field: FormField }) {
  const config = field.config || {};
  const setConfig = (patch: { [k: string]: any }) => updateField(field.id, { config: { ...config, ...patch } }, `dates:${field.id}`);
  const slots: { label: string; value: any }[] = config.slots || [];
  return (
    <div class="stack">
      <DateLimits config={config} setConfig={setConfig} />
      <Field label={t('fieldInspector.maxDays')} hint={t('fieldInspector.maxDaysHint')}>
        <NumberInput min={1} value={config.maxDays} placeholder={t('fieldInspector.noLimit')} onInput={v => setConfig({ maxDays: v || undefined })} />
      </Field>
      <Toggle
        label={t('fieldInspector.askTimes')}
        description={t('fieldInspector.askTimesHint')}
        checked={slots.length > 0}
        onChange={v =>
          updateField(field.id, {
            config: { ...config, slots: v ? [{ label: t('fieldInspector.slotMorning'), value: 'morning' }, { label: t('fieldInspector.slotAfternoon'), value: 'afternoon' }] : undefined },
            defaultValue: undefined,
          })
        }
      />
      {slots.length > 0 && (
        <Field label={t('fieldInspector.timeSlots')}>
          <TextList
            items={slots}
            addLabel={t('fieldInspector.addSlot')}
            placeholder={n => t('fieldInspector.slotN', { n })}
            onChange={(labels, from) => setConfig({ slots: labels.map((label, i) => ({ label, value: from[i][0] ? from[i][0].value : toModelKey(label, `slot${i + 1}`) })) })}
          />
        </Field>
      )}
    </div>
  );
}

/** Hidden field: where its value comes from. */
function HiddenSettings({ field }: { field: FormField }) {
  const config = field.config || {};
  const setConfig = (patch: { [k: string]: any }) => updateField(field.id, { config: { ...config, ...patch } }, `hidden:${field.id}`);
  const source = config.source || 'url';
  const hasData = prefillSources.value.some(s => s.kind !== 'list');
  return (
    <div class="stack">
      <div class="ui-hint">{t('fieldInspector.hiddenHint')}</div>
      <Field label={t('fieldInspector.hiddenName')}>
        <TextInput value={field.label} onInput={v => updateField(field.id, { label: v })} />
      </Field>
      <Field label={t('fieldInspector.hiddenSource')}>
        <Segmented
          value={source}
          onChange={v => setConfig({ source: v })}
          options={[
            { value: 'url', label: t('fieldInspector.hiddenFromUrl') },
            { value: 'fixed', label: t('fieldInspector.hiddenFixedValue') },
            ...(hasData ? [{ value: 'data', label: t('fieldInspector.hiddenFromData') }] : []),
          ]}
        />
      </Field>
      {source === 'url' && (
        <Field label={t('fieldInspector.hiddenParam')} hint={t('fieldInspector.hiddenParamHint', { example: `?${config.param || field.model}=…` })}>
          <TextInput mono value={config.param} placeholder={field.model} onInput={v => setConfig({ param: v.trim() || undefined })} />
        </Field>
      )}
      {source === 'fixed' && (
        <Field label={t('fieldInspector.hiddenValue')}>
          <TextInput value={config.value} onInput={v => setConfig({ value: v })} />
        </Field>
      )}
      {source === 'data' && <AutoFill field={field} />}
      <Field label={t('fieldInspector.fieldKey')} hint={t('fieldInspector.hiddenKeyHint', { token: `{{field:${field.model}}}` })}>
        <TextInput mono value={field.model} onInput={v => updateField(field.id, { model: v.replace(/[^\w.-]/g, ''), inputName: v.replace(/[^\w.-]/g, '') })} />
      </Field>
    </div>
  );
}

/** The chosen video, playable, so people see what they picked. */
function VideoPreview({ src }: { src: { kind: 'iframe' | 'file'; src: string } }) {
  const [failed, setFailed] = useState('');
  if (failed === src.src) return <div class="media-preview is-broken">{t('design.previewFailed')}</div>;
  return (
    <div class="media-preview is-video">
      {src.kind === 'file' ? (
        <video src={src.src} controls muted playsInline preload="metadata" onError={() => setFailed(src.src)} />
      ) : (
        <iframe src={src.src} title={t('fieldInspector.videoUrl')} allow="encrypted-media; picture-in-picture; fullscreen" loading="lazy" />
      )}
    </div>
  );
}

/** Uploads a video to the host's storage (up to 50 MB). */
function VideoUpload({ onDone }: { onDone: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <label class={`btn small ${busy ? 'is-busy' : ''}`}>
      <Icon name="upload" size={14} /> {busy ? t('design.uploading') : t('fieldInspector.uploadVideo')}
      <input
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        disabled={busy}
        onChange={async e => {
          const input = e.target as HTMLInputElement;
          const file = input.files && input.files[0];
          input.value = '';
          if (!file) return;
          if (file.size > MAX_VIDEO_UPLOAD) return notify(t('fieldInspector.videoTooBig'));
          setBusy(true);
          try {
            onDone(await uploadMedia(file, 'video'));
          } catch (err) {
            notify(t('design.uploadFailed'));
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}

/** The thank-you page break: what it is, and what can go on it. */
function EndingPanel() {
  return (
    <div class="stack">
      <div class="ui-hint">{t('fieldInspector.endingHint')}</div>
      <div class="ui-hint">{t('fieldInspector.endingContentHint')}</div>
    </div>
  );
}

/** Whether a field has a Settings section: in the simple view only the types whose settings people need to make it work. */
function hasSettings(field: FormField, adv: boolean): boolean {
  const simple = ['rating', 'scale', 'slider', 'file', 'heading', 'radioGroup', 'checkboxGroup', 'phone', 'likert', 'ranking', 'search', 'address', 'dates', 'dateRange', 'month', 'week', 'year', 'yesNo', 'pictureChoice'];
  if (!adv) return simple.includes(field.type) || (field.type === 'input' && field.inputType === 'tel');
  return simple.includes(field.type) || ['countrySelect', 'textarea', 'signature', 'select'].includes(field.type) || (field.type === 'input' && !['checkbox', 'color'].includes(field.inputType || 'text'));
}

/** The block's settings, then (in a form with several languages) the translations of its texts. */
export function FieldInspector({ field }: { field: FormField }) {
  const prefix = `field.${field.id}.`;
  return (
    <>
      <InspectorBody field={field} />
      <div class="inspector-body inspector-tail">
        <InlineTranslations match={key => key.startsWith(prefix)} />
        {/* last, under the translations: where the rest of the settings are */}
        <AdvancedNote field={field} />
      </div>
    </>
  );
}

function InspectorBody({ field }: { field: FormField }) {
  if (isContainer(field)) return <RowInspector field={field} />;
  const def = typeDefFor(field);
  const layoutOnly = isLayoutType(field.type);
  const adv = advancedView.value;
  const ruleCount = (field.validations || []).length;
  // conditional logic, field keys and the like belong to the advanced view
  const rules = adv ? (
    <Section title={t('fieldInspector.rules')} icon="zap" defaultOpen={!!field.logic} badge={logicRules(field).length}>
      <Logic field={field} />
    </Section>
  ) : null;
  const advancedSection = adv && (
    <Section title={t('common.advanced')} icon="settings" defaultOpen={false}>
      <Advanced field={field} />
    </Section>
  );
  const head = <Title field={field} name={fieldTypeLabel(def)} description={fieldTypeDescription(def)} icon={def.icon} />;

  if (field.type === 'section') {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.section')} icon="layout">
          <SectionSettings field={field} />
        </Section>
        {rules}
        {advancedSection}
      </div>
    );
  }
  if (field.type === 'repeater') {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.group')} icon="repeat">
          <RepeaterSettings field={field} />
          {adv && <AutoFill field={field} />}
        </Section>
        {adv && (
          <Section title={t('fieldInspector.howItemsOpen')} icon="pointer" defaultOpen={false}>
            <RepeaterBehavior field={field} />
          </Section>
        )}
        <Section title={t('fieldInspector.itemsLimits')} icon="hash">
          <RepeaterLimits field={field} />
        </Section>
        {adv && (
          <Section title={t('fieldInspector.addChoices')} icon="listChecks" defaultOpen={false} badge={((field.config && field.config.presets) || []).length}>
            <RepeaterPresets field={field} />
          </Section>
        )}
        {rules}
        {advancedSection}
      </div>
    );
  }
  if (field.type === 'tabs') {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.tabs')} icon="tabs" badge={(field.tabs || []).length}>
          <TabsSettings field={field} />
        </Section>
        {rules}
        {advancedSection}
      </div>
    );
  }
  if (field.type === 'modal') {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.dialog')} icon="dialog">
          <ModalSettings field={field} />
        </Section>
        <Section title={t('fieldInspector.whenConfirmed')} icon="play" badge={((field.config && field.config.confirmActions) || []).length}>
          <ModalActions field={field} />
        </Section>
      </div>
    );
  }
  if (field.type === 'button') {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.button')} icon="pointer">
          <ButtonSettings field={field} />
        </Section>
        <Section title={t('fieldInspector.whenClicked')} icon="play" badge={((field.config && field.config.actions) || []).length}>
          <ButtonActions field={field} />
        </Section>
        {rules}
        {advancedSection}
      </div>
    );
  }
  if (field.type === 'callout') {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.message')} icon="info">
          <CalloutSettings field={field} />
        </Section>
        {rules}
        {advancedSection}
      </div>
    );
  }
  if (field.type === 'hidden') {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.hiddenTitle')} icon="eyeOff">
          <HiddenSettings field={field} />
        </Section>
      </div>
    );
  }
  if (['image', 'video', 'link', 'icon', 'embed'].includes(field.type)) {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.content')} icon={typeDefFor(field).icon}>
          <ContentSettings field={field} />
        </Section>
        {rules}
        {advancedSection}
      </div>
    );
  }
  if (field.type === 'pageBreak' && field.config && field.config.ending) {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.thankYouPage')} icon="party">
          <EndingPanel />
        </Section>
      </div>
    );
  }
  if (field.type === 'pageBreak') {
    return (
      <div class="inspector-body">
        {head}
        <Section title={t('fieldInspector.step')} icon="pageBreak">
          <StepPanel field={field} />
        </Section>
        {rules}
      </div>
    );
  }

  return (
    // keyed by the field: each field starts with its sections as set below (in the simple view only "Question" is open)
    <div class="inspector-body" key={field.id}>
      {head}

      <Section title={t('fieldInspector.question')} icon="text">
        <div class="stack">
          <Question field={field} />
          {!layoutOnly && <DefaultValue field={field} />}
          {adv && !layoutOnly && <AutoFill field={field} />}
        </div>
      </Section>

      {hasOptions(field) && (
        <Section title={t('fieldInspector.options')} icon="listChecks" defaultOpen={adv || field.config?.optionsFrom === 'platform'} badge={field.config?.optionsFrom === 'platform' ? undefined : (field.options || []).length}>
          {field.config?.optionsFrom === 'platform' ? <div class="ui-hint pad">{t('fieldInspector.platformChoices')}</div> : <OptionsEditor field={field} />}
        </Section>
      )}

      {hasSettings(field, adv) && (
        <Section title={t('common.settings')} icon="settings" defaultOpen={adv}>
          {field.type === 'signature' ? <SignatureSettings field={field} /> : <TypeSettings field={field} />}
        </Section>
      )}

      {canRequire(field) && field.type !== 'toggle' && (
        <Section title={t('fieldInspector.validation')} icon="check" defaultOpen={adv} badge={ruleCount}>
          <Validation field={field} />
        </Section>
      )}

      {adv && (
        <Section title={t('fieldInspector.layout')} icon="layout" defaultOpen={false}>
          <LayoutSection field={field} />
        </Section>
      )}

      {rules}

      {advancedSection}
    </div>
  );
}
