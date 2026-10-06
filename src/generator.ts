/**
 * Single entry point for everything we use from the form generator package.
 * The custom elements are registered once, here.
 *
 * Stencil's generated `dist/components/index.d.ts` only describes the element registration, while the
 * runtime module also re-exports the utils, so the values come from the runtime module and the types
 * from the package's main types entry.
 */
import { defineCustomElement as defineGenerator } from '@restrella/form-generator/dist/components/re-form-generator.js';
import * as runtime from '@restrella/form-generator/dist/components/index.js';
import type * as lib from '@restrella/form-generator';

defineGenerator();

const api = runtime as unknown as typeof lib;

export const {
  ADDRESS_PROVIDERS,
  CAPTCHA_PROVIDERS,
  captchaProvider,
  BUILT_IN_UI,
  addressSource,
  runSearch,
  COUNTRIES,
  DEFAULT_THEME,
  LANGUAGES,
  UI_KEYS,
  availableLanguages,
  collectTranslatables,
  createTranslator,
  languageInfo,
  localizeDocument,
  translationProgress,
  FONT_OPTIONS,
  LOGIC_OPERATORS,
  RULE_SPECS,
  BLOCK_ICONS,
  videoSource,
  safeEmbedUrl,
  rulesFor,
  fieldKind,
  THEME_PRESETS,
  computeVisibility,
  childLists,
  withChildList,
  logicRules,
  isLogicGroup,
  flattenConditions,
  mapConditions,
  filterConditions,
  packLogic,
  isGroup,
  blankItem,
  deepClone,
  effectiveValidationType,
  flattenFields,
  isContainer,
  rowLayout,
  upgradeColsToRows,
  isLayoutType,
  loadDocument,
  isLegacySchema,
  resolveTheme,
  safeImageUrl,
  pageStyle,
  pageMode,
  pageGradientCss,
  pageGradientStops,
  pageStyleText,
  SOCIAL_NETWORKS,
  themeToCssVars,
  toModelKey,
  uid,
  uniqueModelKey,
  applyPrefill,
  prefillFields,
  prefillKeys,
  prefillValues,
} = api;

export type { CaptchaProviderInfo, AddressProvider, SearchItem, Translatable, FormColumn, FormDocument, FormField, FormTheme, FormFooter, FooterLink, FooterSocial, FieldLogic, LogicCondition, LogicGroup, LogicNode, LogicMatch, RuleSpec, RuleParam, PrefillSource, PrefillData } from '@restrella/form-generator';
