# Bundle Treemap

Interactive bundle visualizer for Vite, Next.js and Webpack reports.

Drop a `stats.json`, `client.json`, `nodejs.json`, `edge.json`, or click **Load sample report** to explore a demo bundle.

## Features

- **Drag-and-drop upload** for JSON bundle reports
- **Vite parser** for `rollup-plugin-visualizer` JSON output
- **Webpack parser** for `webpack-bundle-analyzer` JSON output
- **Next.js parser** for `.next/analyze/*.json` reports
- **D3 treemap** with stable group colors
- **Hover tooltip** with raw/gzip/brotli sizes
- **Search** with module highlighting
- **Dark/light theme** toggle
- **Built-in sample report** for quick demos

## Tech stack

- **Vite**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **D3 hierarchy / scale**

## Getting started

```bash
npm install
npm run dev
```

Build production assets:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Supported report formats

### Vite

Use `rollup-plugin-visualizer` with JSON output:

```ts
visualizer({
  filename: 'stats.json',
  template: 'raw-data',
  gzipSize: true,
  brotliSize: true,
});
```

Then drop `stats.json` into the app.

### Next.js

Use `@next/bundle-analyzer`, run a production build and drop one of:

- `.next/analyze/client.json`
- `.next/analyze/nodejs.json`
- `.next/analyze/edge.json`

### Webpack

Use `webpack-bundle-analyzer` JSON output and drop the generated report file.

## Roadmap

- Compare two builds before/after
- Export SVG/PNG report
- CLI wrapper: `npx bundle-treemap dist/`
- GitHub Action for PR bundle-size comments

## License

MIT
