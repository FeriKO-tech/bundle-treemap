# Bundle Treemap

Interactive bundle visualizer for Vite, Next.js and Webpack reports.

Drop a `stats.json`, `client.json`, `nodejs.json`, `edge.json`, **or your entire `dist/` folder**, or click **Load sample report** to explore a demo bundle.

## Features

- **Drag-and-drop** JSON bundle reports **or build folders** (recursive walk).
- **Vite** parser for `rollup-plugin-visualizer` JSON output.
- **Webpack** parser for `webpack-bundle-analyzer` JSON output.
- **Next.js** parser for `.next/analyze/*.json` reports.
- **Folder mode** size-only tree when no analyzer JSON is available.
- **Compare two builds** (before/after) with a diff treemap and a top-changes table.
- **Export** the current treemap as **SVG** or **PNG**.
- **D3 treemap** with stable group colors.
- **Hover tooltip** with raw/gzip/brotli sizes.
- **Search** with module highlighting.
- **Dark/light theme** toggle.
- **CLI** that emits a universal report JSON: `npx bundle-treemap dist/`.
- **GitHub Action** that posts a bundle-size diff on PRs.
- **Built-in sample report** for quick demos.

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

### Build folder

Drop your `dist/`, `build/` or `.next/` folder directly. The walker looks for
a known analyzer report inside (`stats.json`, `client.json`, ...) and uses it
when available; otherwise it falls back to a size-only tree built from the
on-disk file sizes.

## Compare two builds

1. Drop your "current" report (file or folder).
2. Click **Compare** in the loaded-bundle header.
3. Drop the baseline report (e.g. produced from `main`).

You'll get totals, an `added / removed / changed` count, a diff treemap
(green = added, red = removed, amber = changed) and a sortable Top-N changes
table.

## Export

Click **SVG** or **PNG** in the loaded-bundle header to download the current
treemap as a standalone image (computed styles inlined, so it renders the
same outside the app).

## CLI

```bash
# Walk a build folder and emit a report JSON.
npx bundle-treemap dist/ --out current.json

# Print a Top-20 summary to stdout.
npx bundle-treemap dist/ --summary

# Pass an existing analyzer JSON straight through.
npx bundle-treemap stats.json --out report.json
```

The CLI ships as `bin: bundle-treemap` and only uses Node 18+ built-ins (no
runtime dependencies).

## GitHub Action

A composite action lives at `.github/actions/bundle-diff/`. It reads two
report JSONs (current + base) and posts/updates a PR comment with the diff:

```yaml
- run: npx bundle-treemap dist/ --out current.json
- uses: ./.github/actions/bundle-diff
  with:
    current: current.json
    base: baseline/bundle-report.json
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

See `.github/actions/bundle-diff/README.md` for the full input/output
reference and a complete workflow example.

## License

MIT
