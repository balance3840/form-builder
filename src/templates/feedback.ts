import { Template, form, req, reqEmail, opts, settings, showWhen, emailRule } from './helpers';

const A = '#f59e0b';

export const FEEDBACK: Template[] = [
  {
    id: 'feedback',
    name: 'Customer feedback',
    description: 'Rating, NPS and comments (2 steps)',
    icon: 'star',
    color: A,
    category: 'feedback',
    keywords: 'review satisfaction rating csat',
    doc: () =>
      form(
        'How did we do?',
        'Your feedback helps us improve.',
        [
          ['rating', { label: 'Overall satisfaction', validations: [{ name: 'required', params: ['Please pick a rating'] }] }],
          ['scale', { label: 'How likely are you to recommend us to a friend?' }],
          ['checkboxes', { label: 'What did you like most?', options: opts('Quality', 'Price', 'Support', 'Speed') }],
          ['pageBreak'],
          ['longText', { label: 'What could we do better?', placeholder: 'Be as honest as you like' }],
          ['email', { label: 'Email (optional)', helpText: 'Only if you want us to follow up.', validations: [] }],
        ],
        { theme: { preset: 'sunset' }, ...settings('Send feedback', 'Thank you for your feedback!') },
      ),
  },
  {
    id: 'survey',
    name: 'Quick survey',
    description: 'Multiple choice with follow-up logic',
    icon: 'listChecks',
    color: '#15803d',
    category: 'feedback',
    keywords: 'questionnaire poll multiple choice',
    doc: () =>
      form(
        'Quick survey',
        'Two minutes, promise.',
        [
          ['radio', { label: 'Have you used our product before?', options: opts('Yes', 'No'), validations: req }],
          ['scale', { label: 'How easy was it to use?', config: { min: 1, max: 5, minLabel: 'Hard', maxLabel: 'Easy' } }],
          ['longText', { label: 'What would make it easier?' }],
          ['dropdown', { label: 'How did you hear about us?', options: opts('Friend', 'Social media', 'Search', 'Other') }],
        ],
        {
          theme: { preset: 'forest' },
          logic: f => {
            showWhen(f[1], f[0], 'Yes');
            showWhen(f[2], f[1], '4', 'lt');
          },
        },
      ),
  },
  {
    id: 'nps',
    name: 'NPS survey',
    description: 'One score and a reason, with a follow-up',
    icon: 'gauge',
    color: A,
    category: 'feedback',
    keywords: 'net promoter score loyalty recommend',
    doc: () =>
      form(
        'One quick question',
        'It takes ten seconds.',
        [
          ['nps', { label: 'How likely are you to recommend us to a friend or colleague?', validations: [{ name: 'required', params: ['Please pick a score'] }] }],
          ['longText', { label: 'What is the main reason for your score?' }],
          ['toggle', { label: 'You may contact me about my answer', defaultValue: false }],
          ['email', { validations: reqEmail }],
        ],
        { theme: { preset: 'sunset' }, ...settings('Send', 'Thank you! Your answer helps us improve.'), logic: f => showWhen(f[3], f[2], 'true') },
      ),
  },
  {
    id: 'product',
    name: 'Product feedback',
    description: 'What works, what is missing and how likely to recommend',
    icon: 'smile',
    color: A,
    category: 'feedback',
    keywords: 'product review user research beta',
    doc: () =>
      form(
        'Tell us about the product',
        'Honest opinions make it better.',
        [
          ['rating', { label: 'How would you rate it?', validations: [{ name: 'required', params: ['Please pick a rating'] }] }],
          ['radio', { label: 'How often do you use it?', options: opts('Every day', 'Every week', 'Now and then', 'This is my first time') }],
          ['checkboxes', { label: 'What do you like?', options: opts('Easy to use', 'Looks good', 'Fast', 'Good value', 'Reliable') }],
          ['longText', { label: 'What is missing or frustrating?' }],
          ['yesNo', { label: 'Would you recommend it?' }],
          ['email', { label: 'Email (optional)', validations: [emailRule] }],
        ],
        { theme: { preset: 'sunset' }, ...settings('Send feedback', 'Thank you for helping us improve!') },
      ),
  },
  {
    id: 'website',
    name: 'Website feedback',
    description: 'Did you find what you were looking for?',
    icon: 'monitor',
    color: A,
    category: 'feedback',
    keywords: 'site page usability ux',
    doc: () =>
      form(
        'Help us improve this site',
        '',
        [
          ['yesNo', { label: 'Did you find what you were looking for?', validations: req }],
          ['longText', { label: 'What were you looking for?' }],
          ['scale', { label: 'How easy was the site to use?', config: { min: 1, max: 5, minLabel: 'Hard', maxLabel: 'Easy' } }],
          ['longText', { label: 'Anything else you would change?' }],
          ['email', { label: 'Email (optional)', validations: [emailRule] }],
        ],
        { theme: { preset: 'minimal' }, ...settings('Send', 'Thanks for your feedback!'), logic: f => showWhen(f[1], f[0], 'no') },
      ),
  },
  {
    id: 'feature',
    name: 'Feature request',
    description: 'Describe an idea and how much it matters',
    icon: 'zap',
    color: A,
    category: 'feedback',
    keywords: 'idea suggestion roadmap product',
    doc: () =>
      form(
        'Request a feature',
        'What should we build next?',
        [
          ['shortText', { label: 'Feature name', validations: req }],
          ['longText', { label: 'What problem would it solve?', validations: req }],
          ['radio', { label: 'How important is it to you?', options: opts('Nice to have', 'Important', 'I cannot work without it'), defaultValue: 'Important' }],
          ['longText', { label: 'How do you solve it today?' }],
          ['email', { label: 'Email', helpText: 'We will tell you when it ships.', validations: reqEmail }],
        ],
        { theme: { preset: 'sunset' }, ...settings('Send request', 'Thanks! We read every request.') },
      ),
  },
];
