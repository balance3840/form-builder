import { useState } from 'preact/hooks';
import { applyPrefill, pageStyle } from '../generator';
import { prefillSources } from '../host';
import { useMemo } from 'preact/hooks';
import { Icon } from '../icons';
import { doc, formLanguages } from '../store';
import { languageInfo } from '../generator';
import { Select } from './ui';
import { t } from '../i18n';
import { FormView } from './ui';

const DEVICES = [
  { id: 'desktop', label: () => t('preview.desktop'), icon: 'monitor', width: '100%' },
  { id: 'tablet', label: () => t('preview.tablet'), icon: 'tablet', width: '768px' },
  { id: 'mobile', label: () => t('preview.phone'), icon: 'smartphone', width: '390px' },
];

export function Preview({ showDevices = true }: { showDevices?: boolean }) {
  const [device, setDevice] = useState('desktop');
  const [result, setResult] = useState<any>(null);
  const [run, setRun] = useState(0);
  const [language, setLanguage] = useState('');
  const d = doc.value;
  const width = (DEVICES.find(x => x.id === device) || DEVICES[0]).width;

  // the host's data is not here: its {{tokens}} show the example values (or the names) of the data sources
  const previewDoc = useMemo(() => {
    const sample: { [key: string]: string } = {};
    prefillSources.value.forEach(src => (sample[src.key] = src.example || src.label));
    return prefillSources.value.length ? applyPrefill(d, sample).doc : d;
  }, [d, prefillSources.value]);

  return (
    <div class="preview">
      <div class="preview-bar">
        {showDevices && (
          <div class="ui-segmented icons">
            {DEVICES.map(x => (
              <button key={x.id} class={x.id === device ? 'active' : ''} onClick={() => setDevice(x.id)} title={x.label()}>
                <Icon name={x.icon} size={16} />
              </button>
            ))}
          </div>
        )}
        {formLanguages.value.length > 1 && (
          <div class="preview-lang">
            <Icon name="languages" size={15} />
            <Select value={language} onChange={setLanguage} options={[{ value: '', label: t('preview.autoLanguage') }, ...formLanguages.value.map(c => ({ value: c, label: `${languageInfo(c).flag ? languageInfo(c).flag + ' ' : ''}${languageInfo(c).name}` }))]} />
          </div>
        )}
        <button
          class="btn ghost small"
          onClick={() => {
            setResult(null);
            setRun(run + 1);
          }}
        >
          <Icon name="refresh" size={14} /> {t('preview.restart')}
        </button>
      </div>
      <div class="preview-scroll" style={pageStyle(d.theme)}>
        <div class={`device ${device}`} style={{ width }}>
          <FormView key={run} schema={previewDoc} theme={d.theme} language={language || null} onSubmitted={detail => setResult(detail.values)} />
        </div>
      </div>
      {result && (
        <div class="preview-result">
          <div class="preview-result-head">
            <strong>{t('preview.submittedData')}</strong>
            <span class="ui-hint">{t('preview.submittedHint')}</span>
            <button class="icon-btn" onClick={() => setResult(null)} aria-label={t('preview.dismiss')}>
              <Icon name="x" size={14} />
            </button>
          </div>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
