import { FieldLogic, FormDocument, FormField, collectTranslatables, uid } from './generator';
import { LEASE_DA } from './templateLease.da';

/**
 * A Danish residential lease (Typeformular A, 10th edition). Each step follows the sections of the official contract,
 * and the answers keep fixed names (`landlordName`, `rent`, …): the platform fills the official PDF from them
 * (`settings.pdf: 'lease-a10'`), so renaming a field or an option value breaks the PDF.
 */

/** An option; `badge` and `help` use the generator's rich options (a chip after the label, a "?" with a tip). */
type Opt = string | { label: string; value?: string; badge?: string; help?: string; description?: string };
const options = (list: Opt[]) => list.map(o => (typeof o === 'string' ? { label: o, value: o } : { ...o, value: o.value ?? o.label }));
const required = (message?: string) => ({ name: 'required', params: message ? [message] : [] });

const base = (model: string, type: string, label: string, extra: Partial<FormField> = {}): FormField => ({ type, id: uid(), model, inputName: model, label, ...extra });
const text = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'text', validationType: 'string', ...extra });
const email = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'email', validationType: 'string', ...extra });
const tel = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'tel', validationType: 'string', ...extra });
const num = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'number', validationType: 'number', ...extra });
const money = (model: string, label: string, extra: Partial<FormField> = {}) => num(model, label, { ...extra, config: { suffix: 'kr.', ...(extra.config || {}) }, validations: [{ name: 'min', params: [0] }, ...(extra.validations || [])] });
const date = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'date', validationType: 'date', ...extra });
const textarea = (model: string, label: string, rows: number, extra: Partial<FormField> = {}) => base(model, 'textarea', label, { validationType: 'string', attributes: { rows }, ...extra });
// plain radios and check boxes, like BoligPortal's lease wizard
const radio = (model: string, label: string, list: Opt[], extra: Partial<FormField> = {}) =>
  base(model, 'radioGroup', label, { validationType: 'string', options: options(list), ...extra, config: { optionStyle: 'plain', ...(extra.config || {}) } });
const checkboxes = (model: string, label: string, list: Opt[], extra: Partial<FormField> = {}) =>
  base(model, 'checkboxGroup', label, { validationType: 'array', options: options(list), ...extra, config: { optionStyle: 'plain', ...(extra.config || {}) } });
const select = (model: string, label: string, list: Opt[], extra: Partial<FormField> = {}) => base(model, 'select', label, { validationType: 'string', options: options(list), ...extra });
const yesNo = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'yesNo', label, { validationType: 'string', ...extra });
const toggle = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'toggle', label, { validationType: 'boolean', defaultValue: false, ...extra });
const files = (model: string, label: string, multiple: boolean, extra: Partial<FormField> = {}) =>
  base(model, 'file', label, { inputType: 'file', validationType: 'file', attributes: { accept: '.pdf,.jpg,.jpeg', multiple }, placeholder: 'PDF or photo', ...extra });
const signature = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'signature', label, { validationType: 'string', config: { height: 150 }, ...extra });

const layout = (type: string, extra: Partial<FormField>): FormField => ({ type, id: uid(), ...extra });
const paragraph = (content: string) => layout('paragraph', { content });
const callout = (tone: string, label: string, content: string) => layout('callout', { label, content, config: { tone } });
const section = (label: string, fields: FormField[], extra: Partial<FormField> = {}) => layout('section', { label, fields, ...extra });
const step = (label: string, helpText: string) => layout('pageBreak', { label, helpText });
const row = (spans: number[], columns: FormField[][]): FormField => ({
  type: 'columns',
  id: uid(),
  columns: columns.map((fields, i) => ({ id: uid('col'), span: spans[i], fields })),
});
const repeater = (model: string, config: { [key: string]: any }, fields: FormField[], extra: Partial<FormField> = {}) => base(model, 'repeater', '', { validationType: 'array', fields, config, ...extra });

const when = (conditions: { field: string; operator: string; value?: any }[], action: FieldLogic['action'] = 'show'): FieldLogic => ({ action, match: 'all', conditions });
const is = (field: string, value: string) => ({ field, operator: 'equals', value });
const has = (field: string, value: string) => ({ field, operator: 'contains', value });
/** Shown only for one answer, and then also required. */
const onlyIf = (...conditions: { field: string; operator: string; value?: any }[]): FieldLogic[] => [when(conditions), when(conditions, 'require')];

