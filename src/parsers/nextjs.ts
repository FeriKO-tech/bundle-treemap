import type { ParsedBundle } from '../lib/types';
import { canParseWebpack, parseWebpack } from './webpack';

/**
 * Next.js's `@next/bundle-analyzer` plugin emits the same JSON shape as
 * `webpack-bundle-analyzer` into `.next/analyze/{client,nodejs,edge}.json`.
 *
 * This module is a thin wrapper that re-tags the parsed result so the UI
 * can show a Next.js-specific badge.
 */

export function isNextAnalyzeFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return /(^|[\\/])(client|nodejs|edge)\.json$/.test(lower);
}

export function canParseNext(input: unknown): boolean {
  return canParseWebpack(input);
}

export function parseNext(input: unknown): ParsedBundle {
  return parseWebpack(input, 'nextjs-analyze');
}
