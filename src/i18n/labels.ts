/**
 * Interface names for lists that come from the form generator package (validation rules, logic operators,
 * address and captcha providers, themes, fonts). The generator keeps its English labels as the fallback, so a new
 * entry there shows up in English until it is translated in `locales/<code>/lib.json`.
 */
import type { AddressProvider, CaptchaProviderInfo, RuleSpec } from '../generator';
import { tOr } from '.';

export const ruleLabel = (spec: RuleSpec) => tOr(`lib.rule.${spec.key}.label`, spec.label);
export const ruleHint = (spec: RuleSpec) => (spec.hint ? tOr(`lib.rule.${spec.key}.hint`, spec.hint) : undefined);

export const operatorLabel = (op: { value: string; label: string }) => tOr(`lib.operator.${op.value}`, op.label);

export const providerLabel = (p: AddressProvider) => tOr(`lib.addressProvider.${p.id}.label`, p.label);
export const providerDescription = (p: AddressProvider) => tOr(`lib.addressProvider.${p.id}.description`, p.description);
export const providerKeyHelp = (p: AddressProvider) => (p.keyHelp ? tOr(`lib.addressProvider.${p.id}.keyHelp`, p.keyHelp) : undefined);

export const captchaLabel = (p: CaptchaProviderInfo) => tOr(`lib.captcha.${p.id}.label`, p.label);
export const captchaDescription = (p: CaptchaProviderInfo) => tOr(`lib.captcha.${p.id}.description`, p.description);

export const themeName = (preset: { id: string; name: string }) => tOr(`lib.theme.${preset.id}`, preset.name);

/** "Merriweather (serif)" -> "Merriweather (serif)" in the interface language; "System default" translated. */
export const fontLabel = (font: { value: string; label: string }) =>
  font.value === 'system' ? tOr('lib.font.system', font.label) : font.label.replace(/\((serif|mono)\)$/, (_all, kind) => `(${tOr(`lib.font.${kind}`, kind)})`);

export const socialLabel = (network: { value: string; label: string }) => tOr(`lib.social.${network.value}`, network.label);
