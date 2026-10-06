/**
 * Text inputs that can hold data: earlier answers (`{{field:email}}`) and the host's data (`{{contact.name}}`), like
 * Typeform's "recall information" or Tally's answer piping. The `{ }` button lists what can be inserted and puts it
 * where the cursor is.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { FormField, isLayoutType } from '../generator';
import { prefillSources } from '../host';
import { Icon } from '../icons';
import { t } from '../i18n';
import { allFields, doc } from '../store';
import { advancedView } from '../view';

const plain = (html?: string) => String(html || '').replace(/<[^>]*>/g, '').trim();

type Item = { token: string; label: string; hint?: string };

/** What can be inserted: the answers of the form (not the field being edited), then the host's data. */
function insertables(exceptId?: string): { title: string; items: Item[] }[] {
  const answers = allFields(doc.value.fields)
    .filter(f => f.id !== exceptId && f.model && !isLayoutType(f.type) && f.type !== 'repeater' && f.type !== 'file' && f.type !== 'signature')
    .map((f: FormField) => ({ token: `{{field:${f.model}}}`, label: plain(f.label || f.checkboxLabel) || (f.model as string), hint: f.model as string }));
  const data = prefillSources.value.filter(s => s.kind !== 'list').map(s => ({ token: `{{${s.key}}}`, label: s.label, hint: s.group }));
  return [
    { title: t('common.answersGroup'), items: answers },
    { title: t('common.dataGroup'), items: data },
  ].filter(g => g.items.length);
}

function InsertMenu({ exceptId, onInsert }: { exceptId?: string; onInsert: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    // closes on a click elsewhere (the builder may sit in a shadow root: check the click's path)
    const close = (e: Event) => box.current && !e.composedPath().includes(box.current) && setOpen(false);
    window.addEventListener('pointerdown', close, true);
    return () => window.removeEventListener('pointerdown', close, true);
  }, [open]);
  const groups = open ? insertables(exceptId) : [];
  const q = query.trim().toLowerCase();
  return (
    <div class="data-insert" ref={box}>
      <button type="button" class="data-insert-btn" title={t('common.insertData')} aria-label={t('common.insertData')} aria-expanded={open} onClick={() => setOpen(!open)}>
        {'{ }'}
      </button>
      {open && (
        <div class="data-menu" role="menu">
          <div class="search">
            <Icon name="search" size={14} />
            <input value={query} placeholder={t('common.searchData')} onInput={e => setQuery((e.target as HTMLInputElement).value)} />
          </div>
          {groups.map(g => {
            const items = g.items.filter(i => !q || i.label.toLowerCase().includes(q) || (i.hint || '').toLowerCase().includes(q));
            if (!items.length) return null;
            return (
              <div key={g.title}>
                <div class="picker-group">{g.title}</div>
                {items.map(i => (
                  <button
                    key={i.token}
                    type="button"
                    class="data-item"
                    role="menuitem"
                    onClick={() => {
                      onInsert(i.token);
                      setOpen(false);
                      setQuery('');
                    }}
                  >
                    <span>{i.label}</span>
                    {i.hint && <small>{i.hint}</small>}
                  </button>
                ))}
              </div>
            );
          })}
          {!groups.length && <div class="ui-hint pad">{t('common.noData')}</div>}
          <div class="ui-hint data-help">{t('common.dataHelp')}</div>
        </div>
      )}
    </div>
  );
}

/** A text input (or textarea) with the insert-data button. `exceptId`: the field being edited (it cannot show its own answer). */
export function DataText({ value, onInput, placeholder, multiline, rows = 3, exceptId }: { value: any; onInput: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number; exceptId?: string }) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const insert = (token: string) => {
    const el = ref.current;
    const text = String(value ?? '');
    const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : text.length;
    const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : text.length;
    const next = text.slice(0, start) + token + text.slice(end);
    onInput(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };
  return (
    <div class={`data-text ${multiline ? 'is-multiline' : ''}`}>
      {multiline ? (
        <textarea ref={ref} class="ui-input ui-textarea" rows={rows} value={value ?? ''} placeholder={placeholder} onInput={e => onInput((e.target as HTMLTextAreaElement).value)} />
      ) : (
        <input ref={ref} class="ui-input" value={value ?? ''} placeholder={placeholder} onInput={e => onInput((e.target as HTMLInputElement).value)} />
      )}
      {advancedView.value && <InsertMenu exceptId={exceptId} onInsert={insert} />}
    </div>
  );
}
