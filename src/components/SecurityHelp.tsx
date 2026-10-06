import { useState } from 'preact/hooks';
import { ADDRESS_PROVIDERS, CAPTCHA_PROVIDERS, FormField, addressSource, captchaProvider } from '../generator';
import { rich, t } from '../i18n';
import { captchaDescription, captchaLabel } from '../i18n/labels';
import { Icon } from '../icons';
import { copy } from '../io';
import { doc, notify, setSettings, updateField } from '../store';
import { Field, Modal, Section, Segmented, Select, TextInput, Toggle } from './ui';
import { options } from '../host';

/* ----------------------------------------------------------------- captcha */

/** What the person's server must do with the token. Shown as a copy-paste example. */
function verificationSnippet(providerId: string) {
  const p = captchaProvider(providerId);
  if (!p) return '';
  return `// Runs on YOUR server, never in the browser.
// CAPTCHA_SECRET is the provider's SECRET key, kept in an environment variable.
const answers = await request.json();                 // what the form submitted
const check = await fetch('${p.verifyUrl}', {
  method: 'POST',
  body: new URLSearchParams({ secret: process.env.CAPTCHA_SECRET, response: answers['${p.field}'] }),
});
const result = await check.json();
if (!result.success${providerId === 'recaptcha3' ? ' || result.score < 0.5' : ''}) {
  return new Response('Captcha failed', { status: 400 });   // reject the submission
}
// ...now save the answers`;
}

/**
 * One switch: spam protection on or off. The host's provider when it has one (Cloudflare Turnstile in a hosted setup,
 * keys on its server), otherwise the keyless trap field.
 */
export function SpamToggle() {
  const captcha = (doc.value.settings && doc.value.settings.captcha) || {};
  const hosted = options.value.spamProtection;
  const provider = hosted ? hosted.provider : 'honeypot';
  const on = !!captcha.provider && captcha.provider !== 'none';
  return (
    <Section title={t('security.title')} icon="check" defaultOpen={false}>
      <Toggle
        label={t('security.toggle')}
        description={hosted && hosted.provider !== 'honeypot' ? t('security.toggleHosted') : t('security.toggleBasic')}
        checked={on}
        onChange={v => setSettings({ captcha: v ? { provider } : { provider: 'none' } })}
      />
    </Section>
  );
}

export function CaptchaSection() {
  const captcha = (doc.value.settings && doc.value.settings.captcha) || { provider: 'none' };
  const legacy = doc.value.action && doc.value.action.recaptchaSiteKey;
  const provider = legacy && captcha.provider === 'none' ? 'recaptcha' : captcha.provider || 'none';
  const info = captchaProvider(provider) || CAPTCHA_PROVIDERS[0];
  const [showVerify, setShowVerify] = useState(false);
  const set = (patch: { [k: string]: any }) => setSettings({ captcha: { ...captcha, provider, ...patch } });
  const widget = ['turnstile', 'hcaptcha', 'recaptcha'].includes(provider);

  return (
    <Section title={t('security.title')} icon="check" defaultOpen={provider !== 'none'}>
      <div class="stack">
        <Field label={t('security.protectWith')} hint={captchaDescription(info)}>
          <Select
            value={provider}
            onChange={v => setSettings({ captcha: v === 'none' ? undefined : { ...captcha, provider: v } })}
            options={CAPTCHA_PROVIDERS.map(p => ({ value: p.id, label: captchaLabel(p) }))}
          />
        </Field>

        {info.needsKey && (
          <>
            <Field label={t('security.siteKey')} hint={t('security.siteKeyHint')}>
              <TextInput mono value={captcha.siteKey || (legacy as string) || ''} placeholder={t('security.siteKeyPlaceholder')} onInput={v => set({ siteKey: v.trim() || undefined })} />
              <div class="row-gap">
                {info.keyUrl && (
                  <a class="link-btn" href={info.keyUrl} target="_blank" rel="noreferrer">
                    {t('security.howToGetKey')}
                  </a>
                )}
                {info.testKey && (
                  <button class="link-btn" onClick={() => (set({ siteKey: info.testKey }), notify(t('security.testKeySet')))}>
                    {t('security.useTestKey')}
                  </button>
                )}
              </div>
            </Field>
            {widget && (
              <Field label={t('security.widgetTheme')}>
                <Segmented
                  value={captcha.theme || 'auto'}
                  onChange={v => set({ theme: v === 'auto' ? undefined : v })}
                  options={[
                    { value: 'auto', label: t('security.matchForm') },
                    { value: 'light', label: t('security.light') },
                    { value: 'dark', label: t('security.dark') },
                  ]}
                />
              </Field>
            )}
          </>
        )}

        {info.token && (
          <div class="callout key-warning">
            {rich('security.tokenCallout', { serverChecks: <strong>{t('security.serverChecks')}</strong>, field: <code>{info.field}</code> })}{' '}
            <button class="link-btn" onClick={() => setShowVerify(true)}>
              {t('security.showHowToCheck')}
            </button>
          </div>
        )}
        {provider === 'honeypot' && <div class="ui-hint">{t('security.honeypotHint')}</div>}
      </div>

      {showVerify && (
        <Modal title={t('security.verifyTitle')} wide onClose={() => setShowVerify(false)}>
          <p class="ui-hint pad-bottom">{t('security.verifyIntro')}</p>
          <pre class="code-area readonly snippet">{verificationSnippet(provider)}</pre>
          <div class="row-gap pad-top">
            <button class="btn small" onClick={async () => notify((await copy(verificationSnippet(provider))) ? t('common.copied') : t('common.copyFailed'))}>
              <Icon name="copy" size={14} /> {t('common.copy')}
            </button>
          </div>
        </Modal>
      )}
    </Section>
  );
}

