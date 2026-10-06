import { advancedView } from '../view';
import { useState } from 'preact/hooks';
import { BUILT_IN_UI, LANGUAGES, UI_KEYS, Translatable, collectTranslatables, createTranslator, languageInfo, translationProgress } from '../generator';
import { MessageKey, t, tOr } from '../i18n';
import { Icon } from '../icons';
import { addLanguage, copySourceToEmpty, defaultLanguage, doc, formLanguages, importTranslations, setTranslation, tab, targetLanguages } from '../store';
import { ImportResult, exportTranslations, readTranslations } from '../translationsFile';
import { translateTarget } from './Languages';
import { Section, Select, Toggle } from './ui';

const baseOf = (code: string) => code.toLowerCase().split('-')[0];

/** Readable name of a built-in text (the key is shown too, for reference). Error messages are named after their rule. */
const builtInName = (key: string) => (key.startsWith('validation.') ? tOr(`translate.builtIn.${key}`, tOr(`lib.rule.${key.slice(11)}.label`, key)) : tOr(`translate.builtIn.${key}`, key));

/** What each translatable text is, keyed by the generator's English description. */
const ITEM_LABELS: { [english: string]: MessageKey } = {
  Title: 'translate.item.title',
  Description: 'translate.item.description',
  'Submit button': 'translate.item.submitButton',
  'Thank-you message': 'translate.item.thanks',
  'Error message': 'translate.item.errorMessage',
  'Form error message': 'translate.item.formErrorMessage',
  'First step title': 'translate.item.firstStepTitle',
  'First step description': 'translate.item.firstStepDescription',
  'Next button': 'translate.item.nextButton',
  'Back button': 'translate.item.backButton',
  'First step picture description': 'translate.item.firstStepImageAlt',
  '“Save and exit” button': 'translate.item.exitButton',
  'Footer text': 'translate.item.footerText',
  'Copyright line': 'translate.item.copyright',
  'Step title': 'translate.item.stepTitle',
  'Button text': 'translate.item.buttonText',
  Question: 'translate.item.question',
  'Checkbox text': 'translate.item.checkboxText',
  Subtitle: 'translate.item.subtitle',
  'Help text': 'translate.item.helpText',
  Placeholder: 'translate.item.placeholder',
  Text: 'translate.item.text',
  'Left label': 'translate.item.minLabel',
  'Right label': 'translate.item.maxLabel',
  Unit: 'translate.item.unit',
  'Upload text': 'translate.item.uploadText',
  'Upload hint': 'translate.item.uploadHint',
  '“Other” option': 'translate.item.otherOption',
  '“Add” button': 'translate.item.addButton',
  'Item title': 'translate.item.itemTitle',
  'Item summary': 'translate.item.itemSummary',
  'Text when empty': 'translate.item.emptyText',
  Caption: 'translate.item.caption',
  'Image description': 'translate.item.imageDescription',
  'Type picker label (dialog)': 'translate.item.presetLabel',
  'Type picker “custom” entry': 'translate.item.presetCustomLabel',
  'Dialog “confirm” button': 'translate.item.confirmLabel',
  'Dialog “cancel” button': 'translate.item.cancelLabel',
  'Dialog title when adding': 'translate.item.addTitle',
  'Dialog title when editing': 'translate.item.editTitle',
  '“Back” link of an open item': 'translate.item.backLabel',
  '“Sign” button': 'translate.item.signLabel',
  'Help tooltip': 'translate.item.tooltip',
  'Hint inside the box': 'translate.item.hint',
  'Sidebar title': 'translate.item.sidebarTitle',
  'Sidebar subtitle': 'translate.item.sidebarSubtitle',
};

