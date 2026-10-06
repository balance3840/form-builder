import { Template, form, req, reqEmail, cols, opts, settings, required } from './helpers';

const B = '#0284c7';

export const WORK: Template[] = [
  {
    id: 'job',
    name: 'Job application',
    description: 'Candidate details, CV and links',
    icon: 'file',
    color: B,
    category: 'work',
    keywords: 'career hiring recruitment candidate resume cv',
    doc: () =>
      form(
        'Job application',
        'Tell us a bit about yourself.',
        [
          ['heading', { label: 'About you' }],
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['country', { label: 'Country', ...cols(6) }],
          ['heading', { label: 'The role' }],
          ['dropdown', { label: 'Position', options: opts('Frontend engineer', 'Backend engineer', 'Product designer', 'Product manager'), validations: req }],
          ['date', { label: 'Available from', ...cols(6) }],
          ['number', { label: 'Expected salary (yearly)', ...cols(6), placeholder: '60000' }],
          ['url', { label: 'LinkedIn or portfolio' }],
          ['file', { label: 'Upload your CV', placeholder: 'PDF up to 10 MB', attributes: { accept: '.pdf,.doc,.docx' } }],
          ['longText', { label: 'Why do you want to work with us?' }],
          ['checkbox', { checkboxLabel: 'I agree to the processing of my data', validations: [required('You need to accept to continue')] }],
        ],
        settings('Apply now', 'Application received. Good luck!'),
      ),
  },
  {
    id: 'timeoff',
    name: 'Time-off request',
    description: 'Leave type, dates and a note for the manager',
    icon: 'calendarRange',
    color: B,
    category: 'work',
    keywords: 'vacation holiday leave absence sick pto',
    doc: () =>
      form(
        'Request time off',
        'Your manager will get this request.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['email', { label: 'Manager email', ...cols(6), validations: reqEmail }],
          ['dropdown', { label: 'Type of leave', options: opts('Vacation', 'Sick leave', 'Personal day', 'Parental leave', 'Other'), validations: req }],
          ['dateRange', { label: 'From and to', validations: req }],
          ['toggle', { label: 'Half days only', defaultValue: false }],
          ['longText', { label: 'Note for your manager' }],
        ],
        settings('Send request', 'Request sent. You will hear back soon.'),
      ),
  },
  {
    id: 'expense',
    name: 'Expense report',
    description: 'Amount, category and a receipt',
    icon: 'hash',
    color: B,
    category: 'work',
    keywords: 'reimbursement receipt claim money spending',
    doc: () =>
      form(
        'Expense report',
        'Attach the receipt so we can reimburse you.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['date', { label: 'Date of expense', ...cols(6), validations: req }],
          ['dropdown', { label: 'Category', options: opts('Travel', 'Meals', 'Accommodation', 'Equipment', 'Other'), validations: req }],
          ['number', { label: 'Amount', ...cols(6), placeholder: '0.00', validations: [required(), { name: 'min', params: [0] }] }],
          ['dropdown', { label: 'Currency', options: opts('EUR', 'USD', 'GBP', 'DKK', 'SEK'), defaultValue: 'EUR', ...cols(6) }],
          ['longText', { label: 'What was it for?', validations: req }],
          ['file', { label: 'Receipt', placeholder: 'A photo or PDF', attributes: { accept: 'image/*,.pdf' }, validations: req }],
        ],
        settings('Submit expense', 'Expense submitted.'),
      ),
  },
  {
    id: 'onboarding',
    name: 'Employee onboarding',
    description: 'Personal details, equipment and an emergency contact',
    icon: 'briefcase',
    color: B,
    category: 'work',
    keywords: 'new hire starter welcome staff',
    doc: () =>
      form(
        'Welcome aboard',
        'A few details so we are ready for your first day.',
        [
          ['heading', { label: 'About you' }],
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['date', { label: 'Date of birth', ...cols(6) }],
          ['email', { label: 'Personal email', ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['address', { label: 'Home address', placeholder: 'Search for your address' }],
          ['heading', { label: 'Your equipment' }],
          ['radio', { label: 'Laptop', options: opts('Windows', 'Mac'), defaultValue: 'Mac' }],
          ['dropdown', { label: 'T-shirt size', options: opts('XS', 'S', 'M', 'L', 'XL', 'XXL'), ...cols(6) }],
          ['longText', { label: 'Dietary requirements or access needs' }],
          ['heading', { label: 'In case of emergency' }],
          ['shortText', { label: 'Contact person', ...cols(6), validations: req }],
          ['phone', { label: 'Their phone', ...cols(6) }],
        ],
        settings('Send', 'Thank you! See you on your first day.'),
      ),
  },
  {
    id: 'employeeSurvey',
    name: 'Employee satisfaction',
    description: 'How people feel about work, with an anonymous option',
    icon: 'smile',
    color: B,
    category: 'work',
    keywords: 'engagement pulse staff morale hr',
    doc: () =>
      form(
        'How is work going?',
        'Your answers are anonymous.',
        [
          [
            'likert',
            {
              label: 'How much do you agree?',
              config: {
                rows: [
                  { label: 'I enjoy my work', value: 'enjoy' },
                  { label: 'I feel supported by my team', value: 'team' },
                  { label: 'I have what I need to do my job', value: 'tools' },
                  { label: 'I can see a future here', value: 'future' },
                ],
              },
            },
          ],
          ['nps', { label: 'How likely are you to recommend us as a place to work?' }],
          ['longText', { label: 'What is the one thing we should improve?' }],
          ['longText', { label: 'What should we keep doing?' }],
        ],
        { theme: { preset: 'ocean' }, ...settings('Send', 'Thank you for your honesty.') },
      ),
  },
];