/**
 * Most characters each one-line answer may have, so it fits its box on the official PDF (both languages, smallest
 * print size). Longer text is not cut off: the backend moves it to an appendix page, but the contract reads better
 * without one. Measured from the boxes in the backend's resources/pdf-templates/typeformular-a-10/{da,en}.json.
 */
const PDF_MAX_LENGTH: { [model: string]: number } = {
  tenancyNumber: 59, propertyTypeOther: 54, propertyAddress: 50, propertyZipCity: 48,
  landlordName: 118, landlordCvr: 105, landlordAddress: 115, landlordPhone: 51, landlordEmail: 49, tenantAddress: 115,
  usage: 127, storageRoomNo: 10, garageNo: 8, rentDueDay: 19, otherPayment1Label: 32, otherPayment2Label: 32,
  bankRegNo: 10, bankAccountNo: 28, bankName: 58, landlordHeatingOther: 61, heatingYearStart: 22, tenantHeatingOther: 61,
  waterYearStart: 22, electricityYearStart: 23, coolingYearStart: 23, indexationDate: 22, indexationFromMonth: 23, indexationToMonth: 23,
};
const maxLength = (max: number) => ({ name: 'max', params: [max] });

function limitToPdf(list: FormField[]) {
  list.forEach(field => {
    const max = field.model ? PDF_MAX_LENGTH[field.model] : undefined;
    if (max && field.type !== 'repeater') field.validations = [...(field.validations || []), maxLength(max)];
    if (field.type !== 'repeater' && field.fields) limitToPdf(field.fields);
    (field.columns || []).forEach(column => limitToPdf(column.fields));
  });
}

const ONE_PER_LINE = 'One per line.';

const MONTHS: Opt[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => ({ label: m, value: m.toLowerCase() }));
/** 0–3 months of rent, or another amount ("other"); the backend reads the number of months from the value. */
const MONTH_CHOICES = (none: string): Opt[] => [
  { label: none, value: '0' },
  { label: '1 month', value: '1' },
  { label: '2 months', value: '2' },
  { label: '3 months', value: '3' },
  { label: 'Another amount', value: 'other' },
];
/**
 * How a utility is paid, like BoligPortal asks it: on account to the landlord, directly between tenant and supplier,
 * or included in the rent. The backend turns it into the official form's "landlord supplies … / meters" boxes.
 */
const settlement = (model: string, label: string, mostUsed?: string, optional = false) =>
  radio(
    model,
    label,
    [
      { label: 'On account to the landlord', value: 'aconto', badge: mostUsed === 'aconto' ? 'Most used' : undefined },
      { label: 'Between the tenant and the supplier', value: 'direct', badge: mostUsed === 'direct' ? 'Most used' : undefined },
      { label: 'Included in the rent', value: 'included' },
      ...(optional ? [{ label: 'Not relevant', value: 'none' }] : []),
    ],
    optional ? { defaultValue: 'none' } : { validations: [required()] },
  );

