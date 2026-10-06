import { Template, form, req, reqEmail, cols, opts, settings, showWhen, required } from './helpers';

const R = '#dc2626';

export const HEALTH: Template[] = [
  {
    id: 'patientIntake',
    name: 'Patient intake',
    description: 'Contact details, health history and consent',
    icon: 'pulse',
    color: R,
    category: 'health',
    keywords: 'clinic doctor medical registration new patient history',
    doc: () =>
      form(
        'New patient form',
        'Please fill this in before your first visit.',
        [
          ['heading', { label: 'About you' }],
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['date', { label: 'Date of birth', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6), validations: req }],
          ['heading', { label: 'Your health' }],
          ['longText', { label: 'Reason for your visit', validations: req }],
          ['yesNo', { label: 'Do you take any medication?' }],
          ['longText', { label: 'Which medication?' }],
          ['yesNo', { label: 'Do you have any allergies?' }],
          ['longText', { label: 'Which allergies?' }],
          ['checkboxes', { label: 'Do you have or have you had any of these?', options: opts('Asthma', 'Diabetes', 'Heart disease', 'High blood pressure', 'None of these') }],
          ['heading', { label: 'In case of emergency' }],
          ['shortText', { label: 'Contact person', ...cols(6) }],
          ['phone', { label: 'Their phone', ...cols(6) }],
          ['checkbox', { checkboxLabel: 'I confirm the information is correct and agree to its use for my care', validations: [required('You need to accept to continue')] }],
          ['signature', { label: 'Signature', validations: req }],
        ],
        {
          theme: { preset: 'ocean' },
          ...settings('Send form', 'Thank you. We look forward to seeing you.'),
          logic: f => {
            showWhen(f[8], f[7], 'yes');
            showWhen(f[10], f[9], 'yes');
          },
        },
      ),
  },
  {
    id: 'waiver',
    name: 'Consent or waiver',
    description: 'Read, agree and sign',
    icon: 'shield',
    color: R,
    category: 'health',
    keywords: 'liability release agreement consent signature legal',
    doc: () =>
      form(
        'Consent form',
        'Please read the terms and sign at the bottom.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['date', { label: 'Date', ...cols(6), validations: req }],
          ['email', { validations: reqEmail }],
          ['callout', { label: 'Please read', content: 'Replace this text with your terms. Explain what people agree to and what you are not responsible for.', config: { tone: 'warning' } }],
          ['checkbox', { checkboxLabel: 'I have read and understood the terms', validations: [required('You need to accept to continue')] }],
          ['signature', { label: 'Signature', validations: req }],
        ],
        { theme: { preset: 'minimal' }, ...settings('Sign', 'Thank you. Your signed form has been sent.') },
      ),
  },
];

