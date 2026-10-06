/**
 * Ready-made examples for the form's own code (Settings → Custom code). Each one uses the questions of the form when
 * it has a fitting one (so it works as soon as it is inserted) and a made-up field name otherwise.
 */
import { FormDocument, FormField, flattenFields } from './generator';
import { inContentLanguage, t } from './i18n';

export type CodeExample = { id: string; title: () => string; code: (doc: FormDocument) => string };

const fieldsOf = (doc: FormDocument): FormField[] => flattenFields(doc.fields || [], true, true).filter(f => f.model);
const isDate = (f: FormField) => f.type === 'input' && f.inputType === 'date';
const isChoice = (f: FormField) => (f.type === 'select' || f.type === 'radioGroup') && Array.isArray(f.options) && f.options.length > 1;
const quote = (value: unknown) => {
  const text = String(value ?? '');
  // "We're" reads better than 'We\'re'
  if (text.includes("'") && !text.includes('"')) return `"${text.replace(/\\/g, '\\\\')}"`;
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
};
const comment = (text: string) => `// ${text}`;
const hintFieldName = () => comment(t('settings.codeExFieldNameHint'));

export const CODE_EXAMPLES: CodeExample[] = [
  {
    id: 'highScore',
    title: () => t('settings.codeExHighScore'),
    code: doc => {
      const score = fieldsOf(doc).find(f => f.type === 'scale' || f.type === 'rating');
      const model = score ? score.model : 'recommend';
      const top = score ? (score.type === 'rating' ? Number(score.config?.max || 5) : Math.max(Number(score.config?.max ?? 10) - 1, 1)) : 9;
      const message = inContentLanguage(() => t('settings.codeExHighScoreMessage'));
      return [
        comment(t('settings.codeExHighScoreComment')),
        ...(score ? [] : [hintFieldName()]),
        `form.on('change', ({ key, value }) => {`,
        `  if (key === ${quote(model)} && value >= ${top}) {`,
        `    form.alert(${quote(message)});`,
        `  }`,
        `});`,
      ].join('\n');
    },
  },
  {
    id: 'style',
    title: () => t('settings.codeExStyle'),
    code: doc => {
      const score = fieldsOf(doc).find(f => f.type === 'scale' || f.type === 'rating');
      const model = score ? score.model : 'recommend';
      const low = score ? (score.type === 'rating' ? 2 : Math.max(Math.round(Number(score.config?.max ?? 10) / 2), 1)) : 5;
      return [
        comment(t('settings.codeExStyleComment')),
        ...(score ? [] : [hintFieldName()]),
        `form.on('change', ({ key, value }) => {`,
        `  if (key !== ${quote(model)}) return;`,
        `  if (value <= ${low}) {`,
        `    form.style(${quote(model)}, { highlight: '#fff4e5', labelColor: '#b45309' });`,
        `  } else {`,
        `    form.resetStyle(${quote(model)});`,
        `  }`,
        `});`,
      ].join('\n');
    },
  },
  {
    id: 'today',
    title: () => t('settings.codeExToday'),
    code: doc => {
      const date = fieldsOf(doc).find(isDate);
      return [
        comment(t('settings.codeExTodayComment')),
        ...(date ? [] : [hintFieldName()]),
        `form.on('ready', () => {`,
        `  if (!form.get(${quote(date ? date.model : 'date')})) {`,
        `    form.set(${quote(date ? date.model : 'date')}, new Date().toISOString().slice(0, 10));`,
        `  }`,
        `});`,
      ].join('\n');
    },
  },
  {
    id: 'checkDates',
    title: () => t('settings.codeExCheckDates'),
    code: doc => {
      const dates = fieldsOf(doc).filter(isDate);
      const start = dates[0] ? dates[0].model : 'startDate';
      const end = dates[1] ? dates[1].model : 'endDate';
      const message = inContentLanguage(() => t('settings.codeExCheckDatesMessage'));
      return [
        comment(t('settings.codeExCheckDatesComment')),
        ...(dates.length > 1 ? [] : [hintFieldName()]),
        `form.on('beforeSubmit', ({ values }) => {`,
        `  if (values[${quote(start)}] && values[${quote(end)}] && values[${quote(end)}] < values[${quote(start)}]) {`,
        `    return ${quote(message)};`,
        `  }`,
        `});`,
      ].join('\n');
    },
  },
  {
    id: 'redirect',
    title: () => t('settings.codeExRedirect'),
    code: doc => {
      const choice = fieldsOf(doc).find(isChoice);
      const model = choice ? choice.model : 'type';
      const value = choice ? choice.options[0].value : 'business';
      return [
        comment(t('settings.codeExRedirectComment')),
        ...(choice ? [] : [hintFieldName()]),
        `form.on('submitted', ({ values }) => {`,
        `  if (values[${quote(model)}] === ${typeof value === 'string' ? quote(value) : JSON.stringify(value)}) {`,
        `    form.redirect('https://www.example.com/page-one');`,
        `  } else {`,
        `    form.redirect('https://www.example.com/page-two');`,
        `  }`,
        `});`,
      ].join('\n');
    },
  },
  {
    id: 'filterOptions',
    title: () => t('settings.codeExFilter'),
    code: doc => {
      const choices = fieldsOf(doc).filter(isChoice);
      const first = choices[0] ? choices[0].model : 'city';
      const second = choices[1] ? choices[1].model : 'office';
      return [
        comment(t('settings.codeExFilterComment')),
        ...(choices.length > 1 ? [] : [hintFieldName()]),
        `const update = answer => {`,
        `  if (!answer) return form.resetOptions(${quote(second)});`,
        `  form.filterOptions(${quote(second)}, option => option.label.toLowerCase().includes(String(answer).toLowerCase()));`,
        `};`,
        `form.on('ready', () => update(form.get(${quote(first)})));`,
        `form.on('change', ({ key, value }) => {`,
        `  if (key === ${quote(first)}) update(value);`,
        `});`,
      ].join('\n');
    },
  },
];
