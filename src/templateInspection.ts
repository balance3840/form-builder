import { FieldLogic, FormDocument, FormField, collectTranslatables, uid } from './generator';
import { INSPECTION_DA } from './templateInspection.da';

/**
 * A move-in / move-out inspection: an eight step flow with a step list, repeating groups (tenants, rooms, meters, keys),
 * a table of units per room, rules that show / disable / require things, buttons with actions and signatures.
 * It exists to show (and test) that the builder can express a form that behaves like an app.
 */

type Opt = string | { label: string; value?: string; description?: string };
const options = (list: Opt[]) => list.map(o => (typeof o === 'string' ? { label: o, value: o } : { label: o.label, value: o.value ?? o.label, ...(o.description ? { description: o.description } : {}) }));
const required = (message?: string) => ({ name: 'required', params: message ? [message] : [] });

const base = (model: string, type: string, label: string, extra: Partial<FormField> = {}): FormField => ({ type, id: uid(), model, inputName: model, label, ...extra });
const text = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'text', validationType: 'string', ...extra });
const email = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'email', validationType: 'string', ...extra });
const tel = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'tel', validationType: 'string', ...extra });
const num = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'number', validationType: 'number', ...extra });
const date = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'date', validationType: 'date', ...extra });
const datetime = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'input', label, { inputType: 'datetime-local', validationType: 'string', ...extra });
const textarea = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'textarea', label, { validationType: 'string', attributes: { rows: 3 }, ...extra });
const select = (model: string, label: string, list: Opt[], extra: Partial<FormField> = {}) => base(model, 'select', label, { validationType: 'string', options: options(list), ...extra });
const radio = (model: string, label: string, list: Opt[], extra: Partial<FormField> = {}) => base(model, 'radioGroup', label, { validationType: 'string', options: options(list), ...extra });
const toggle = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'toggle', label, { validationType: 'boolean', defaultValue: false, ...extra });
const checkbox = (model: string, checkboxLabel: string, extra: Partial<FormField> = {}) => base(model, 'input', '', { inputType: 'checkbox', checkboxLabel, validationType: 'boolean', defaultValue: false, ...extra });
const photos = (model: string, label: string, extra: Partial<FormField> = {}) =>
  base(model, 'file', label, { inputType: 'file', validationType: 'file', attributes: { accept: 'image/*', multiple: true }, config: { compact: true, preview: true, title: 'Add photo' }, ...extra });
const signature = (model: string, label: string, extra: Partial<FormField> = {}) => base(model, 'signature', label, { validationType: 'string', config: { height: 150 }, ...extra });

const layout = (type: string, extra: Partial<FormField>): FormField => ({ type, id: uid(), ...extra });
const paragraph = (content: string) => layout('paragraph', { content });
const callout = (tone: string, label: string, content: string, logic?: FieldLogic) => layout('callout', { label, content, config: { tone }, ...(logic ? { logic } : {}) });
const button = (label: string, actions: any[], config: { [key: string]: any } = {}, extra: Partial<FormField> = {}) => layout('button', { label, config: { variant: 'primary', ...config, actions }, ...extra });
const section = (label: string, fields: FormField[], extra: Partial<FormField> = {}) => layout('section', { label, fields, ...extra });
const step = (label: string, helpText: string) => layout('pageBreak', { label, helpText });
const row = (spans: number[], columns: FormField[][], extra: Partial<FormField> = {}): FormField => ({
  type: 'columns',
  id: uid('row'),
  config: { align: 'start', justify: 'start' },
  columns: spans.map((span, i) => ({ id: uid('col'), span, fields: columns[i] || [] })),
  ...extra,
});
const repeater = (model: string, config: { [key: string]: any }, fields: FormField[], extra: Partial<FormField> = {}) => base(model, 'repeater', '', { validationType: 'array', fields, config, ...extra });

const tabsBlock = (tabs: { label: string; fields: FormField[] }[]) => layout('tabs', { tabs: tabs.map(t => ({ id: uid('tab'), label: t.label, fields: t.fields })) });
const modalBlock = (label: string, fields: FormField[], config: { [key: string]: any } = {}) => layout('modal', { label, fields, config });

