/**
 * Picks an emoji or an icon, like the pickers of Notion or Slack: an Emoji tab (every Unicode emoji, search in the
 * interface language, categories, skin tones, recently used) and an Icons tab (the Lucide set, searchable, recently
 * used). Both libraries load only when the picker opens. The chosen icon's shapes are stored in the form, so the form
 * itself never needs the icon library.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Icon } from '../icons';
import { locale, t } from '../i18n';
import { Modal, Segmented } from './ui';

export type IconNode = [string, { [attr: string]: string | number }][];
export type IconChoice = { emoji?: string; icon?: string; iconNode?: IconNode };

/**
 * Emoji names and keywords per interface language (searching "corazón" finds ❤️). Each language is its own chunk,
 * loaded when the picker opens, and handed to the picker as an in-memory file (nothing is fetched from a CDN).
 */
const EMOJI_DATA: { [code: string]: () => Promise<any> } = {
  en: () => import('emoji-picker-element-data/en/cldr/data.json'),
  es: () => import('emoji-picker-element-data/es/cldr/data.json'),
  da: () => import('emoji-picker-element-data/da/cldr/data.json'),
  sv: () => import('emoji-picker-element-data/sv/cldr/data.json'),
  pt: () => import('emoji-picker-element-data/pt/cldr/data.json'),
};
const dataUrls: { [code: string]: string } = {};
async function emojiDataUrl(code: string): Promise<string> {
  if (!dataUrls[code]) {
    const data = (await EMOJI_DATA[code]()).default;
    dataUrls[code] = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  }
  return dataUrls[code];
}

/** The emoji picker's own texts. It ships English, Spanish and Portuguese (of Portugal); Danish and Swedish are written here. */
async function emojiTexts(code: string): Promise<any> {
  if (code === 'es') return (await import('emoji-picker-element/i18n/es')).default;
  if (code === 'pt') return (await import('emoji-picker-element/i18n/pt_PT')).default;
  const en = (await import('emoji-picker-element/i18n/en')).default;
  if (code === 'da')
    return {
      ...en,
      categoriesLabel: 'Kategorier',
      emojiUnsupportedMessage: 'Din browser understøtter ikke farve-emoji.',
      favoritesLabel: 'Favoritter',
      loadingMessage: 'Indlæser…',
      networkErrorMessage: 'Emoji kunne ikke indlæses.',
      regionLabel: 'Emoji-vælger',
      searchDescription: 'Når der er søgeresultater, brug pil op og ned til at vælge og Enter til at bekræfte.',
      searchLabel: 'Søg',
      searchResultsLabel: 'Søgeresultater',
      skinToneDescription: 'Når den er åben, brug pil op og ned til at vælge og Enter til at bekræfte.',
      skinToneLabel: 'Vælg en hudfarve (nu {skinTone})',
      skinTonesLabel: 'Hudfarver',
      skinTones: ['Standard', 'Lys', 'Mellemlys', 'Mellem', 'Mellemmørk', 'Mørk'],
      categories: { custom: 'Brugerdefineret', 'smileys-emotion': 'Smileys og følelser', 'people-body': 'Mennesker og krop', 'animals-nature': 'Dyr og natur', 'food-drink': 'Mad og drikke', 'travel-places': 'Rejser og steder', activities: 'Aktiviteter', objects: 'Ting', symbols: 'Symboler', flags: 'Flag' },
    };
  if (code === 'sv')
    return {
      ...en,
      categoriesLabel: 'Kategorier',
      emojiUnsupportedMessage: 'Din webbläsare stöder inte färg-emoji.',
      favoritesLabel: 'Favoriter',
      loadingMessage: 'Laddar…',
      networkErrorMessage: 'Det gick inte att ladda emoji.',
      regionLabel: 'Emoji-väljare',
      searchDescription: 'När det finns sökresultat, använd pil upp och ned för att välja och Enter för att bekräfta.',
      searchLabel: 'Sök',
      searchResultsLabel: 'Sökresultat',
      skinToneDescription: 'När den är öppen, använd pil upp och ned för att välja och Enter för att bekräfta.',
      skinToneLabel: 'Välj en hudton (nu {skinTone})',
      skinTonesLabel: 'Hudtoner',
      skinTones: ['Standard', 'Ljus', 'Mellanljus', 'Mellan', 'Mellanmörk', 'Mörk'],
      categories: { custom: 'Anpassade', 'smileys-emotion': 'Smileys och känslor', 'people-body': 'Människor och kropp', 'animals-nature': 'Djur och natur', 'food-drink': 'Mat och dryck', 'travel-places': 'Resor och platser', activities: 'Aktiviteter', objects: 'Föremål', symbols: 'Symboler', flags: 'Flaggor' },
    };
  return en;
}

/** "ArrowRight" → "arrow right" (what people type when they search). */
const words = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').toLowerCase();

const RECENT_KEY = 'form-builder:recent-icons';
const recentIcons = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch (e) {
    return [];
  }
};
const rememberIcon = (name: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([name, ...recentIcons().filter(n => n !== name)].slice(0, 16)));
  } catch (e) {
    /* storage blocked */
  }
};

export function IconSvg({ node, size = 20 }: { node: IconNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {node.map(([Tag, attrs], i) => {
        const T = Tag as any;
        return <T key={i} {...attrs} />;
      })}
    </svg>
  );
}

