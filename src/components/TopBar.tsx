import { Icon } from '../icons';
import { stringify, download, slug, copy } from '../io';
import { dirty, embedded, options, saveError, saveFailed, saveNow, saving } from '../host';
import { availableLocales, locale, localeName, setLocale, t as tr } from '../i18n';
import { advancedView, setView, viewLocked } from '../view';
import { canRedo, canUndo, doc, notify, redo, savedAt, setMeta, showTemplates, tab, Tab, undo } from '../store';

const TABS: { id: Tab; label: () => string; icon: string; advanced?: boolean }[] = [
  { id: 'build', label: () => tr('topbar.tabBuild'), icon: 'layout' },
  { id: 'design', label: () => tr('topbar.tabDesign'), icon: 'palette2' },
  { id: 'translate', label: () => tr('topbar.tabTranslate'), icon: 'languages' },
  { id: 'preview', label: () => tr('topbar.tabPreview'), icon: 'play' },
  { id: 'code', label: () => tr('topbar.tabEmbed'), icon: 'code' },
];

export function TopBar() {
  const d = doc.value;
  const opts = options.value;
  const autosave = !!(opts.autosave && opts.onSave);
  const save = () => {
    saveNow();
  };
  // embedded: what happened to the edits (with autosave there is no Save button, so say it plainly)
  const savedText = !embedded.value
    ? savedAt.value
      ? tr('topbar.saved')
      : ''
    : saving.value
      ? tr('topbar.saving')
      : saveFailed.value
        ? saveError.value || tr('topbar.saveFailed')
        : dirty.value
          ? autosave
            ? ''
            : tr('topbar.unsaved')
          : autosave
            ? tr('topbar.saved')
            : '';
  return (
    <header class="topbar">
      {!opts.hideBrand && (
        <div class="brand">
          <span class="logo">
            <Icon name="alignLeft" size={16} stroke={2.4} />
          </span>
          <span class="brand-name">{tr('topbar.brand')}</span>
        </div>
      )}

      {!opts.hideTitleInput && <input class="form-name" value={d.title || ''} placeholder={tr('topbar.untitled')} onInput={e => setMeta({ title: (e.target as HTMLInputElement).value })} aria-label={tr('topbar.formName')} />}

      <div class="history">
        <button class="icon-btn" disabled={!canUndo.value} onClick={undo} title={tr('topbar.undo')}>
          <Icon name="undo" size={17} />
        </button>
        <button class="icon-btn" disabled={!canRedo.value} onClick={redo} title={tr('topbar.redo')}>
          <Icon name="redo" size={17} />
        </button>
        <span class={`saved ${saveFailed.value ? 'is-error' : ''}`} role="status" title={savedText || undefined}>
          {saveFailed.value && <Icon name="info" size={13} />}
          {savedText}
        </span>
      </div>

      <nav class="tabs" role="tablist">
        {TABS.filter(t => (!t.advanced || advancedView.value) && !(t.id === 'code' && opts.hideEmbed)).map(t => (
          <button key={t.id} role="tab" aria-selected={tab.value === t.id} class={tab.value === t.id ? 'active' : ''} onClick={() => (tab.value = t.id)}>
            <Icon name={t.icon} size={16} />
            <span>{t.label()}</span>
          </button>
        ))}
      </nav>

      <div class="actions">
        {!viewLocked.value && <ViewSwitch />}
        {!opts.hideLocalePicker && <LocalePicker />}
        <button class="btn" onClick={() => (showTemplates.value = true)}>
          <Icon name="sparkles" size={15} /> {tr('topbar.templates')}
        </button>
        {!opts.hideExport && (
          <>
            <button class="btn" title={tr('topbar.copyJson')} onClick={async () => notify((await copy(stringify(d))) ? tr('topbar.jsonCopied') : tr('common.copyFailed'))}>
              <Icon name="copy" size={15} /> <span class="btn-label">{tr('topbar.copyJson')}</span>
            </button>
            <button class="btn" title={tr('common.download')} onClick={() => { download(`${slug(d.title || '')}.json`, stringify(d)); notify(tr('topbar.downloaded')); }}>
              <Icon name="download" size={15} /> <span class="btn-label">{tr('common.download')}</span>
            </button>
          </>
        )}
        {opts.onSave && (!autosave || saveFailed.value) && (
          <button class="btn primary" disabled={saving.value} onClick={save}>
            <Icon name="check" size={15} /> {saving.value ? tr('topbar.saving') : opts.saveLabel || tr('common.save')}
          </button>
        )}
      </div>
    </header>
  );
}

/** The builder's own language (not the form's: that is set in Form settings → Languages). */
function LocalePicker() {
  const label = tr('topbar.interfaceLanguage');
  return (
    <label class="locale-picker" title={`${label}: ${localeName(locale.value)}`}>
      <Icon name="globe" size={15} />
      <span class="locale-code">{locale.value.toUpperCase()}</span>
      <select
        aria-label={label}
        value={locale.value}
        onChange={async e => {
          const code = (e.target as HTMLSelectElement).value;
          await setLocale(code);
          options.value.onLocaleChange?.(locale.value);
        }}
      >
        {availableLocales().map(l => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Simple view (the settings most forms need) or advanced view (rules, logic, layout, technical settings). */
function ViewSwitch() {
  const adv = advancedView.value;
  return (
    <div class="view-switch" role="radiogroup" aria-label={tr('topbar.viewLabel')} title={adv ? tr('topbar.advancedHint') : tr('topbar.simpleHint')}>
      <button role="radio" aria-checked={!adv} class={!adv ? 'active' : ''} onClick={() => setView('simple')}>
        {tr('topbar.simple')}
      </button>
      <button role="radio" aria-checked={adv} class={adv ? 'active' : ''} onClick={() => setView('advanced')}>
        {tr('topbar.advanced')}
      </button>
    </div>
  );
}
