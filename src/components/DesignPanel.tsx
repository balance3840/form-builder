import { advancedView } from '../view';
import { SOCIAL_NETWORKS, pageGradientStops, pageMode, pageStyle, THEME_PRESETS, FooterLink, FooterSocial, FormTheme, resolveTheme } from '../generator';
import { doc, replaceTheme, setFooter, setTheme } from '../store';
import { MAX_IMAGE_UPLOAD, MAX_INLINE_IMAGE, canUpload, uploadMedia } from '../host';
import { useState } from 'preact/hooks';
import { Icon } from '../icons';
import { notify } from '../store';
import { MessageKey, t } from '../i18n';
import { socialLabel, themeName } from '../i18n/labels';
import { FontPicker } from './FontPicker';
import { ColorInput, Field, MoreInAdvanced, Section, Segmented, Select, TextArea, TextInput, Toggle } from './ui';


/** A preview of the chosen picture, so people see what they picked (an upload or an address). */
function ImagePreview({ src, compact }: { src: string; compact?: boolean }) {
  const [failed, setFailed] = useState('');
  if (failed === src) return compact ? <span class="media-thumb is-broken" title={t('design.previewFailed')}><Icon name="x" size={12} /></span> : <div class="media-preview is-broken">{t('design.previewFailed')}</div>;
  if (compact) return <img class="media-thumb" src={src} alt="" onError={() => setFailed(src)} />;
  return (
    <a class="media-preview" href={src.startsWith('data:') ? undefined : src} target="_blank" rel="noreferrer">
      <img src={src} alt="" onError={() => setFailed(src)} />
    </a>
  );
}

