import { advancedView } from '../view';
import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { LANGUAGES, languageInfo, translationProgress } from '../generator';
import { rich, t } from '../i18n';
import { Icon } from '../icons';
import { addLanguage, defaultLanguage, doc, formLanguages, removeLanguage, setDefaultLanguage, setI18nOption, tab, targetLanguages } from '../store';
import { Field, Section, Segmented, Select, Toggle } from './ui';

/** The language currently being edited in the Translate tab. */
export const translateTarget = signal('');

/** Settings for the form's languages (shown in the form settings panel). */
export function LanguagesSection() {
  const i18n = (doc.value.i18n || {}) as any;
  const languages = formLanguages.value;
  const [adding, setAdding] = useState('');
  const available = LANGUAGES.filter(l => !languages.includes(l.code));
  const multi = languages.length > 1;

  return (
    <Section title={t('languages.title')} icon="languages" defaultOpen={multi} badge={multi ? languages.length : null}>
      <div class="stack">
        <div class="ui-hint">{t('languages.intro')}</div>

        <Field label={t('languages.writtenIn')}>
          <Select value={defaultLanguage.value} onChange={v => setDefaultLanguage(v)} options={LANGUAGES.map(l => ({ value: l.code, label: `${l.flag ? l.flag + ' ' : ''}${l.name}` }))} />
        </Field>

        {targetLanguages.value.length > 0 && (
          <div class="lang-list">
            {targetLanguages.value.map(code => {
              const info = languageInfo(code);
              const { done, total } = translationProgress(doc.value, code);
              return (
                <div class="lang-row" key={code}>
                  <span class="lang-flag">{info.flag || code.toUpperCase()}</span>
                  <span class="lang-name">{info.name}</span>
                  <span class={`lang-progress ${total && done === total ? 'done' : ''}`}>
                    {done}/{total}
                  </span>
                  <button
                    class="link-btn"
                    onClick={() => {
                      translateTarget.value = code;
                      tab.value = 'translate';
                    }}
                  >
                    {t('languages.translate')}
                  </button>
                  <button class="icon-btn" aria-label={t('languages.removeLanguage', { name: info.name })} onClick={() => removeLanguage(code)}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <Field label={t('languages.add')}>
          <Select
            value={adding}
            placeholder={t('languages.choose')}
            options={available.map(l => ({ value: l.code, label: `${l.flag ? l.flag + ' ' : ''}${l.name}` }))}
            onChange={v => {
              if (!v) return;
              setAdding('');
              addLanguage(v);
              translateTarget.value = v;
            }}
          />
        </Field>

        {multi && (
          <>
            {advancedView.value && <Toggle label={t('languages.detect')} description={t('languages.detectDescription')} checked={i18n.detect !== false} onChange={v => setI18nOption({ detect: v })} />}
            <Field label={t('languages.switcher')} hint={t('languages.switcherHint')}>
              <Segmented
                value={i18n.switcher || 'none'}
                onChange={v => setI18nOption({ switcher: v })}
                options={[
                  { value: 'none', label: t('languages.none') },
                  { value: 'flags', label: t('languages.flags') },
                  { value: 'dropdown', label: t('languages.dropdown') },
                ]}
              />
            </Field>
            <div class="ui-hint" hidden={!advancedView.value}>
              {rich('languages.forceHint', { code: <code>{'<re-form-generator language="es">'}</code> })}
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
