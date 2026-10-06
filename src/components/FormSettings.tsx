import { createTranslator } from '../generator';
import { options } from '../host';
import { inContentLanguage, rich, t } from '../i18n';
import { addThankYouPage, defaultLanguage, doc, endingIndex, isEnding, setAction, setMeta, setSettings } from '../store';
import { ImagePicker } from './DesignPanel';
import { InlineTranslations } from './TranslatePane';
import { LanguagesSection } from './Languages';
import { CaptchaSection, SpamToggle } from './SecurityHelp';
import { CodeSection } from './CodeSection';
import { DataText } from './DataText';
import { Field, MoreInAdvanced, Section, Segmented, Select, TextInput, Toggle } from './ui';
import { Icon } from '../icons';
import { advancedView } from '../view';

type Progress = 'bar' | 'percent' | 'steps' | 'titles' | 'sidebar' | 'none';

/** The step texts of the form settings, for the translations under the Steps section. */
const STEP_SETTING_KEYS = ['firstStepTitle', 'firstStepDescription', 'firstStepImageAlt', 'nextButtonText', 'backButtonText', 'exitText', 'sidebarHeader.title', 'sidebarHeader.subtitle'].map(k => `settings.${k}`);
const isStepSettingKey = (key: string) => STEP_SETTING_KEYS.includes(key) || /^settings\.sidebarActions\.\d+\.label$/.test(key);

/** How the form shows the steps: one choice for the layout (side list) and the progress style. */
function progressChoice(settings: any): Progress {
  if (settings.stepsLayout === 'sidebar') return 'sidebar';
  if (settings.showProgress === false) return 'none';
  return ['percent', 'steps', 'titles', 'none'].includes(settings.progressStyle) ? settings.progressStyle : 'bar';
}

function setProgress(v: Progress) {
  setSettings({
    stepsLayout: v === 'sidebar' ? 'sidebar' : undefined,
    progressStyle: v === 'bar' || v === 'sidebar' ? undefined : v,
    showProgress: undefined,
  });
}

/** Little drawings of each progress style (like Gravity Forms / WPForms), so people pick by looking. */
function ProgressPicker({ value, onChange }: { value: Progress; onChange: (v: Progress) => void }) {
  const dots = (titles = false) => (
    <span class={`pp-dots ${titles ? 'with-titles' : ''}`}>
      {[0, 1, 2].map(i => (
        <span key={i} class={`pp-dot ${i === 0 ? 'done' : i === 1 ? 'current' : ''}`}>
          <i />
          {titles && <em />}
        </span>
      ))}
    </span>
  );
  const choices: { value: Progress; label: string; art: any }[] = [
    { value: 'bar', label: t('settings.progressBar'), art: <span class="pp-bar"><b /></span> },
    { value: 'percent', label: t('settings.progressPercent'), art: <span class="pp-bar with-percent"><b /><small>40%</small></span> },
    { value: 'steps', label: t('settings.progressSteps'), art: dots() },
    { value: 'titles', label: t('settings.progressTitles'), art: dots(true) },
    { value: 'sidebar', label: t('settings.stepList'), art: <span class="pp-side"><span><i class="done" /><i class="current" /><i /></span><b /></span> },
    { value: 'none', label: t('common.none'), art: <span class="pp-none" /> },
  ];
  return (
    <div class="progress-picker" role="radiogroup">
      {choices.map(c => (
        <button key={c.value} type="button" role="radio" aria-checked={value === c.value} class={`pp-choice ${value === c.value ? 'active' : ''}`} onClick={() => onChange(c.value)}>
          <span class="pp-art">{c.art}</span>
          <span class="pp-label">{c.label}</span>
        </button>
      ))}
    </div>
  );
}

type SidebarAction = { label: string; variant?: string; action: 'submit' | 'next' | 'emit'; name?: string };

/** A copy of `obj` without empty properties. */
const compact = <T extends { [k: string]: any }>(obj: T): T => {
  const out: { [k: string]: any } = { ...obj };
  Object.keys(out).forEach(k => (out[k] === undefined || out[k] === '') && delete out[k]);
  return out as T;
};

