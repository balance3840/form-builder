import { FormDocument, FormField, uid, upgradeColsToRows } from './generator';

/**
 * The sign-up form of a waiting list. The platform turns a finished response into an application, and reads the
 * answers by these names (`first_name`, `mail`, `phone`, `street`…): they are locked, so they cannot be renamed. The
 * choices of `projects` and `selectedZones` (and `unitGroups` / `unitTypes` when a form has them) come from the
 * corporation when the form is served: their options here are only examples.
 */

const required = (message: string) => ({ name: 'required', params: [message] });
const base = (model: string, type: string, label: string, extra: Partial<FormField> = {}): FormField => ({ type, id: uid(), model, inputName: model, label, keyLocked: true, ...extra });
const text = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'text', validationType: 'string', ...extra });
const num = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'number', validationType: 'number', ...extra });
const heading = (label: string): FormField => ({ type: 'heading', id: uid(), label, config: { level: 'h2' } });
const cols = (n: number) => ({ layout: { cols: n } });

/** A choice whose options the platform fills in when the form is served. */
const platformChoice = (model: string, label: string, placeholder: string, example: string): FormField =>
  base(model, 'multiSelect', label, { validationType: 'array', placeholder, options: [{ label: example, value: 'example' }], config: { optionsFrom: 'platform' } });

export function waitingListDoc(): FormDocument {
  const fields: FormField[] = [
    heading('About you'),
    text('first_name', 'First name', { ...cols(6), validations: [required('Please enter your first name')] }),
    text('last_name', 'Last name', { ...cols(6), validations: [required('Please enter your last name')] }),
    base('mail', 'input', 'Email', { inputType: 'email', validationType: 'string', placeholder: 'name@example.com', ...cols(6), validations: [required('Please enter a valid email address'), { name: 'email', params: [] }] }),
    base('phone', 'phone', 'Phone', { validationType: 'string', ...cols(6), validations: [required('Please enter your phone number'), { name: 'phone', params: [] }] }),
    base('interestedFrom', 'input', 'Preferred move-in date', { inputType: 'date', validationType: 'date', ...cols(6) }),
    base('nationality', 'countrySelect', 'Nationality', { validationType: 'string', ...cols(6) }),

    heading('Where do you live today?'),
    text('street', 'Street', { ...cols(6) }),
    text('number', 'Number', { ...cols(2) }),
    text('floor', 'Floor', { ...cols(2) }),
    text('door', 'Door', { ...cols(2) }),
    text('zipcode', 'Zip code', { ...cols(4) }),
    text('city', 'City', { ...cols(8) }),
    base('country', 'countrySelect', 'Country', { validationType: 'string', defaultValue: 'dk' }),

    heading('What are you looking for?'),
    platformChoice('projects', 'Which properties are you interested in?', 'Select properties', 'Example property'),
    platformChoice('selectedZones', 'Preferences', 'Select preferences', 'Example preference'),
    num('minApartmentSize', 'Minimum size (m²)', { ...cols(6), placeholder: '40' }),
    num('maxApartmentSize', 'Maximum size (m²)', { ...cols(6), placeholder: '90' }),
    num('minRent', 'Minimum rent', { ...cols(6) }),
    num('maxRent', 'Maximum rent', { ...cols(6) }),
    num('rooms', 'Number of rooms', { ...cols(6), placeholder: '2' }),

    base('documents', 'file', 'Documents', { inputType: 'file', validationType: 'file', attributes: { multiple: true, accept: 'image/*,.pdf' } }),
    base('allow', 'input', '', {
      inputType: 'checkbox',
      validationType: 'boolean',
      defaultValue: false,
      checkboxLabel: 'I accept that my personal data is processed and stored as described in the privacy policy, and that you may contact me about my application.',
      validations: [required('You need to accept to sign up')],
    }),
  ];

  return {
    version: 2,
    title: 'Join the waiting list',
    description: 'Tell us a little about yourself and what you are looking for. We will get in touch when something suitable becomes available.',
    fields: upgradeColsToRows(fields),
    theme: { preset: 'indigo' },
    settings: { submitButtonText: 'Sign up', successMessage: 'Thank you for signing up for the waiting list.' },
    action: {},
  };
}
