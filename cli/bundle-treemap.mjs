#!/usr/bin/env node
/**
 * bundle-treemap CLI
 *
 * Walks a build output directory (or accepts an analyzer JSON) and emits a
 * universal `ParsedBundle` JSON report that the web app can render. Designed
 * to be invoked as `npx bundle-treemap dist/` in CI or locally.
 *
 * Usage:
 *   bundle-treemap <dir-or-file> [--out report.json] [--summary]
 *
 *   --out <path>     Output path for the JSON report (default: bundle-report.json)
 *   --summary        Print a Top-20 modules summary to stdout
 *   --filter <exts>  Comma-separated list of extensions to count, e.g. ".js,.css"
 *   --quiet          Suppress non-error stdout output
 *   --help           Show this message
 *
 * Exit codes: 0 success, 1 user error, 2 unexpected error.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { argv, exit, stderr, stdout } from 'node:process';

const DEFAULT_FILTER = new Set([
  '.js', '.mjs', '.cjs', '.css', '.html', '.htm', '.map', '.wasm',
  '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif',
  '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot',
]);

const REPORT_FILENAME_RE = /(stats|client|nodejs|edge|bundle|report)\.json$/i;

function parseArgs(argv) {
  const args = { _: [], out: 'bundle-report.json', summary: false, filter: null, quiet: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { args.help = true; }
    else if (a === '--out' || a === '-o') { args.out = argv[++i]; }
    else if (a === '--summary' || a === '-s') { args.summary = true; }
    else if (a === '--filter' || a === '-f') {
      args.filter = new Set(argv[++i].split(',').map((x) => x.trim().toLowerCase()));
    }
    else if (a === '--quiet' || a === '-q') { args.quiet = true; }
    else if (a.startsWith('--')) { args.unknown = a; }
    else { args._.push(a); }
  }
  return args;
}

const HELP = `bundle-treemap <dir-or-file> [options]

  Walks a build directory (e.g. dist/) or reads an analyzer JSON, and writes a
  universal ParsedBundle JSON report you can drop into the web app or feed to
  the bundle-diff GitHub Action.

Options:
  --out <path>      Output JSON path (default: bundle-report.json)
  --summary         Print top-20 modules to stdout
  --filter <exts>   Comma-separated extensions to count, e.g. ".js,.css,.html"
  --quiet           No stdout output (errors still go to stderr)
  --help            Show this message

Examples:
  npx bundle-treemap dist/
  npx bundle-treemap dist/ --summary
  npx bundle-treemap stats.json --out report.json
`;

function log(args, msg) { if (!args.quiet) stdout.write(msg + '\n'); }
function err(msg) { stderr.write(msg + '\n'); }

async function* walkDir(root) {
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch { continue; }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) yield full;
    }
  }
}

function getExt(name) {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot).toLowerCase();
}

function ensureDir(parent, name) {
  if (!parent.children) parent.children = new Map();
  let child = parent.children.get(name);
  if (!child) {
    child = { name, size: 0, children: new Map() };
    parent.children.set(name, child);
  }
  return child;
}

function toBundleNode(node) {
  if (node.children && node.children.size > 0) {
    const children = Array.from(node.children.values()).map(toBundleNode);
    const size = children.reduce((s, c) => s + c.size, 0);
    return { name: node.name, size, children };
  }
  return { name: node.name, size: node.size };
}

function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}

function flattenLeaves(node, prefix = '') {
  if (!node.children || node.children.length === 0) {
    return [{ path: prefix ? `${prefix}/${node.name}` : node.name, size: node.size }];
  }
  const next = prefix ? `${prefix}/${node.name}` : node.name;
  return node.children.flatMap((c) => flattenLeaves(c, next));
}

async function buildFromDir(rootDir, args) {
  const filter = args.filter ?? DEFAULT_FILTER;
  const rootName = rootDir.split(sep).filter(Boolean).pop() || 'dist';
  const tree = { name: rootName, size: 0, children: new Map() };

  let totalFiles = 0;
  let countedFiles = 0;
  for await (const file of walkDir(rootDir)) {
    totalFiles++;
    const rel = relative(rootDir, file).split(sep).join('/');
    if (!filter.has(getExt(rel))) continue;
    const st = await stat(file);
    countedFiles++;
    const parts = rel.split('/');
    let cursor = tree;
    for (let i = 0; i < parts.length - 1; i++) cursor = ensureDir(cursor, parts[i]);
    if (!cursor.children) cursor.children = new Map();
    cursor.children.set(parts[parts.length - 1], { name: parts[parts.length - 1], size: st.size });
  }

  const root = toBundleNode(tree);
  return {
    source: 'folder',
    root,
    totalSize: root.size,
    moduleCount: countLeaves(root),
    meta: { fileCount: countedFiles, totalScanned: totalFiles, generatedBy: 'bundle-treemap-cli' },
  };
}

async function buildFromJsonFile(filePath) {
  const text = await readFile(filePath, 'utf8');
  const json = JSON.parse(text);
  // We don't run the full TS parser here -- but we can re-emit the JSON
  // verbatim if it already follows our shape, otherwise embed it under a
  // placeholder root for the web app to re-parse.
  if (json && typeof json === 'object' && 'source' in json && 'root' in json) {
    return json; // Already a ParsedBundle.
  }
  // Defer parsing to the web app; emit a marker so the UI knows to parse.
  return {
    source: 'unknown',
    root: { name: 'unparsed', size: 0, children: [] },
    totalSize: 0,
    moduleCount: 0,
    meta: {
      generatedBy: 'bundle-treemap-cli',
      raw: filePath,
      hint: 'Drop the original JSON into the web app for full parsing.',
    },
    raw: json,
  };
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  const digits = exp === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[exp]}`;
}

function printSummary(report, args) {
  if (args.quiet) return;
  log(args, '');
  log(args, `bundle-treemap report - ${report.source}`);
  log(args, `  total:   ${formatBytes(report.totalSize)} (${report.moduleCount} files)`);
  if (report.totalGzipSize) log(args, `  gzipped: ${formatBytes(report.totalGzipSize)}`);
  if (report.meta?.fileCount !== undefined) {
    log(args, `  scanned: ${report.meta.fileCount} files`);
  }
  log(args, '');
  log(args, 'Top 20 files by size:');
  const leaves = flattenLeaves(report.root).sort((a, b) => b.size - a.size).slice(0, 20);
  const maxName = Math.max(...leaves.map((l) => l.path.length), 12);
  const padName = (s) => s.padEnd(Math.min(maxName, 80), ' ');
  for (const leaf of leaves) {
    const truncated = leaf.path.length > 80 ? `...${leaf.path.slice(-77)}` : leaf.path;
    log(args, `  ${padName(truncated)}  ${formatBytes(leaf.size).padStart(10)}`);
  }
  log(args, '');
}

async function main() {
  const args = parseArgs(argv);
  if (args.help) { stdout.write(HELP); return 0; }
  if (args.unknown) { err(`Unknown option: ${args.unknown}\n`); stdout.write(HELP); return 1; }
  if (args._.length === 0) { err('Missing input. Pass a directory or JSON file.\n'); stdout.write(HELP); return 1; }

  const input = resolve(args._[0]);
  if (!existsSync(input)) { err(`Path not found: ${input}`); return 1; }

  const st = await stat(input);
  let report;
  if (st.isDirectory()) {
    log(args, `Scanning ${input}...`);
    report = await buildFromDir(input, args);
  } else if (st.isFile()) {
    if (!input.toLowerCase().endsWith('.json')) {
      err(`Only .json files are supported as direct input (got: ${input}).`);
      return 1;
    }
    report = await buildFromJsonFile(input);
  } else {
    err(`Unsupported input type: ${input}`); return 1;
  }

  const outPath = resolve(args.out);
  await writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');
  log(args, `\nWrote report to ${relative(process.cwd(), outPath) || outPath}`);
  log(args, `Drop it into the web app or pass it to .github/actions/bundle-diff`);

  if (args.summary) printSummary(report, args);
  return 0;
}

main()
  .then((code) => exit(code ?? 0))
  .catch((e) => { err(e?.stack || String(e)); exit(2); });
