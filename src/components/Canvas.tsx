import { restrictionFor, rootElement } from '../host';
import { useComputed, useSignal, signal } from '@preact/signals';
import { memo } from 'preact/compat';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { createTranslator, FormDocument, FormField, isContainer, logicRules, pageStyle, resolveTheme, rowLayout, safeImageUrl, themeToCssVars } from '../generator';
import { Icon } from '../icons';
import { fieldTypeLabel, typeDefFor } from '../catalog';
import { t } from '../i18n';
import { defaultLanguage } from '../store';

/** The form's own built-in wording (its language, not the interface's), as the finished form shows it. */
const formText = (key: string) => createTranslator(defaultLanguage.value, doc.value.i18n as any)(key);
import { endingIndex, Dest, ListKind, ROOT, accepts, addField, addTab, allFields, doc, tab, duplicateField, kindOf, moveField, nudgeField, requestRemoveField, selectedId, setMeta, showAddMenu, showTemplates } from '../store';
import { DRAG_KIND, DRAG_MOVE, DRAG_NEW, DRAG_ROW } from './Palette';
import { FormView } from './ui';

const singleDocs = new WeakMap<FormField, FormDocument>();
/** One stable document per field object, so only the card whose field changed re-renders. */
function docFor(field: FormField): FormDocument {
  let single = singleDocs.get(field);
  if (!single) {
    single = { version: 2, fields: [field] };
    singleDocs.set(field, single);
  }
  return single;
}

type Drop = { list: string; index: number } | { beside: string; side: 'left' | 'right' } | null;

/**
 * Where the dragged block would land. It is a signal read by the individual lists and cards (each through a
 * `computed`), so a drag only re-renders the one list or card whose indicator changes, not the whole form.
 */
const dropTarget = signal<Drop>(null);
function setDropTarget(next: Drop) {
  const cur = dropTarget.peek();
  if (cur === next) return;
  if (cur && next && JSON.stringify(cur) === JSON.stringify(next)) return;
  dropTarget.value = next;
}
/** The thank-you page is drawn as its own sheet; its list is the root blocks after the ending break. */
const ENDING_LIST = '__ending';

/** The index of the drop line in list `id` (-1 when the drag is not over it). */
const dropIndexIn = (id: string) => {
  const d = dropTarget.value;
  return d && 'list' in d && d.list === id ? d.index : -1;
};