/** The Emoji tab: the emoji-picker-element web component, in the interface language. */
function EmojiTab({ onPick }: { onPick: (emoji: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let picker: any = null;
    let cancelled = false;
    const code = EMOJI_DATA[locale.value] ? locale.value : 'en';
    (async () => {
      await import('emoji-picker-element');
      const [i18n, dataSource] = await Promise.all([emojiTexts(code), emojiDataUrl(code)]);
      if (cancelled || !host.current) return;
      picker = document.createElement('emoji-picker');
      picker.locale = code;
      picker.dataSource = dataSource;
      picker.i18n = i18n;
      picker.addEventListener('emoji-click', (e: any) => e.detail && e.detail.unicode && onPick(e.detail.unicode));
      host.current.appendChild(picker);
    })();
    return () => {
      cancelled = true;
      if (picker) picker.remove();
    };
  }, [locale.value]);
  return <div class="emoji-tab" ref={host} />;
}

/** The Icons tab: the Lucide icons, searchable by name, with the recently used ones first. */
function IconsTab({ current, onPick }: { current?: string; onPick: (name: string, node: IconNode) => void }) {
  const [icons, setIcons] = useState<{ [name: string]: IconNode } | null>(null);
  const [query, setQuery] = useState('');
  useEffect(() => {
    import('lucide').then(m => setIcons((m as any).icons));
  }, []);
  const names = useMemo(() => (icons ? Object.keys(icons) : []), [icons]);
  const MAX = 240;
  const q = query.trim().toLowerCase();
  const found = q ? names.filter(n => words(n).includes(q) || n.toLowerCase().includes(q.replace(/\s+/g, ''))) : names;
  const recent = recentIcons().filter(n => icons && icons[n]);
  const tile = (name: string) => (
    <button
      key={name}
      class={`icon-pick ${current === `lucide:${name}` ? 'active' : ''}`}
      title={words(name)}
      onClick={() => {
        rememberIcon(name);
        onPick(name, icons![name]);
      }}
    >
      <IconSvg node={icons![name]} />
    </button>
  );
  if (!icons) return <div class="ui-hint pad">{t('fieldInspector.loadingIcons')}</div>;
  return (
    <div class="icons-tab">
      <div class="search">
        <Icon name="search" size={15} />
        <input value={query} placeholder={t('fieldInspector.searchIcons')} onInput={e => setQuery((e.target as HTMLInputElement).value)} />
      </div>
      {!q && recent.length > 0 && (
        <>
          <div class="picker-group">{t('fieldInspector.recentlyUsed')}</div>
          <div class="icon-grid">{recent.map(tile)}</div>
          <div class="picker-group">{t('fieldInspector.allIcons')}</div>
        </>
      )}
      <div class="icon-grid">{found.slice(0, MAX).map(tile)}</div>
      {found.length > MAX && <div class="ui-hint">{t('fieldInspector.moreIcons', { count: found.length - MAX })}</div>}
      {!found.length && <div class="ui-hint">{t('fieldInspector.noIcons')}</div>}
      <div class="ui-hint picker-credit">{t('fieldInspector.iconsCredit')}</div>
    </div>
  );
}

/** The two tabs of the picker. */
function PickerTabs({ value, onPick }: { value: IconChoice; onPick: (next: IconChoice) => void }) {
  const [tab, setTab] = useState<'emoji' | 'icons'>(value.iconNode || value.icon ? 'icons' : 'emoji');
  return (
    <>
      <Segmented
        value={tab}
        onChange={v => setTab(v)}
        options={[
          { value: 'emoji', label: t('fieldInspector.emoji') },
          { value: 'icons', label: t('fieldInspector.icon') },
        ]}
      />
      {tab === 'emoji' ? <EmojiTab onPick={emoji => onPick({ emoji })} /> : <IconsTab current={value.icon} onPick={(name, iconNode) => onPick({ icon: `lucide:${name}`, iconNode })} />}
    </>
  );
}

/** A small square button (next to a text box) that opens the picker in a pop-up. */
export function IconButtonPicker({ value, onChange, label }: { value: IconChoice; onChange: (next: IconChoice) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button class={`icon-picker-mini ${value.iconNode ? 'has-icon' : ''}`} title={label} aria-label={label} onClick={() => setOpen(true)}>
        {value.iconNode ? <IconSvg node={value.iconNode} size={18} /> : <Icon name="smile" size={17} />}
      </button>
      {open && (
        <Modal title={label} onClose={() => setOpen(false)}>
          <div class="icon-picker-panel in-modal">
            <PickerTabs
              value={value}
              onPick={next => {
                onChange(next);
                setOpen(false);
              }}
            />
            {value.iconNode && (
              <button
                class="link-btn"
                onClick={() => {
                  onChange({});
                  setOpen(false);
                }}
              >
                {t('fieldInspector.removeIcon')}
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

/** The current emoji or icon, big, with the picker opening under it. */
export function IconPicker({ value, onChange }: { value: IconChoice; onChange: (next: IconChoice) => void }) {
  const [open, setOpen] = useState(false);
  const node = value.iconNode;
  return (
    <div class="icon-picker">
      <div class="icon-picker-current">
        <button class="icon-picker-preview" onClick={() => setOpen(!open)} aria-expanded={open} title={t('fieldInspector.chooseIcon')}>
          {value.emoji ? <span class="icon-picker-emoji">{value.emoji}</span> : node ? <IconSvg node={node} size={30} /> : <Icon name="smile" size={26} />}
        </button>
        <div class="stack tight">
          <button class="btn small" onClick={() => setOpen(!open)}>
            {open ? t('common.close') : t('fieldInspector.chooseIcon')}
          </button>
          {(value.emoji || node || value.icon) && (
            <button class="link-btn" onClick={() => onChange({})}>
              {t('common.remove')}
            </button>
          )}
        </div>
      </div>
      {open && (
        <div class="icon-picker-panel">
          <PickerTabs
            value={value}
            onPick={next => {
              onChange(next);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
