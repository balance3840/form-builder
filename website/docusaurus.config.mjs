// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Form builder',
  tagline: 'A visual editor for forms. Standalone app or embeddable library',
  favicon: 'img/favicon.png',

  // GitHub Pages: https://balance3840.github.io/form-builder/
  url: 'https://balance3840.github.io',
  baseUrl: '/form-builder/',
  organizationName: 'balance3840',
  projectName: 'form-builder',
  trailingSlash: false,
  onBrokenLinks: 'warn',
  // .md files are plain CommonMark (the v1 pages were converted from HTML and are full of braces and angle brackets)
  markdown: { format: 'detect', hooks: { onBrokenMarkdownLinks: 'warn' } },

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/', // docs only: the site opens on the documentation
          sidebarPath: './sidebars.mjs',
          editUrl: 'https://github.com/balance3840/form-builder/tree/main/website/',
          // The version people land on. `current` is the docs folder, which is v2.
          // The version people land on. `current` is the docs folder: the latest release.
          lastVersion: 'current',
          versions: {
            current: { label: '0.2', path: '/', banner: 'none' },
            // After `npm run docs:version -- 0.3`, add it here: '0.3': { label: '0.3', path: '0.3' }, and set
            // `current` to the next release, e.g. { label: 'Next', path: 'next', banner: 'unreleased' }.
          },
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      }),
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      /** @type {import('@easyops-cn/docusaurus-search-local').PluginOptions} */
      ({ hashed: true, docsRouteBasePath: '/', indexBlog: false, explicitSearchResultPath: true }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Form builder',
        items: [
          { type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Documentation' },
          { to: '/playground', position: 'left', label: 'Playground' },
          { type: 'docsVersionDropdown', position: 'right', dropdownActiveClassDisabled: true },
          { href: 'https://github.com/balance3840/form-builder', label: 'GitHub', position: 'right' },
        ],
      },
      footer: { style: 'dark', copyright: 'MIT License' },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['json', 'bash'],
      },
    }),
};

export default config;