/* ----------------------------------------------------------- address key proxy */

/** A small Cloudflare Worker that keeps the provider key on the server and forwards searches. */
function workerSnippet(config: { [k: string]: any }) {
  const src = addressSource({ ...config, apiKey: '__KEY__' }, 'en');
  const isPost = String(src.method || 'GET').toUpperCase() === 'POST';
  const upstream = isPost
    ? `    const upstream = await fetch(${JSON.stringify(src.url)}, {
      method: 'POST',
      headers: ${JSON.stringify(src.headers).replace('"__KEY__"', 'env.API_KEY')},
      body: JSON.stringify(${JSON.stringify(src.body)}).replace(/\\{q\\}/g, JSON.stringify(q).slice(1, -1)),
    });`
    : `    const upstream = await fetch(${JSON.stringify(src.url)}.replace('{q}', encodeURIComponent(q)).replace('__KEY__', encodeURIComponent(env.API_KEY)));`;
  return `// Cloudflare Worker: the provider key stays here, never in the web page.
// Settings > Variables: add the secret API_KEY, and ALLOWED_ORIGINS (e.g. https://www.example.com)
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!(env.ALLOWED_ORIGINS || '').split(',').includes(origin)) return new Response('Forbidden', { status: 403 });
    const q = (new URL(request.url).searchParams.get('q') || '').slice(0, 100);
    if (q.length < 2) return new Response('[]', { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin } });
${upstream}
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin, Vary: 'Origin' },
    });
  },
};
// Tip: add a rate limit (Workers Rate Limiting) so nobody can burn your quota through the proxy.`;
}

export function ProxyHelp({ field }: { field: FormField }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const config = field.config || {};
  const apply = () => {
    const base = url.trim().replace(/\?.*$/, '');
    if (!/^https?:\/\//i.test(base)) return notify(t('security.enterProxyUrl'));
    // the proxy returns the provider's answer unchanged, so the same way of reading it applies
    const { url: _u, method: _m, headers: _h, body: _b, ...reading } = addressSource({ ...config, apiKey: '' }, 'en');
    // Google's terms still ask for the attribution when the results come through a proxy
    const attribution = (ADDRESS_PROVIDERS.find(p => p.id === config.provider) || {}).attribution;
    updateField(field.id, { config: { ...config, provider: 'custom', apiKey: undefined, ...(attribution ? { attribution } : {}), source: { ...reading, url: `${base}?q={q}` } } });
    setOpen(false);
    notify(t('security.usingProxy'));
  };
  return (
    <>
      <button class="link-btn" onClick={() => setOpen(true)}>
        {t('security.proxyLink')}
      </button>
      {open && (
        <Modal title={t('security.proxyTitle')} wide onClose={() => setOpen(false)}>
          <div class="stack">
            <p class="ui-hint" style={{ margin: 0 }}>
              {rich('security.proxyIntro', { yourAddress: <em>{t('security.yourAddress')}</em> })}
            </p>
            <ol class="steps">
              <li>{t('security.proxyStep1')}</li>
              <li>{rich('security.proxyStep2', { apiKey: <code>API_KEY</code>, origins: <code>ALLOWED_ORIGINS</code>, example: <code>https://www.example.com</code> })}</li>
              <li>{rich('security.proxyStep3', { button: <strong>{t('security.useProxy')}</strong> })}</li>
            </ol>
            <pre class="code-area readonly snippet">{workerSnippet(config)}</pre>
            <div class="row-gap">
              <button class="btn small" onClick={async () => notify((await copy(workerSnippet(config))) ? t('common.copied') : t('common.copyFailed'))}>
                <Icon name="copy" size={14} /> {t('security.copyCode')}
              </button>
            </div>
            <Field label={t('security.proxyAddress')}>
              <div class="image-picker">
                <TextInput mono value={url} placeholder="https://address-proxy.your-name.workers.dev" onInput={setUrl} />
                <button class="btn primary small" onClick={apply}>
                  {t('security.useProxy')}
                </button>
              </div>
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
