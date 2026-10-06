import { useState } from 'preact/hooks';
import { Icon } from '../icons';
import { TEMPLATES, TEMPLATE_CATEGORIES, offeredTemplates } from '../templates';
import { options, withDefaultSpamProtection } from '../host';
import { doc, emptyDoc, notify, replaceDoc, showTemplates } from '../store';
import { Modal } from './ui';
import { inEnglish, t as tr, tOr } from '../i18n';
import { localizeTemplate } from '../i18n/templates';

/** A template as a new form: written in the interface language and with the host's spam protection. */
export function templateDocument(id: string) {
  const template = TEMPLATES.find(t => t.id === id);
  return template ? withDefaultSpamProtection(localizeTemplate(inEnglish(() => template.doc()), template.id)) : null;
}

const categoryName = (id: string) => tOr(`templates.category.${id}`, id);

export function TemplatesModal() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  if (!showTemplates.value) return null;
  const close = () => {
    showTemplates.value = false;
    setQuery('');
    setCategory('all');
  };

  const offered = offeredTemplates(options.value.templateIds, options.value.templateCategories);
  const categories = TEMPLATE_CATEGORIES.filter(c => offered.some(t => t.category === c.id && t.id !== 'blank'));
  const q = query.trim().toLowerCase();
  const shown = offered.filter(t => {
    if (q) {
      const text = [tOr(`templates.${t.id}.name`, t.name), tOr(`templates.${t.id}.description`, t.description), t.name, t.keywords || '', categoryName(t.category)].join(' ').toLowerCase();
      return q.split(/\s+/).every(word => text.includes(word));
    }
    return category === 'all' ? true : t.id !== 'blank' && t.category === category;
  });

  return (
    <Modal title={tr('templates.title')} onClose={close} wide>
      <p class="ui-hint pad-bottom">{tr('templates.intro')}</p>
      {offered.length > 6 && (
        <div class="template-tools">
          <div class="search">
            <Icon name="search" size={15} />
            <input autoFocus placeholder={tr('templates.search')} value={query} onInput={e => setQuery((e.target as HTMLInputElement).value)} />
          </div>
          {categories.length > 1 && (
            <div class="template-categories" role="tablist" aria-label={tr('templates.categories')}>
              {[{ id: 'all', icon: 'layout' }, ...categories].map(c => (
                <button key={c.id} class={`template-category ${!q && category === c.id ? 'active' : ''}`} role="tab" aria-selected={!q && category === c.id} onClick={() => { setCategory(c.id); setQuery(''); }}>
                  <Icon name={c.icon} size={14} />
                  {c.id === 'all' ? tr('templates.all') : categoryName(c.id)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div class="template-scroll">
        <div class="template-grid">
          {shown.map(t => {
            const name = tOr(`templates.${t.id}.name`, t.name);
            return (
              <button
                key={t.id}
                class="template"
                onClick={() => {
                  if (doc.value.fields.length && !confirm(tr('templates.replaceConfirm'))) return;
                  // Templates are written in English and created in the interface language
                  replaceDoc(t.id === 'blank' ? emptyDoc() : templateDocument(t.id)!);
                  close();
                  notify(tr('templates.loaded', { name }));
                }}
              >
                <span class="template-icon" style={{ background: `${t.color}1a`, color: t.color }}>
                  <Icon name={t.icon} size={22} />
                </span>
                <span class="template-name">{name}</span>
                <span class="ui-hint">{tOr(`templates.${t.id}.description`, t.description)}</span>
              </button>
            );
          })}
        </div>
        {!shown.length && <div class="ui-hint pad">{tr('templates.noMatch', { query })}</div>}
      </div>
    </Modal>
  );
}