export function leaseDoc(): FormDocument {
  const fields: FormField[] = [
    // ---- 1. general (§ 1, § 2): the rental and the tenancy
    callout('info', '', 'This form fills in the official Danish lease contract (Typeformular A). When it is sent, you can download the contract as a PDF.'),
    row(
      [8, 4],
      [
        [text('propertyAddress', 'Address', { placeholder: 'Street, number, floor and door', config: { prefill: 'unit.street' }, validations: [required()] })],
        [text('propertyZipCity', 'Postal code and town', { config: { prefill: 'unit.zipCity' }, validations: [required()] })],
      ],
    ),
    date('startDate', 'Move-in date', { helpText: 'The tenancy runs until it is terminated, unless it is time-limited.', config: { prefill: 'tenancy.start' }, validations: [required()] }),
    toggle('subleaseToggle', 'Sublease'),
    // a time-limited tenancy is written in § 11, as the official form's § 2 says
    toggle('timeLimitedToggle', 'Time-limited tenancy'),
    date('endDate', 'It ends on', { logic: onlyIf(is('timeLimitedToggle', true as any)), validations: [{ name: 'minField', params: ['startDate', 'The end must be after the start.'] }] }),
    textarea('timeLimitedReason', 'Why is it time-limited?', 2, {
      helpText: 'The law requires a real reason, for example that you will move back in yourself. It is written in § 11.',
      logic: onlyIf(is('timeLimitedToggle', true as any)),
    }),
    yesNo('timeLimitedTerminable', 'Can either side give notice before it ends?', { logic: onlyIf(is('timeLimitedToggle', true as any)) }),
    radio(
      'propertyType',
      'Type of home',
      [
        { label: 'Apartment', value: 'apartment' },
        { label: 'Room(s)', value: 'singleRoom' },
        { label: 'Owner-occupied apartment', value: 'ownerOccupied' },
        { label: 'Cooperative dwelling', value: 'cooperative' },
        { label: 'House', value: 'house' },
        { label: 'Terraced house', value: 'terracedHouse' },
        { label: 'Other', value: 'other' },
      ],
      { defaultValue: 'apartment', validations: [required()] },
    ),
    text('propertyTypeOther', 'What kind of rental is it?', { logic: onlyIf(is('propertyType', 'other')) }),
    row(
      [4, 4, 4],
      [
        [num('rooms', 'Number of rooms', { config: { prefill: 'unit.rooms' }, validations: [{ name: 'min', params: [1] }] })],
        [num('areaM2', 'Area', { config: { suffix: 'm²', prefill: 'unit.area' }, validations: [required(), { name: 'min', params: [1] }] })],
        [num('businessAreaM2', 'Area for business', { placeholder: 'Optional', config: { suffix: 'm²' } })],
      ],
    ),
    text('usage', 'The rental may only be used for', { defaultValue: 'beboelse', helpText: 'Without the landlord’s written consent.' }),

    // ---- 2. rent (§ 3, § 11)
    step('Rent', 'Amount, payment and adjustment'),
    section('Amount and how often', [
      row(
        [6, 6],
        [
          [money('rent', 'Rent', { helpText: 'Without utilities.', validations: [required()] })],
          [radio('rentPeriod', 'Rent is paid', [{ label: 'Monthly', value: 'monthly' }, { label: 'Quarterly', value: 'quarterly' }], { defaultValue: 'monthly', config: { optionColumns: 2 }, validations: [required()] })],
        ],
      ),
      text('rentDueDay', 'Due on the', { defaultValue: '1.', helpText: 'Day of the month or quarter.' }),
      radio('paymentMethod', 'How does the tenant pay?', [{ label: 'Bank transfer', value: 'bank' }, { label: 'Betalingsservice', value: 'betalingsservice' }], { defaultValue: 'bank', validations: [required()] }),
      row(
        [3, 5, 4],
        [
          [text('bankRegNo', 'Reg. no.', { logic: onlyIf(is('paymentMethod', 'bank')) })],
          [text('bankAccountNo', 'Account number', { logic: onlyIf(is('paymentMethod', 'bank')) })],
          [text('bankName', 'Bank', { logic: [when([is('paymentMethod', 'bank')])] })],
        ],
      ),
      date('taxesDate', 'The rent includes taxes and duties as of', { helpText: 'Leave empty for 1 January of the start year.' }),
    ]),
    section('Rent setting', [
      toggle('freeRentToggle', 'The tenancy is covered by the rules on free rent', { helpText: '§ 54 of the Rent Act. It is written in § 11.' }),
      textarea('freeRentReason', 'Why?', 3, { logic: onlyIf(is('freeRentToggle', true as any)) }),
    ]),
    section('Rent adjustment', [
      toggle('rentIndexationToggle', 'Adjust the rent once a year by the net price index', { helpText: 'It is written in § 11.' }),
      row(
        [6, 6],
        [
          [select('indexationMonth', 'Which month is the rent adjusted?', MONTHS, { logic: onlyIf(is('rentIndexationToggle', true as any)) })],
          [select('indexationBaseMonth', 'Which month is the index based on?', MONTHS, { logic: onlyIf(is('rentIndexationToggle', true as any)) })],
        ],
      ),
      date('indexationFirstDate', 'When is the rent adjusted the first time?', { logic: onlyIf(is('rentIndexationToggle', true as any)) }),
    ]),

    // ---- 3. utilities (§ 3, § 5, § 6)
    step('Utilities', 'How heating, water and power are paid'),
    section('Heating and hot water', [
      settlement('heatingSettlement', 'How are heating and hot water paid?'),
      money('heatingAconto', 'Amount for heating and hot water', { logic: onlyIf(is('heatingSettlement', 'aconto')) }),
      checkboxes(
        'landlordHeatingSources',
        'The home is heated by',
        [
          { label: 'District heating or natural gas', value: 'district' },
          { label: 'Central heating with oil', value: 'oil' },
          { label: 'Electric heating', value: 'electric' },
          { label: 'Other', value: 'other' },
        ],
        { logic: [when([{ field: 'heatingSettlement', operator: 'not_equals', value: 'direct' }, { field: 'heatingSettlement', operator: 'not_empty' }])] },
      ),
      text('landlordHeatingOther', 'Other heating', { logic: [when([{ field: 'heatingSettlement', operator: 'not_equals', value: 'direct' }, has('landlordHeatingSources', 'other')])] }),
      checkboxes(
        'tenantHeatingSources',
        'The home is heated by',
        [
          { label: 'Electricity', value: 'electric' },
          { label: 'Gas', value: 'gas' },
          { label: 'Oil or petroleum', value: 'oil' },
          { label: 'District heating or natural gas', value: 'district' },
          { label: 'Other', value: 'other' },
        ],
        { logic: [when([is('heatingSettlement', 'direct')])] },
      ),
      text('tenantHeatingOther', 'Other heating', { logic: [when([is('heatingSettlement', 'direct'), has('tenantHeatingSources', 'other')])] }),
      text('heatingYearStart', 'The heating accounting year starts on', {
        placeholder: 'For example 1 June',
        helpText: 'If you only rent out this home, the move-in date is a good choice: then each account covers a whole year.',
        logic: onlyIf(is('heatingSettlement', 'aconto')),
      }),
    ]),
    section('Water', [
      settlement('waterSettlement', 'How is water paid?'),
      money('waterAconto', 'Amount for water', { logic: onlyIf(is('waterSettlement', 'aconto')) }),
      toggle('waterMetersToggle', 'Water is charged by individual meters', { logic: [when([is('waterSettlement', 'aconto')])] }),
      text('waterYearStart', 'The water accounting year starts on', { placeholder: 'For example 1 January', logic: onlyIf(is('waterSettlement', 'aconto'), is('waterMetersToggle', true as any)) }),
    ]),
    section('Electricity', [
      settlement('electricitySettlement', 'How is electricity paid?', 'direct'),
      money('electricityAconto', 'Amount for electricity', { logic: onlyIf(is('electricitySettlement', 'aconto')) }),
      toggle('electricityMetersToggle', 'Electricity is charged by individual meters', { logic: [when([is('electricitySettlement', 'aconto')])] }),
      text('electricityYearStart', 'The electricity accounting year starts on', {
        placeholder: 'For example 1 January',
        logic: onlyIf(is('electricitySettlement', 'aconto'), is('electricityMetersToggle', true as any)),
      }),
    ]),
    section('Cooling', [
      settlement('coolingSettlement', 'How is cooling paid?', undefined, true),
      money('coolingAconto', 'Amount for cooling', { logic: onlyIf(is('coolingSettlement', 'aconto')) }),
      toggle('coolingMetersToggle', 'Cooling is charged by individual meters', { logic: [when([is('coolingSettlement', 'aconto')])] }),
      text('coolingYearStart', 'The cooling accounting year starts on', { placeholder: 'For example 1 January', logic: onlyIf(is('coolingSettlement', 'aconto'), is('coolingMetersToggle', true as any)) }),
    ]),
    section('Other fixed monthly contributions', [
      radio(
        'tvSettlement',
        'How is TV paid?',
        [
          { label: 'The tenant pays a contribution for TV', value: 'landlord', help: 'The landlord supplies the TV signal.' },
          { label: 'TV package from the tenants’ antenna association', value: 'association' },
          { label: 'No TV', value: 'none' },
        ],
        { defaultValue: 'none', validations: [required()] },
      ),
      money('antennaContribution', 'Contribution for TV', { logic: onlyIf(is('tvSettlement', 'landlord')) }),
      radio(
        'internetSettlement',
        'How is internet paid?',
        [
          { label: 'The tenant signs up for internet', value: 'tenant', help: 'The tenant chooses a provider and pays it directly.' },
          { label: 'The tenant pays a contribution for internet', value: 'landlord', help: 'The landlord supplies internet.' },
        ],
        { defaultValue: 'tenant', validations: [required()] },
      ),
      money('internetContribution', 'Contribution for internet', { logic: onlyIf(is('internetSettlement', 'landlord')) }),
      toggle('residentRepresentationPays', 'The tenant pays for resident representation'),
      money('residentRepresentationContribution', 'Contribution for resident representation', { logic: onlyIf(is('residentRepresentationPays', true as any)) }),
      row([8, 4], [[text('otherPayment1Label', 'Other contribution')], [money('otherPayment1', 'Amount')]]),
      row([8, 4], [[text('otherPayment2Label', 'Other contribution')], [money('otherPayment2', 'Amount')]]),
    ]),

    // ---- 4. payments before moving in (§ 4)
    step('Payments before moving in', 'Deposit, prepaid rent and the first payment'),
    paragraph('We suggest two payments: the deposit right after signing, and everything else just before moving in.'),
    section('Deposit', [
      radio('depositMonths', 'Months of rent as deposit', MONTH_CHOICES('No deposit'), { defaultValue: '3', validations: [required()] }),
      money('depositAmount', 'Deposit', { logic: onlyIf(is('depositMonths', 'other')) }),
      date('depositDueDate', 'Payment date', { helpText: 'Usually right after signing.', validations: [required()] }),
    ]),
    section('Prepaid rent, one-off costs and the first rent', [
      radio('prepaidRentMonths', 'Months of prepaid rent', MONTH_CHOICES('No prepaid rent'), { defaultValue: '0', validations: [required()] }),
      money('prepaidRentAmount', 'Prepaid rent', { logic: onlyIf(is('prepaidRentMonths', 'other')) }),
      repeater(
        'oneOffCosts',
        { itemLabel: '{label}', addLabel: 'Add a cost', maxItems: 3 },
        [row([8, 4], [[text('label', 'What for', { placeholder: 'For example: name on the mailbox', validations: [required()] })], [money('amount', 'Amount', { validations: [required()] })]])],
        { label: 'One-off costs', helpText: 'Up to three.' },
      ),
      date('firstPaymentDueDate', 'Payment date for these payments', { helpText: 'Usually just before moving in.', validations: [required()] }),
      row([6, 6], [[date('firstPeriodFrom', 'First rent covers the period from')], [date('firstPeriodTo', 'to')]]),
      money('firstPeriodAmount', 'First rent', { helpText: 'Leave empty to use the rent and the contributions per month or quarter.' }),
      date('firstRegularRentDate', 'After that, rent is first due on'),
    ]),

    // ---- 5. access, maintenance and inventory (§ 1, § 7, § 8, § 9, § 10)
    step('Access, maintenance and inventory', 'What the tenant can use and who maintains it'),
    section('What the tenant has access to', [
      checkboxes('rightToUse', 'The tenant has access to', [
        { label: 'Shared laundry', value: 'laundry' },
        { label: 'Shared courtyard', value: 'courtyard' },
        { label: 'Attic or basement room', value: 'storage' },
        { label: 'Bicycle parking', value: 'bicycle' },
        { label: 'Garage', value: 'garage' },
      ]),
      row(
        [6, 6],
        [
          [text('storageRoomNo', 'Attic or basement room number', { logic: [when([has('rightToUse', 'storage')])] })],
          [text('garageNo', 'Garage number', { logic: [when([has('rightToUse', 'garage')])] })],
        ],
      ),
      textarea('rightToUseOther', 'Other things the tenant has access to', 2, { helpText: ONE_PER_LINE }),
    ]),
    section('Inventory', [
      paragraph('Details about the inventory, like brand and year, can go under “Other information” in the next step.'),
      checkboxes(
        'appliances',
        'The rental comes with',
        [
          { label: 'Cooker', value: 'cooker' },
          { label: 'Dishwasher', value: 'dishwasher' },
          { label: 'Cooker hood', value: 'cookerHood' },
          { label: 'Fridge', value: 'fridge' },
          { label: 'Washing machine', value: 'washingMachine' },
          { label: 'Freezer', value: 'freezer' },
          { label: 'Tumble dryer', value: 'tumbleDryer' },
          { label: 'Fridge-freezer', value: 'fridgeFreezer' },
          { label: 'Washer-dryer', value: 'washerDryer' },
        ],
        { config: { optionColumns: 3 } },
      ),
      textarea('appliancesOther', 'Other inventory', 2, { helpText: ONE_PER_LINE }),
    ]),
    section('Inspections and maintenance', [
      yesNo('landlordMultipleRentals', 'Does the landlord rent out more than one home?', { validations: [required()] }),
      yesNo('moveInInspection', 'Is there a move-in inspection?', { validations: [required()] }),
      yesNo('moveOutInspection', 'Is there a move-out inspection?', { validations: [required()] }),
      radio('maintenance', 'Who is responsible for interior maintenance?', [{ label: 'Landlord', value: 'landlord' }, { label: 'Tenant', value: 'tenant' }], { config: { optionColumns: 2 }, validations: [required()] }),
      row(
        [6, 6],
        [
          [date('maintenanceAccountDate', 'Maintenance account balance as of', { logic: [when([is('maintenance', 'landlord')])] })],
          [money('maintenanceAccountAmount', 'Balance', { logic: [when([is('maintenance', 'landlord')])] })],
        ],
      ),
    ]),
    section('Use', [
      radio('petsAllowed', 'Are pets allowed?', [{ label: 'Yes, pets are allowed', value: 'yes' }, { label: 'No pets', value: 'no' }], { validations: [required()] }),
      textarea('petsConditions', 'Conditions for pets', 2, { placeholder: 'For example: one cat, no dogs', helpText: 'For example only certain pets.', logic: [when([is('petsAllowed', 'yes')])] }),
      yesNo('residentRepresentation', 'Is there resident representation at the property?'),
    ]),

    // ---- 6. attachments and other information (§ 10)
    step('Attachments and other', 'Documents for the tenant and other information'),
    paragraph('The documents are added to the end of the contract and listed in § 10. The energy label is required for every rental except single rooms.'),
    section('Documents', [
      files('energyLabel', 'Energy label', false, { helpText: 'Find it on the Danish Energy Agency’s website.' }),
      files('soilCertificate', 'Soil contamination certificate', false, { helpText: 'Required if the ground is mapped as contaminated.' }),
      radio('houseRules', 'Are there house rules?', [{ label: 'No house rules', value: 'no' }, { label: 'Yes, attach our own house rules', value: 'yes' }], { defaultValue: 'no' }),
      files('houseRulesFile', 'House rules', false, { logic: onlyIf(is('houseRules', 'yes')) }),
      files('otherAttachments', 'Other documents', true),
    ]),
    textarea('otherInformation', 'Other information about the rental (§ 10)', 4, { helpText: 'Not for deviations from the rules. Those go under special terms (§ 11).' }),
    section('Internal information', [text('tenancyNumber', 'Tenancy number', { placeholder: 'Optional', config: { prefill: 'unit.number' } })]),

    // ---- 7. special terms (§ 11)
    step('Special terms (§ 11)', 'Deviations from the general rules'),
    callout('warning', '', 'Everything here goes in § 11 of the contract. A term that gives the tenant fewer rights or more duties than the law only counts if it is in § 11. Only add what you have agreed.'),
    // each switch adds a ready-made term; the backend has the same texts (LeaseContractPdf::CLAUSES), so change both together
    section('Ready-made terms', [
      paragraph('Turn on the ones you have agreed. Each one is added to § 11 with the text shown.'),
      radio(
        'handoverCondition',
        'Condition at move-in',
        [
          { label: 'Newly renovated', value: 'renovated' },
          { label: 'Well maintained', value: 'maintained' },
          { label: 'Don’t add', value: 'none' },
        ],
        { helpText: 'Newly renovated: “The property is handed over newly renovated.” Well maintained: “The property is handed over well maintained.”' },
      ),
      toggle('termValidity', 'Condition for the lease', { helpText: 'The lease is conditional on the tenant paying on time the amounts due before moving in under Section 4.' }),
      toggle('termMoveOutEarly', 'Moving out before the tenancy ends', {
        helpText: 'The tenant must move out and hand over the property cleared no later than 14 days before the tenancy ends, so the landlord can renovate it. The tenant still pays rent and utilities until the tenancy ends.',
      }),
      toggle('termMeterFees', 'Fees for meter readings', {
        helpText: 'The tenant pays the fees for moving-out and annual readings of the meters for heating, water, electricity and gas at the utility companies’ current rates.',
      }),
      toggle('termTenantUtilities', 'Signing up for electricity', {
        helpText: 'The tenant signs up for electricity with an electricity company from the day of handover and pays for the consumption directly to the company.',
      }),
      toggle('termPaint', 'Choice of colours', {
        helpText: 'The tenant may not paint walls, ceilings, floors, woodwork or metal in colours other than the current ones without the landlord’s written consent.',
      }),
      toggle('termGardenSnow', 'Garden and snow clearing', { helpText: 'The tenant looks after the garden and clears snow and grits against ice at the property.' }),
      toggle('termNoSmoking', 'No smoking', { helpText: 'Smoking is not allowed in the property. This includes e-cigarettes.' }),
      toggle('termNoShortTermLetting', 'No short-term letting', { helpText: 'The tenant may not let the property or part of it to tourists or for other short stays, for example through Airbnb.' }),
      toggle('termVentilation', 'Airing and heating', { helpText: 'The tenant must air and heat the property enough to prevent damp and mould.' }),
      toggle('termDigitalReports', 'Digital reports', { helpText: 'The move-in and move-out reports are sent digitally to the tenant’s email address in Section 1.' }),
    ]),
    // each term is printed as "§ 11, stk. 1 – <title>" and its text, like the official guide shows
    repeater(
      'specialTerms',
      { itemLabel: '§ 11, term {n} – {title}', addLabel: 'Add a term', maxItems: 30 },
      [text('title', 'Title', { placeholder: 'For example: No smoking', validations: [required()] }), textarea('text', 'The term', 4, { validations: [required()] })],
      { label: 'Own terms', helpText: 'One term at a time. They are numbered in § 11 of the contract.' },
    ),

    // ---- 8. landlord (§ 1)
    step('Landlord', 'Information and contact details'),
    text('landlordName', 'Name or company name', { config: { prefill: 'corporation.name' }, validations: [required()] }),
    text('landlordAddress', 'Address', { placeholder: 'Street, number, postal code and town', validations: [required()] }),
    text('landlordCvr', 'CVR number', { placeholder: 'Optional' }),
    row([6, 6], [[email('landlordEmail', 'Email', { validations: [required(), { name: 'email', params: [] }] })], [tel('landlordPhone', 'Phone', { validations: [required()] })]]),

    // ---- 9. tenants (§ 1)
    step('Tenants', 'Who rents the home'),
    paragraph('With more than two tenants, the others are listed in an appendix to the contract.'),
    repeater(
      'tenants',
      { itemLabel: 'Tenant {n}', addLabel: 'Add tenant', minItems: 1, maxItems: 4, prefill: 'tenants.contacts' },
      [
        toggle('company', 'The tenant is a company'),
        // all names share one box on the PDF
        text('name', 'Full name or company name', { validations: [required(), maxLength(40)] }),
        text('cvr', 'CVR number', { logic: onlyIf({ field: 'company', operator: 'equals', value: true }), validations: [{ name: 'matches', params: ['^\\d{8}$', 'A CVR number has 8 digits.'] }] }),
        row([6, 6], [[email('email', 'Email', { validations: [required(), { name: 'email', params: [] }] })], [tel('phone', 'Phone')]]),
      ],
    ),
    text('tenantAddress', 'The tenants’ current address', { helpText: 'Where the tenants live now.' }),

    // ---- 10. review and finish (§ 12)
    step('Review and finish', 'Check the answers and sign'),
    paragraph('Go through the steps once more. You can also leave the signatures empty and sign the PDF instead.'),
    section('Landlord', [date('landlordSignDate', 'Date'), signature('landlordSignature', 'Landlord’s signature', { config: { height: 150, mode: 'dialog', signLabel: 'Sign as landlord' } })]),
    section('Tenants', [
      date('tenantSignDate', 'Date'),
      signature('tenantSignature', 'Tenant’s signature', { config: { height: 150, mode: 'dialog', signLabel: 'Sign as tenant' } }),
      signature('tenant2Signature', 'Second tenant’s signature', { config: { height: 150, mode: 'dialog', signLabel: 'Sign as tenant' }, logic: [when([{ field: 'tenants', operator: 'gt', value: 1 }])] }),
    ]),
  ];
  limitToPdf(fields);

  const doc: FormDocument = {
    version: 2,
    title: 'Lease contract',
    description: 'Typeformular A, 10th edition',
    fields,
    theme: { preset: 'minimal', primaryColor: '#1b2a6b', backgroundColor: '#ffffff', textColor: '#1f2937', pageBackground: '#f3f4f6', borderRadius: 6, inputStyle: 'outlined', cardStyle: 'bordered', maxWidth: 1040, buttonWidth: 'auto', buttonAlign: 'right', spacing: 'comfortable' },
    settings: {
      stepsLayout: 'sidebar',
      stepNavigation: 'free',
      firstStepTitle: 'General',
      firstStepDescription: 'The rental and the tenancy',
      submitButtonText: 'Create contract',
      successMessage: 'The lease contract is ready.',
      saveDraft: true,
      // like BoligPortal: progress rings per step, a way back that keeps the draft, and the main actions in the sidebar
      stepProgress: true,
      sidebarHeader: { title: 'Back and save as draft', subtitle: '{saved}', action: 'back' },
      sidebarActions: [
        { label: 'Create contract', variant: 'primary', action: 'submit' },
        { label: 'See the contract (PDF)', variant: 'link', action: 'emit', name: 'preview-pdf' },
      ],
      autofill: false,
      // the platform fills the official contract (Typeformular A) from the answers
      pdf: 'lease-a10',
    },
    action: {},
  };

  // Danish version: the English text is the source, the Danish is looked up by that text (field ids are random per load)
  const da: { [key: string]: string } = {};
  collectTranslatables(doc).forEach(item => {
    if (LEASE_DA[item.source]) da[item.key] = LEASE_DA[item.source];
  });
  doc.i18n = { defaultLanguage: 'en', languages: ['en', 'da'], detect: true, switcher: 'none', translations: { da } };
  // the contract PDF reads the answers by these names: they cannot be renamed in the builder, and the required ones cannot be deleted
  const lock = (list: FormField[]) =>
    list.forEach(field => {
      if (field.model) field.keyLocked = true;
      lock(field.fields || []);
      (field.columns || []).forEach(column => lock(column.fields || []));
      (field.tabs || []).forEach(tab => lock(tab.fields || []));
    });
  lock(doc.fields);
  return doc;
}

let leaseKeys: Set<string> | undefined;

/**
 * Is this field's name fixed? Fields marked `keyLocked` are, and so are the fields of the lease contract template in
 * a form that makes the contract PDF, also when it was made before `keyLocked` existed.
 */
export function isKeyLocked(field: FormField, settings?: { pdf?: string }): boolean {
  if (field.keyLocked) return true;
  if (!field.model || settings?.pdf !== 'lease-a10') return false;
  if (!leaseKeys) {
    leaseKeys = new Set();
    const walk = (list: FormField[]) =>
      list.forEach(f => {
        if (f.model) leaseKeys!.add(f.model);
        walk(f.fields || []);
        (f.columns || []).forEach(c => walk(c.fields || []));
        (f.tabs || []).forEach(tab => walk(tab.fields || []));
      });
    walk(leaseDoc().fields);
  }
  return leaseKeys.has(field.model);
}