/** The extras of the step list layout: progress rings, a header with a back link, and buttons under the steps. */
function SidebarSettings({ settings }: { settings: any }) {
  const header = settings.sidebarHeader || {};
  const setHeader = (patch: { [k: string]: any }) => {
    const next = compact({ ...header, ...patch });
    setSettings({ sidebarHeader: Object.keys(next).length ? next : undefined }, 'sidebarHeader');
  };
  const actions: SidebarAction[] = Array.isArray(settings.sidebarActions) ? settings.sidebarActions : [];
  const setActions = (next: SidebarAction[]) => setSettings({ sidebarActions: next.length ? next : undefined }, 'sidebarActions');
  const patchAction = (i: number, patch: Partial<SidebarAction>) => setActions(actions.map((a, idx) => (idx === i ? compact({ ...a, ...patch }) : a)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= actions.length) return;
    const next = [...actions];
    [next[i], next[j]] = [next[j], next[i]];
    setActions(next);
  };
  return (
    <div class="stack">
      <Toggle label={t('settings.stepProgress')} description={t('settings.stepProgressHint')} checked={!!settings.stepProgress} onChange={v => setSettings({ stepProgress: v || undefined })} />
      <div class="group-title">{t('settings.sidebarHeader')}</div>
      <Field label={t('settings.sidebarTitle')}>
        <TextInput value={header.title} placeholder={t('settings.sidebarTitlePlaceholder')} onInput={v => setHeader({ title: v || undefined })} />
      </Field>
      <Field label={t('settings.sidebarSubtitle')} hint={settings.saveDraft ? t('settings.sidebarSubtitleHint', { saved: '{saved}' }) : t('settings.sidebarSubtitleNoDraft', { saved: '{saved}' })}>
        <TextInput value={header.subtitle} placeholder={t('common.optional')} onInput={v => setHeader({ subtitle: v || undefined })} />
      </Field>
      <Field label={t('settings.sidebarBackUrl')} hint={t('settings.sidebarBackUrlHint')}>
        <TextInput value={header.backUrl} placeholder="https://" onInput={v => setHeader({ backUrl: v.trim() || undefined })} />
      </Field>
      <div class="group-title">{t('settings.sidebarButtons')}</div>
      {!actions.length && <div class="ui-hint">{t('settings.sidebarButtonsHint')}</div>}
      {actions.map((a, i) => (
        <div class="action-row" key={i}>
          <span class="action-num">{i + 1}</span>
          <div class="action-body">
            <TextInput value={a.label} placeholder={t('settings.sidebarButtonText')} onInput={v => patchAction(i, { label: v })} />
            <div class="stack tight">
              <Field label={t('settings.sidebarButtonLook')}>
                <Select
                  value={a.variant || 'primary'}
                  onChange={v => patchAction(i, { variant: v === 'primary' ? undefined : v })}
                  options={[
                    { value: 'primary', label: t('blocks.variant_primary') },
                    { value: 'secondary', label: t('blocks.variant_secondary') },
                    { value: 'outline', label: t('blocks.variant_outline') },
                    { value: 'ghost', label: t('settings.sidebarVariantGhost') },
                    { value: 'link', label: t('settings.sidebarVariantLink') },
                  ]}
                />
              </Field>
              <Field label={t('settings.sidebarButtonDoes')}>
                <Select
                  value={a.action}
                  onChange={v => patchAction(i, { action: v as SidebarAction['action'], name: v === 'emit' ? a.name : undefined })}
                  options={[
                    { value: 'submit', label: t('blocks.action_submit') },
                    { value: 'next', label: t('blocks.action_next') },
                    { value: 'emit', label: t('blocks.action_emit') },
                  ]}
                />
              </Field>
            </div>
            {a.action === 'emit' && (
              <>
                <TextInput mono value={a.name} placeholder="my-event" onInput={v => patchAction(i, { name: v.replace(/\s+/g, '-') })} />
                <div class="ui-hint">{rich('blocks.emitHint', { code: <code>addEventListener('formAction', e =&gt; e.detail.name)</code> })}</div>
              </>
            )}
          </div>
          <div class="action-tools">
            <button class="icon-btn" aria-label={t('common.moveUp')} disabled={i === 0} onClick={() => move(i, -1)}>
              <Icon name="up" size={13} />
            </button>
            <button class="icon-btn" aria-label={t('common.moveDown')} disabled={i === actions.length - 1} onClick={() => move(i, 1)}>
              <Icon name="down" size={13} />
            </button>
            <button class="icon-btn danger" aria-label={t('settings.sidebarRemoveButton')} onClick={() => setActions(actions.filter((_, idx) => idx !== i))}>
              <Icon name="x" size={13} />
            </button>
          </div>
        </div>
      ))}
      <button class="btn ghost small" onClick={() => setActions([...actions, { label: actions.length ? inContentLanguage(() => t('settings.sidebarNewButton')) : builtInSubmit(), action: actions.length ? 'emit' : 'submit', ...(actions.length ? { variant: 'link' } : {}) }])}>
        <Icon name="plus" size={14} /> {t('settings.sidebarAddButton')}
      </button>
    </div>
  );
}

