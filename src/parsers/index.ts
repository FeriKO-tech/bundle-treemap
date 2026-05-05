import type { ParsedBundle } from '../lib/types';
import { ParseError } from '../lib/types';
import { canParseVite, parseVite } from './vite';
import { canParseWebpack, parseWebpack } from './webpack';
import { isNextAnalyzeFilename, parseNext } from './nextjs';

export interface ParseInput {
  filename: string;
  text: string;
}

/**
 * Auto-detect format and parse a dropped report file into our universal `ParsedBundle`.
 *
 * Detection priority:
 *   1. Filename hint for Next.js (`client.json` / `nodejs.json` / `edge.json`)
 *   2. JSON shape - array -> webpack-bundle-analyzer; object with tree/nodes -> vite
 *   3. Throw a friendly `ParseError` otherwise
 */
export function parseBundle({ filename, text }: ParseInput): ParsedBundle {
  if (filename.toLowerCase().endsWith('.html')) {
    throw new ParseError(
      'HTML reports are not supported yet - drop the JSON file instead. ' +
        'For webpack-bundle-analyzer use --mode static --report-json, ' +
        'for Next.js read the JSON files inside `.next/analyze/`.',
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new ParseError(
      `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Filename hint takes priority - Next.js uses webpack-analyzer shape but
  // we want to badge it as Next.js so the user sees the right label.
  if (isNextAnalyzeFilename(filename) && canParseWebpack(json)) {
    return parseNext(json);
  }

  if (canParseWebpack(json)) {
    return parseWebpack(json);
  }

  if (canParseVite(json)) {
    return parseVite(json);
  }

  throw new ParseError(
    'Unrecognized bundle report format. ' +
      'Supported: rollup-plugin-visualizer (Vite), webpack-bundle-analyzer, @next/bundle-analyzer.',
  );
}

export { parseVite, parseWebpack, parseNext };
export { ParseError };
