import { useEffect, useRef, useState } from 'preact/hooks';
import { FormDocument, isLegacySchema, languageInfo, loadDocument, pageStyleText } from '../generator';
import { Icon } from '../icons';
import { DEFAULT_LIB_URL, EmbedOptions, copy, download, embedSnippet, iframeSnippet, singleLanguageDoc, slug, standalonePage, stringify } from '../io';
import { options } from '../host';
import { advancedView } from '../view';
import { commit, doc, formLanguages, notify, replaceDoc, tab } from '../store';
import { Field, Segmented, Select, TextArea, TextInput, Toggle } from './ui';
import { rich, t } from '../i18n';

type Mode = 'iframe' | 'embed' | 'json' | 'import';

function tryLoad(text: string, extra: { action?: string; mapping?: string; showHidden?: boolean } = {}) {
  const parsed = JSON.parse(text);
  const legacy = isLegacySchema(parsed);
  const options: any = { showFieldsWithoutVisible: !!extra.showHidden };
  if (extra.action && extra.action.trim()) options.action = JSON.parse(extra.action);
  if (extra.mapping && extra.mapping.trim()) options.mapping = JSON.parse(extra.mapping);
  const result = loadDocument(parsed, options);
  return { doc: result.doc, legacy, notes: result.notes };
}

/* ------------------------------------------------------------------- JSON */

function JsonEditor() {
  const [text, setText] = useState(stringify(doc.value));
  const [error, setError] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Keep the editor in sync with changes made elsewhere, unless the user is typing in it.
  useEffect(() => {
    if (((ref.current && (ref.current.getRootNode() as Document | ShadowRoot).activeElement) || document.activeElement) !== ref.current) {
      setText(stringify(doc.value));
      setError(null);
      setLegacy(false);
    }
  }, [doc.value]);

  const onInput = (value: string) => {
    setText(value);
    try {
      const result = tryLoad(value);
      setLegacy(result.legacy);
      setError(null);
      if (!result.legacy) commit(result.doc, 'json');
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  return (
    <div class="code-card">
      <div class="code-toolbar">
        <span class={`status ${error ? 'bad' : 'good'}`}>{error ? t('code.invalidJson') : legacy ? t('code.v1Detected') : t('code.validJson')}</span>
        <div class="grow" />
        <button class="btn ghost small" onClick={() => tryFormat(text, setText)}>
          {t('code.format')}
        </button>
        <button class="btn ghost small" onClick={async () => notify((await copy(stringify(doc.value))) ? t('code.jsonCopied') : t('common.copyFailed'))}>
          <Icon name="copy" size={14} /> {t('common.copy')}
        </button>
        <button class="btn primary small" onClick={() => download(`${slug(doc.value.title || '')}.json`, stringify(doc.value))}>
          <Icon name="download" size={14} /> {t('common.download')}
        </button>
      </div>
      {error && <div class="code-error">{error}</div>}
      {legacy && (
        <div class="callout">
          {rich('code.v1Callout', { v1: <strong>v1</strong>, tab: <strong>{t('code.modeImport')}</strong> })}
        </div>
      )}
      <textarea ref={ref} class="code-area" spellcheck={false} value={text} onInput={e => onInput((e.target as HTMLTextAreaElement).value)} />
      <div class="ui-hint pad">
        {rich('code.jsonHint', { keys: <><code>type</code>, <code>model</code>, <code>label</code>, <code>validations</code>, <code>layout.cols</code>, <code>logic</code>…</> })}
      </div>
    </div>
  );
}

function tryFormat(text: string, set: (s: string) => void) {
  try {
    set(JSON.stringify(JSON.parse(text), null, 2));
  } catch (e) {
    notify(t('code.fixErrorsFirst'));
  }
}

/* ------------------------------------------------------------------ Embed */

type LangMode = 'all' | 'one';

function Embed() {
  const [lib, setLib] = useState(DEFAULT_LIB_URL);
  const [mode, setMode] = useState<LangMode>('all');
  const [language, setLanguage] = useState('');
  const [strip, setStrip] = useState(true);
  const d = doc.value;
  const languages = formLanguages.value;
  const multi = languages.length > 1;
  const chosen = languages.includes(language) ? language : languages[0];
  const one = multi && mode === 'one';

  // "All languages": the full form. "One language": either the full form forced to that language (attribute),
  // or a trimmed copy that only contains that language.
  const exported: FormDocument = one && strip ? singleLanguageDoc(d, chosen) : d;
  const options: EmbedOptions = { language: one && !strip ? chosen : undefined, hint: multi && mode === 'all' };
  const snippet = embedSnippet(exported, lib, options);
  const info = languageInfo(chosen);
  const i18n = (d.i18n || {}) as any;

  return (
    <div class="code-card">
      <div class="stack pad">
        <Field label={t('code.libraryUrl')} hint={t('code.libraryUrlHint')}>
          <TextInput mono value={lib} onInput={setLib} />
        </Field>

        {multi && (
          <div class="embed-lang">
            <Field label={t('code.embedLanguages')}>
              <Segmented<LangMode>
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'all', label: t('code.allLanguages', { count: languages.length }) },
                  { value: 'one', label: t('code.oneLanguage') },
                ]}
              />
            </Field>

            {mode === 'all' ? (
              <div class="ui-hint">
                {t('code.allLanguagesHint', { language: languageInfo(languages[0]).name })}{' '}
                {i18n.switcher === 'flags' ? t('code.switcherFlags') : i18n.switcher === 'dropdown' ? t('code.switcherDropdown') : t('code.switcherNone')}
              </div>
            ) : (
              <>
                <Field label={t('code.language')}>
                  <Select value={chosen} onChange={setLanguage} options={languages.map(c => ({ value: c, label: `${languageInfo(c).flag ? languageInfo(c).flag + ' ' : ''}${languageInfo(c).name}` }))} />
                </Field>
                <Toggle
                  label={t('code.strip')}
                  description={strip ? t('code.stripOn', { language: info.name }) : t('code.stripOff', { language: info.name, code: chosen })}
                  checked={strip}
                  onChange={setStrip}
                />
              </>
            )}
          </div>
        )}
      </div>
      <div class="code-toolbar">
        <span class="status good">{one ? (strip ? t('code.snippetOnly', { language: info.name }) : t('code.snippetForced', { language: info.name })) : t('code.snippet')}</span>
        <div class="grow" />
        {one && strip && (
          <button class="btn ghost small" onClick={() => download(`${slug(d.title || '')}.${chosen}.json`, stringify(exported))}>
            <Icon name="download" size={14} /> JSON
          </button>
        )}
        <button class="btn ghost small" onClick={async () => notify((await copy(snippet)) ? t('code.snippetCopied') : t('common.copyFailed'))}>
          <Icon name="copy" size={14} /> {t('common.copy')}
        </button>
        <button class="btn primary small" onClick={() => download(`${slug(d.title || '')}${one ? '.' + chosen : ''}.html`, standalonePage(exported, lib, pageStyleText(d.theme), options), 'text/html')}>
          <Icon name="download" size={14} /> {t('code.downloadPage')}
        </button>
      </div>
      <pre class="code-area readonly">{snippet}</pre>
    </div>
  );
}