const when = (action: FieldLogic['action'], conditions: { field: string; operator: string; value?: any }[], match: 'all' | 'any' = 'all'): FieldLogic => ({ action, match, conditions });

/* ------------------------------------------------------------------ rooms */

const COMMON = ['Ceiling', 'Walls', 'Floor', 'Woodwork', 'Windows', 'Radiators', 'Sockets and switches', 'Doors and frames'];
const ROOM_TYPES: { value: string; label: string; description: string; units: string[] }[] = [
  { value: 'kitchen', label: 'Kitchen', description: 'With stove, oven and appliances', units: [...COMMON, 'Sink', 'Taps', 'Countertop', 'Cabinets and drawers', 'Tiles', 'Stove', 'Oven', 'Extractor hood', 'Fridge', 'Dishwasher', 'Fire alarm'] },
  { value: 'bathroom', label: 'Bathroom', description: 'Shower, bath, sink and toilet', units: [...COMMON, 'Sink', 'Taps', 'Toilet', 'Shower', 'Bath', 'Tiles', 'Mirror', 'Ventilation'] },
  { value: 'hallway', label: 'Hallway', description: 'Entrance and corridors', units: ['Ceiling', 'Walls', 'Floor', 'Woodwork', 'Sockets and switches', 'Doors and frames', 'Fire alarm'] },
  { value: 'bedroom', label: 'Bedroom', description: 'A sleeping room', units: COMMON },
  { value: 'living_room', label: 'Living room', description: 'Main living space', units: COMMON },
  { value: 'toilet', label: 'Toilet', description: 'Separate toilet', units: ['Ceiling', 'Walls', 'Floor', 'Toilet', 'Sink', 'Taps', 'Ventilation', 'Doors and frames'] },
  { value: 'outside', label: 'Outside', description: 'Balcony, terrace, garden', units: ['Balcony or terrace', 'Garden', 'Storage room', 'Mailbox', 'Door entry system'] },
  { value: 'room', label: 'Room', description: 'Any other room', units: COMMON },
  { value: 'other', label: 'Other', description: 'Start with an empty checklist', units: [] },
];

const CONDITIONS = ['New', 'Good', 'Worn', 'Neglected', 'Missing'];
const REMEDIES = ['Only document it', 'Repair', 'Fill and paint', 'Clean', 'Sand', 'Replace', 'Other'];

/**
 * The rooms step. The overview has the same two tools twice: for everything (all rooms) and, inside a room, for that room.
 * A room opens as its own page (tabs Units / Notes / Defects, a condition button per unit, a "+" that starts a defect for
 * that unit, "Mark as done" at the bottom); adding a room asks for a type and a name in a dialog.
 */
function defectFields(): FormField[] {
  return [
    base('units', 'checkboxGroup', 'Units', { validationType: 'array', options: [], config: { optionStyle: 'chips', optionsFrom: { field: 'units', labelKey: 'unit' } }, validations: [required('Pick at least one unit')] }),
    select('remedy', 'Remedy', REMEDIES, { placeholder: 'Choose type' }),
    textarea('description', 'Describe and document the defect', { validations: [required('Please describe the defect')] }),
    photos('photos', 'Photos', { attributes: { accept: 'image/*', multiple: true }, config: { fileStyle: 'block', preview: true, title: 'Add photo' } }),
  ];
}

const defectConfig = (extra: { [key: string]: any } = {}) => ({
  itemLabel: 'Defect {n}',
  itemMeta: '{units}',
  itemOpen: 'modal',
  addMode: 'modal',
  addLabel: 'Create defect',
  addTitle: 'Create defect',
  editTitle: 'Edit defect',
  confirmLabel: 'Save defect',
  emptyText: 'No defects yet.',
  itemMenu: ['edit', 'duplicate', 'remove'],
  ...extra,
});

function stateDialog(title: string, field: string): FormField {
  return modalBlock(title, [radio('state', 'Set the condition of all units', CONDITIONS, { validations: [required('Pick a condition')] })], {
    confirmLabel: 'Set condition',
    confirmActions: [{ type: 'setAll', field, key: 'condition', value: '{draft:state}' }],
  });
}

