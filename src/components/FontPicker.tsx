import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../icons';
import { t } from '../i18n';
import { FontKind, GOOGLE_FONTS, fontCss, loadPreviewFont } from '../fonts';
import { Modal } from './ui';

const KINDS: ('all' | FontKind)[] = ['all', 'sans', 'serif', 'mono', 'display', 'hand'];
const clean = (v: string) => v.replace(/[^A-Za-z0-9 \-]/g, '');

/** One font with a sample sentence; its font is only downloaded once the card is (nearly) on screen. */
function FontCard({ name, label, sample, selected, onPick }: { name: string; label: string; sample: string; selected: boolean; onPick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || name === 'system' || name === 'inherit') return;
    if (typeof IntersectionObserver === 'undefined') return loadPreviewFont(name, sample + name);
    const seen = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        loadPreviewFont(name, sample + name);
        seen.disconnect();
      }
    }, { rootMargin: '200px' });
    seen.observe(el);
    return () => seen.disconnect();
  }, [name, sample]);
  return (
    <button ref={ref} type="button" class={`font-card ${selected ? 'selected' : ''}`} onClick={onPick} aria-pressed={selected}>
      <span class="font-sample" style={{ fontFamily: fontCss(name) }}>{sample}</span>
      <span class="font-name">{label}</span>
    </button>
  );
}

/** The font field: shows the current font; opens a picker with a sample of every font. */
export function FontPicker({ value, onChange, inherit }: { value: string; onChange: (v: string) => void; inherit?: boolean }) {
  const [open, setOpen] = useState(false);
  const fallback = inherit ? 'inherit' : 'system';
  const labelOf = (v: string) => (v === 'inherit' ? t('design.sameAsBody') : v === 'system' ? t('design.systemFont') : v);
  useEffect(() => loadPreviewFont(value, value), [value]);
  return (
    <>
      <button type="button" class="font-field" onClick={() => setOpen(true)}>
        <span style={{ fontFamily: fontCss(value) }}>{labelOf(value)}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <FontModal
          value={value}
          fallback={fallback}
          labelOf={labelOf}
          onClose={() => setOpen(false)}
          onApply={v => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function FontModal({ value, fallback, labelOf, onClose, onApply }: { value: string; fallback: string; labelOf: (v: string) => string; onClose: () => void; onApply: (v: string) => void }) {
  const [picked, setPicked] = useState(value);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | FontKind>('all');
  const q = query.trim().toLowerCase();
  const sample = t('design.fontSample');
  const [typed, setTyped] = useState('');
  // a font typed by name is only fetched once the typing pauses
  useEffect(() => {
    const timer = setTimeout(() => setTyped(clean(query).trim()), 500);
    return () => clearTimeout(timer);
  }, [query]);
  const shown = GOOGLE_FONTS.filter(f => (kind === 'all' || f.kind === kind) && (!q || f.name.toLowerCase().includes(q)));
  const exact = GOOGLE_FONTS.some(f => f.name.toLowerCase() === typed.toLowerCase());
  const specials = [fallback].filter(v => !q || labelOf(v).toLowerCase().includes(q));
  return (
    <Modal
      title={t('design.fontPickerTitle')}
      wide
      onClose={onClose}
      footer={
        <>
          <button class="btn" onClick={() => setPicked(fallback)}>{t('common.reset')}</button>
          <span class="spacer" />
          <button class="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button class="btn primary" onClick={() => onApply(picked)}>{t('common.apply')}</button>
        </>
      }
    >
      <div class="stack">
        <div class="search">
          <Icon name="search" size={15} />
          <input autoFocus placeholder={t('design.fontSearch')} value={query} onInput={e => setQuery((e.target as HTMLInputElement).value)} />
        </div>
        <div class="ui-segmented font-kinds" role="radiogroup">
          {KINDS.map(k => (
            <button type="button" key={k} class={k === kind ? 'active' : ''} onClick={() => setKind(k)}>{t(`design.fontKind.${k}` as never)}</button>
          ))}
        </div>
        <div class="font-grid">
          {kind === 'all' && specials.map(v => <FontCard key={v} name={v} label={labelOf(v)} sample={sample} selected={picked === v} onPick={() => setPicked(v)} />)}
          {shown.map(f => (
            <FontCard key={f.name} name={f.name} label={f.name} sample={sample} selected={picked === f.name} onPick={() => setPicked(f.name)} />
          ))}
        </div>
        {typed && !exact && (
          <div class="font-other">
            <FontCard key={typed} name={typed} label={t('design.fontUse', { name: typed })} sample={sample} selected={picked === typed} onPick={() => setPicked(typed)} />
            <div class="ui-hint">{t('design.fontCustomHint')}</div>
          </div>
        )}
      </div>
    </Modal>
  );
}
