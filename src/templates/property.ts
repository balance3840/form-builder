import { Template, form, req, reqEmail, cols, opts, settings, showWhen, required } from './helpers';
import { inspectionDoc } from '../templateInspection';
import { leaseDoc } from '../templateLease';
import { waitingListDoc } from '../templateWaitingList';

const N = '#1b2a6b';

export const PROPERTY: Template[] = [
  {
    id: 'maintenance',
    name: 'Maintenance request',
    description: 'Report something that needs fixing, with photos',
    icon: 'wrench',
    color: N,
    category: 'property',
    keywords: 'repair fix issue home flat apartment building facility',
    doc: () =>
      form(
        'Maintenance request',
        'Tell us what needs fixing and we will take care of it.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['phone', { ...cols(6), validations: req }],
          ['email', { validations: reqEmail }],
          ['address', { label: 'Address', placeholder: 'Search for the address', validations: req }],
          ['dropdown', { label: 'What is the problem with?', options: opts('Plumbing', 'Electricity', 'Heating', 'Windows and doors', 'Appliances', 'Something else'), validations: req }],
          ['radio', { label: 'How urgent is it?', options: opts('It can wait', 'Soon', 'Emergency'), defaultValue: 'Soon' }],
          ['longText', { label: 'Describe the problem', validations: req }],
          ['file', { label: 'Photos', placeholder: 'Show us the problem', attributes: { accept: 'image/*', multiple: true } }],
          ['toggle', { label: 'You may enter when I am not home', defaultValue: false }],
          ['longText', { label: 'When are you home?', placeholder: 'Days and times that suit you' }],
        ],
        {
          theme: { preset: 'minimal', primaryColor: N },
          ...settings('Send request', 'Request received. We will be in touch.'),
          logic: f => showWhen(f[9], f[8], 'false'),
        },
      ),
  },
  {
    id: 'report',
    name: 'Report a problem',
    description: 'Noise, safety or anything else, with an anonymous option',
    icon: 'callout',
    color: N,
    category: 'property',
    keywords: 'complaint noise neighbour neighbor nuisance safety incident',
    doc: () =>
      form(
        'Report a problem',
        'We take every report seriously.',
        [
          ['dropdown', { label: 'What kind of problem is it?', options: opts('Noise', 'Safety', 'Cleanliness', 'Damage', 'Something else'), validations: req }],
          ['datetime', { label: 'When did it happen?', ...cols(6) }],
          ['shortText', { label: 'Where?', placeholder: 'Building, floor or area', ...cols(6) }],
          ['longText', { label: 'What happened?', validations: req }],
          ['file', { label: 'Photos or other files', attributes: { multiple: true } }],
          ['toggle', { label: 'Send anonymously', defaultValue: false }],
          ['shortText', { label: 'Your name', ...cols(6) }],
          ['email', { ...cols(6), validations: reqEmail }],
        ],
        {
          theme: { preset: 'minimal', primaryColor: N },
          ...settings('Send report', 'Thank you. We will look into it.'),
          logic: f => {
            showWhen(f[6], f[5], 'false');
            showWhen(f[7], f[5], 'false');
          },
        },
      ),
  },
  {
    id: 'visitor',
    name: 'Visitor registration',
    description: 'Who is visiting, whom and why',
    icon: 'user',
    color: N,
    category: 'property',
    keywords: 'guest check-in reception sign in access building',
    doc: () =>
      form(
        'Visitor registration',
        'Please sign in when you arrive.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['shortText', { label: 'Company', ...cols(6) }],
          ['email', { ...cols(6) }],
          ['phone', { ...cols(6) }],
          ['shortText', { label: 'Who are you visiting?', validations: req }],
          ['dropdown', { label: 'Purpose of the visit', options: opts('Meeting', 'Delivery', 'Service or repair', 'Private visit', 'Other'), validations: req }],
          ['shortText', { label: 'Car registration number', helpText: 'Only if you are parking here.' }],
          ['checkbox', { checkboxLabel: 'I have read the visitor rules', validations: [required('You need to accept to continue')] }],
        ],
        { theme: { preset: 'minimal', primaryColor: N }, ...settings('Check in', 'You are checked in. Welcome!') },
      ),
  },
  {
    id: 'parking',
    name: 'Parking permit request',
    description: 'Vehicle details and the kind of permit',
    icon: 'car',
    color: N,
    category: 'property',
    keywords: 'car vehicle garage space pass',
    doc: () =>
      form(
        'Parking permit request',
        'Apply for a parking space.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['address', { label: 'Address', placeholder: 'Search for your address' }],
          ['heading', { label: 'The vehicle' }],
          ['shortText', { label: 'Registration number', ...cols(6), validations: req }],
          ['shortText', { label: 'Make and model', ...cols(6) }],
          ['radio', { label: 'Type of permit', options: opts('Resident', 'Second car', 'Visitor', 'Disabled access'), defaultValue: 'Resident' }],
          ['date', { label: 'Start date', ...cols(6) }],
          ['file', { label: 'Vehicle registration document', placeholder: 'A photo or PDF', attributes: { accept: 'image/*,.pdf' } }],
        ],
        { theme: { preset: 'minimal', primaryColor: N }, ...settings('Apply', 'Application received. We will confirm by email.') },
      ),
  },
  {
    id: 'moving',
    name: 'Moving notice',
    description: 'New address, moving date and forwarding details',
    icon: 'home',
    color: N,
    category: 'property',
    keywords: 'relocation move out notice change of address',
    doc: () =>
      form(
        'Moving notice',
        'Let us know when you are moving.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['address', { label: 'Current address', placeholder: 'Search for your address', validations: req }],
          ['date', { label: 'Moving date', ...cols(6), validations: req }],
          ['toggle', { label: 'I have a new address to give', defaultValue: true }],
          ['address', { label: 'New address', placeholder: 'Search for your new address' }],
          ['longText', { label: 'Anything else we should know?' }],
        ],
        { theme: { preset: 'minimal', primaryColor: N }, ...settings('Send notice', 'Notice received. Thank you!'), logic: f => showWhen(f[5], f[4], 'true') },
      ),
  },
  // made for one application (a backend that reads their answers): listed only when the host asks for them by id
  {
    id: 'inspection',
    name: 'Property inspection',
    description: 'Rooms, signatures and rules over several steps',
    icon: 'layout',
    color: N,
    category: 'property',
    specific: true,
    doc: inspectionDoc,
  },
  {
    id: 'lease',
    name: 'Lease contract',
    description: 'The official Danish lease (Typeformular A) as a PDF',
    icon: 'signature',
    color: '#0f766e',
    category: 'property',
    specific: true,
    doc: leaseDoc,
  },
  {
    id: 'waitingList',
    name: 'Waiting list',
    description: 'People sign up and become applications',
    icon: 'send',
    color: '#be185d',
    category: 'property',
    specific: true,
    doc: waitingListDoc,
  },
];