/** The submit button's text in the form's language (a new sidebar button starts as "Submit"). */
const builtInSubmit = () => {
  const d = doc.value;
  return (d.settings && d.settings.submitButtonText) || createTranslator(defaultLanguage.value, d.i18n as any)('ui.submit');
};

export function FormSettings() {
  const d = doc.value;
  const settings = d.settings || {};
  const action = d.action || {};
  // the thank-you page starts with a page break too, but it is not a step
  const hasPages = d.fields.some(f => f.type === 'pageBreak' && !isEnding(f));
  const progress = progressChoice(settings);
  // placeholders show what the form says by itself, in the form's own language
  const builtIn = createTranslator(defaultLanguage.value, d.i18n as any);
  const adv = advancedView.value;
  // what happens after sending: a message, the thank-you page built in the form, or another website
  const ending = endingIndex(d.fields);
  const after: string = settings.afterSubmit || (settings.redirectUrl ? 'redirect' : ending >= 0 ? 'page' : 'message');
  return (
    <div class="inspector-body">
      <div class="inspector-title">
        <div class="grow">
          <div class="inspector-name">{t('settings.title')}</div>
          <div class="ui-hint">{t('settings.selectHint')}</div>
        </div>
      </div>

      <Section title={t('settings.general')} icon="file">
        <div class="stack">
          <Field label={t('settings.formTitle')}>
            <DataText value={d.title} onInput={v => setMeta({ title: v })} />
          </Field>
          <Field label={t('settings.description')}>
            <DataText multiline rows={2} value={d.description} placeholder={t('common.optional')} onInput={v => setMeta({ description: v })} />
          </Field>
          {adv && <Toggle label={t('settings.showTitle')} checked={settings.showTitle !== false} onChange={v => setSettings({ showTitle: v })} />}
          {adv && <Toggle label={t('settings.autofill')} description={t('settings.autofillDescription')} checked={settings.autofill !== false} onChange={v => setSettings({ autofill: v ? undefined : false })} />}
        </div>
      </Section>

      <Section title={t('settings.submitThanks')} icon="send">
        <div class="stack">
          <Field label={t('settings.submitText')}>
            <TextInput value={settings.submitButtonText} placeholder={builtIn('ui.submit')} onInput={v => setSettings({ submitButtonText: v })} />
          </Field>
          <Field label={t('settings.afterSending')}>
            <Segmented
              value={after}
              onChange={v => (v === 'page' && ending < 0 ? addThankYouPage() : setSettings({ afterSubmit: v }))}
              options={[
                { value: 'message', label: t('settings.afterMessage') },
                { value: 'page', label: t('settings.afterPage') },
                { value: 'redirect', label: t('settings.afterRedirect') },
              ]}
            />
          </Field>
          {after === 'message' && (
            <Field label={t('settings.thanks')} hint={t('settings.thanksHint')}>
              <DataText multiline rows={2} value={settings.successMessage} placeholder={builtIn('ui.success')} onInput={v => setSettings({ successMessage: v })} />
            </Field>
          )}
          {after === 'page' && (
            <div class="stack tight">
              <div class="ui-hint">{t('settings.afterPageHint')}</div>
              <button class="btn small" onClick={() => addThankYouPage()}>
                {t('settings.editThankYou')}
              </button>
            </div>
          )}
          {after === 'redirect' && (
            <Field label={t('settings.redirect')} hint={t('settings.redirectHint')}>
              <TextInput value={settings.redirectUrl} placeholder="https://" onInput={v => setSettings({ redirectUrl: v })} />
            </Field>
          )}
          {after === 'redirect' && adv && (
            <Field label={t('settings.redirectTarget')} hint={t('settings.redirectTargetHint')}>
              <Segmented
                value={settings.redirectTarget === 'self' ? 'self' : 'top'}
                onChange={v => setSettings({ redirectTarget: v === 'self' ? 'self' : undefined })}
                options={[
                  { value: 'top', label: t('settings.redirectTop') },
                  { value: 'self', label: t('settings.redirectSelf') },
                ]}
              />
            </Field>
          )}
          {adv && after !== 'redirect' && <Toggle label={t('settings.allowResubmit')} checked={settings.allowResubmit === true} onChange={v => setSettings({ allowResubmit: v })} />}
          {/* the PDF the platform makes of each response (`settings.pdf`): the answers, or the official lease contract */}
          <Field label={t('settings.pdf')} hint={settings.pdf === 'lease-a10' ? t('settings.pdfLeaseHint') : t('settings.pdfHint')}>
            <Select
              value={['lease-a10', 'none'].includes(settings.pdf) ? settings.pdf : 'answers'}
              onChange={v => setSettings({ pdf: v === 'answers' ? undefined : v })}
              options={[
                { value: 'answers', label: t('settings.pdfAnswers') },
                { value: 'lease-a10', label: t('settings.pdfLease') },
                { value: 'none', label: t('settings.pdfNone') },
              ]}
            />
          </Field>
        </div>
      </Section>

      <Section title={t('settings.steps')} icon="pageBreak" defaultOpen={hasPages}>
        {!hasPages ? (
          <div class="ui-hint">{rich('settings.stepsEmpty', { pageBreak: <b>{t('settings.pageBreak')}</b> })}</div>
        ) : (
          <div class="stack">
            <Field label={t('settings.progress')}>
              <ProgressPicker value={progress} onChange={setProgress} />
            </Field>
            {progress !== 'none' && progress !== 'sidebar' && (
              <Toggle label={t('settings.showStepCount')} checked={settings.showStepCount !== false} onChange={v => setSettings({ showStepCount: v ? undefined : false })} />
            )}
            {progress !== 'sidebar' && (
              <Toggle label={t('settings.stepHeader')} description={t('settings.stepHeaderHint')} checked={settings.stepHeader !== false} onChange={v => setSettings({ stepHeader: v ? undefined : false })} />
            )}
            {progress !== 'none' && progress !== 'sidebar' && (
              <Field label={t('settings.progressPosition')}>
                <Segmented
                  value={settings.progressPosition === 'bottom' ? 'bottom' : 'top'}
                  onChange={v => setSettings({ progressPosition: v === 'bottom' ? 'bottom' : undefined })}
                  options={[
                    { value: 'top', label: t('settings.positionTop') },
                    { value: 'bottom', label: t('settings.positionBottom') },
                  ]}
                />
              </Field>
            )}
            {progress === 'sidebar' && (
              <Field label={t('settings.stepsSide')}>
                <Segmented
                  value={settings.stepsSide === 'right' ? 'right' : 'left'}
                  onChange={v => setSettings({ stepsSide: v === 'right' ? 'right' : undefined })}
                  options={[
                    { value: 'left', label: t('settings.sideLeft') },
                    { value: 'right', label: t('settings.sideRight') },
                  ]}
                />
              </Field>
            )}
            {adv && progress === 'sidebar' && <SidebarSettings settings={settings} />}
            <Field label={t('settings.firstStepTitle')} hint={t('settings.firstStepTitleHint')}>
              <TextInput value={settings.firstStepTitle} placeholder={t('settings.firstStepPlaceholder')} onInput={v => setSettings({ firstStepTitle: v || undefined })} />
            </Field>
            <div class="row-gap two">
              <Field label={t('settings.nextText')}>
                <TextInput value={settings.nextButtonText} placeholder={builtIn('ui.continue')} onInput={v => setSettings({ nextButtonText: v || undefined })} />
              </Field>
              <Field label={t('settings.backText')}>
                <TextInput value={settings.backButtonText} placeholder={builtIn('ui.back')} onInput={v => setSettings({ backButtonText: v || undefined })} />
              </Field>
            </div>
            <div class="ui-hint">{t('settings.stepOwnHint')}</div>
            {adv && (
            <>
            <Field label={t('settings.stepTransition')} hint={t('settings.stepTransitionHint')}>
              <Segmented
                value={settings.stepTransition === 'fade' || settings.stepTransition === 'slide' ? settings.stepTransition : 'none'}
                onChange={v => setSettings({ stepTransition: v === 'none' ? undefined : v })}
                options={[
                  { value: 'none', label: t('common.none') },
                  { value: 'fade', label: t('settings.transitionFade') },
                  { value: 'slide', label: t('settings.transitionSlide') },
                ]}
              />
            </Field>
            <Field label={t('settings.firstStepDescription')}>
              <TextInput value={settings.firstStepDescription} placeholder={t('common.optional')} onInput={v => setSettings({ firstStepDescription: v || undefined })} />
            </Field>
            <Field label={t('settings.firstStepImage')} hint={t('settings.firstStepImageHint')}>
              <ImagePicker value={settings.firstStepImage} placeholder="https://…/picture.jpg" onChange={v => setSettings({ firstStepImage: v || undefined, firstStepImageAlt: v ? settings.firstStepImageAlt : undefined })} />
            </Field>
            {settings.firstStepImage && (
              <Field label={t('fieldInspector.altText')} hint={t('fieldInspector.altTextHint')}>
                <TextInput value={settings.firstStepImageAlt} placeholder={t('common.optional')} onInput={v => setSettings({ firstStepImageAlt: v || undefined })} />
              </Field>
            )}
            <Field label={t('settings.stepNavigation')} hint={settings.stepNavigation === 'free' ? t('settings.stepsAnyHint') : settings.stepNavigation === 'locked' ? t('settings.stepsBackOnlyHint') : t('settings.stepsVisitedHint')}>
              <Select
                value={settings.stepNavigation || 'visited'}
                onChange={v => setSettings({ stepNavigation: v === 'visited' ? undefined : v })}
                options={[
                  { value: 'visited', label: t('settings.stepsVisited') },
                  { value: 'free', label: t('settings.stepsAny') },
                  { value: 'locked', label: t('settings.stepsBackOnly') },
                ]}
              />
            </Field>
            <div class="ui-hint">{t('settings.nextTextHint')}</div>
            <Toggle label={t('settings.saveDraft')} description={t('settings.saveDraftDescription')} checked={!!settings.saveDraft} onChange={v => setSettings({ saveDraft: v || undefined })} />
            {settings.saveDraft && (
              <>
                <Field label={t('settings.exitText')}>
                  <TextInput value={settings.exitText} placeholder={t('settings.exitPlaceholder')} onInput={v => setSettings({ exitText: v || undefined })} />
                </Field>
                <Field label={t('settings.exitUrl')} hint={t('settings.exitUrlHint')}>
                  <TextInput value={settings.exitUrl} placeholder="https://" onInput={v => setSettings({ exitUrl: v || undefined })} />
                </Field>
              </>
            )}
            </>
            )}
          </div>
        )}
      </Section>
      {hasPages && <InlineTranslations title={t('settings.stepsTranslations')} match={isStepSettingKey} />}

      <LanguagesSection />

      {/* spam protection: an on / off switch when the host runs it (or in the simple view), every provider in the advanced view */}
      {options.value.spamProtection || !adv ? <SpamToggle /> : !options.value.hideCaptchaSettings && <CaptchaSection />}

      {!adv && <MoreInAdvanced text={t('settings.moreInAdvanced')} />}

      {adv && !options.value.hideScriptSettings && <CodeSection />}

      {adv && !options.value.hideActionSettings && (
      <Section title={t('settings.sendTo')} icon="zap" defaultOpen={!!action.endpoint}>
        <div class="stack">
          <div class="ui-hint">{rich('settings.sendToHint', { event: <code>submitted</code> })}</div>
          <Field label={t('settings.endpoint')}>
            <TextInput mono value={action.endpoint} placeholder="https://api.example.com/forms" onInput={v => setAction({ endpoint: v })} />
          </Field>
          <Field label={t('settings.method')}>
            <Select value={action.httpMethod || 'POST'} onChange={v => setAction({ httpMethod: v })} options={['POST', 'PUT', 'PATCH'].map(m => ({ value: m, label: m }))} />
          </Field>
          <Field label={t('settings.bearer')} hint={t('settings.bearerHint')}>
            <TextInput mono value={action.bearerToken} placeholder={t('common.optional')} onInput={v => setAction({ bearerToken: v })} />
          </Field>
          <Toggle label={t('settings.multipart')} description={t('settings.multipartDescription')} checked={String(action.formData) === 'true'} onChange={v => setAction({ formData: v ? 'true' : undefined })} />
          <Field label={t('settings.errorMessage')}>
            <TextInput value={settings.errorMessage} placeholder={builtIn('ui.error')} onInput={v => setSettings({ errorMessage: v })} />
          </Field>
          <Field label={t('settings.webhook')} hint={t('settings.webhookHint')}>
            <TextInput mono value={action.webhookEndpoint} placeholder={t('common.optional')} onInput={v => setAction({ webhookEndpoint: v })} />
          </Field>
        </div>
      </Section>
      )}
    </div>
  );
}
