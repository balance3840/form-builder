import { Template, form, req, reqEmail, cols, opts, settings, showWhen, required } from './helpers';

const P = '#ec4899';

export const EVENTS: Template[] = [
  {
    id: 'event',
    name: 'Event registration',
    description: 'Sign-ups with plus-ones and diet',
    icon: 'calendar',
    color: P,
    category: 'events',
    keywords: 'sign up tickets attendees guests',
    doc: () =>
      form(
        'Register for the event',
        'Saturday, 10:00. Limited places.',
        [
          ['shortText', { label: 'Full name', validations: req }],
          ['email', { validations: reqEmail }],
          ['radio', { label: 'Ticket type', options: opts('Standard', 'VIP', 'Student'), defaultValue: 'Standard' }],
          ['toggle', { label: 'Bringing a guest?', defaultValue: false }],
          ['shortText', { label: "Guest's name", placeholder: 'Their full name' }],
          ['checkboxes', { label: 'Dietary requirements', options: opts('Vegetarian', 'Vegan', 'Gluten free', 'No pork') }],
          ['longText', { label: 'Anything we should know?' }],
        ],
        { theme: { preset: 'soft' }, ...settings('Reserve my spot', "You're in! See you there 🎉"), logic: f => showWhen(f[4], f[3], 'true') },
      ),
  },
  {
    id: 'rsvp',
    name: 'RSVP',
    description: 'Yes, no or maybe, with guests and a meal choice',
    icon: 'party',
    color: P,
    category: 'events',
    keywords: 'invitation wedding party birthday reply',
    doc: () =>
      form(
        'Will you join us?',
        'Please let us know by the end of the month.',
        [
          ['shortText', { label: 'Your name', validations: req }],
          ['radio', { label: 'Can you come?', options: opts('Yes, with pleasure', 'Maybe', 'Sorry, I cannot'), validations: req }],
          ['number', { label: 'How many people are coming?', defaultValue: 1, placeholder: '1' }],
          ['radio', { label: 'Meal choice', options: opts('Meat', 'Fish', 'Vegetarian') }],
          ['checkboxes', { label: 'Allergies', options: opts('Nuts', 'Gluten', 'Lactose', 'Shellfish') }],
          ['longText', { label: 'A message for the hosts' }],
        ],
        {
          theme: { preset: 'soft' },
          ...settings('Send reply', 'Thank you for your reply!'),
          logic: f => [2, 3, 4].forEach(i => showWhen(f[i], f[1], 'Sorry, I cannot', 'not_equals')),
        },
      ),
  },
  {
    id: 'workshop',
    name: 'Workshop signup',
    description: 'Pick sessions and tell us your level',
    icon: 'users',
    color: P,
    category: 'events',
    keywords: 'training class course session seminar',
    doc: () =>
      form(
        'Sign up for the workshop',
        'Choose the sessions you want to attend.',
        [
          ['shortText', { label: 'Full name', ...cols(6), validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['checkboxes', { label: 'Sessions', options: opts('Morning session', 'Afternoon session', 'Evening session'), validations: req }],
          ['radio', { label: 'Your experience', options: opts('Beginner', 'Intermediate', 'Advanced'), defaultValue: 'Beginner' }],
          ['toggle', { label: 'I will bring my own laptop', defaultValue: true }],
          ['longText', { label: 'What do you want to learn?' }],
        ],
        { theme: { preset: 'soft' }, ...settings('Sign up', 'You are registered. See you there!') },
      ),
  },
  {
    id: 'webinar',
    name: 'Webinar registration',
    description: 'Name, work details and topics of interest',
    icon: 'monitor',
    color: P,
    category: 'events',
    keywords: 'online event virtual meeting live',
    doc: () =>
      form(
        'Save your seat',
        'Join the live webinar. A recording follows for everyone who signs up.',
        [
          ['shortText', { label: 'First name', ...cols(6), validations: req }],
          ['shortText', { label: 'Last name', ...cols(6), validations: req }],
          ['email', { label: 'Work email', validations: reqEmail }],
          ['shortText', { label: 'Company', ...cols(6) }],
          ['shortText', { label: 'Job title', ...cols(6) }],
          ['checkboxes', { label: 'Which topics interest you?', options: opts('Strategy', 'Tools', 'Case studies', 'Q and A') }],
          ['longText', { label: 'Questions for the speakers' }],
          ['checkbox', { checkboxLabel: 'I agree to receive the recording by email', validations: [required('You need to accept to continue')] }],
        ],
        { theme: { preset: 'ocean' }, ...settings('Register', 'You are registered. Check your email for the link.') },
      ),
  },
  {
    id: 'volunteer',
    name: 'Volunteer signup',
    description: 'Availability, interests and an emergency contact',
    icon: 'heart',
    color: P,
    category: 'events',
    keywords: 'helper community charity shifts',
    doc: () =>
      form(
        'Become a volunteer',
        'Thank you for wanting to help.',
        [
          ['heading', { label: 'About you' }],
          ['shortText', { label: 'Full name', validations: req }],
          ['email', { ...cols(6), validations: reqEmail }],
          ['phone', { ...cols(6) }],
          ['heading', { label: 'How you can help' }],
          ['checkboxes', { label: 'What would you like to do?', options: opts('Set up and clean up', 'Welcome guests', 'Food and drinks', 'Kids activities', 'Photos and video') }],
          ['dates', { label: 'Days you are available' }],
          ['longText', { label: 'Skills or experience' }],
          ['heading', { label: 'In case of emergency' }],
          ['shortText', { label: 'Contact person', ...cols(6) }],
          ['phone', { label: 'Their phone', ...cols(6) }],
        ],
        { theme: { preset: 'soft' }, ...settings('Sign me up', 'Welcome to the team!') },
      ),
  },
];

