import { Template, form, req, reqEmail, cols, opts, settings, showWhen, required } from './helpers';

const V = '#7c3aed';

export const EDUCATION: Template[] = [
  {
    id: 'course',
    name: 'Course registration',
    description: 'Student details, course and start date',
    icon: 'book',
    color: V,
    category: 'education',
    keywords: 'enrol enroll student class school training',
    doc: () =>
      form(
        'Register for a course',
        'Choose your course and tell us about yourself.',
        [
          ['heading', { label: 'About you' }],
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['date', { label: 'Date of birth', ...cols(6) }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['heading', { label: 'The course' }],
          ['dropdown', { label: 'Course', options: opts('Introduction', 'Intermediate', 'Advanced', 'Masterclass'), validations: req }],
          ['radio', { label: 'How will you attend?', options: opts('In person', 'Online'), defaultValue: 'In person' }],
          ['dropdown', { label: 'Start date', options: opts('Next month', 'In two months', 'In three months'), ...cols(6) }],
          ['longText', { label: 'Why do you want to take this course?' }],
          ['checkbox', { checkboxLabel: 'I accept the course terms', validations: [required('You need to accept to continue')] }],
        ],
        { theme: { preset: 'soft' }, ...settings('Register', 'You are registered. Welcome!') },
      ),
  },
  {
    id: 'courseEvaluation',
    name: 'Course evaluation',
    description: 'Rate the teaching, the content and the course',
    icon: 'listChecks',
    color: V,
    category: 'education',
    keywords: 'teacher student review class school rating',
    doc: () =>
      form(
        'Course evaluation',
        'Tell us what worked and what did not.',
        [
          ['dropdown', { label: 'Which course did you take?', options: opts('Introduction', 'Intermediate', 'Advanced') }],
          [
            'likert',
            {
              label: 'How much do you agree?',
              config: {
                rows: [
                  { label: 'The content was clear', value: 'clear' },
                  { label: 'The teacher explained well', value: 'teacher' },
                  { label: 'The pace was right', value: 'pace' },
                  { label: 'I learned what I wanted', value: 'learned' },
                ],
              },
            },
          ],
          ['rating', { label: 'Overall rating', validations: [{ name: 'required', params: ['Please pick a rating'] }] }],
          ['longText', { label: 'What was best about the course?' }],
          ['longText', { label: 'What should be improved?' }],
          ['yesNo', { label: 'Would you recommend this course?' }],
        ],
        { theme: { preset: 'soft' }, ...settings('Send evaluation', 'Thank you for your evaluation.') },
      ),
  },
  {
    id: 'permissionSlip',
    name: 'Permission slip',
    description: 'A guardian gives permission and signs',
    icon: 'signature',
    color: V,
    category: 'education',
    keywords: 'consent parent guardian school trip child signature',
    doc: () =>
      form(
        'Permission slip',
        'A parent or guardian needs to fill this in and sign.',
        [
          ['heading', { label: 'The child' }],
          ['shortText', { label: 'Name of the child', ...cols(6), validations: req }],
          ['shortText', { label: 'Class or group', ...cols(6) }],
          ['heading', { label: 'The activity' }],
          ['shortText', { label: 'Activity or trip', validations: req }],
          ['date', { label: 'Date', ...cols(6) }],
          ['yesNo', { label: 'Is there anything we should know about the child’s health?' }],
          ['longText', { label: 'Please tell us more' }],
          ['heading', { label: 'The guardian' }],
          ['shortText', { label: 'Guardian name', ...cols(6), validations: req }],
          ['phone', { label: 'Phone', ...cols(6), validations: req }],
          ['checkbox', { checkboxLabel: 'I give my permission for the child to take part', validations: [required('You need to accept to continue')] }],
          ['signature', { label: 'Guardian signature', validations: req }],
        ],
        {
          theme: { preset: 'soft' },
          ...settings('Send', 'Thank you. The permission has been sent.'),
          logic: f => showWhen(f[7], f[6], 'yes'),
        },
      ),
  },
];
