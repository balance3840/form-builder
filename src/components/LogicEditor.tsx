import { FieldLogic, FormField, LOGIC_OPERATORS, LogicMatch, LogicNode, isContainer, isLayoutType, isLogicGroup, logicRules, packLogic } from '../generator';
import { Icon } from '../icons';
import { logicSources, updateField } from '../store';
import { Select, TextInput } from './ui';
import { t } from '../i18n';
import { operatorLabel } from '../i18n/labels';

const ACTIONS: { value: FieldLogic['action']; label: () => string; sentence: () => string }[] = [
  { value: 'show', label: () => t('logic.actionShow'), sentence: () => t('logic.thisFieldWhen') },
  { value: 'hide', label: () => t('logic.actionHide'), sentence: () => t('logic.thisFieldWhen') },
  { value: 'disable', label: () => t('logic.actionDisable'), sentence: () => t('logic.thisFieldWhen') },
  { value: 'enable', label: () => t('logic.actionEnable'), sentence: () => t('logic.thisFieldWhen') },
  { value: 'require', label: () => t('logic.actionRequire'), sentence: () => t('logic.when') },
];

/** Which things a rule can do to this kind of block. */
function actionsFor(field: FormField) {
  const holdsAnswer = !isLayoutType(field.type) && field.type !== 'repeater' && field.type !== 'toggle';
  const canDisable = field.type !== 'callout' && field.type !== 'heading' && field.type !== 'paragraph' && field.type !== 'divider' && field.type !== 'pageBreak';
  return ACTIONS.filter(a => {
    if (a.value === 'require') return holdsAnswer;
    if (a.value === 'disable' || a.value === 'enable') return canDisable && !isContainer(field);
    return true;
  });
}

const blankCondition = (sources: FormField[]) => ({ field: sources[sources.length - 1].model as string, operator: 'equals', value: '' });
const MAX_DEPTH = 3;

const matchOptions = () => [
  { value: 'all', label: t('logic.matchAll') },
  { value: 'any', label: t('logic.matchAny') },
  { value: 'none', label: t('logic.matchNone') },
];