/** The generator describes each text in English; this names it in the interface language. */
function itemLabel(item: Translatable): string {
  if (ITEM_LABELS[item.label]) return t(ITEM_LABELS[item.label]);
  const name = (/“([^”]*)”/.exec(item.label) || [])[1] || '';
  const k = item.key.split('.');
  if (k[0] === 'footer' && k[1] === 'link') return t('translate.item.footerLink', { n: Number(k[2]) + 1 });
  if (k[0] === 'settings' && k[1] === 'sidebarActions') return t('translate.item.sidebarButton', { n: Number(k[2]) + 1 });
  if (k[0] !== 'field') return item.label;
  if (k[2] === 'tab') return t('translate.item.tab', { name });
  if (k[2] === 'option') return t('translate.item.option', { name });
  if (k[2] === 'row') return t('translate.item.statement', { name });
  if (k[2] === 'optionDesc') return t('translate.item.descriptionOf', { name });
  if (k[2] === 'optionBadge') return t('translate.item.badgeOf', { name });
  if (k[2] === 'optionHelp') return t('translate.item.helpOf', { name });
  if (k[2] === 'optionLink') return t('translate.item.linkOf', { name });
  if (k[2] === 'optionAlt') return t('translate.item.pictureOf', { name });
  if (k[2] === 'group') return t('translate.item.optionGroup', { name });
  if (k[2] === 'validation') return t('translate.item.ruleMessage', { rule: k.slice(3).join('.') });
  if (k[2] === 'preset' && k[4] === 'label') return t('translate.item.choice', { name });
  if (k[2] === 'preset' && k[4] === 'description') return t('translate.item.descriptionOf', { name });
  return item.label;
}

const groupName = (group: string) => (group === 'Form' ? t('translate.group.form') : group === 'Footer' ? t('translate.group.footer') : group);

function Row({ item, language, value }: { item: Translatable; language: string; value: string }) {
  return (
    <div class="tr-row">
      <div class="tr-source">
        <div class="tr-label">{itemLabel(item)}</div>
        <div class="tr-text">{item.source}</div>
      </div>
      {item.multiline ? (
        <textarea class="ui-input ui-textarea" rows={2} value={value} placeholder={t('translate.translation')} dir={languageInfo(language).dir} onInput={e => setTranslation(language, item.key, (e.target as HTMLTextAreaElement).value)} />
      ) : (
        <input class="ui-input" value={value} placeholder={t('translate.translation')} dir={languageInfo(language).dir} onInput={e => setTranslation(language, item.key, (e.target as HTMLInputElement).value)} />
      )}
    </div>
  );
}

/** The built-in texts (buttons, step counter, default error messages) with their default for this language. */
function BuiltIn({ language, dict }: { language: string; dict: { [key: string]: string } }) {
  const overridden = UI_KEYS.filter(k => dict[k]).length;
  const builtIn = createTranslator(language);
  const hasBuiltIn = !!(BUILT_IN_UI[language.toLowerCase()] || BUILT_IN_UI[baseOf(language)]);
  const groups = [
    { id: 'ui', title: t('translate.buttonsAndMessages'), keys: UI_KEYS.filter(k => k.startsWith('ui.')) },
    { id: 'validation', title: t('translate.defaultErrors'), keys: UI_KEYS.filter(k => k.startsWith('validation.')) },
  ];
  return (
    <>
      {!hasBuiltIn && <div class="callout info">{t('translate.noBuiltIn')}</div>}
      {overridden > 0 && <div class="tr-overridden">{t('translate.overridden', { count: overridden })}</div>}
      {groups.map(group => (
        <Section key={group.id} title={group.title} defaultOpen={group.id === 'ui'} badge={UI_KEYS.filter(k => group.keys.includes(k) && dict[k]).length || null}>
          <div class="stack">
            {group.keys.map(key => (
              <div class="tr-row" key={key}>
                <div class="tr-source">
                  <div class="tr-label">{builtInName(key)}</div>
                  <div class="tr-text">{BUILT_IN_UI.en[key]}</div>
                  <div class="tr-key mono">{key}</div>
                </div>
                <input class="ui-input" value={dict[key] || ''} placeholder={builtIn(key)} dir={languageInfo(language).dir} onInput={e => setTranslation(language, key, (e.target as HTMLInputElement).value)} />
              </div>
            ))}
          </div>
        </Section>
      ))}
    </>
  );
}

type FileOutcome = { result?: ImportResult; error?: string };

function downloadTranslations() {
  const file = exportTranslations(doc.value);
  const name = (doc.value.title || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'form';
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}-translations.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Export / Import: every text of the form as a JSON file, to translate outside the builder (a translator, an AI). */
function FileButtons({ onOutcome }: { onOutcome: (outcome: FileOutcome) => void }) {
  const pick = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    file.text().then(
      text => {
        try {
          const result = readTranslations(text, doc.value);
          if (result.imported) {
            importTranslations(result.updates);
            if (result.newLanguages.length) translateTarget.value = result.newLanguages[0];
          }
          onOutcome({ result });
        } catch (error) {
          onOutcome({ error: error instanceof Error && error.message === 'too-large' ? t('translate.importTooLarge') : t('translate.importFailed') });
        }
      },
      () => onOutcome({ error: t('translate.importFailed') }),
    );
  };
  return (
    <div class="tr-file">
      <button class="btn ghost small" onClick={downloadTranslations} title={t('translate.exportFileTitle')}>
        <Icon name="download" size={14} /> {t('translate.exportFile')}
      </button>
      <label class="btn ghost small" title={t('translate.importFileTitle')}>
        <Icon name="upload" size={14} /> {t('translate.importFile')}
        <input type="file" accept=".json,application/json" class="visually-hidden" onChange={pick} />
      </label>
    </div>
  );
}

