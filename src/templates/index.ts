import { Template, TemplateCategory, base } from './helpers';
import { GENERAL } from './general';
import { FEEDBACK } from './feedback';
import { EVENTS } from './events';
import { WORK } from './work';
import { EDUCATION } from './education';
import { HEALTH } from './health';
import { BUSINESS } from './business';
import { PROPERTY } from './property';

export type { Template, TemplateCategory } from './helpers';

/** The groups of the template picker, in the order they are listed. The names are in `templates.json` of each locale (`category.<id>`). */
export const TEMPLATE_CATEGORIES: { id: TemplateCategory; icon: string }[] = [
  { id: 'general', icon: 'mail' },
  { id: 'feedback', icon: 'star' },
  { id: 'events', icon: 'calendar' },
  { id: 'work', icon: 'briefcase' },
  { id: 'education', icon: 'book' },
  { id: 'health', icon: 'pulse' },
  { id: 'business', icon: 'bag' },
  { id: 'property', icon: 'home' },
];

const BLANK: Template = {
  id: 'blank',
  name: 'Blank form',
  description: 'Start from scratch',
  icon: 'plus',
  color: '#6b7280',
  category: 'general',
  doc: () => base('Untitled form', '', []),
};

export const TEMPLATES: Template[] = [BLANK, ...GENERAL, ...FEEDBACK, ...EVENTS, ...WORK, ...EDUCATION, ...HEALTH, ...BUSINESS, ...PROPERTY];

/**
 * The templates a host offers: `ids` (when given) is the whole list, specific ones included; otherwise every general
 * template, limited to `categories` when given. The blank form is always there.
 */
export function offeredTemplates(ids?: string[], categories?: string[]): Template[] {
  if (ids) return TEMPLATES.filter(t => ids.includes(t.id));
  return TEMPLATES.filter(t => t.id === 'blank' || (!t.specific && (!categories || categories.includes(t.category))));
}
