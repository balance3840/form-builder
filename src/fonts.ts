/**
 * Google fonts offered in the font picker, by kind. Any other family from fonts.google.com can still be typed by name.
 * The previews load each font only when its card scrolls into view, with just the letters of the sample text.
 */
export type FontKind = 'sans' | 'serif' | 'mono' | 'display' | 'hand';

const list = (kind: FontKind, names: string) => names.split(',').map(name => ({ name: name.trim(), kind }));

export const GOOGLE_FONTS: { name: string; kind: FontKind }[] = [
  ...list('sans', 'Inter, Poppins, Nunito, DM Sans, Kumbh Sans, Montserrat, Roboto, Open Sans, Lato, Work Sans, Manrope, Plus Jakarta Sans, Outfit, Raleway, Rubik, Figtree, Source Sans 3, Space Grotesk, Quicksand, Mulish, Noto Sans, Karla, Barlow, Cabin, Josefin Sans, Public Sans, Lexend, Sora, Urbanist, Albert Sans, Red Hat Display, IBM Plex Sans, Hind, Heebo, Fira Sans, Oxygen, Titillium Web, Assistant, Archivo, Be Vietnam Pro, Epilogue, Jost, Libre Franklin, Mukta, Overpass, PT Sans, Ubuntu, Varela Round, Questrial, Cairo'),
  ...list('serif', 'Merriweather, Playfair Display, Lora, Source Serif 4, Libre Baskerville, EB Garamond, Cormorant Garamond, Crimson Text, PT Serif, Noto Serif, Bitter, Roboto Slab, Zilla Slab, DM Serif Display, Spectral, Vollkorn, Cardo, Frank Ruhl Libre, Libre Caslon Text, Newsreader, Fraunces, Old Standard TT'),
  ...list('mono', 'JetBrains Mono, IBM Plex Mono, Space Mono, Fira Code, Roboto Mono, Source Code Pro, DM Mono, Inconsolata, Ubuntu Mono'),
  ...list('display', 'Bebas Neue, Oswald, Anton, Abril Fatface, Lobster, Righteous, Archivo Black, Alfa Slab One, Bungee, Fredoka, Baloo 2, Comfortaa, Syne, Unbounded, Staatliches'),
  ...list('hand', 'Pacifico, Caveat, Dancing Script, Satisfy, Shadows Into Light, Indie Flower, Kalam, Patrick Hand, Permanent Marker'),
];

const loaded = new Set<string>();

/** Loads a font for its preview (once): the stylesheet goes in the page's head, as a shadow root cannot load fonts. */
export function loadPreviewFont(name: string, text: string) {
  if (typeof document === 'undefined' || !name || name === 'system' || name === 'inherit' || loaded.has(name)) return;
  loaded.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // only the letters of the sample (and of the name) are downloaded
  const letters = Array.from(new Set(text.split(''))).join('');
  link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}&text=${encodeURIComponent(letters)}&display=swap`;
  document.head.appendChild(link);
}

export const fontCss = (name: string) => (!name || name === 'system' || name === 'inherit' ? 'inherit' : `'${name}', ${/Serif|Baskerville|Garamond|Merriweather|Playfair|Lora|Slab|Bitter|Crimson|Cormorant|Spectral|Vollkorn|Cardo|Fraunces|Old Standard|Newsreader|Caslon/.test(name) && !/Sans/.test(name) ? 'serif' : /Mono|Code/.test(name) ? 'monospace' : 'sans-serif'}`);
