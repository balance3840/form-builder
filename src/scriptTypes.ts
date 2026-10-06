/**
 * TypeScript declarations of the `form` object the custom code gets (see the generator's script-sandbox). A host's code
 * editor (Monaco: `addExtraLib`) uses them for autocomplete and hover help; the field names of the form are filled in so
 * `form.get('…')` suggests them.
 */
import { FormDocument, flattenFields, isLayoutType } from './generator';

const literal = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const doc = (text: string) => `  /** ${text.replace(/\*\//g, '* /')} */\n`;

export function scriptTypings(form: FormDocument): string {
  const fields = flattenFields(form.fields || [], true, true).filter(f => f.model && !isLayoutType(f.type));
  const names = Array.from(new Set(fields.map(f => String(f.model))));
  const fieldName = names.length ? `${names.map(literal).join(' | ')} | (string & {})` : 'string';
  const choiceNames = fields.filter(f => Array.isArray(f.options)).map(f => String(f.model));
  const choiceName = choiceNames.length ? `${Array.from(new Set(choiceNames)).map(literal).join(' | ')} | (string & {})` : 'string';
  const stepIds = flattenFields(form.fields || [], false, true)
    .filter(f => f.type === 'next' && f.id)
    .map(f => String(f.id));
  const stepId = stepIds.length ? `${stepIds.map(literal).join(' | ')} | (string & {})` : 'string';
  const fieldDocs = fields
    .slice(0, 60)
    .map(f => ` * - \`${f.model}\`: ${String(f.label || f.checkboxLabel || f.type).replace(/<[^>]*>/g, '').replace(/\*\//g, '* /').slice(0, 80)}`)
    .join('\n');
  return `/** The field name of a question of this form. */
type FormFieldName = ${fieldName};
/** A question with options. */
type FormChoiceName = ${choiceName};
type FormStepId = ${stepId};
type FormOption = { label: string; value: any };
type FormValues = { [field: string]: any };
/** A colour: '#e11d48', 'rgb(225, 29, 72)', 'hsl(350 80% 50%)' or a name like 'red'. null removes it. */
type FormColor = string | null;
interface FormStyle {
  /** The answer box. */
  background?: FormColor;
  /** The text in the answer box. */
  color?: FormColor;
  borderColor?: FormColor;
  /** Selected options and the focus ring. */
  accentColor?: FormColor;
  /** The question's title. */
  labelColor?: FormColor;
  /** A coloured box behind the whole question. */
  highlight?: FormColor;
}

interface FormEvents {
  /** The form has opened. */
  ready: { values: FormValues };
  /** An answer changed. */
  change: { key: FormFieldName; value: any; values: FormValues };
  /** Another step opened. */
  step: { index: number; id: string; title: string };
  /** Just before sending. Return a message (or false) to stop the form from being sent. */
  beforeSubmit: { values: FormValues };
  /** The answers were sent. */
  submitted: { values: FormValues };
}

interface FormScript {
${doc('Runs your function when something happens: ready, change, step, beforeSubmit or submitted.')}  on<E extends keyof FormEvents>(event: E, handler: (data: FormEvents[E]) => any): FormScript;
${doc('Every answer, by field name.')}  readonly values: FormValues;
${doc('Every question: field name, type, label and options.')}  readonly fields: { model: string; type: string; label: string; options?: FormOption[] }[];
${doc('Reads an answer.')}  get(field: FormFieldName): any;
${doc('Changes an answer, or several at once: form.set({ a: 1, b: 2 }).')}  set(field: FormFieldName, value: any): void;
  set(values: { [field: string]: any }): void;
${doc('Shows a message to the person.')}  alert(message: string): void;
${doc('Hides a question. Hidden questions are not checked and not sent.')}  hide(field: FormFieldName): void;
${doc('Shows a question again.')}  show(field: FormFieldName): void;
${doc('Lets the form decide again whether to show the question.')}  resetVisibility(field: FormFieldName): void;
${doc('Only offers the options for which your function returns true.')}  filterOptions(field: FormChoiceName, keep: (option: FormOption) => boolean): void;
${doc('Replaces the options of a question.')}  setOptions(field: FormChoiceName, options: FormOption[]): void;
${doc('Offers the original options again.')}  resetOptions(field: FormChoiceName): void;
${doc("Colours a question. Only colours: form.style('email', { background: '#fff3f3', borderColor: '#e11d48' }).")}  style(field: FormFieldName, colors: FormStyle): void;
${doc('Takes the colours set with form.style away again.')}  resetStyle(field: FormFieldName): void;
${doc('Opens a step.')}  goToStep(id: FormStepId): void;
${doc('Opens another page (https only).')}  redirect(url: string): void;
}

/**
 * The form. Questions of this form:
${fieldDocs || ' * (none yet)'}
 */
declare const form: FormScript;
`;
}
