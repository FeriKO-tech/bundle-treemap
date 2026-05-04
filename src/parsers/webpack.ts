import type { BundleNode, ParsedBundle, BundleSource } from '../lib/types';
import { ParseError } from '../lib/types';

/**
 * Parser for `webpack-bundle-analyzer` JSON reports.
 * Produced by:
 *   - `webpack-bundle-analyzer --mode static` (`stats.json`-derived)
 *   - Next.js `@next/bundle-analyzer` (`.next/analyze/client.json`, etc.)
 *
 * The format is an array of asset bundles, each with nested `groups`
 * (modules / directories). Sizes are reported as:
 *   - statSize:  source bytes before bundling
 *   - parsedSize: bundled bytes (after webpack)
 *   - gzipSize:  gzip-compressed parsed bytes
 *
 * We use `parsedSize` as the canonical "size" since that's what ships;
 * fall back to `statSize` when parsedSize is missing.
 */

interface RawWebpackGroup {
  label?: string;
  path?: string;
  isAsset?: boolean;
  statSize?: number;
  parsedSize?: number;
  gzipSize?: number;
  groups?: RawWebpackGroup[];
  /** present on leaf modules in some versions */
  modules?: RawWebpackGroup[];
}

export function canParseWebpack(input: unknown): boolean {
  if (!Array.isArray(input) || input.length === 0) return false;
  const first = input[0];
  if (typeof first !== 'object' || first === null) return false;
  const obj = first as Record<string, unknown>;
  return (
    typeof obj.label === 'string' &&
    (typeof obj.statSize === 'number' ||
      typeof obj.parsedSize === 'number' ||
      Array.isArray(obj.groups))
  );
}

function pickSize(g: RawWebpackGroup): number {
  if (typeof g.parsedSize === 'number' && g.parsedSize > 0) return g.parsedSize;
  if (typeof g.statSize === 'number') return g.statSize;
  return 0;
}

function convert(g: RawWebpackGroup): BundleNode {
  const childrenRaw = g.groups ?? g.modules ?? [];
  if (childrenRaw.length > 0) {
    const children = childrenRaw.map(convert);
    const summed = children.reduce((sum, c) => sum + c.size, 0);
    // Prefer reported size when present, otherwise fall back to summed children.
    const reported = pickSize(g);
    const size = reported > 0 ? reported : summed;
    return {
      name: g.label ?? '(unknown)',
      path: g.path,
      size,
      gzipSize: g.gzipSize ?? aggregateGzip(children),
      children,
    };
  }
  return {
    name: g.label ?? '(unknown)',
    path: g.path,
    size: pickSize(g),
    gzipSize: g.gzipSize,
  };
}

function aggregateGzip(children: BundleNode[]): number | undefined {
  let total = 0;
  let any = false;
  for (const c of children) {
    if (typeof c.gzipSize === 'number') {
      total += c.gzipSize;
      any = true;
    }
  }
  return any ? total : undefined;
}

function countModules(node: BundleNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countModules(c), 0);
}

export function parseWebpack(
  input: unknown,
  source: BundleSource = 'webpack-analyzer',
): ParsedBundle {
  if (!canParseWebpack(input)) {
    throw new ParseError('Not a recognized webpack-bundle-analyzer JSON.');
  }
  const assets = input as RawWebpackGroup[];
  const children = assets.map(convert);
  const totalSize = children.reduce((sum, c) => sum + c.size, 0);
  const totalGzip = aggregateGzip(children);

  const root: BundleNode = {
    name: 'bundle',
    size: totalSize,
    gzipSize: totalGzip,
    children,
  };

  return {
    source,
    root,
    totalSize,
    totalGzipSize: totalGzip,
    moduleCount: countModules(root) - children.length, // subtract synthetic asset wrappers? keep as-is for now
  };
}
