/** Ready-made sources for the "Custom search" field. */
export type SearchSource = { [key: string]: any };

export const COUNTRIES_SOURCE: SearchSource = { url: 'https://restcountries.com/v3.1/name/{q}?fields=name,cca2', labelKey: 'name.common', valueKey: 'cca2', minChars: 2 };

export const SEARCH_EXAMPLES: { id: string; label: string; source: SearchSource }[] = [{ id: 'countries', label: 'Example: countries (REST Countries)', source: COUNTRIES_SOURCE }];
