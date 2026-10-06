import { FormDocument, FormField, upgradeColsToRows } from '../generator';
import { createField } from '../catalog';

export type Spec = [string, Partial<FormField>?];

export type TemplateCategory = 'general' | 'feedback' | 'events' | 'work' | 'education' | 'health' | 'business' | 'property';

export type Template = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: TemplateCategory;
  /** Extra words people may search for (English). */
  keywords?: string;
  /** Made for one kind of application (a backend that reads its answers): shown only when the host lists the id in `templateIds`. */
  specific?: boolean;
  doc: () => FormDocument;
};

export const required = (message?: string) => ({ name: 'required', params: message ? [message] : [] });
export const emailRule = { name: 'email', params: [] };
export const req = [required()];
export const reqEmail = [required(), emailRule];
export const cols = (n: number) => ({ layout: { cols: n } });
export const opts = (...labels: string[]) => labels.map(label => ({ label, value: label }));

export function build(specs: Spec[]): FormField[] {
  const fields: FormField[] = [];
  specs.forEach(([type, overrides]) => fields.push(createField(type, fields, overrides || {})));
  return fields;
}

export const base = (title: string, description: string, fields: FormField[], extra: Partial<FormDocument> = {}): FormDocument => ({
  version: 2,
  title,
  description,
  fields: upgradeColsToRows(fields),
  theme: { preset: 'indigo' },
  settings: { submitButtonText: 'Submit' },
  action: {},
  ...extra,
});

/** Shows `field` only while `source` has the value (`operator` defaults to "equals"). */
export function showWhen(field: FormField, source: FormField, value: string, operator = 'equals') {
  field.logic = { action: 'show', match: 'all', conditions: [{ field: source.model as string, operator, value }] };
}

/** A whole template from its parts: the fields are written as specs, and the logic gets the built fields by position. */
export function form(
  title: string,
  description: string,
  specs: Spec[],
  extra: Partial<FormDocument> & { logic?: (f: FormField[]) => void } = {},
): FormDocument {
  const { logic, ...doc } = extra;
  const fields = build(specs);
  logic?.(fields);
  return base(title, description, fields, doc);
}

export const settings = (submit: string, success: string, extra: Record<string, unknown> = {}) => ({ settings: { submitButtonText: submit, successMessage: success, ...extra } });
