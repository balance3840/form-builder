import { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../icons';
import { advancedView, setView, viewLocked } from '../view';
import './../generator';
import { FormDocument, FormTheme } from '../generator';
import { t } from '../i18n';

/* ------------------------------------------------------------ generator host */

/**
 * Hosts a real <re-form-generator>. Props are assigned as properties (not attributes) and events are
 * wired with addEventListener, because the element expects objects and camelCase event names.
 */
export function FormView({
  schema,
  theme,
  designMode = false,
  language,
  onSubmitted,
  class: cls,
}: {
  schema: FormDocument;
  theme?: FormTheme;
  designMode?: boolean;
  /** Forces a language; leave empty for automatic detection. */
  language?: string | null;
  onSubmitted?: (detail: any) => void;
  class?: string;
}) {
  const ref = useRef<any>(null);
  const handler = useRef(onSubmitted);
  handler.current = onSubmitted;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const listener = (e: CustomEvent) => handler.current && handler.current(e.detail);
    el.addEventListener('submitted', listener);
    return () => el.removeEventListener('submitted', listener);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.designMode = designMode;
  }, [designMode]);
  useEffect(() => {
    if (ref.current) ref.current.language = language || null;
  }, [language]);
  useEffect(() => {
    if (ref.current) ref.current.theme = theme || null;
  }, [theme]);
  useEffect(() => {
    if (ref.current) ref.current.schema = schema;
  }, [schema]);

  return <re-form-generator ref={ref} class={cls} />;
}

/* ------------------------------------------------------------------ controls */

export function Field({ label, hint, children, inline }: { label?: string; hint?: string; children: ComponentChildren; inline?: boolean }) {
  return (
    <div class={`ui-field ${inline ? 'inline' : ''}`}>
      {label && <label class="ui-label">{label}</label>}
      {children}
      {hint && <div class="ui-hint">{hint}</div>}
    </div>
  );
}

export function TextInput({ value, onInput, placeholder, type = 'text', mono, onBlur, id, disabled }: { value: any; onInput: (v: string) => void; placeholder?: string; type?: string; mono?: boolean; onBlur?: () => void; id?: string; disabled?: boolean }) {
  return <input id={id} class={`ui-input ${mono ? 'mono' : ''}`} type={type} disabled={disabled} value={value ?? ''} placeholder={placeholder} onInput={e => onInput((e.target as HTMLInputElement).value)} onBlur={onBlur} />;
}

export function NumberInput({ value, onInput, placeholder, min, max, step }: { value: any; onInput: (v: number | undefined) => void; placeholder?: string; min?: number; max?: number; step?: number }) {
  return (
    <input
      class="ui-input"
      type="number"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onInput={e => {
        const raw = (e.target as HTMLInputElement).value;
        onInput(raw === '' ? undefined : Number(raw));
      }}
    />
  );
}

export function TextArea({ value, onInput, placeholder, rows = 3, mono }: { value: any; onInput: (v: string) => void; placeholder?: string; rows?: number; mono?: boolean }) {
  return <textarea class={`ui-input ui-textarea ${mono ? 'mono' : ''}`} rows={rows} value={value ?? ''} placeholder={placeholder} onInput={e => onInput((e.target as HTMLTextAreaElement).value)} />;
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <label class="ui-toggle">
      <span class="ui-toggle-text">
        <span class="ui-toggle-label">{label}</span>
        {description && <span class="ui-hint">{description}</span>}
      </span>
      <span class={`ui-switch ${checked ? 'on' : ''}`}>
        <input type="checkbox" checked={checked} onChange={e => onChange((e.target as HTMLInputElement).checked)} />
        <span class="ui-switch-knob" />
      </span>
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div class="ui-segmented" role="radiogroup">
      {options.map(o => (
        <button type="button" key={String(o.value)} title={o.title} class={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Select({ value, options, onChange, placeholder }: { value: any; options: { value: any; label: string }[]; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div class="ui-select">
      <select value={value ?? ''} onChange={e => onChange((e.target as HTMLSelectElement).value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={14} />
    </div>
  );
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <div class="ui-color">
      <label class="ui-color-swatch" style={{ background: value }} title={label}>
        <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'} onInput={e => onChange((e.target as HTMLInputElement).value)} />
      </label>
      <div class="ui-color-text">
        <span class="ui-color-label">{label}</span>
        <input
          value={text}
          spellcheck={false}
          onInput={e => {
            const v = (e.target as HTMLInputElement).value;
            setText(v);
            if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) onChange(v);
          }}
        />
      </div>
    </div>
  );
}

export function Section({ title, icon, children, defaultOpen = true, badge }: { title: string; icon?: string; children: ComponentChildren; defaultOpen?: boolean; badge?: string | number | null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section class={`ui-section ${open ? 'open' : ''}`}>
      <button type="button" class="ui-section-head" onClick={() => setOpen(!open)}>
        {icon && <Icon name={icon} size={16} />}
        <span>{title}</span>
        {badge !== undefined && badge !== null && badge !== 0 && <span class="ui-badge">{badge}</span>}
        <Icon name="chevronDown" size={16} class="ui-chevron" />
      </button>
      {open && <div class="ui-section-body">{children}</div>}
    </section>
  );
}

export function Modal({ title, onClose, children, wide, size, footer }: { title: string; onClose: () => void; children: ComponentChildren; wide?: boolean; size?: 'wide' | 'full'; footer?: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  // a real modal dialog sits above the whole page, also when the host app puts the builder in its own layer
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open && dialog.showModal) dialog.showModal();
  }, []);
  const kind = size || (wide ? 'wide' : '');
  return (
    <dialog
      ref={ref}
      class="modal-backdrop"
      aria-label={title}
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div class={`modal ${kind}`} role="document">
        <header class="modal-head">
          <h2>{title}</h2>
          <button class="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="x" />
          </button>
        </header>
        <div class="modal-body">{children}</div>
        {footer && <footer class="modal-foot">{footer}</footer>}
      </div>
    </dialog>
  );
}

/** In the simple view, at the end of a panel: the advanced view has more here. */
export function MoreInAdvanced({ text }: { text: string }) {
  if (advancedView.value || viewLocked.value) return null;
  return (
    <div class="advanced-note">
      <span class="ui-hint">{text}</span>
      <button class="link-btn" onClick={() => setView('advanced')}>
        {t('common.switchToAdvanced')}
      </button>
    </div>
  );
}
