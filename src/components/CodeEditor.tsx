/**
 * A VS Code-like editor (Monaco) for the form's own code, with autocomplete from `typings` (the `form` object and this
 * form's field names). Monaco is large, so it is loaded from a CDN the first time it opens; until then, and when it
 * cannot load (offline, a strict Content-Security-Policy), a plain text box is shown instead.
 */
import loader from '@monaco-editor/loader';
import { useEffect, useRef, useState } from 'preact/hooks';

const MONACO_VS = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';
loader.config({ paths: { vs: MONACO_VS } });

let monacoPromise: Promise<any> | null = null;
/** Loads Monaco once for the page (later editors reuse it); a failed load can be tried again. */
function loadMonaco(): Promise<any> {
  if (!monacoPromise) {
    monacoPromise = Promise.race([
      loader.init(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Monaco took too long to load')), 20000)),
    ]).catch(e => {
      monacoPromise = null;
      throw e;
    });
  }
  return monacoPromise;
}

/**
 * Monaco puts its CSS in the document's <head>. Inside the builder's shadow root that CSS does not apply, so the root
 * gets its own copy (the icon font is declared by the copy in <head>, fonts are shared by the whole page).
 */
function addStylesTo(element: HTMLElement) {
  const root = element.getRootNode();
  if (!(root instanceof ShadowRoot) || root.querySelector('link[data-monaco]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${MONACO_VS}/editor/editor.main.css`;
  link.setAttribute('data-monaco', '');
  root.prepend(link);
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** TypeScript declarations for autocomplete (see scriptTypes.ts). */
  typings?: string;
  /** What to show while Monaco loads, and when it cannot load. */
  fallback: (value: string) => any;
};

export function CodeEditor({ value, onChange, typings, fallback }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  // what was typed in the plain box while Monaco loaded
  const valueRef = useRef(value);
  valueRef.current = value;
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let disposed = false;
    let lib: { dispose(): void } | null = null;
    loadMonaco()
      .then(monaco => {
        if (disposed || !host.current) return;
        addStylesTo(host.current);
        const js = monaco.languages.typescript.javascriptDefaults;
        js.setCompilerOptions({ target: monaco.languages.typescript.ScriptTarget.ES2020, allowNonTsExtensions: true, lib: ['es2020'] });
        if (typings) lib = js.addExtraLib(typings, 'file:///form-script.d.ts');
        const editor = monaco.editor.create(host.current, {
          value: valueRef.current,
          language: 'javascript',
          theme: 'vs-dark',
          automaticLayout: true,
          fontSize: 14,
          tabSize: 2,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          quickSuggestions: { other: true, comments: false, strings: true },
          padding: { top: 16, bottom: 16 },
        });
        editorRef.current = editor;
        // the editor owns the code while it is open (nothing else can change it then), so it only reports, never takes
        // the value back: a render with an older value would otherwise overwrite what is being typed and loop
        editor.onDidChangeModelContent(() => changeRef.current(editor.getValue()));
        // field names come in quotes: suggest them as soon as a quote is typed
        editor.onKeyUp((e: { browserEvent: KeyboardEvent }) => {
          if (e.browserEvent.key === "'" || e.browserEvent.key === '"') editor.trigger('quote', 'editor.action.triggerSuggest', {});
        });
        setState('ready');
        editor.focus();
      })
      .catch(() => !disposed && setState('failed'));
    return () => {
      disposed = true;
      lib && lib.dispose();
      editorRef.current && editorRef.current.dispose();
      editorRef.current = null;
    };
  }, []);

  if (state === 'failed') return fallback(value);
  return (
    <div class="code-monaco">
      <div ref={host} class="code-monaco-host" />
      {state === 'loading' && <div class="code-monaco-loading">{fallback(value)}</div>}
    </div>
  );
}
