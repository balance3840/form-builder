import { render } from 'preact';
import './generator';
import { App } from './App';
import { setRootElement } from './host';
import { initialLocale, setLocale } from './i18n';
import { relocalizeUntouchedDoc } from './store';
import './styles.css';

document.documentElement.classList.add('fb-page');
const root = document.getElementById('app')!;
root.classList.add('fb-root');
setRootElement(root);
// Wait for the interface language (a small file) so the first paint is already translated
setLocale(initialLocale(), { remember: false }).finally(() => {
  relocalizeUntouchedDoc();
  render(<App />, root);
});
