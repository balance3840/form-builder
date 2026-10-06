import { Template, form, req, reqEmail, cols, opts, settings, showWhen, required } from './helpers';

const T = '#0f766e';

export const BUSINESS: Template[] = [
  {
    id: 'order',
    name: 'Order form',
    description: 'Products, delivery and payment',
    icon: 'bag',
    color: T,
    category: 'business',
    keywords: 'purchase shop store checkout buy products',
    doc: () =>
      form(
        'Place an order',
        'We will confirm your order by email.',
        [
          ['heading', { label: 'Your order' }],
          ['dropdown', { label: 'Product', options: opts('Small package', 'Medium package', 'Large package'), validations: req }],
          ['number', { label: 'Quantity', defaultValue: 1, placeholder: '1', ...cols(6), validations: [required(), { name: 'min', params: [1] }] }],
          ['radio', { label: 'Delivery', options: opts('Home delivery', 'Pick up in store'), defaultValue: 'Home delivery' }],
          ['heading', { label: 'Your details' }],
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['address', { label: 'Delivery address', placeholder: 'Search for your address' }],
          ['radio', { label: 'Payment', options: opts('Card', 'Invoice', 'Bank transfer'), defaultValue: 'Card' }],
          ['longText', { label: 'Notes for the order' }],
        ],
        {
          theme: { preset: 'forest' },
          ...settings('Place order', 'Thank you for your order!'),
          logic: f => showWhen(f[8], f[3], 'Home delivery'),
        },
      ),
  },
  {
    id: 'return',
    name: 'Return request',
    description: 'Order number, reason and photos',
    icon: 'repeat',
    color: T,
    category: 'business',
    keywords: 'refund exchange rma warranty product',
    doc: () =>
      form(
        'Return an item',
        'Tell us what went wrong and what you would like us to do.',
        [
          ['shortText', { label: 'Order number', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['shortText', { label: 'Item', validations: req }],
          ['dropdown', { label: 'Reason for the return', options: opts('Does not fit', 'Damaged', 'Not as described', 'Arrived too late', 'Changed my mind'), validations: req }],
          ['radio', { label: 'What would you like?', options: opts('A refund', 'An exchange'), defaultValue: 'A refund' }],
          ['longText', { label: 'More details' }],
          ['file', { label: 'Photos', placeholder: 'Show us the problem', attributes: { accept: 'image/*', multiple: true } }],
        ],
        { theme: { preset: 'forest' }, ...settings('Send request', 'Request received. We will email you the next steps.') },
      ),
  },
  {
    id: 'donation',
    name: 'Donation form',
    description: 'Amount, frequency and donor details',
    icon: 'heart',
    color: T,
    category: 'business',
    keywords: 'charity fundraising nonprofit give gift',
    doc: () =>
      form(
        'Make a donation',
        'Every contribution helps.',
        [
          ['radio', { label: 'Amount', options: opts('10', '25', '50', '100', 'Other amount'), defaultValue: '25', validations: req }],
          ['number', { label: 'Your amount', placeholder: '0', validations: [required(), { name: 'min', params: [1] }] }],
          ['radio', { label: 'How often?', options: opts('Once', 'Every month'), defaultValue: 'Once' }],
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['toggle', { label: 'Donate anonymously', defaultValue: false }],
          ['longText', { label: 'A message (optional)' }],
        ],
        {
          theme: { preset: 'soft' },
          ...settings('Donate', 'Thank you for your generosity!'),
          logic: f => showWhen(f[1], f[0], 'Other amount'),
        },
      ),
  },
  {
    id: 'membership',
    name: 'Membership application',
    description: 'Plan, personal details and payment method',
    icon: 'users',
    color: T,
    category: 'business',
    keywords: 'club join member gym association subscription',
    doc: () =>
      form(
        'Become a member',
        'Choose a plan and we will get you started.',
        [
          ['radio', { label: 'Plan', options: opts('Basic', 'Standard', 'Premium'), defaultValue: 'Standard', validations: req }],
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['date', { label: 'Date of birth', ...cols(6) }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['address', { label: 'Address', placeholder: 'Search for your address' }],
          ['date', { label: 'Start date', ...cols(6) }],
          ['radio', { label: 'Payment method', options: opts('Card', 'Direct debit', 'Invoice'), defaultValue: 'Card', ...cols(6) }],
          ['checkbox', { checkboxLabel: 'I accept the membership terms', validations: [required('You need to accept to continue')] }],
        ],
        { theme: { preset: 'ocean' }, ...settings('Join now', 'Welcome! Your membership is on its way.') },
      ),
  },
];