/** One condition: a question, how to compare it and the value. */
function Condition({ c, sources, onChange, onRemove }: { c: any; sources: FormField[]; onChange: (patch: any) => void; onRemove: () => void }) {
  const source = sources.find(s => s.model === c.field);
  const operator = LOGIC_OPERATORS.find(o => o.value === c.operator) || LOGIC_OPERATORS[0];
  const choices = source && source.options && source.options.length ? source.options : source && (source.type === 'toggle' || (source.type === 'input' && source.inputType === 'checkbox')) ? [{ label: t('logic.onTicked'), value: 'true' }, { label: t('logic.off'), value: 'false' }] : null;
  return (
    <div class="condition">
      <Select
        value={c.field}
        onChange={v => onChange({ field: v, value: '' })}
        options={sources.map(s => ({ value: s.model, label: s.type === 'repeater' ? t('logic.numberOf', { name: s.label || s.model }) : s.label || s.checkboxLabel || s.model || '' }))}
      />
      <Select value={c.operator} onChange={v => onChange({ operator: v })} options={LOGIC_OPERATORS.map(o => ({ value: o.value, label: operatorLabel(o) }))} />
      {operator.needsValue &&
        (choices ? (
          <Select value={String(c.value ?? '')} placeholder={t('logic.choose')} onChange={v => onChange({ value: v })} options={choices.map((o: { value: any; label: string }) => ({ value: String(o.value), label: o.label }))} />
        ) : (
          <TextInput value={c.value} placeholder={t('common.value')} onInput={v => onChange({ value: v })} />
        ))}
      <button class="icon-btn" aria-label={t('logic.removeCondition')} onClick={onRemove}>
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

/**
 * A list of conditions joined by all (AND) / any (OR) / none (NOT any). A condition can be a group of its own with its
 * own join, so "(A or B) and (C and D)" is a rule joined by "all" with two groups joined by "any" and "all".
 */
function Conditions({ match, nodes, sources, depth, onChange, showMatch }: { match: LogicMatch; nodes: LogicNode[]; sources: FormField[]; depth: number; onChange: (match: LogicMatch, nodes: LogicNode[]) => void; showMatch: boolean }) {
  const setNode = (i: number, node: LogicNode) => onChange(match, nodes.map((n, idx) => (idx === i ? node : n)));
  const dropNode = (i: number) => onChange(match, nodes.filter((_, idx) => idx !== i));
  return (
    <>
      {showMatch && (
        <div class="logic-sentence">
          <Select value={match} onChange={v => onChange(v as LogicMatch, nodes)} options={matchOptions()} />
          <span>{t('logic.ofTheseMatch')}</span>
        </div>
      )}
      {nodes.map((n, i) => [
        i > 0 && (
          <button class={`logic-join is-${match}`} key={`join${i}`} title={t('logic.toggleJoin')} aria-label={t('logic.toggleJoin')} onClick={() => onChange(match === 'any' ? 'all' : 'any', nodes)}>
            {match === 'any' ? t('logic.or') : match === 'none' ? t('logic.andNot') : t('logic.and')}
          </button>
        ),
        isLogicGroup(n) ? (
          <div class="logic-group" key={i}>
            <Conditions match={n.match} nodes={n.conditions} sources={sources} depth={depth + 1} showMatch onChange={(m, list) => (list.length ? setNode(i, { match: m, conditions: list }) : dropNode(i))} />
            <button class="link-btn danger" onClick={() => dropNode(i)}>
              {t('logic.removeGroup')}
            </button>
          </div>
        ) : (
          <Condition key={i} c={n} sources={sources} onChange={patch => setNode(i, { ...n, ...patch })} onRemove={() => dropNode(i)} />
        ),
      ])}
      <div class="row-gap">
        <button class="btn ghost small" onClick={() => onChange(match, [...nodes, blankCondition(sources)])}>
          <Icon name="plus" size={14} /> {t('logic.addCondition')}
        </button>
        {depth < MAX_DEPTH && (
          <button class="btn ghost small" onClick={() => onChange(match, [...nodes, { match: 'any', conditions: [blankCondition(sources), blankCondition(sources)] }])}>
            <Icon name="plus" size={14} /> {t('logic.addGroup')}
          </button>
        )}
      </div>
    </>
  );
}

/** The "Conditional logic" panel: any number of rules, each showing / hiding / disabling / requiring the field. */
export function Logic({ field }: { field: FormField }) {
  const sources = logicSources(field.id);
  const rules = logicRules(field);
  const actions = actionsFor(field);
  const set = (next: FieldLogic[]) => updateField(field.id, { logic: packLogic(next) }, `logic:${field.id}`);
  const free = actions.filter(a => !rules.some(r => r.action === a.value));
  const setRule = (i: number, patch: Partial<FieldLogic>) => set(rules.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  if (!sources.length) {
    return <div class="ui-hint pad">{t('logic.noSources')}</div>;
  }

  return (
    <div class="stack">
      {!rules.length && <div class="ui-hint">{t('logic.noRules')}</div>}
      {rules.map((rule, i) => {
        const conditions = rule.conditions || [];
        return (
          <div class="rule-card" key={i}>
            <div class="logic-sentence">
              <Select value={rule.action} onChange={v => setRule(i, { action: v as FieldLogic['action'] })} options={actions.concat(ACTIONS.filter(a => a.value === rule.action && !actions.some(x => x.value === a.value))).map(a => ({ value: a.value, label: a.label() }))} />
              <span>{(ACTIONS.find(a => a.value === rule.action) || ACTIONS[0]).sentence()}</span>
              {(conditions.length > 1 || rule.match === 'none') && <Select value={rule.match} onChange={v => setRule(i, { match: v as LogicMatch })} options={matchOptions()} />}
              {(conditions.length > 1 || rule.match === 'none') && <span>{t('logic.ofTheseMatch')}</span>}
            </div>
            <Conditions match={rule.match} nodes={conditions} sources={sources} depth={1} showMatch={false} onChange={(match, list) => (list.length ? setRule(i, { match, conditions: list }) : set(rules.filter((_, idx) => idx !== i)))} />
            <div class="row-gap">
              <button class="link-btn danger" onClick={() => set(rules.filter((_, idx) => idx !== i))}>
                {t('logic.removeRule')}
              </button>
            </div>
          </div>
        );
      })}
      {!rules.length ? (
        <div>
          <button class="btn ghost small" onClick={() => set([{ action: 'show', match: 'all', conditions: [blankCondition(sources)] }])}>
            <Icon name="zap" size={14} /> {t('logic.addRule')}
          </button>
        </div>
      ) : (
        // one rule per action: the ANDs / ORs of an action are built inside its card, with groups
        free.length > 0 && <Select value="" placeholder={t('logic.addAnotherRule')} onChange={v => v && set([...rules, { action: v as FieldLogic['action'], match: 'all', conditions: [blankCondition(sources)] }])} options={free.map(a => ({ value: a.value, label: a.label() }))} />
      )}
    </div>
  );
}
