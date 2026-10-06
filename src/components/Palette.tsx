import { useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { Icon } from '../icons';
import { CATEGORIES, FIELD_TYPES, FieldTypeDef, POPULAR_FIELDS, categoryClass, categoryLabel, fieldTypeDescription, fieldTypeLabel } from '../catalog';
import { t } from '../i18n';
import { ROOT, addField, kindOf, showAddMenu } from '../store';
import { restrictionFor } from '../host';
import { Modal } from './ui';

export const DRAG_NEW = 'application/x-fb-new';
export const DRAG_MOVE = 'application/x-fb-move';
/** Set in addition to DRAG_MOVE while dragging a row, so drop targets can refuse to nest it. */
export const DRAG_ROW = 'application/x-fb-row';
/** `application/x-fb-kind-<kind>`: what is being dragged (row, section, repeater), so lists that cannot hold it refuse the drop. */
export const DRAG_KIND = 'application/x-fb-kind-';

function Tile({ def, onPick }: { def: FieldTypeDef; onPick: (def: FieldTypeDef) => void }) {
  // a kind of field the host limits for this form stays in the list, marked, with the reason on hover
  const restriction = restrictionFor(def.key);
  const blocked = restriction?.level === 'blocked';
  const title = restriction
    ? t(blocked ? 'palette.blockedTitle' : 'palette.warningTitle', { reason: restriction.reason })
    : fieldTypeDescription(def);
  return (
    <button
      class={`tile ${categoryClass(def.category)} ${blocked ? 'is-blocked' : ''} ${restriction?.level === 'warning' ? 'is-warned' : ''}`}
      draggable={!blocked}
      aria-disabled={blocked || undefined}
      title={title}
      onDragStart={e => {
        e.dataTransfer!.setData(DRAG_NEW, def.key);
        const kind = kindOf(def.make() as { type: string });
        if (kind !== 'leaf') e.dataTransfer!.setData(DRAG_KIND + kind, '1');
        e.dataTransfer!.setData('text/plain', fieldTypeLabel(def));
        e.dataTransfer!.effectAllowed = 'copy';
      }}
      onClick={() => onPick(def)}
    >
      <span class="tile-icon">
        <Icon name={def.icon} size={17} />
      </span>
      <span class="tile-text">
        <span class="tile-label">{fieldTypeLabel(def)}</span>
        {blocked && <span class="tile-flag">{t('palette.notAvailable')}</span>}
      </span>
      {restriction?.level === 'warning' && (
        <span class="tile-flag warn" aria-label={title}>
          <Icon name="info" size={13} />
        </span>
      )}
    </button>
  );
}

/** `compact`: the side panel (only "Most used" is open to start with); the big picker shows everything. */
export function FieldList({ onPick, autoFocus, compact }: { onPick: (def: FieldTypeDef) => void; autoFocus?: boolean; compact?: boolean }) {
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const q = query.trim().toLowerCase();
  // search the interface language and English, so “email” finds the field in every language
  const matches = (d: FieldTypeDef) => !q || [fieldTypeLabel(d), fieldTypeDescription(d), categoryLabel(d.category), d.label, d.description].some(text => text.toLowerCase().includes(q));
  const popular = POPULAR_FIELDS.map(key => FIELD_TYPES.find(d => d.key === key)).filter((d): d is FieldTypeDef => !!d && !d.hidden);
  const visible = CATEGORIES.map(c => ({ category: c, items: FIELD_TYPES.filter(d => !d.hidden && d.category === c && matches(d)) })).filter(g => g.items.length);
  // while searching everything is open; otherwise the groups start closed in the side panel
  const isOpen = (id: string, fallback: boolean) => !!q || (id in opened ? opened[id] : fallback);
  const group = (id: string, title: string, items: FieldTypeDef[], extra: string, fallback: boolean, icon?: string) => {
    const open = isOpen(id, fallback);
    return (
      <div class={`tile-group ${extra} ${open ? 'open' : ''}`} key={id}>
        <button type="button" class="group-head" aria-expanded={open} onClick={() => setOpened({ ...opened, [id]: !open })}>
          {icon ? <Icon name={icon} size={13} /> : <span class="group-dot" />}
          <span class="group-title">{title}</span>
          <span class="group-count">{items.length}</span>
          <Icon name="chevronDown" size={14} class="group-chevron" />
        </button>
        {open && (
          <div class="tile-grid">
            {items.map(def => (
              <Tile key={def.key} def={def} onPick={onPick} />
            ))}
          </div>
        )}
      </div>
    );
  };
  return (
    <div class="field-list">
      <div class="search">
        <Icon name="search" size={15} />
        <input autoFocus={autoFocus} placeholder={t('palette.searchPlaceholder')} value={query} onInput={e => setQuery((e.target as HTMLInputElement).value)} />
      </div>
      {!q && group('popular', t('palette.popular'), popular, 'cat-popular', true, 'star')}
      {visible.map(g => group(g.category, categoryLabel(g.category), g.items, categoryClass(g.category), !compact))}
      {!visible.length && <div class="ui-hint pad">{t('palette.noMatch', { query })}</div>}
    </div>
  );
}

const COLLAPSED_KEY = 'form-builder:palette-collapsed';
const savedCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch (e) {
    return false;
  }
};
/** The fields panel can be folded away to give the form more room; the choice is remembered. */
export const paletteCollapsed = signal(savedCollapsed());
export function setPaletteCollapsed(value: boolean) {
  paletteCollapsed.value = value;
  try {
    localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0');
  } catch (e) {
    /* storage blocked */
  }
}

export function Palette() {
  if (paletteCollapsed.value) {
    return (
      <aside class="palette is-collapsed">
        <button class="icon-btn" title={t('palette.show')} aria-label={t('palette.show')} onClick={() => setPaletteCollapsed(false)}>
          <Icon name="chevronRight" size={16} />
        </button>
        <button class="icon-btn rail-add" title={t('palette.addField')} aria-label={t('palette.addField')} onClick={() => (showAddMenu.value = { dest: { list: ROOT, index: 9999 } })}>
          <Icon name="plus" size={16} />
        </button>
      </aside>
    );
  }
  return (
    <aside class="palette">
      <div class="palette-head">
        <div>
          <div class="panel-title">{t('palette.addField')}</div>
          <div class="panel-sub">{t('palette.hint')}</div>
        </div>
        <button class="icon-btn" title={t('palette.hide')} aria-label={t('palette.hide')} onClick={() => setPaletteCollapsed(true)}>
          <Icon name="chevronLeft" size={16} />
        </button>
      </div>
      <FieldList compact onPick={def => addField(def.key)} />
    </aside>
  );
}

/** Big picker opened from the “Add field” button inside the canvas. */
export function AddFieldModal() {
  const state = showAddMenu.value;
  if (!state) return null;
  return (
    <Modal title={t('palette.addField')} onClose={() => (showAddMenu.value = null)} wide>
      <FieldList
        autoFocus
        onPick={def => {
          addField(def.key, state.dest);
          showAddMenu.value = null;
        }}
      />
    </Modal>
  );
}
