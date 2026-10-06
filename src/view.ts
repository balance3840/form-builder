/**
 * Simple and advanced view. Every field type is available in both; the simple view only shows the settings most
 * forms need (question, options, required, each type's essentials) and leaves out validation rules, logic, layout,
 * keys, detailed design and technical settings. Nothing is lost: settings made in the advanced view stay in the form,
 * and the simple view says when a field has some (see AdvancedNote).
 */
import { computed, signal } from '@preact/signals';

export type BuilderView = 'simple' | 'advanced';

const STORAGE_KEY = 'form-builder:view';

function remembered(): BuilderView | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'simple' || v === 'advanced' ? v : null;
  } catch (e) {
    return null;
  }
}

/** New people start in the simple view; the last choice is remembered. */
export const view = signal<BuilderView>(remembered() || 'simple');
export const advancedView = computed(() => view.value === 'advanced');
/** The host app can keep people in the simple view (no switch). */
export const viewLocked = signal(false);

let listener: ((view: BuilderView) => void) | undefined;
export const onViewChange = (fn: ((view: BuilderView) => void) | undefined) => (listener = fn);

export function setView(next: BuilderView, { remember = true } = {}) {
  if (viewLocked.value && next === 'advanced') return;
  if (view.value === next) return;
  view.value = next;
  if (remember) {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      /* storage blocked */
    }
  }
  listener?.(next);
}