/** One room's page. */
function roomFields(): FormField[] {
  const roomState = stateDialog('Set the condition of everything in this room', 'units');
  const units = repeater(
    'units',
    { layout: 'table', addLabel: 'Add unit', addMode: 'modal', addTitle: 'Add unit', editTitle: 'Edit unit', itemMenu: ['edit', 'remove'] },
    [
      row(
        [6, 3, 3],
        [
          [text('unit', 'Unit', { config: { plain: true }, validations: [required('Give the unit a name')] })],
          [select('condition', 'Condition', CONDITIONS, { defaultValue: 'Good', config: { selectStyle: 'pill' } })],
          [button('Create defect', [{ type: 'add', field: 'defects', values: { units: ['{unit}'] } }], { variant: 'ghost', icon: 'plus', iconOnly: true, columnLabel: 'Defect', hideInDialog: true })],
        ],
      ),
    ],
  );
  const defects = repeater('defects', defectConfig({ emptyText: 'No defects have been created in this room yet.' }), defectFields(), { label: 'Defects' });
  return [
    // asked in the “Add room” dialog (and when editing the room): the type picker fills in the name and the checklist
    row([12], [[text('name', 'Room name', { validations: [required('Give the room a name')] })]], { config: { align: 'start', justify: 'start', dialogOnly: true } }),
    row(
      [4, 4],
      [
        [button('Create defect', [{ type: 'add', field: 'defects' }], { variant: 'primary', icon: 'plus' })],
        [button('Set condition on all', [{ type: 'openModal', modal: roomState.id }], { variant: 'outline' })],
      ],
    ),
    tabsBlock([
      { label: 'Units', fields: [units] },
      {
        label: 'Notes',
        fields: [select('type', 'Room type', ROOM_TYPES.map(t => ({ label: t.label, value: t.value })), { placeholder: ' ' }), textarea('note', 'Note', { placeholder: 'Anything about this room' }), photos('notePhotos', 'Photos', { attributes: { accept: 'image/*', multiple: true }, config: { fileStyle: 'block', preview: true, title: 'Add photo' } }), toggle('done', 'This room is finished', { helpText: 'Marks the room as done on the overview.' })],
      },
      { label: 'Defect overview', fields: [defects] },
    ]),
    roomState,
    button('Mark as done', [{ type: 'set', field: 'done', value: true }, { type: 'closeItem' }], { variant: 'primary', align: 'end' }),
  ];
}

/** The whole step: tools for all rooms on top, then tabs Room overview | Defects | Other. */
function roomsStep(): FormField[] {
  const everything = stateDialog('Set the condition of everything', 'rooms.units');
  const roomList = repeater(
    'rooms',
    {
      layout: 'grid',
      columns: 2,
      itemOpen: 'page',
      itemMenu: ['edit', 'duplicate', 'up', 'down', 'remove'],
      itemLabel: '{name}',
      itemMeta: '{count:defects|No defects|1 defect|# defects}',
      doneField: 'done',
      addLabel: 'Add room',
      addTitle: 'Add room',
      editTitle: 'Edit room',
      addMode: 'modal',
      addStyle: 'dashed',
      dialogContent: 'marked',
      uniqueKey: 'name',
      presetNameKey: 'name',
      presetTextKeys: ['name', 'unit'],
      presetLabel: 'Room type',
      presetCustomLabel: 'Other',
      backLabel: 'Back to the rooms',
      presets: ROOM_TYPES.map(t => ({ label: t.label, description: t.description, values: { type: t.value, name: t.label, units: t.units.map(unit => ({ unit, condition: 'Good' })) } })),
    },
    roomFields(),
  );
  const allDefects = repeater(
    'allDefects',
    defectConfig({ emptyText: 'No defects yet. Use “Create defect” to pick units from any room.' }),
    [
      base('units', 'checkboxGroup', 'Choose units', {
        validationType: 'array',
        options: [],
        config: { optionStyle: 'plain', searchable: true, optionColumns: 2, optionsFrom: { field: 'rooms.units', labelKey: 'unit', groupKey: 'name' } },
        validations: [required('Pick at least one unit')],
      }),
      ...defectFields().slice(1),
    ],
    { label: 'Defects in all rooms' },
  );
  return [
    row(
      [4, 4],
      [
        [button('Create defect', [{ type: 'add', field: 'allDefects' }], { variant: 'primary', icon: 'plus' })],
        [button('Set condition on all', [{ type: 'openModal', modal: everything.id }], { variant: 'outline' })],
      ],
    ),
    tabsBlock([
      { label: 'Room overview', fields: [roomList] },
      { label: 'Defects', fields: [allDefects] },
      {
        label: 'Other',
        fields: [
          section('General note', [textarea('generalNote', 'Write a note', { placeholder: 'Add a general note to the report' }), photos('generalPhotos', 'Photos', { config: { fileStyle: 'block', preview: true, title: 'Add photo' } })]),
          section('Final cleaning', [toggle('finalCleaning', 'The rental must be cleaned at the end')], { config: { tooltip: 'If the rental has to be professionally cleaned when the tenant moves out, tick this. It is added to the report.' } }),
        ],
      },
    ]),
    everything,
  ];
}

