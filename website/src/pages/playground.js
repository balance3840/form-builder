import React from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';

// The standalone builder (website/static/playground-app, built by `npm run build:playground`) inside the docs layout,
// so the navigation stays one click away. The form is kept in the visitor's browser only.
export default function Playground() {
  const src = useBaseUrl('/playground-app/');
  return (
    <Layout title="Playground" description="Build a form by dragging fields, and see its JSON." noFooter>
      <iframe
        src={src}
        title="Form builder playground"
        style={{ display: 'block', width: '100%', height: 'calc(100vh - var(--ifm-navbar-height))', border: 0 }}
      />
    </Layout>
  );
}
