/** Build helper (used by the Vite configs): each interface language is downloaded as one file, `locale-<code>.js`. */
export function localeChunk(id: string): string | undefined {
  const match = /[\\/]i18n[\\/]locales[\\/]([^\\/]+)[\\/]/.exec(id) || /[\\/]i18n[\\/]template-content[\\/]([^\\/]+)\.json$/.exec(id);
  return match && match[1] !== 'en' ? `locale-${match[1]}` : undefined;
}
