/**
 * Universal bundle representation that all parsers normalize to.
 * - `size` is the rendered (uncompressed) bytes of the chunk/module.
 * - `gzipSize` / `brotliSize` are optional compressed sizes when reported.
 * - Internal nodes have `children`; leaf nodes do not.
 */
export interface BundleNode {
  name: string;
  size: number;
  gzipSize?: number;
  brotliSize?: number;
  children?: BundleNode[];
  /** Optional original path/id for tooltip display */
  path?: string;
}

export type BundleSource =
  | 'vite-visualizer'
  | 'webpack-analyzer'
  | 'nextjs-analyze'
  | 'unknown';

export interface ParsedBundle {
  source: BundleSource;
  root: BundleNode;
  totalSize: number;
  totalGzipSize?: number;
  totalBrotliSize?: number;
  /** Number of leaf modules */
  moduleCount: number;
  /** Free-form metadata for the UI to surface (e.g. tool version) */
  meta?: Record<string, string | number>;
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}
