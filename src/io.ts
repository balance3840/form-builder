import { FormDocument, localizeDocument } from './generator';

export const stringify = (doc: FormDocument) => JSON.stringify(doc, null, 2);

export function download(filename: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export const slug = (s: string) => (s || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'form';

export const DEFAULT_LIB_URL = 'https://unpkg.com/@restrella/form-generator@2/dist/form-generator/form-generator.esm.js';

export type EmbedOptions = {
  /** Adds `language="xx"` so the form is always shown in that language (and the switcher is hidden). */
  language?: string;
  /** Leave a hint comment explaining how to force a language (shown for multi-language forms). */
  hint?: boolean;
};

/**
 * A copy of the form that only contains `language`: the texts are already translated and the other languages are
 * dropped (smaller, and nothing to detect). Overridden built-in texts for that language are kept.
 */
export function singleLanguageDoc(doc: FormDocument, language: string): FormDocument {
  const localized = localizeDocument(doc, language);
  const dict = ((doc.i18n || {}) as any).translations?.[language] || {};
  const overrides: { [key: string]: string } = {};
  Object.keys(dict).forEach(key => {
    if (key.startsWith('ui.') || key.startsWith('validation.')) overrides[key] = dict[key];
  });
  return { ...localized, i18n: { defaultLanguage: language, languages: [language], detect: false, switcher: 'none', translations: Object.keys(overrides).length ? { [language]: overrides } : {} } };
}

export function embedSnippet(doc: FormDocument, libUrl: string, options: EmbedOptions = {}) {
  const json = JSON.stringify(doc, null, 2).replace(/<\/script/gi, '<\\/script').split('\n').map((l, i) => (i === 0 ? l : '    ' + l)).join('\n');
  const attr = options.language ? ` language="${options.language}"` : '';
  const tip = options.hint && !options.language ? '<!-- Tip: add language="es" to the element below to show one language only -->\n' : '';
  return `<script type="module" src="${libUrl}"></script>

${tip}<re-form-generator id="my-form"${attr}></re-form-generator>

<script>
  const form = document.getElementById('my-form');
  form.schema = ${json};

  // Called with the answers once the form is valid and submitted
  form.addEventListener('submitted', event => {
    console.log(event.detail.values);
  });
</script>`;
}

/**
 * An <iframe> for a form that is published at `url` (a hosted link, or the downloaded page put online). With `autoHeight`
 * a few lines of script make the frame as tall as the form (the form reports its height, also when it moves to another
 * step) and bring it into view when a new step starts, so there is never a scrollbar inside the frame.
 */
export function iframeSnippet(url: string, title: string, { autoHeight = true, height = 700 }: { autoHeight?: boolean; height?: number } = {}) {
  const src = url ? `${url}${url.includes('?') ? '&' : '?'}embed=1` : 'https://…';
  const safeTitle = (title || 'Form').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const frame = `<iframe src="${src}" title="${safeTitle}" loading="lazy" style="display:block;width:100%;height:${height}px;border:0" allow="clipboard-write"></iframe>`;
  if (!autoHeight) return frame;
  return `${frame}
<script>
  // Lets the form set the frame's height (and scroll it into view on a new step). Add it once per page.
  window.addEventListener('message', function (event) {
    var data = event.data || {};
    if (data.type !== 'rfg:height' && data.type !== 'rfg:scroll') return;
    document.querySelectorAll('iframe').forEach(function (frame) {
      if (frame.contentWindow !== event.source) return;
      if (data.type === 'rfg:height') frame.style.height = data.height + 'px';
      else if (frame.getBoundingClientRect().top < 0) frame.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
</script>`;
}

export function standalonePage(doc: FormDocument, libUrl: string, pageCss: string, options: EmbedOptions = {}) {
  return `<!doctype html>
<html lang="${options.language || (doc.i18n && (doc.i18n as any).defaultLanguage) || 'en'}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${(doc.title || 'Form').replace(/</g, '&lt;')}</title>
    <style>body { margin: 0; padding: 40px 16px; ${pageCss}; } html.embedded body { padding: 0; background: transparent; }</style>
    <script>if (window.self !== window.top || /[?&]embed=1/.test(location.search)) document.documentElement.classList.add('embedded');</script>
  </head>
  <body>
${embedSnippet(doc, libUrl, options).split('\n').map(l => '    ' + l).join('\n')}
  </body>
</html>
`;
}