function Toolbar({ field, canUp, canDown }: { field: FormField; canUp: boolean; canDown: boolean }) {
  const stop = (fn: () => void) => (e: Event) => {
    e.stopPropagation();
    fn();
  };
  return (
    <div class="card-toolbar" onClick={(e: Event) => e.stopPropagation()}>
      <span class="grip" title={t('common.dragToReorder')}>
        <Icon name="grip" size={16} stroke={2.6} />
      </span>
      <button class="icon-btn" title={t('common.moveUp')} disabled={!canUp} onClick={stop(() => nudgeField(field.id, -1))}>
        <Icon name="up" size={14} />
      </button>
      <button class="icon-btn" title={t('common.moveDown')} disabled={!canDown} onClick={stop(() => nudgeField(field.id, 1))}>
        <Icon name="down" size={14} />
      </button>
      <button class="icon-btn" title={t('common.duplicate')} onClick={stop(() => duplicateField(field.id))}>
        <Icon name="copy" size={14} />
      </button>
      <button class="icon-btn danger" title={t('common.delete')} onClick={stop(() => requestRemoveField(field.id))}>
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}

function Badges({ field }: { field: FormField }) {
  const rules = logicRules(field);
  // the host does not allow (or warns about) this kind of field in this form
  const restriction = restrictionFor(typeDefFor(field).key);
  if (!restriction && field.visible !== false && !rules.length && !(field.config && (field.config.dialogOnly || field.config.hideInDialog))) return null;
  const has = (...actions: string[]) => rules.some(r => actions.includes(r.action));
  return (
    <div class="card-badges">
      {restriction && (
        <span class={`badge ${restriction.level === 'blocked' ? 'danger' : 'warn'}`} title={restriction.reason}>
          <Icon name="info" size={11} /> {restriction.level === 'blocked' ? t('canvas.notAllowed') : t('canvas.checkThis')}
        </span>
      )}
      {field.visible === false && (
        <span class="badge" title={t('canvas.hiddenTitle')}>
          <Icon name="eyeOff" size={11} /> {t('canvas.hidden')}
        </span>
      )}
      {has('show', 'hide') && (
        <span class="badge accent" title={t('canvas.conditionalTitle')}>
          <Icon name="zap" size={11} /> {t('canvas.conditional')}
        </span>
      )}
      {has('disable', 'enable') && (
        <span class="badge accent" title={t('canvas.locksTitle')}>
          <Icon name="lock" size={11} /> {t('canvas.locks')}
        </span>
      )}
      {field.config && field.config.dialogOnly && (
        <span class="badge" title={t('canvas.dialogOnlyTitle')}>
          <Icon name="dialog" size={11} /> {t('canvas.dialogOnly')}
        </span>
      )}
      {field.config && field.config.hideInDialog && (
        <span class="badge" title={t('canvas.notInDialogTitle')}>
          <Icon name="dialog" size={11} /> {t('canvas.notInDialog')}
        </span>
      )}
      {has('require') && (
        <span class="badge accent" title={t('canvas.requiredWhenTitle')}>
          <Icon name="check" size={11} /> {t('canvas.requiredWhen')}
        </span>
      )}
    </div>
  );
}

function startDrag(e: DragEvent, field: FormField) {
  e.stopPropagation();
  e.dataTransfer!.setData(DRAG_MOVE, field.id);
  if (isContainer(field)) e.dataTransfer!.setData(DRAG_ROW, '1');
  if (kindOf(field) !== 'leaf') e.dataTransfer!.setData(DRAG_KIND + kindOf(field), '1');
  e.dataTransfer!.effectAllowed = 'move';
  selectedId.value = field.id;
}

const Card = memo(function Card({ field, index, size, steps }: { field: FormField; index: number; size: number; steps: number }) {
  const selected = selectedId.value === field.id;
  const def = typeDefFor(field);
  const side = useComputed(() => {
    const d = dropTarget.value;
    return d && 'beside' in d && d.beside === field.id ? d.side : null;
  }).value;
  return (
    <div
      class={`fb-card ${selected ? 'selected' : ''} ${side ? `drop-${side}` : ''} ${field.type === 'pageBreak' ? 'is-page-break' : ''}`}
      data-card
      data-leaf
      data-id={field.id}
      draggable
      onDragStart={(e: DragEvent) => startDrag(e, field)}
      onClick={(e: Event) => {
        e.stopPropagation();
        selectedId.value = field.id;
      }}
    >
      <div class="card-tag">
        <Icon name={def.icon} size={12} /> {fieldTypeLabel(def)}
      </div>
      <Toolbar field={field} canUp={index > 0} canDown={index < size - 1} />
      {field.type === 'hidden' ? (
        <div class="hidden-card">
          <Icon name="eyeOff" size={14} />
          <b>{field.label || field.model}</b>
          <code>{field.model}</code>
          <span>
            {(field.config && field.config.source) === 'fixed'
              ? t('canvas.hiddenFixed', { value: String((field.config && field.config.value) ?? '') })
              : (field.config && field.config.source) === 'data'
                ? t('canvas.hiddenData', { key: String((field.config && field.config.prefill) || '…') })
                : t('canvas.hiddenUrl', { param: String((field.config && field.config.param) || field.model) })}
          </span>
        </div>
      ) : field.type === 'pageBreak' ? (
        <div class="page-break">
          <span>
            <Icon name="pageBreak" size={14} />{' '}
            {field.label ? t('canvas.pageBreakNamed', { step: steps, title: field.label }) : t('canvas.pageBreak', { step: steps })}
            {logicRules(field).length ? ` ${t('canvas.pageBreakConditional')}` : ''}
          </span>
        </div>
      ) : (
        <FormView designMode schema={docFor(field)} theme={doc.value.theme} />
      )}
      <Badges field={field} />
    </div>
  );
});

type Steps = { [id: string]: number };

/** One block of the form: a row, a section, a repeating group or a normal field. */
const Block = memo(function Block({ field, index, size, steps }: { field: FormField; index: number; size: number; steps: Steps }) {
  if (isContainer(field)) return <RowCard row={field} index={index} size={size} steps={steps} />;
  if (field.type === 'section') return <SectionCard section={field} index={index} size={size} steps={steps} />;
  if (field.type === 'repeater') return <RepeaterCard repeater={field} index={index} size={size} steps={steps} />;
  if (field.type === 'tabs') return <TabsCard block={field} index={index} size={size} steps={steps} />;
  if (field.type === 'modal') return <ModalCard block={field} index={index} size={size} steps={steps} />;
  return <Card field={field} index={index} size={size} steps={steps[field.id] || 1} />;
});

function List({ id, kind, items, steps, className, style, empty, footer }: { id: string; kind: ListKind; items: FormField[]; steps: Steps; className?: string; style?: any; empty?: preact.ComponentChildren; footer?: preact.ComponentChildren }) {
  const children: preact.ComponentChildren[] = [];
  const at = useComputed(() => dropIndexIn(id)).value;
  items.forEach((field, i) => {
    if (at === i) children.push(<div key={`drop-${i}`} class="drop-line" />);
    children.push(<Block key={field.id} field={field} index={i} size={items.length} steps={steps} />);
  });
  if (at === items.length) children.push(<div key="drop-end" class="drop-line" />);
  return (
    <div class={className} data-list={id} data-kind={kind} style={style}>
      {children}
      {!items.length && empty}
      {!!items.length && footer}
    </div>
  );
}

const AddHere = ({ list, label, class: cls = 'col-empty' }: { list: string; label?: string; class?: string }) => (
  <button
    class={cls}
    onClick={(e: Event) => {
      e.stopPropagation();
      showAddMenu.value = { dest: { list, index: 9999 } };
    }}
  >
    <Icon name="plus" size={14} /> {label || t('canvas.addField')}
  </button>
);

function RowCard({ row, index, size, steps }: { row: FormField; index: number; size: number; steps: { [id: string]: number } }) {
  const selected = selectedId.value === row.id;
  const layout = rowLayout(row);
  return (
    <div
      class={`fb-card fb-row-card ${selected ? 'selected' : ''}`}
      data-card
      data-id={row.id}
      draggable
      onDragStart={(e: DragEvent) => startDrag(e, row)}
      onClick={(e: Event) => {
        e.stopPropagation();
        selectedId.value = row.id;
      }}
    >
      <div class="card-tag">
        <Icon name="columns" size={12} /> {t('canvas.columns')}
      </div>
      <Toolbar field={row} canUp={index > 0} canDown={index < size - 1} />
      <div class="rfg-row fb-row" style={{ alignItems: layout.alignItems }}>
        {(row.columns || []).map((column, i) => (
          <List
            key={column.id}
            id={column.id}
            kind="column"
            items={column.fields}
            steps={steps}
            className="rfg-col fb-col"
            style={{ '--rfg-span': String(layout.spans[i]), ...(i === 0 ? { '--rfg-start': String(layout.firstColumn) } : {}) }}
            empty={
              <button
                class="col-empty"
                onClick={(e: Event) => {
                  e.stopPropagation();
                  showAddMenu.value = { dest: { list: column.id, index: 0 } };
                }}
              >
                <Icon name="plus" size={14} /> {t('canvas.addField')}
              </button>
            }
          />
        ))}
      </div>
      <Badges field={row} />
    </div>
  );
}

/** Shared frame of the cards that hold other blocks: tag, toolbar, badges, selection and dragging. */
function Frame({ field, index, size, className, tag, icon, children }: { field: FormField; index: number; size: number; className: string; tag: string; icon: string; children: preact.ComponentChildren }) {
  const selected = selectedId.value === field.id;
  return (
    <div
      class={`fb-card ${className} ${selected ? 'selected' : ''}`}
      data-card
      data-id={field.id}
      draggable
      onDragStart={(e: DragEvent) => startDrag(e, field)}
      onClick={(e: Event) => {
        e.stopPropagation();
        selectedId.value = field.id;
      }}
    >
      <div class="card-tag">
        <Icon name={icon} size={12} /> {tag}
      </div>
      <Toolbar field={field} canUp={index > 0} canDown={index < size - 1} />
      {children}
      <Badges field={field} />
    </div>
  );
}

function SectionCard({ section, index, size, steps }: { section: FormField; index: number; size: number; steps: Steps }) {
  const config = section.config || {};
  return (
    <Frame field={section} index={index} size={size} className="fb-section-card" tag={t('canvas.section')} icon="panel">
      <section class={`rfg-section rfg-section-${config.style === 'plain' ? 'plain' : 'card'}`}>
        <header class="rfg-section-head">
          {config.badge && <span class="rfg-badge">{config.badge}</span>}
          <div class="rfg-section-titles">
            <h3 class="rfg-section-title">
              {section.label || <span class="fb-placeholder">{t('canvas.sectionTitle')}</span>}
              {config.tooltip && <span class="rfg-tip">?</span>}
            </h3>
            {section.helpText && <p class="rfg-section-desc">{section.helpText}</p>}
          </div>
          {config.collapsible && <span class="rfg-chevron is-open" />}
        </header>
        {/* the whole body (padding included) is the drop zone */}
        <List
          id={section.id}
          kind="section"
          items={section.fields || []}
          steps={steps}
          className="rfg-section-body rfg-grid fb-nested"
          empty={<AddHere list={section.id} label={t('canvas.dropHere')} />}
          footer={<AddHere list={section.id} class="col-add" />}
        />
      </section>
    </Frame>
  );
}

function RepeaterCard({ repeater, index, size, steps }: { repeater: FormField; index: number; size: number; steps: Steps }) {
  const config = repeater.config || {};
  const table = config.layout === 'table';
  const filled = String(config.itemLabel || t('fields.default.itemLabel')).replace(/\{n\}/g, '1').replace(/\{[\w.-]+\}/g, '').trim();
  // a template made only of answers (“{name} ({type})”) has nothing to show in the preview
  const title = /[\p{L}\p{N}]/u.test(filled) ? filled : t('canvas.firstItem');
  return (
    <Frame field={repeater} index={index} size={size} className="fb-repeater-card" tag={t('canvas.repeater')} icon="repeat">
      <div class="fb-repeater">
        {(repeater.label || repeater.helpText) && (
          <div class="rfg-repeater-head">
            {repeater.label && <div class="rfg-label">{repeater.label}</div>}
            {repeater.helpText && <div class="rfg-help">{repeater.helpText}</div>}
          </div>
        )}
        <div class="fb-repeater-note">
          <Icon name="repeat" size={12} /> {config.minItems ? t('canvas.repeaterNoteMin', { count: config.minItems }) : t('canvas.repeaterNote')}
          {table ? ` · ${t('canvas.asTable')}` : ''}
        </div>
        <div class="rfg-item">
          {!table && (
            <div class="rfg-item-head">
              <span class="rfg-item-title">{title}</span>
              <span class="rfg-item-actions">
                <span class="rfg-icon-btn">
                  <Icon name="trash" size={16} />
                </span>
              </span>
            </div>
          )}
          <List
            id={repeater.id}
            kind="repeater"
            items={repeater.fields || []}
            steps={steps}
            className="rfg-item-body rfg-grid fb-nested"
            empty={<AddHere list={repeater.id} label={t('canvas.dropItemFields')} />}
            footer={<AddHere list={repeater.id} class="col-add" />}
          />
        </div>
        <div class={`rfg-add rfg-add-${config.addStyle === 'dashed' ? 'dashed' : 'button'}`}>
          <span class="rfg-add-btn">
            <Icon name="plus" size={16} /> {config.addLabel || t('common.add')}
          </span>
        </div>
      </div>
    </Frame>
  );
}

function TabsCard({ block, index, size, steps }: { block: FormField; index: number; size: number; steps: Steps }) {
  const picked = useSignal('');
  const tabs = block.tabs || [];
  const current = tabs.find(t => t.id === picked.value) || tabs[0];
  return (
    <Frame field={block} index={index} size={size} className="fb-tabs-card" tag={t('canvas.tabs')} icon="tabs">
      <div class={`rfg-tabs rfg-tabs-${(block.config && block.config.style) === 'pills' ? 'pills' : 'line'}`}>
        <div class="rfg-tablist" role="tablist">
          {tabs.map(tab => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              class={`rfg-tab ${current && tab.id === current.id ? 'is-active' : ''}`}
              onClick={(e: Event) => {
                e.stopPropagation();
                picked.value = tab.id;
                selectedId.value = block.id;
              }}
              // hovering a tab while dragging a field opens it, so the field can be dropped inside
              onDragEnter={() => (picked.value = tab.id)}
            >
              <span>{tab.label || t('canvas.untitled')}</span>
              <span class="fb-tab-count">{tab.fields.length}</span>
            </button>
          ))}
          <button
            type="button"
            class="rfg-tab fb-tab-add"
            title={t('canvas.addTab')}
            onClick={(e: Event) => {
              e.stopPropagation();
              addTab(block.id);
            }}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
        {current && (
          <List
            id={current.id}
            kind="tab"
            items={current.fields}
            steps={steps}
            className="rfg-tabpanel rfg-grid fb-nested"
            empty={<AddHere list={current.id} label={t('canvas.dropHere')} />}
            footer={<AddHere list={current.id} class="col-add" />}
          />
        )}
      </div>
    </Frame>
  );
}