/** A URL box with an upload button and a preview. Uploaded images are embedded in the form JSON as data URLs. `compact`: a small thumbnail in the row (lists of options). */
export function ImagePicker({ value, onChange, placeholder, compact }: { value?: string; onChange: (v: string | undefined) => void; placeholder: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const isData = !!value && value.startsWith('data:');
  const hosted = canUpload();
  const choose = async (file: File) => {
    if (hosted) {
      // stored by the host (5 MB): the form keeps only the address
      if (file.size > MAX_IMAGE_UPLOAD) return notify(t('design.imageTooBigHosted'));
      setBusy(true);
      try {
        onChange(await uploadMedia(file, 'image'));
      } catch (e) {
        notify(t('design.uploadFailed'));
      } finally {
        setBusy(false);
      }
      return;
    }
    // no storage: the picture goes inside the form, so it must stay small
    if (file.size > MAX_INLINE_IMAGE) return notify(t('design.imageTooBig'));
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  };
  const row = (
    <div class="image-picker">
      {compact && value && <ImagePreview src={value} compact />}
      <TextInput value={isData ? '' : value} placeholder={isData ? t('design.uploadedImage') : placeholder} onInput={v => onChange(v.trim() || undefined)} />
      <label class={`btn small ${busy ? 'is-busy' : ''}`} title={t('design.uploadTitle')}>
        <Icon name="upload" size={14} /> {busy ? t('design.uploading') : t('common.upload')}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          disabled={busy}
          onChange={e => {
            const input = e.target as HTMLInputElement;
            const file = input.files && input.files[0];
            input.value = '';
            if (file) choose(file);
          }}
        />
      </label>
      {value && (
        <button class="icon-btn" aria-label={t('design.removeImage')} onClick={() => onChange(undefined)}>
          <Icon name="x" size={14} />
        </button>
      )}
    </div>
  );
  if (compact || !value || !/^(https?:|data:image\/|blob:)/i.test(value)) return row;
  return (
    <div class="image-picker-wrap">
      <ImagePreview src={value} />
      {row}
    </div>
  );
}

export function DesignPanel() {
  const theme = resolveTheme(doc.value.theme);
  const set = (patch: Partial<FormTheme>) => setTheme(patch);
  const activePreset = doc.value.theme && doc.value.theme.preset;

  return (
    <div class="design-panel">
      <Section title={t('design.themes')} icon="sparkles">
        <div class="preset-grid">
          {THEME_PRESETS.map(p => (
            <button key={p.id} class={`preset ${activePreset === p.id ? 'active' : ''}`} onClick={() => replaceTheme({ preset: p.id })} title={themeName(p)}>
              <span class="preset-swatch" style={{ background: p.theme.pageBackground }}>
                <span class="preset-card" style={{ background: p.theme.backgroundColor, borderRadius: Math.min(p.theme.borderRadius || 8, 10) }}>
                  <i style={{ background: p.theme.textColor, opacity: 0.55 }} />
                  <i style={{ background: p.theme.textColor, opacity: 0.2, width: '70%' }} />
                  <b style={{ background: p.theme.primaryColor, borderRadius: Math.min(p.theme.borderRadius || 8, 6) }} />
                </span>
              </span>
              <span class="preset-name">{themeName(p)}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('design.colours')} icon="palette">
        <div class="colors">
          <ColorInput label={t('design.accent')} value={theme.primaryColor as string} onChange={v => set({ primaryColor: v })} />
          <ColorInput label={t('design.formBackground')} value={theme.backgroundColor as string} onChange={v => set({ backgroundColor: v })} />
          <ColorInput label={t('design.text')} value={theme.textColor as string} onChange={v => set({ textColor: v })} />
        </div>
      </Section>

      {advancedView.value && (
      <Section title={t('design.typography')} icon="text">
        <div class="stack">
          <Field label={t('design.font')}>
            <FontPicker value={theme.fontFamily || 'system'} onChange={v => set({ fontFamily: v })} />
          </Field>
          <Field label={t('design.headingFont')} hint={t('design.headingFontHint')}>
            <FontPicker value={theme.headingFont || 'inherit'} inherit onChange={v => set({ headingFont: v === 'inherit' ? undefined : v })} />
          </Field>
          <Field label={t('design.titleAlignment')}>
            <Segmented value={theme.headerAlign || 'left'} onChange={v => set({ headerAlign: v })} options={[{ value: 'left', label: t('design.left') }, { value: 'center', label: t('design.centered') }]} />
          </Field>
          <Field label={t('design.labelStyle')}>
            <Segmented value={theme.labelStyle || 'normal'} onChange={v => set({ labelStyle: v })} options={[{ value: 'normal', label: t('design.normal') }, { value: 'uppercase', label: t('design.uppercase') }]} />
          </Field>
        </div>
      </Section>
      )}

      {advancedView.value && (
      <Section title={t('design.shapeSpacing')} icon="layout">
        <div class="stack">
          <Field label={t('design.roundness', { px: theme.borderRadius })}>
            <input class="ui-range" type="range" min="0" max="28" value={theme.borderRadius} onInput={e => set({ borderRadius: Number((e.target as HTMLInputElement).value) })} />
          </Field>
          <Field label={t('design.inputStyle')}>
            <Segmented value={theme.inputStyle || 'outlined'} onChange={v => set({ inputStyle: v })} options={[{ value: 'outlined', label: t('design.outlined') }, { value: 'filled', label: t('design.filled') }, { value: 'underlined', label: t('design.underlined') }]} />
          </Field>
          <Field label={t('design.spacing')}>
            <Segmented value={theme.spacing || 'comfortable'} onChange={v => set({ spacing: v })} options={[{ value: 'compact', label: t('design.compact') }, { value: 'comfortable', label: t('design.comfy') }, { value: 'spacious', label: t('design.spacious') }]} />
          </Field>
          <Field label={t('design.card')}>
            <Segmented value={theme.cardStyle || 'shadow'} onChange={v => set({ cardStyle: v })} options={[{ value: 'shadow', label: t('design.shadow') }, { value: 'bordered', label: t('design.border') }, { value: 'flat', label: t('design.flat') }]} />
          </Field>
          <Field label={t('design.formWidth', { px: theme.maxWidth })}>
            <input class="ui-range" type="range" min="420" max="1280" step="10" value={theme.maxWidth} onInput={e => set({ maxWidth: Number((e.target as HTMLInputElement).value) })} />
          </Field>
        </div>
      </Section>
      )}

      {advancedView.value && (
      <Section title={t('design.button')} icon="play">
        <div class="stack">
          <Field label={t('design.style')}>
            <Segmented value={theme.buttonStyle || 'solid'} onChange={v => set({ buttonStyle: v })} options={[{ value: 'solid', label: t('design.solid') }, { value: 'outline', label: t('design.outline') }]} />
          </Field>
          <Field label={t('design.width')}>
            <Segmented value={theme.buttonWidth || 'full'} onChange={v => set({ buttonWidth: v })} options={[{ value: 'full', label: t('design.fullWidth') }, { value: 'equal', label: t('design.equalWidth') }, { value: 'auto', label: t('design.fitText') }]} />
          </Field>
          {theme.buttonWidth === 'auto' && theme.buttonAlign !== 'split' && (
            <Field label={t('design.alignment')}>
              <Segmented value={theme.buttonAlign || 'left'} onChange={v => set({ buttonAlign: v })} options={[{ value: 'left', label: t('design.left') }, { value: 'center', label: t('design.center') }, { value: 'right', label: t('design.right') }]} />
            </Field>
          )}
          {theme.buttonWidth === 'auto' && doc.value.fields.some(f => f.type === 'pageBreak' && !(f.config && f.config.ending)) && (
            <Field label={t('settings.steps')}>
              <Toggle label={t('design.split')} checked={theme.buttonAlign === 'split'} onChange={v => set({ buttonAlign: v ? 'split' : 'left' })} />
            </Field>
          )}
        </div>
      </Section>
      )}

      <Section title={t('design.logo')} icon="image" defaultOpen={!!theme.logo}>
        <div class="stack">
          <Field label={t('design.logo')} hint={t('design.logoHint')}>
            <ImagePicker value={theme.logo} placeholder="https://…/logo.png" onChange={v => set({ logo: v })} />
          </Field>
          {theme.logo && (
            <>
              <Field label={t('design.height', { px: theme.logoHeight || 40 })}>
                <input class="ui-range" type="range" min="20" max="140" value={theme.logoHeight || 40} onInput={e => set({ logoHeight: Number((e.target as HTMLInputElement).value) })} />
              </Field>
              <Field label={t('design.alignment')}>
                <Segmented value={theme.logoAlign || 'left'} onChange={v => set({ logoAlign: v })} options={[{ value: 'left', label: t('design.left') }, { value: 'center', label: t('design.center') }, { value: 'right', label: t('design.right') }]} />
              </Field>
              <Field label={t('design.linkOptional')} hint={t('design.logoLinkHint')}>
                <TextInput value={theme.logoLink} placeholder="https://example.com" onInput={v => set({ logoLink: v.trim() || undefined })} />
              </Field>
              <Field label={t('design.altText')} hint={t('design.altTextHint')}>
                <TextInput value={theme.logoAlt} placeholder={t('design.altPlaceholder')} onInput={v => set({ logoAlt: v || undefined })} />
              </Field>
            </>
          )}
        </div>
      </Section>

      <Section title={t('design.coverImage')} icon="image" defaultOpen={!!theme.cover}>
        <div class="stack">
          <Field label={t('design.coverImage')} hint={t('design.coverHint')}>
            <ImagePicker value={theme.cover} placeholder="https://…/cover.jpg" onChange={v => set({ cover: v })} />
          </Field>
          {theme.cover && (
            <>
              <Field label={t('design.layout')}>
                <Segmented value={theme.coverStyle || 'banner'} onChange={v => set({ coverStyle: v })} options={[{ value: 'banner', label: t('design.banner'), title: t('design.bannerTitle') }, { value: 'hero', label: t('design.titleOnImage'), title: t('design.titleOnImageTitle') }]} />
              </Field>
              <Field label={t(theme.coverStyle === 'hero' ? 'design.minHeight' : 'design.height', { px: theme.coverHeight || 160 })}>
                <input class="ui-range" type="range" min="80" max="420" step="10" value={theme.coverHeight || 160} onInput={e => set({ coverHeight: Number((e.target as HTMLInputElement).value) })} />
              </Field>
              <Field label={t('design.focus')}>
                <Segmented value={theme.coverPosition || 'center'} onChange={v => set({ coverPosition: v })} options={[{ value: 'top', label: t('design.top') }, { value: 'center', label: t('design.middle') }, { value: 'bottom', label: t('design.bottom') }]} />
              </Field>
              <Field label={t('design.darken', { percent: theme.coverOverlay || 0 })} hint={theme.coverStyle === 'hero' ? t('design.darkenHint') : undefined}>
                <input class="ui-range" type="range" min="0" max="80" step="5" value={theme.coverOverlay || 0} onInput={e => set({ coverOverlay: Number((e.target as HTMLInputElement).value) || undefined })} />
              </Field>
            </>
          )}
        </div>
      </Section>

      {advancedView.value && <PageBackground />}

      {advancedView.value && <FooterSection />}

      <MoreInAdvanced text={t('design.moreInAdvanced')} />

      {advancedView.value && (
      <Section title={t('design.customCss')} icon="code" defaultOpen={false}>
        <Field label={t('common.advanced')} hint={t('design.customCssHint')}>
          <TextArea mono rows={6} value={doc.value.theme && doc.value.theme.customCss} placeholder={'.rfg-btn-primary { letter-spacing: .04em; }'} onInput={v => setTheme({ customCss: v || undefined })} />
        </Field>
      </Section>
      )}
    </div>
  );
}

function FooterSection() {
  const footer = doc.value.footer || {};
  const on = !!doc.value.footer && footer.enabled !== false;
  const links: FooterLink[] = footer.links || [];
  const social: FooterSocial[] = footer.social || [];
  const theme = resolveTheme(doc.value.theme);
  const setLink = (i: number, patch: Partial<FooterLink>) => setFooter({ links: links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }, `footer:link:${i}`);
  const setSocial = (i: number, patch: Partial<FooterSocial>) => setFooter({ social: social.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }, `footer:social:${i}`);
  return (
    <Section title={t('design.footer')} icon="layout" defaultOpen={on}>
      <div class="stack">
        <Toggle checked={on} onChange={v => (v ? setFooter({ enabled: true, style: footer.style || 'plain', align: footer.align || 'center' }) : setFooter({ enabled: false }))} label={t('design.showFooter')} description={t('design.showFooterDescription')} />
        {on && (
          <>
            <Field label={t('design.style')}>
              <Segmented value={footer.style || 'plain'} onChange={v => setFooter({ style: v })} options={[{ value: 'plain', label: t('design.onPage'), title: t('design.onPageTitle') }, { value: 'card', label: t('design.card') }, { value: 'bar', label: t('design.fullBar'), title: t('design.fullBarTitle') }]} />
            </Field>
            <Field label={t('design.alignment')}>
              <Segmented value={footer.align || 'center'} onChange={v => setFooter({ align: v })} options={[{ value: 'left', label: t('design.left') }, { value: 'center', label: t('design.center') }, { value: 'right', label: t('design.right') }]} />
            </Field>
            <Field label={t('design.logoOptional')}>
              <ImagePicker value={footer.logo} placeholder="https://…/logo.png" onChange={v => setFooter({ logo: v })} />
            </Field>
            <Field label={t('design.text')} hint={t('design.footerTextHint')}>
              <TextArea rows={3} value={footer.text} placeholder={t('design.footerTextPlaceholder')} onInput={v => setFooter({ text: v }, 'footer:text')} />
            </Field>
            <Field label={t('design.links')} hint={t('design.linksHint')}>
              <div class="list-editor">
                {links.map((l, i) => (
                  <div class="list-editor-row" key={i}>
                    <TextInput value={l.label} placeholder={t('common.label')} onInput={v => setLink(i, { label: v })} />
                    <TextInput value={l.url} placeholder="https://…" onInput={v => setLink(i, { url: v })} />
                    <button class="icon-btn" aria-label={t('design.removeLink')} onClick={() => setFooter({ links: links.filter((_, idx) => idx !== i) })}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                <div>
                  <button class="btn ghost small" onClick={() => setFooter({ links: [...links, { label: '', url: '' }] })}>
                    <Icon name="plus" size={14} /> {t('design.addLink')}
                  </button>
                </div>
              </div>
            </Field>
            <Field label={t('design.socialIcons')}>
              <div class="list-editor">
                {social.map((l, i) => (
                  <div class="list-editor-row social" key={i}>
                    <Select value={l.type} options={SOCIAL_NETWORKS.map(n => ({ value: n.value, label: socialLabel(n) }))} onChange={v => setSocial(i, { type: v })} />
                    <TextInput value={l.url} placeholder={l.type === 'email' ? 'hello@example.com' : l.type === 'phone' ? '+45 12 34 56 78' : 'https://…'} onInput={v => setSocial(i, { url: v })} />
                    <button class="icon-btn" aria-label={t('common.remove')} onClick={() => setFooter({ social: social.filter((_, idx) => idx !== i) })}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                <div>
                  <button class="btn ghost small" onClick={() => setFooter({ social: [...social, { type: 'website', url: '' }] })}>
                    <Icon name="plus" size={14} /> {t('design.addIcon')}
                  </button>
                </div>
              </div>
            </Field>
            <Field label={t('design.copyright')} hint={t('design.copyrightHint')}>
              <TextInput value={footer.copyright} placeholder="© {year} Acme ApS" onInput={v => setFooter({ copyright: v }, 'footer:copy')} />
            </Field>
            <div class="colors">
              <ColorInput label={t('design.footerBackground')} value={(footer.backgroundColor || (footer.style === 'bar' ? '#1f2937' : theme.backgroundColor)) as string} onChange={v => setFooter({ backgroundColor: v })} />
              <ColorInput label={t('design.footerText')} value={(footer.textColor || (footer.style === 'bar' ? '#ffffff' : theme.textColor)) as string} onChange={v => setFooter({ textColor: v })} />
            </div>
            {(footer.backgroundColor || footer.textColor) && (
              <button class="link-btn" onClick={() => setFooter({ backgroundColor: undefined, textColor: undefined })}>
                {t('design.useThemeColours')}
              </button>
            )}
          </>
        )}
      </div>
    </Section>
  );
}

const GRADIENTS: { id: string; colors: string[]; angle: number }[] = [
  { id: 'dusk', colors: ['#6366f1', '#ec4899'], angle: 135 },
  { id: 'ocean', colors: ['#0ea5e9', '#1e3a8a'], angle: 160 },
  { id: 'sunrise', colors: ['#fde68a', '#fb923c', '#e11d48'], angle: 160 },
  { id: 'aurora', colors: ['#22d3ee', '#818cf8', '#c084fc'], angle: 135 },
  { id: 'mint', colors: ['#d1fae5', '#a7f3d0'], angle: 160 },
  { id: 'peach', colors: ['#ffedd5', '#fecaca'], angle: 135 },
  { id: 'slate', colors: ['#334155', '#0f172a'], angle: 180 },
  { id: 'sky', colors: ['#e0f2fe', '#ede9fe'], angle: 160 },
];
const evenStops = (colors: string[]) => colors.map((color, i) => ({ color, pos: Math.round((i / (colors.length - 1)) * 100) }));

/** Colour, gradient or image behind the form, with a live strip that shows the result. */
function PageBackground() {
  const theme = resolveTheme(doc.value.theme);
  // the panel shows the tab that was picked, even while it has nothing to draw yet (an image mode with no image)
  const mode = theme.pageMode || pageMode(theme);
  const set = (patch: Partial<FormTheme>) => setTheme(patch);
  const stops = pageGradientStops(theme);
  const setStops = (next: { color: string; pos: number }[]) => set({ pageMode: 'gradient', pageGradientStops: next });
  const setStop = (i: number, patch: { color?: string; pos?: number }) => setStops(stops.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  const angle = Number.isFinite(Number(theme.pageGradientAngle)) ? Number(theme.pageGradientAngle) : 160;
  const radial = theme.pageGradientType === 'radial';
  return (
    <Section title={t('design.pageBackground')} icon="image" defaultOpen={mode !== 'color'}>
      <div class="stack">
        <div class="bg-preview" style={pageStyle(theme) as any} aria-hidden="true">
          <span class="bg-preview-card" />
        </div>
        <Segmented
          value={mode}
          onChange={v => set({ pageMode: v })}
          options={[
            { value: 'color', label: t('design.colour') },
            { value: 'gradient', label: t('design.gradient') },
            { value: 'image', label: t('design.image') },
          ]}
        />
        {mode === 'color' && (
          <div class="colors">
            <ColorInput label={t('design.pageColour')} value={theme.pageBackground as string} onChange={v => set({ pageBackground: v })} />
          </div>
        )}
        {mode === 'gradient' && (
          <>
            <div class="gradient-presets">
              {GRADIENTS.map(g => (
                <button
                  key={g.id}
                  type="button"
                  class={`gradient-swatch ${stops.map(x => x.color).join() === g.colors.join() ? 'active' : ''}`}
                  title={t(`design.gradient.${g.id}` as MessageKey)}
                  style={{ background: `linear-gradient(135deg, ${g.colors.join(', ')})` }}
                  onClick={() => set({ pageMode: 'gradient', pageGradientStops: evenStops(g.colors), pageGradientAngle: g.angle, pageGradientType: 'linear' })}
                />
              ))}
            </div>
            <div class="gradient-stops">
              {stops.map((st, i) => (
                <div class="gradient-stop" key={i}>
                  <ColorInput label={t('design.colourN', { n: i + 1 })} value={st.color} onChange={v => setStop(i, { color: v })} />
                  <input class="ui-range" type="range" min="0" max="100" value={st.pos} title={t('design.position', { percent: st.pos })} aria-label={t('design.positionOf', { n: i + 1 })} onInput={e => setStop(i, { pos: Number((e.target as HTMLInputElement).value) })} />
                  <span class="gradient-pos">{st.pos}%</span>
                  <button class="icon-btn" aria-label={t('design.removeColour')} disabled={stops.length <= 2} onClick={() => setStops(stops.filter((_, idx) => idx !== i))}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              ))}
              <div class="row-gap">
                <button class="btn ghost small" disabled={stops.length >= 6} onClick={() => setStops(evenStops([...stops.map(x => x.color), stops[stops.length - 1].color]))}>
                  <Icon name="plus" size={14} /> {t('design.addColour')}
                </button>
                <button class="link-btn" onClick={() => setStops(stops.map((st, i) => ({ color: stops[stops.length - 1 - i].color, pos: st.pos })))}>
                  {t('design.reverse')}
                </button>
              </div>
            </div>
            <Field label={t('design.shape')}>
              <Segmented value={radial ? 'radial' : 'linear'} onChange={v => set({ pageGradientType: v })} options={[{ value: 'linear', label: t('design.linear') }, { value: 'radial', label: t('design.radial') }]} />
            </Field>
            {!radial && (
              <Field label={t('design.direction', { degrees: angle })}>
                <input class="ui-range" type="range" min="0" max="360" step="5" value={angle} onInput={e => set({ pageGradientAngle: Number((e.target as HTMLInputElement).value) })} />
              </Field>
            )}
          </>
        )}
        {mode === 'image' && (
          <>
            <Field label={t('design.image')} hint={t('design.imageHint')}>
              <ImagePicker value={theme.pageImage} placeholder="https://…/background.jpg" onChange={v => set({ pageImage: v, pageMode: 'image' })} />
            </Field>
            {theme.pageImage && (
              <>
                <Field label={t('design.fit')}>
                  <Segmented value={theme.pageImageFit || 'cover'} onChange={v => set({ pageImageFit: v })} options={[{ value: 'cover', label: t('design.fill') }, { value: 'contain', label: t('design.fitContain') }, { value: 'tile', label: t('design.tile') }]} />
                </Field>
                <Field label={t('design.darken', { percent: theme.pageOverlay || 0 })}>
                  <input class="ui-range" type="range" min="0" max="80" step="5" value={theme.pageOverlay || 0} onInput={e => set({ pageOverlay: Number((e.target as HTMLInputElement).value) || undefined })} />
                </Field>
              </>
            )}
            <div class="colors">
              <ColorInput label={t('design.fallbackColour')} value={theme.pageBackground as string} onChange={v => set({ pageBackground: v })} />
            </div>
          </>
        )}
      </div>
    </Section>
  );
}
