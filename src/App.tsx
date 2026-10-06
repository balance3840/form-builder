import { useEffect } from 'preact/hooks';
import { Canvas } from './components/Canvas';
import { CodePane } from './components/CodePane';
import { DesignPanel } from './components/DesignPanel';
import { FieldInspector } from './components/FieldInspector';
import { FormSettings } from './components/FormSettings';
import { AddFieldModal, Palette, paletteCollapsed } from './components/Palette';
import { Preview } from './components/Preview';
import { TemplatesModal } from './components/Templates';
import { TranslatePane } from './components/TranslatePane';
import { TopBar } from './components/TopBar';
import { Modal } from './components/ui';
import { rootElement } from './host';
import { locale, t } from './i18n';
import { duplicateField, nudgeField, redo, removalAsk, removeField, requestRemoveField, selectedField, selectedId, tab, toast, undo } from './store';
import { options } from './host';

function useShortcuts() {
  useEffect(() => {
    // Embedded in another page the keyboard belongs to the builder only after the person clicked into it
    let active = true;
    const onPointer = (e: Event) => {
      const root = rootElement();
      active = !root || e.composedPath().includes(root);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!active) return;
      const target = (e.composedPath()[0] || e.target) as HTMLElement;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        redo();
      } else if (!typing && tab.value === 'build' && selectedId.value) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          requestRemoveField(selectedId.value);
        } else if (mod && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          duplicateField(selectedId.value);
        } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey) {
          // ↑ / ↓ (with or without Alt/Ctrl/Cmd): move the selected block up or down
          e.preventDefault();
          nudgeField(selectedId.value, e.key === 'ArrowUp' ? -1 : 1);
          requestAnimationFrame(() => (rootElement() || document).querySelector('.fb-card.selected')?.scrollIntoView({ block: 'nearest' }));
        } else if (e.key === 'Escape') {
          selectedId.value = null;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);
}

export function App() {
  useShortcuts();
  const current = tab.value === 'code' && options.value.hideEmbed ? 'build' : tab.value;
  const field = selectedField.value;
  return (
    <div class="app" lang={locale.value}>
      <TopBar />
      <div class={`workspace ws-${current} ${current === 'build' && paletteCollapsed.value ? 'palette-folded' : ''}`}>
        {current === 'build' && (
          <>
            <Palette />
            <Canvas />
            <aside class="inspector">{field ? <FieldInspector key={field.id} field={field} /> : <FormSettings />}</aside>
          </>
        )}
        {current === 'design' && (
          <>
            <aside class="inspector left">
              <DesignPanel />
            </aside>
            <Preview />
          </>
        )}
        {current === 'translate' && <TranslatePane />}
        {current === 'preview' && <Preview />}
        {current === 'code' && <CodePane />}
      </div>
      <TemplatesModal />
      <AddFieldModal />
      {removalAsk.value && (
        <Modal
          title={t('store.removeAskTitle')}
          onClose={() => (removalAsk.value = null)}
          footer={
            <>
              <button class="btn ghost" onClick={() => (removalAsk.value = null)}>
                {t('common.cancel')}
              </button>
              <button
                class="btn primary"
                onClick={() => {
                  const id = removalAsk.value;
                  removalAsk.value = null;
                  if (id) removeField(id);
                }}
              >
                {t('store.removeAskConfirm')}
              </button>
            </>
          }
        >
          <p>{t('store.removeAskText')}</p>
          <p class="ui-hint">{t('store.removeAskUndo')}</p>
        </Modal>
      )}
      {toast.value && (
        <div class="toast" role="status" key={toast.value.id}>
          {toast.value.message}
        </div>
      )}
    </div>
  );
}