function ModalCard({ block, index, size, steps }: { block: FormField; index: number; size: number; steps: Steps }) {
  const config = block.config || {};
  return (
    <Frame field={block} index={index} size={size} className="fb-modal-card" tag={t('canvas.dialog')} icon="dialog">
      <div class="fb-modal">
        <div class="fb-modal-head">
          <strong>{block.label || <span class="fb-placeholder">{t('canvas.dialogTitle')}</span>}</strong>
          <span class="fb-repeater-note">
            <Icon name="dialog" size={12} /> {t('canvas.dialogNote')}
          </span>
        </div>
        <List
          id={block.id}
          kind="modal"
          items={block.fields || []}
          steps={steps}
          className="rfg-grid fb-nested"
          empty={<AddHere list={block.id} label={t('canvas.dropDialogFields')} />}
          footer={<AddHere list={block.id} class="col-add" />}
        />
        <div class="fb-modal-foot">
          <span class="rfg-btn rfg-bv-ghost">{config.cancelLabel || formText('ui.cancel')}</span>
          <span class="rfg-btn rfg-btn-primary">{config.confirmLabel || formText('ui.confirm')}</span>
        </div>
      </div>
    </Frame>
  );
}

export function Canvas() {
  const d = doc.value;
  const theme = resolveTheme(d.theme);
  const vars = themeToCssVars(d.theme) as any;
  // the paper holds the top level list; `rootList()` finds it
  const rootRef = useRef<HTMLDivElement>(null);
  const endingRef = useRef<HTMLDivElement>(null);
  // the form, and the thank-you page after it (drawn as a second sheet)
  const ending = endingIndex(d.fields);
  const formItems = ending >= 0 ? d.fields.slice(0, ending) : d.fields;
  const endingBreak = ending >= 0 ? d.fields[ending] : null;
  const endingItems = ending >= 0 ? d.fields.slice(ending + 1) : [];
  const rootList = () => (rootRef.current && (rootRef.current.querySelector(':scope > [data-list="root"]') as HTMLElement | null)) || null;
  const emptyOver = useComputed(() => dropIndexIn(ROOT) === 0).value;
  const dragging = useSignal(false);

  // `dragging` on the body switches off hover effects (toolbars, tags) while a block is carried around
  const setDragging = (on: boolean) => {
    document.body.classList.toggle('dragging', on);
    rootElement()?.classList.toggle('dragging', on);
  };
  useEffect(() => {
    // a drag that ends outside the canvas (or is cancelled) must not leave the drop line behind
    const end = () => {
      setDropTarget(null);
      setDragging(false);
    };
    window.addEventListener('dragend', end);
    window.addEventListener('drop', end);
    return () => {
      window.removeEventListener('dragend', end);
      window.removeEventListener('drop', end);
      setDragging(false);
    };
  }, []);

  const acceptsDrag = (e: DragEvent) => !!e.dataTransfer && (e.dataTransfer.types.includes(DRAG_NEW) || e.dataTransfer.types.includes(DRAG_MOVE));

  /** What is being dragged: a field, a row, a section or a repeating group. */
  const dragKind = (e: DragEvent) => {
    const hit = Array.from(e.dataTransfer!.types).find(t => t.startsWith(DRAG_KIND));
    return (hit ? hit.slice(DRAG_KIND.length) : 'leaf') as ReturnType<typeof kindOf>;
  };

  /** Works out where a drag would land: a list + index, or beside a field (which makes columns). */
  const resolve = (e: DragEvent): Drop => {
    const kind = dragKind(e);
    const target = e.target as HTMLElement;
    const root = rootList();
    if (!root) return null;
    // the innermost list under the pointer that can hold what is dragged (a section cannot go inside a column…)
    let listEl: HTMLElement | null = target.closest('[data-list]') as HTMLElement | null;
    while (listEl && !accepts(kind, (listEl.getAttribute('data-kind') || 'root') as ListKind)) listEl = (listEl.parentElement && (listEl.parentElement.closest('[data-list]') as HTMLElement)) || null;
    const endingEl = endingRef.current && (endingRef.current.querySelector(`:scope > [data-list="${ENDING_LIST}"]`) as HTMLElement | null);
    listEl = listEl && (root.contains(listEl) || (endingEl && endingEl.contains(listEl))) ? listEl : root;
    const listId = listEl.getAttribute('data-list') || ROOT;
    const listKind = (listEl.getAttribute('data-kind') || 'root') as ListKind;

    // dropping at the left or right edge of a field creates columns (not inside columns, and not for rows / sections)
    if (kind === 'leaf' && listKind !== 'column') {
      const card = target.closest('[data-leaf]') as HTMLElement | null;
      if (card && card.parentElement === listEl) {
        const rect = card.getBoundingClientRect();
        // narrower zone inside sections and groups, where the cards are small and a stray drop would make columns by accident
        const edge = listKind === 'root' ? Math.min(120, rect.width * 0.22) : Math.min(56, rect.width * 0.12);
        const id = card.getAttribute('data-id')!;
        // (the dragged id is not readable until drop, so dropping a field beside itself is ignored in applyDrop)
        if (e.clientX < rect.left + edge) return { beside: id, side: 'left' };
        if (e.clientX > rect.right - edge) return { beside: id, side: 'right' };
      }
    }

    const items = Array.from(listEl.children).filter(c => c.hasAttribute('data-card')) as HTMLElement[];
    let index = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        index = i;
        break;
      }
    }
    return { list: listId, index };
  };

  // the step number of every top level block (stable while the fields do not change, so cards can skip re-rendering)
  const steps = useMemo(() => {
    let stepNumber = 1;
    const map: { [id: string]: number } = {};
    d.fields.forEach(f => {
      if (f.type === 'pageBreak') stepNumber++;
      map[f.id] = stepNumber;
    });
    return map;
  }, [d.fields]);

  const settings = d.settings || {};
  // a button that submits the form replaces the built-in submit button
  const hasOwnSubmit = allFields(d.fields).some(f => f.type === 'button' && ((f.config && f.config.actions) || []).some((a: any) => a && a.type === 'submit'));
  const paperClass = ['rfg', `rfg-card-${theme.cardStyle}`, `rfg-input-${theme.inputStyle}`, `rfg-btn-${theme.buttonStyle}`, `rfg-btnw-${theme.buttonWidth}`].join(' ');

  const applyDrop = (e: DragEvent) => {
    let target = dropTarget.peek() || resolve(e);
    if (target && 'list' in target && target.list === ENDING_LIST) target = { list: ROOT, index: ending + 1 + target.index };
    const newType = e.dataTransfer!.getData(DRAG_NEW);
    const moveId = e.dataTransfer!.getData(DRAG_MOVE);
    if (!target) return;
    if (newType) {
      addField(newType, target as Dest);
    } else if (moveId) {
      if ('beside' in target && target.beside === moveId) return;
      moveField(moveId, target as Dest);
    }
  };

  return (
    <main
      class="canvas-scroll"
      style={pageStyle(doc.value.theme)}
      onClick={() => (selectedId.value = null)}
      onDragOver={(e: DragEvent) => {
        if (!acceptsDrag(e)) return;
        e.preventDefault();
        if (!dragging.peek()) {
          dragging.value = true;
          setDragging(true);
        }
        setDropTarget(resolve(e));
      }}
      onDragLeave={(e: DragEvent) => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setDropTarget(null);
      }}
      onDrop={(e: DragEvent) => {
        if (!acceptsDrag(e)) return;
        e.preventDefault();
        applyDrop(e);
        setDropTarget(null);
        dragging.value = false;
        setDragging(false);
      }}
      onDragEnd={() => {
        setDropTarget(null);
        dragging.value = false;
        setDragging(false);
      }}
    >
      <div ref={rootRef} class={`paper ${paperClass}`} style={{ ...vars, background: theme.backgroundColor, color: theme.textColor, maxWidth: theme.maxWidth, fontFamily: vars['--rfg-font'] }} onClick={(e: Event) => e.stopPropagation()}>
        {safeImageUrl(theme.cover) && <div class="rfg-cover" role="presentation" style={{ backgroundImage: `${theme.coverOverlay ? `linear-gradient(rgba(0,0,0,${Math.min(80, theme.coverOverlay) / 100}), rgba(0,0,0,${Math.min(80, theme.coverOverlay) / 100})), ` : ''}url("${safeImageUrl(theme.cover)}")`, backgroundPosition: `center ${theme.coverPosition || 'center'}`, height: `${theme.coverHeight || 160}px` }} />}
        {safeImageUrl(theme.logo) && (
          <div class={`rfg-logo rfg-logo-${theme.logoAlign || 'left'}`}>
            <img src={safeImageUrl(theme.logo) as string} alt="" style={{ height: `${theme.logoHeight || 40}px` }} />
          </div>
        )}
        {settings.showTitle !== false && (
          <header class="rfg-header canvas-header">
            <input class="canvas-title" value={d.title || ''} placeholder={t('canvas.formTitle')} onInput={e => setMeta({ title: (e.target as HTMLInputElement).value })} onFocus={() => (selectedId.value = null)} />
            <textarea class="canvas-desc" rows={1} value={d.description || ''} placeholder={t('canvas.descriptionPlaceholder')} onInput={e => setMeta({ description: (e.target as HTMLTextAreaElement).value })} onFocus={() => (selectedId.value = null)} />
          </header>
        )}

        {d.fields.length === 0 && (
          <div class={`empty-state ${emptyOver ? 'drop-over' : ''}`}>
            <div class="empty-icon">
              <Icon name="sparkles" size={26} />
            </div>
            <h3>{t('canvas.emptyTitle')}</h3>
            <p>{t('canvas.emptyText')}</p>
            <div class="row-gap center">
              <button class="btn primary" onClick={() => (showAddMenu.value = { dest: { list: ROOT, index: 0 } })}>
                <Icon name="plus" size={16} /> {t('canvas.addField')}
              </button>
              <button class="btn" onClick={() => (showTemplates.value = true)}>
                {t('canvas.startFromTemplate')}
              </button>
            </div>
          </div>
        )}

        <List id={ROOT} kind="root" items={formItems} steps={steps} className="rfg-grid card-grid" />

        {d.fields.length > 0 && (
          <>
            <button class="add-inline" onClick={() => (showAddMenu.value = { dest: { list: ROOT, index: formItems.length } })}>
              <Icon name="plus" size={16} /> {t('canvas.addField')}
            </button>
            {!hasOwnSubmit && (
              <div class="rfg-actions fake-actions">
                <span class="rfg-btn rfg-btn-primary">{settings.submitButtonText || formText('ui.submit')}</span>
              </div>
            )}
          </>
        )}
      </div>
      {endingBreak && (
        <div class={`paper ending-paper ${paperClass}`} ref={endingRef} style={{ ...vars, background: theme.backgroundColor, color: theme.textColor, maxWidth: theme.maxWidth, fontFamily: vars['--rfg-font'] }} onClick={(e: Event) => e.stopPropagation()}>
          <button
            class={`ending-head ${selectedId.value === endingBreak.id ? 'selected' : ''}`}
            onClick={(e: Event) => {
              e.stopPropagation();
              selectedId.value = endingBreak.id;
            }}
          >
            <Icon name="party" size={16} />
            <b>{t('canvas.thankYouPage')}</b>
            <span>{t('canvas.thankYouPageHint')}</span>
          </button>
          <List
            id={ENDING_LIST}
            kind="root"
            items={endingItems}
            steps={steps}
            className="rfg-grid card-grid"
            empty={<div class="ui-hint pad">{t('canvas.thankYouEmpty')}</div>}
          />
          <button class="add-inline" onClick={() => (showAddMenu.value = { dest: { list: ROOT, index: d.fields.length } })}>
            <Icon name="plus" size={16} /> {t('canvas.addToThankYou')}
          </button>
        </div>
      )}
      {d.footer && d.footer.enabled !== false && (d.footer.text || (d.footer.links || []).length || d.footer.copyright) && (
        <button class="canvas-footer-note" onClick={(e: Event) => { e.stopPropagation(); tab.value = 'design'; }}>
          <Icon name="layout" size={13} />{' '}
          {t('canvas.footerNote', {
            parts: [d.footer.text && t('canvas.footerText'), (d.footer.links || []).length && t('canvas.footerLinks', { count: (d.footer.links || []).length }), (d.footer.social || []).length && t('canvas.footerSocial'), d.footer.copyright && t('canvas.footerCopyright')].filter(Boolean).join(', '),
          })}
        </button>
      )}
    </main>
  );
}