function FileOutcomeCard({ outcome, onClose }: { outcome: FileOutcome; onClose: () => void }) {
  const result = outcome.result;
  const lines: string[] = [];
  if (outcome.error) lines.push(outcome.error);
  else if (result) {
    lines.push(result.imported ? t('translate.importDone', { count: result.imported }) : result.unchanged ? t('translate.importUpToDate') : t('translate.importNothing'));
    if (result.newLanguages.length) lines.push(t('translate.importAdded', { languages: result.newLanguages.map(code => languageInfo(code).name).join(', ') }));
    if (result.unknown) lines.push(t('translate.importUnknown', { count: result.unknown }));
  }
  // amber (the plain callout) when something needs a look, green when all went in
  const good = !outcome.error && !!result?.imported && !result.placeholders.length;
  return (
    <div class={`callout ${good ? 'good' : ''} tr-file-outcome`} role="status">
      <div class="grow">
        {lines.map(line => (
          <div key={line}>{line}</div>
        ))}
        {result && result.placeholders.length > 0 && (
          <div class="tr-file-placeholders">
            <div>{t('translate.importPlaceholders')}</div>
            <ul>
              {result.placeholders.slice(0, 5).map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <button class="icon-btn" onClick={onClose} aria-label={t('translate.closeOutcome')} title={t('translate.closeOutcome')}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

export function TranslatePane() {
  const all = formLanguages.value;
  const def = defaultLanguage.value;
  const targets = targetLanguages.value;
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [adding, setAdding] = useState('');
  const [outcome, setOutcome] = useState<FileOutcome | null>(null);
  const adv = advancedView.value;
  // the form's own language tab only holds the built-in wording overrides: an advanced setting
  const shown = adv ? all : targets;
  const language = shown.includes(translateTarget.value) ? translateTarget.value : targets[0] || def;
  const isDefault = language === def;

  const items = collectTranslatables(doc.value);
  const dict = ((doc.value.i18n || {}) as any).translations?.[language] || {};
  const { done, total } = translationProgress(doc.value, language);
  const visible = items.filter(i => !onlyMissing || !(dict[i.key] && dict[i.key].trim()));
  const groups: { id: string; name: string; items: Translatable[] }[] = [];
  visible.forEach(item => {
    const last = groups[groups.length - 1];
    // items of one field share the id in their key (`field.<id>.label`); two fields can have the same name
    const id = item.key.startsWith('field.') ? item.key.split('.')[1] : item.group;
    if (last && last.id === id) last.items.push(item);
    else groups.push({ id, name: item.group, items: [item] });
  });
  const info = languageInfo(language);

  return (
    <div class="code-pane">
      <div class="code-head">
        <div class="tr-langs">
          {shown.map(code => {
            const meta = languageInfo(code);
            const p = code === def ? null : translationProgress(doc.value, code);
            return (
              <button key={code} class={`tr-lang ${code === language ? 'active' : ''}`} onClick={() => (translateTarget.value = code)} title={code === def ? t('translate.defaultLanguageTitle') : undefined}>
                <span class="lang-flag">{meta.flag || code.toUpperCase()}</span>
                {meta.name}
                {p ? (
                  <span class={`lang-progress ${p.total && p.done === p.total ? 'done' : ''}`}>
                    {p.done}/{p.total}
                  </span>
                ) : (
                  <span class="lang-progress">{t('translate.wording')}</span>
                )}
              </button>
            );
          })}
        </div>
        <FileButtons onOutcome={setOutcome} />
      </div>
      {outcome && <FileOutcomeCard outcome={outcome} onClose={() => setOutcome(null)} />}

      {!targets.length && (
        <div class="code-card translate-empty">
          <div class="empty-icon">
            <Icon name="languages" size={26} />
          </div>
          <h3>{t('translate.emptyTitle')}</h3>
          <p>{t('translate.emptyText')}</p>
          <div class="translate-add">
            <Select
              value={adding}
              placeholder={t('languages.choose')}
              options={LANGUAGES.filter(l => l.code !== def).map(l => ({ value: l.code, label: `${l.flag ? l.flag + ' ' : ''}${l.name}` }))}
              onChange={v => {
                if (!v) return;
                setAdding('');
                addLanguage(v);
                translateTarget.value = v;
              }}
            />
          </div>
          <div class="ui-hint">{t('translate.writtenIn', { language: languageInfo(def).name })}</div>
        </div>
      )}

      {!isDefault && (
        <div class="code-card">
          <div class="code-toolbar">
            <span class={`status ${total && done === total ? 'good' : ''}`}>
              {t('translate.progress', { language: `${info.flag ? info.flag + ' ' : ''}${info.name}`, done, total })}
            </span>
            <div class="grow" />
            <Toggle label={t('translate.onlyMissing')} checked={onlyMissing} onChange={setOnlyMissing} />
            <button class="btn ghost small" onClick={() => copySourceToEmpty(language, items)} title={t('translate.copyOriginalTitle')}>
              {t('translate.copyOriginal')}
            </button>
            <button class="btn small" onClick={() => (tab.value = 'preview')}>
              <Icon name="play" size={14} /> {t('translate.preview')}
            </button>
          </div>
          <div class="tr-progress">
            <div style={{ width: `${total ? (done / total) * 100 : 100}%` }} />
          </div>

          <div class="tr-body">
            {!items.length && <div class="ui-hint pad">{t('translate.noItems')}</div>}
            {groups.map(group => (
              <div class="tr-group" key={group.id}>
                <div class="tr-group-title">{groupName(group.name)}</div>
                {group.items.map(item => (
                  <Row key={item.key} item={item} language={language} value={dict[item.key] || ''} />
                ))}
              </div>
            ))}
            {items.length > 0 && !visible.length && <div class="callout good">{t('translate.allDone')}</div>}
          </div>
        </div>
      )}

      {adv && (
      <div class="code-card">
        <div class="tr-builtin-head">
          <strong>{t('translate.builtInTitle', { language: info.name })}</strong>
          <span class="ui-hint">
            {isDefault
              ? t('translate.builtInDefaultHint')
              : t('translate.builtInHint')}
          </span>
        </div>
        <BuiltIn language={language} dict={dict} />
      </div>
      )}
    </div>
  );
}

/**
 * The translations of one block (or of some form settings), right where it is edited: every text of it, with a box
 * per language. Shown in the inspector when the form has more than one language, so a step title is never left
 * behind in one language while the rest of the form is translated.
 */
export function InlineTranslations({ match, title }: { match: (key: string) => boolean; title?: string }) {
  const targets = targetLanguages.value;
  if (!targets.length) return null;
  const items = collectTranslatables(doc.value).filter(i => match(i.key));
  if (!items.length) return null;
  const all = ((doc.value.i18n || {}) as any).translations || {};
  const missing = items.reduce((n, item) => n + targets.filter(code => !(all[code] && all[code][item.key] && all[code][item.key].trim())).length, 0);
  return (
    <Section title={title || t('translate.inlineTitle')} icon="languages" badge={missing ? t('translate.inlineMissing', { count: missing }) : undefined} defaultOpen={false}>
      <div class="stack inline-tr">
        {items.map(item => (
          <div key={item.key} class="inline-tr-item">
            <div class="tr-label">{itemLabel(item)}</div>
            <div class="inline-tr-source">{item.source}</div>
            {targets.map(code => {
              const meta = languageInfo(code);
              const value = (all[code] && all[code][item.key]) || '';
              return (
                <label key={code} class={`inline-tr-row ${value.trim() ? '' : 'is-missing'}`} title={meta.name}>
                  <span class="lang-flag">{meta.flag || code.toUpperCase()}</span>
                  <input class="ui-input" value={value} placeholder={meta.name} dir={meta.dir} onInput={e => setTranslation(code, item.key, (e.target as HTMLInputElement).value)} />
                </label>
              );
            })}
          </div>
        ))}
        <button class="link-btn" onClick={() => (tab.value = 'translate')}>
          {t('translate.openAll')}
        </button>
      </div>
    </Section>
  );
}
