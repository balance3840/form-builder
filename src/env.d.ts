/// <reference types="vite/client" />
import 'preact';

declare module 'preact' {
  namespace JSX {
    interface IntrinsicElements {
      're-form-generator': any;
    }
  }
}
