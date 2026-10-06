/**
 * The form's own JavaScript (`doc.script`), like a "Script" box in older form tools. The generator runs it
 * in a sandbox with a `form` object; this is where it is written, with a short reference and examples. A host app can
 * open its own editor for the larger view (`editCode`, the hub uses Monaco).
 */
import { useState } from 'preact/hooks';
import { CODE_EXAMPLES } from '../codeExamples';
import { options } from '../host';
import { t } from '../i18n';
import { scriptTypings } from '../scriptTypes';
import { CodeEditor } from './CodeEditor';
import { doc, setMeta } from '../store';
import { Field, Modal, Section } from './ui';

const REFERENCE = `// When something happens
form.on('ready', () => { … })
form.on('change', ({ key, value }) => { … })
form.on('step', ({ index, id }) => { … })
form.on('submitted', ({ values }) => { … })

// Just before sending. Return a message
// to stop the form from being sent.
form.on('beforeSubmit', ({ values }) => { … })

// Answers ('email' is a field name)
form.get('email')
form.set('email', 'a@b.com')
form.values

// Show a message
form.alert('Thank you!')

// Hide or show a question
form.hide('company')
form.show('company')

// Colour a question
form.style('email', { background: '#fff3f3' })
form.resetStyle('email')

// Only offer some options
form.filterOptions('office', option => …)
form.resetOptions('office')

// Open a step or another page
form.goToStep('stepId')
form.redirect('https://…')`;

export function CodeSection() {
  const code = doc.value.script || '';
  const [showReference, setShowReference] = useState(false);
  const [large, setLarge] = useState(false);
  const set = (value: string) => setMeta({ script: value.trim() ? value : undefined }, 'script');
  const insertExample = (id: string) => {
    const example = CODE_EXAMPLES.find(e => e.id === id);
    if (!example) return;
    const current = doc.value.script || '';
    set(current.trim() ? `${current.replace(/\s+$/, '')}\n\n${example.code(doc.value)}\n` : `${example.code(doc.value)}\n`);
  };
  const openLarger = async () => {
    const editCode = options.value.editCode;
    if (!editCode) return setLarge(true);
    const next = await editCode(doc.value.script || '', { title: t('settings.code'), reference: REFERENCE, typings: scriptTypings(doc.value) });
    if (typeof next === 'string') set(next);
  };
  // Tab writes two spaces instead of leaving the box
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    e.preventDefault();
    const el = e.target as HTMLTextAreaElement;
    const { selectionStart: start, selectionEnd: end, value } = el;
    set(value.slice(0, start) + '  ' + value.slice(end));
    requestAnimationFrame(() => el.setSelectionRange(start + 2, start + 2));
  };
  const editor = (rows: number) => (
    <textarea
      class="ui-input ui-textarea mono code-editor"
      rows={rows}
      spellcheck={false}
      value={code}
      placeholder={t('settings.codePlaceholder')}
      onInput={e => set((e.target as HTMLTextAreaElement).value)}
      onKeyDown={onKeyDown}
    />
  );
  return (
    <Section title={t('settings.code')} icon="code" defaultOpen={!!code} badge={code ? t('settings.codeOn') : undefined}>
      <div class="stack">
        <div class="ui-hint">{t('settings.codeIntro')}</div>
        <Field label={t('settings.codeLabel')}>
          {editor(14)}
        </Field>
        <select
          class="ui-input code-examples"
          value=""
          aria-label={t('settings.codeExample')}
          onChange={e => {
            insertExample((e.target as HTMLSelectElement).value);
            (e.target as HTMLSelectElement).value = '';
          }}
        >
          <option value="">{t('settings.codeExample')}</option>
          {CODE_EXAMPLES.map(example => (
            <option key={example.id} value={example.id}>
              {example.title()}
            </option>
          ))}
        </select>
        <div class="code-actions">
          <button class="link-btn" onClick={openLarger}>
            {t('settings.codeLarger')}
          </button>
          <button class="link-btn" onClick={() => setShowReference(!showReference)}>
            {showReference ? t('settings.codeHideReference') : t('settings.codeShowReference')}
          </button>
        </div>
        {showReference && <pre class="code-reference">{REFERENCE}</pre>}
        <div class="ui-hint">{t('settings.codeSafety')}</div>
      </div>
      {large && (
        <Modal
          title={t('settings.code')}
          size="full"
          onClose={() => setLarge(false)}
          footer={
            <button class="btn primary" onClick={() => setLarge(false)}>
              {t('common.done')}
            </button>
          }
        >
          <div class="code-modal">
            <CodeEditor value={code} onChange={set} typings={scriptTypings(doc.value)} fallback={() => editor(28)} />
            <pre class="code-reference">{REFERENCE}</pre>
          </div>
        </Modal>
      )}
    </Section>
  );
}