/* ----------------------------------------------------------------- Iframe */

/**
 * The simplest way to put the form on any website (WordPress, Webflow, Wix…): an <iframe> of the published form. The
 * frame takes the form's height by itself, so steps and long forms never get a scrollbar inside the frame.
 */
function IframeEmbed() {
  const shareUrl = options.value.shareUrl || '';
  const [url, setUrl] = useState(shareUrl);
  const [auto, setAuto] = useState(true);
  const [height, setHeight] = useState(700);
  useEffect(() => setUrl(shareUrl), [shareUrl]);
  const d = doc.value;
  const address = url.trim();
  const valid = /^https?:\/\//i.test(address);
  const snippet = iframeSnippet(valid ? address : '', d.title || '', { autoHeight: auto, height });
  return (
    <div class="code-card">
      <div class="stack pad">
        <div class="ui-hint">{t('code.iframeIntro')}</div>
        <Field label={t('code.iframeUrl')} hint={shareUrl ? t('code.iframeUrlHosted') : t('code.iframeUrlHint')}>
          <TextInput mono value={url} placeholder="https://…" onInput={setUrl} />
        </Field>
        <Toggle label={t('code.iframeAuto')} description={auto ? t('code.iframeAutoOn') : t('code.iframeAutoOff')} checked={auto} onChange={setAuto} />
        {!auto && (
          <Field label={t('code.iframeHeight')}>
            <input class="ui-input" type="number" min={200} step={50} value={height} onInput={e => setHeight(Math.max(200, Number((e.target as HTMLInputElement).value) || 700))} />
          </Field>
        )}
      </div>
      <div class="code-toolbar">
        <span class={`status ${valid ? 'good' : ''}`}>{valid ? t('code.iframeReady') : t('code.iframeNeedsUrl')}</span>
        <div class="grow" />
        <button class="btn primary small" disabled={!valid} onClick={async () => notify((await copy(snippet)) ? t('code.snippetCopied') : t('common.copyFailed'))}>
          <Icon name="copy" size={14} /> {t('common.copy')}
        </button>
      </div>
      <pre class="code-area readonly">{snippet}</pre>
    </div>
  );
}

