import { Template, form, req, reqEmail, cols, opts, settings, showWhen, required, emailRule } from './helpers';

const C = '#4f46e5';

export const GENERAL: Template[] = [
  {
    id: 'contact',
    name: 'Contact us',
    description: 'Name, email and a message',
    icon: 'mail',
    color: C,
    category: 'general',
    keywords: 'contact enquiry inquiry message',
    doc: () =>
      form(
        'Contact us',
        'We usually reply within one business day.',
        [
          ['shortText', { label: 'First name', placeholder: 'Jane', ...cols(6), validations: req }],
          ['shortText', { label: 'Last name', placeholder: 'Doe', ...cols(6), validations: req }],
          ['email', { validations: reqEmail }],
          ['dropdown', { label: 'What is this about?', options: opts('General question', 'Support', 'Sales', 'Something else') }],
          ['longText', { label: 'Message', placeholder: 'How can we help?', validations: req }],
        ],
        settings('Send message', 'Thanks! We will get back to you soon.'),
      ),
  },
  {
    id: 'support',
    name: 'Support request',
    description: 'Describe a problem and attach a file',
    icon: 'info',
    color: C,
    category: 'general',
    keywords: 'help desk ticket issue problem',
    doc: () =>
      form(
        'Support request',
        'Tell us what is wrong and we will help you.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['dropdown', { label: 'Topic', options: opts('Account', 'Billing', 'Technical problem', 'Other'), validations: req }],
          ['radio', { label: 'How urgent is it?', options: opts('Low', 'Normal', 'Urgent'), defaultValue: 'Normal' }],
          ['shortText', { label: 'Subject', validations: req }],
          ['longText', { label: 'What happened?', placeholder: 'The more detail, the faster we can help', validations: req }],
          ['file', { label: 'Attachments', placeholder: 'Screenshots or documents', attributes: { multiple: true } }],
        ],
        settings('Send request', 'We got your request and will be in touch.'),
      ),
  },
  {
    id: 'bug',
    name: 'Bug report',
    description: 'Steps to reproduce, severity and a screenshot',
    icon: 'code',
    color: '#dc2626',
    category: 'general',
    keywords: 'bug defect error software',
    doc: () =>
      form(
        'Report a bug',
        'Help us fix it: tell us what you saw.',
        [
          ['shortText', { label: 'Short summary', validations: req }],
          ['longText', { label: 'Steps to reproduce', placeholder: '1. Go to…\n2. Click…', validations: req }],
          ['longText', { label: 'What did you expect?', ...cols(6) }],
          ['longText', { label: 'What happened instead?', ...cols(6) }],
          ['radio', { label: 'How bad is it?', options: opts('Cosmetic', 'Annoying', 'Blocks my work'), defaultValue: 'Annoying' }],
          ['dropdown', { label: 'Where did it happen?', options: opts('Desktop', 'Phone', 'Tablet', 'Other') }],
          ['file', { label: 'Screenshot', placeholder: 'Drop an image here', attributes: { accept: 'image/*' } }],
          ['email', { label: 'Email (optional)', helpText: 'Only if we may contact you about this.', validations: [emailRule] }],
        ],
        settings('Send report', 'Thank you! Our team will look at it.'),
      ),
  },
  {
    id: 'newsletter',
    name: 'Newsletter signup',
    description: 'Email, interests and consent',
    icon: 'send',
    color: C,
    category: 'general',
    keywords: 'subscribe mailing list email marketing',
    doc: () =>
      form(
        'Stay in the loop',
        'Get our news in your inbox. Unsubscribe at any time.',
        [
          ['shortText', { label: 'First name', ...cols(6) }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['checkboxes', { label: 'What would you like to hear about?', options: opts('Product news', 'Tips and guides', 'Events', 'Offers') }],
          ['radio', { label: 'How often?', options: opts('Every week', 'Every month'), defaultValue: 'Every month' }],
          ['checkbox', { checkboxLabel: 'I agree to receive emails', validations: [required('You need to accept to continue')] }],
        ],
        settings('Subscribe', 'You are subscribed. Check your inbox!'),
      ),
  },
  {
    id: 'quote',
    name: 'Request a quote',
    description: 'Project details, budget and timeline',
    icon: 'file',
    color: C,
    category: 'general',
    keywords: 'estimate proposal pricing offer',
    doc: () =>
      form(
        'Request a quote',
        'Tell us about your project and we will send an offer.',
        [
          ['heading', { label: 'About you' }],
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['shortText', { label: 'Company', ...cols(6) }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['heading', { label: 'The project' }],
          ['dropdown', { label: 'What do you need?', options: opts('Design', 'Development', 'Consulting', 'Something else'), validations: req }],
          ['dropdown', { label: 'Budget', options: opts('Under 1,000', '1,000 to 5,000', '5,000 to 20,000', 'More than 20,000'), ...cols(6) }],
          ['dropdown', { label: 'When do you need it?', options: opts('As soon as possible', 'Within a month', 'Within three months', 'No rush'), ...cols(6) }],
          ['longText', { label: 'Describe the project', validations: req }],
          ['file', { label: 'Files', placeholder: 'Briefs, drawings or examples', attributes: { multiple: true } }],
        ],
        settings('Request quote', 'Thanks! You will get a quote within two business days.'),
      ),
  },
  {
    id: 'appointment',
    name: 'Book an appointment',
    description: 'Service, day, time and contact details',
    icon: 'calendarClock',
    color: C,
    category: 'general',
    keywords: 'booking schedule reservation meeting',
    doc: () =>
      form(
        'Book an appointment',
        'Pick a time that suits you.',
        [
          ['shortText', { label: 'Full name', validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['dropdown', { label: 'Service', options: opts('First visit', 'Follow-up', 'Consultation'), validations: req }],
          ['date', { label: 'Preferred day', ...cols(6), validations: req }],
          ['time', { label: 'Preferred time', ...cols(6), validations: req }],
          ['longText', { label: 'Anything we should know?' }],
        ],
        { theme: { preset: 'ocean' }, ...settings('Request appointment', 'Request received. We will confirm by email.') },
      ),
  },
  {
    id: 'suggestion',
    name: 'Suggestion box',
    description: 'Ideas and suggestions, with an anonymous option',
    icon: 'sparkles',
    color: '#f59e0b',
    category: 'general',
    keywords: 'idea improvement anonymous',
    doc: () =>
      form(
        'Suggestion box',
        'Every idea counts. Share yours.',
        [
          ['dropdown', { label: 'What is your idea about?', options: opts('Products', 'Service', 'Website', 'Something else') }],
          ['shortText', { label: 'Your idea in one line', validations: req }],
          ['longText', { label: 'Tell us more', placeholder: 'Why would it help?' }],
          ['toggle', { label: 'Send anonymously', defaultValue: true }],
          ['email', { label: 'Email', helpText: 'So we can tell you what happened with your idea.', validations: reqEmail }],
        ],
        {
          theme: { preset: 'sunset' },
          ...settings('Send idea', 'Thanks for your idea!'),
          logic: f => showWhen(f[4], f[3], 'false'),
        },
      ),
  },
];