/* --------------------------------------------------------------- the form */

export function inspectionDoc(): FormDocument {
  const fields: FormField[] = [
    // ---- 1. type
    radio(
      'inspectionType',
      'What kind of inspection is this?',
      [
        { label: 'Move-in inspection', value: 'move_in', description: 'Document the condition when the tenant moves in.' },
        { label: 'Move-out inspection', value: 'move_out', description: 'Document the condition when the tenant moves out.' },
      ],
      { config: { optionStyle: 'cards', autoAdvance: true, optionColumns: 2, prefill: 'inspection.type' }, validations: [required('Choose a type to continue')] },
    ),

    // ---- 2. details
    step('Inspection details', 'Dates, who inspects and who receives a copy'),
    select('tenancy', 'Choose tenancy', ['New tenancy', 'Existing tenancy'], { defaultValue: 'New tenancy', placeholder: ' ' }),
    section('Dates', [
      row([6, 6], [[date('noticeDate', 'Date of the notice for the inspection')], [datetime('inspectionAt', 'Date and time of the inspection', { validations: [required()] })]]),
    ]),
    section('14-day defects period', [
      checkbox('collectDefects', 'Collect defects and shortcomings from the tenant', { defaultValue: true }),
      date('tenancyStart', 'Tenancy start date in the lease (start of the defects period)', { config: { prefill: 'tenancy.start' }, logic: when('show', [{ field: 'collectDefects', operator: 'equals', value: 'true' }]), validations: [required()] }),
    ]),
    section('Landlord / inspector', [
      text('inspectorName', 'First and last name', { config: { prefill: 'staff.name' }, validations: [required()] }),
      toggle('inspectionViaLink', 'Allow the inspection to be done via a link', { helpText: 'The inspector can open the inspection on a phone without logging in.' }),
    ]),
    section('Copy recipients', [
      repeater('copyRecipients', { layout: 'table', addLabel: 'Add copy recipient', emptyText: 'Nobody will receive a copy.' }, [row([12], [[email('recipientEmail', 'Email address', { validations: [required(), { name: 'email', params: [] }] })]])], {
        helpText: 'These addresses get a copy of the documents: the inspection report, the 14-day defects report and any power of attorney.',
      }),
    ]),
    section('Add the inspection to a calendar', [
      paragraph('Add the inspection to your calendar. The event contains the link to this inspection, so it can be opened again without logging in.'),
      row([4, 8], [[button('Add to my calendar', [{ type: 'emit', name: 'add-to-calendar' }], { variant: 'outline' })], []]),
    ]),
    section('Internal property number', [text('propertyNumber', 'Property number', { placeholder: 'Optional', config: { prefill: 'unit.number' } })]),

    // ---- 3. tenants
    step('Tenant details', 'Who is moving in or out'),
    repeater(
      'tenants',
      { itemLabel: 'Tenant #{n}', addLabel: 'Add tenant', minItems: 1, prefill: 'tenants' },
      [
        row([6, 6], [[text('firstName', 'First name', { validations: [required()] })], [text('lastName', 'Last name', { validations: [required()] })]]),
        row([6, 6], [[email('email', 'Email', { validations: [required(), { name: 'email', params: [] }] })], [tel('phone', 'Phone number')]]),
        radio('presence', 'Is the tenant at the inspection?', ['Yes, present', 'Represented by a proxy', 'No, not present'], { defaultValue: 'Yes, present', config: { optionColumns: 3 } }),
        text('proxyName', 'Name of the proxy', { logic: when('show', [{ field: 'presence', operator: 'equals', value: 'Represented by a proxy' }]), validations: [required()] }),
      ],
    ),

    // ---- 4. rooms
    step('Room review', 'Walk through each room and record its condition'),
    callout('info', 'How it works', 'Add the rooms you inspect. Each room comes with a checklist of units. Open a room to set the condition of every unit, and create defects with photos where something is wrong.'),
    ...roomsStep(),

    // ---- 5. meters
    step('Meter readings', 'Record the readings at the time of the inspection'),
    repeater(
      'meters',
      { itemLabel: '{meterType} ({name})', addLabel: 'Add meter', addMode: 'modal', addTitle: 'Add meter', editTitle: 'Edit meter', addStyle: 'dashed', itemMenu: ['edit', 'remove'], emptyText: 'No meters added yet.' },
      [
        select('meterType', 'Type', ['Heating', 'Electricity', 'Cold water', 'Hot water', 'Gas'], { defaultValue: 'Heating', validations: [required()], config: { dialogOnly: true } }),
        text('name', 'Name / installation no.', { placeholder: 'Inst. no.:', config: { dialogOnly: true } }),
        num('reading', 'Reading', { validations: [required()], config: { suffixBy: { field: 'meterType', values: { Heating: 'kWh', Electricity: 'kWh', 'Cold water': 'm³', 'Hot water': 'm³', Gas: 'm³' } } } }),
        photos('meterPhoto', 'Photo of the meter', { attributes: { accept: 'image/*' }, config: { fileStyle: 'block', preview: true, title: 'Add photo of the meter' } }),
      ],
    ),

    // ---- 6. keys
    step('Keys', 'Keys and access cards that are handed over'),
    repeater(
      'keys',
      { itemLabel: '{keyType}', addLabel: 'Add key / access card', addMode: 'modal', addTitle: 'Add key or access card', editTitle: 'Edit', addStyle: 'dashed', itemMenu: ['edit', 'remove'], minItems: 1 },
      [
        select('keyType', 'Type', ['Front door', 'Back door', 'Mailbox', 'Basement or storage', 'Garage', 'Access card', 'Other'], { defaultValue: 'Front door', validations: [required()], config: { dialogOnly: true } }),
        num('quantity', 'Quantity', { defaultValue: 1, config: { suffix: 'pcs.' }, validations: [required(), { name: 'min', params: [1] }] }),
      ],
    ),
    section('Extra information', [
      textarea('keyNote', 'Write a note', { placeholder: 'For example that a key is missing, who replaces it, or other special circumstances' }),
      photos('keyPhotos', 'Photos of the keys', { config: { fileStyle: 'block', preview: true, title: 'Add photo of the keys' } }),
      toggle('keysHandedOver', 'Keys handed over to the tenant'),
      callout('success', 'Keys handed over', 'The keys are marked as handed over to the tenant.', when('show', [{ field: 'keysHandedOver', operator: 'equals', value: 'true' }])),
    ]),

    // ---- 7. electricity
    step('Electricity sign-up', 'Help the tenant avoid paying for the previous tenant’s power'),
    callout('warning', 'Almost there', 'Fill in the date of the inspection and the tenant details first, then the electricity sign-up can be used.', when('show', [{ field: 'inspectionAt', operator: 'empty' }, { field: 'tenants', operator: 'lt', value: 1 }], 'any')),
    radio(
      'electricity',
      'Has the tenant signed up for electricity?',
      [
        { label: 'Yes, the tenant is already signed up', value: 'yes', description: 'The electricity sign-up is skipped.' },
        { label: 'No, let the tenant sign up now', value: 'no', description: 'The tenant chooses a supplier by scanning a QR code or opening a link. It takes about two minutes, with no commitment.' },
      ],
      { config: { optionStyle: 'cards' }, validations: [required('Please choose one')] },
    ),
    callout('info', '', 'The tenant gets the link by email and SMS when the inspection is finished.', when('show', [{ field: 'electricity', operator: 'equals', value: 'no' }])),

    // ---- 8. finish: five numbered cards; 3 to 5 stay greyed out until the landlord has signed
    step('Finish, sign and send', 'Review, sign and send the report'),
    section('Review the report and make sure everything is correct.', [button('Review report', [{ type: 'emit', name: 'review-report' }], { variant: 'primary', align: 'stretch' })], { config: { badge: '1' } }),
    section('Sign in the box below.', [signature('landlordSignature', 'Landlord: sign and send', { validations: [required('The landlord needs to sign')], config: { mode: 'dialog', signLabel: 'Sign as landlord' } })], { config: { badge: '2' } }),
    section('Wait for the tenant to receive a copy by email and SMS. Ask them to open the link: it is noted in the activity log of the report. (A tenant who is not present receives the report when it has been sent.)', [], { config: { badge: '3' }, logic: when('disable', [{ field: 'landlordSignature', operator: 'empty' }]) }),
    section(
      'When the tenant has received the report, they sign in the box below. Important: the tenant only confirms that the report was received.',
      [
        toggle('tenantRefuses', 'The tenant refuses to sign'),
        signature('tenantSignature', 'Tenant: confirm receipt', { config: { mode: 'dialog', signLabel: 'Sign as tenant' }, logic: [when('show', [{ field: 'tenantRefuses', operator: 'equals', value: 'false' }]), when('require', [{ field: 'tenantRefuses', operator: 'equals', value: 'false' }])] }),
      ],
      { config: { badge: '4' }, logic: when('disable', [{ field: 'landlordSignature', operator: 'empty' }]) },
    ),
    section(
      'Send the finished report and finish the inspection.',
      [button('Send and finish', [{ type: 'submit' }], { variant: 'primary', size: 'large', align: 'stretch' })],
      {
        config: { badge: '5' },
        logic: [when('disable', [{ field: 'landlordSignature', operator: 'empty' }]), when('disable', [{ field: 'tenantSignature', operator: 'empty' }, { field: 'tenantRefuses', operator: 'equals', value: 'false' }])],
      },
    ),
  ];

  const doc: FormDocument = {
    version: 2,
    title: 'Inspection report',
    description: '{{unit.address}}',
    fields,
    footer: {
      style: 'plain',
      align: 'center',
      text: 'Moving reports made simple',
      links: [
        { label: 'Privacy policy', url: 'https://example.com/privacy' },
        { label: 'Terms', url: 'https://example.com/terms' },
        { label: 'Contact', url: 'https://example.com/contact' },
      ],
      social: [
        { type: 'email', url: 'hello@example.com' },
        { type: 'linkedin', url: 'https://linkedin.com' },
      ],
      copyright: '© {year} Example ApS',
    },
    theme: { preset: 'minimal', primaryColor: '#1b2a6b', backgroundColor: '#ffffff', textColor: '#1f2937', pageBackground: '#f3f4f6', borderRadius: 6, inputStyle: 'outlined', cardStyle: 'bordered', maxWidth: 1120, buttonWidth: 'auto', buttonAlign: 'right', spacing: 'comfortable' },
    settings: {
      stepsLayout: 'sidebar',
      stepNavigation: 'free',
      firstStepTitle: 'Inspection type',
      firstStepDescription: 'Choose what you are about to inspect',
      nextButtonText: '{next} →',
      submitButtonText: 'Send and finish',
      successMessage: 'The inspection report has been sent. Thank you!',
      saveDraft: true,
      exitText: 'Back and save',
      autofill: false,
      // the platform makes a PDF report of the answers
      pdf: 'answers',
    },
    action: {},
  };

  // Danish version: the English text is the source, the Danish is looked up by that text (field ids are random per load)
  const da: { [key: string]: string } = {};
  collectTranslatables(doc).forEach(item => {
    if (INSPECTION_DA[item.source]) da[item.key] = INSPECTION_DA[item.source];
  });
  doc.i18n = { defaultLanguage: 'en', languages: ['en', 'da'], detect: true, switcher: 'none', translations: { da } };
  return doc;
}