/* ----------------------------------------------------------------- Import */

function Importer() {
  const [text, setText] = useState('');
  const [action, setAction] = useState('');
  const [mapping, setMapping] = useState('');
  const [showHidden, setShowHidden] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ doc: FormDocument; legacy: boolean; notes: string[] } | null>(null);

  const analyse = (value = text, hidden = showHidden) => {
    setResult(null);
    if (!value.trim()) {
      setError(null);
      return;
    }
    try {
      setResult(tryLoad(value, { action, mapping, showHidden: hidden }));
      setError(null);
    } catch (e: any) {
      setError(e.message || String(e));
    }
  };

  return (
    <div class="code-card">
      <div class="stack pad">
        <div>
          <h3 class="h3">{t('code.importTitle')}</h3>
          <p class="ui-hint">
            {rich('code.importIntro', { v1: <strong>{t('code.v1Schemas')}</strong> })}
          </p>
        </div>
        <div class="row-gap">
          <label class="btn small">
            <Icon name="upload" size={14} /> {t('code.chooseFile')}
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async e => {
                const file = (e.target as HTMLInputElement).files![0];
                if (!file) return;
                const content = await file.text();
                setText(content);
                analyse(content);
              }}
            />
          </label>
        </div>
        <TextArea mono rows={10} value={text} placeholder={'[ { "type": "input", "inputType": "text", "label": "Name", ... } ]'} onInput={v => { setText(v); analyse(v); }} />
        <details class="v1-extra">
          <summary>{rich('code.v1Extra', { action: <code>action</code>, mapping: <code>mapping</code> })}</summary>
          <div class="stack pad-top">
            <Field label={t('code.actionJson')}>
              <TextArea mono rows={3} value={action} placeholder={'{ "endpoint": "https://…", "submitButtonText": "Apply" }'} onInput={v => { setAction(v); }} />
            </Field>
            <Field label={t('code.mappingJson')}>
              <TextArea mono rows={3} value={mapping} placeholder={'{ "applicantName": ["applicant.name"] }'} onInput={v => { setMapping(v); }} />
            </Field>
            <button class="btn small" onClick={() => analyse()}>
              {t('code.rerun')}
            </button>
          </div>
        </details>
        <Toggle label={t('code.showHidden')} description={t('code.showHiddenHint')} checked={showHidden} onChange={v => { setShowHidden(v); analyse(text, v); }} />
        {error && <div class="code-error">{error}</div>}
        {result && (
          <div class={`callout ${result.legacy ? 'info' : 'good'}`}>
            <div class="callout-title">
              {result.legacy ? t('code.converted') : t('code.validV2')} · {t('code.fieldCount', { count: result.doc.fields.length })}
            </div>
            {result.notes.length > 0 && (
              <ul>
                {result.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
            <div class="row-gap">
              <button
                class="btn primary"
                onClick={() => {
                  if (doc.value.fields.length && !confirm(`${t('code.replaceConfirm')} ${t('common.undoHint')}`)) return;
                  replaceDoc({ ...doc.value, ...result.doc, theme: result.doc.theme || doc.value.theme });
                  notify(t('code.imported'));
                  tab.value = 'build';
                }}
              >
                {t('code.useForm')}
              </button>
              <button class="btn" onClick={() => download('converted-form.json', stringify(result.doc))}>
                <Icon name="download" size={14} /> {t('code.downloadConverted')}
              </button>
            </div>
          </div>
        )}
        <div class="ui-hint">
          {rich('code.terminalHint', { command: <code>npm run migrate -- old.json -o new.json</code> })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- Pane */

/** The Embed tab: an iframe for any website; in the advanced view also the code snippet, the JSON and the importer. */
export function CodePane() {
  const [picked, setMode] = useState<Mode>('iframe');
  const adv = advancedView.value;
  const mode: Mode = adv ? picked : 'iframe';
  return (
    <div class="code-pane">
      {adv && (
        <div class="code-head">
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            options={[
              { value: 'iframe', label: t('code.modeIframe') },
              { value: 'embed', label: t('code.modeSnippet') },
              { value: 'json', label: 'JSON' },
              { value: 'import', label: t('code.modeImport') },
            ]}
          />
        </div>
      )}
      {mode === 'iframe' && <IframeEmbed />}
      {mode === 'json' && <JsonEditor />}
      {mode === 'embed' && <Embed />}
      {mode === 'import' && <Importer />}
    </div>
  );
}
