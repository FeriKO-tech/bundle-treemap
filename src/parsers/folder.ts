import type { BundleNode, ParsedBundle } from '../lib/types';
import type { WalkedFile } from '../lib/folder-walker';

/**
 * Build a `ParsedBundle` from a flat list of files in a dropped folder
 * (e.g. `dist/`) using their on-disk sizes. No gzip/brotli info is available
 * in this mode -- it's a pure size-based view, useful when no analyzer JSON
 * was produced.
 *
 * Files with these extensions are treated as bundle output and counted:
 *   .js, .mjs, .cjs, .css, .html, .map, .wasm, .json, .svg, image binaries
 *
 * Source maps and unrelated assets can be filtered later via UI search.
 */

const COUNTABLE_EXT = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.html',
  '.htm',
  '.map',
  '.wasm',
  '.json',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
]);

function getExt(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return '';
  return name.slice(dot).toLowerCase();
}

interface FolderTreeNode {
  name: string;
  size: number;
  children?: Map<string, FolderTreeNode>;
}

function ensureDir(parent: FolderTreeNode, name: string): FolderTreeNode {
  if (!parent.children) parent.children = new Map();
  let child = parent.children.get(name);
  if (!child) {
    child = { name, size: 0, children: new Map() };
    parent.children.set(name, child);
  }
  return child;
}

function toBundleNode(node: FolderTreeNode): BundleNode {
  if (node.children && node.children.size > 0) {
    const children = Array.from(node.children.values()).map(toBundleNode);
    const size = children.reduce((sum, c) => sum + c.size, 0);
    return { name: node.name, size, children };
  }
  return { name: node.name, size: node.size };
}

function countLeaves(node: BundleNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

export interface FolderParseOptions {
  /** Folder name to use as the root of the tree (e.g. `dist`). */
  rootName: string;
  /** Files to include. Files outside `COUNTABLE_EXT` are ignored. */
  files: WalkedFile[];
}

export function parseFolder({ rootName, files }: FolderParseOptions): ParsedBundle {
  const root: FolderTreeNode = { name: rootName || 'dist', size: 0, children: new Map() };

  for (const file of files) {
    if (!COUNTABLE_EXT.has(getExt(file.path))) continue;
    const parts = file.path.split('/').filter(Boolean);
    if (parts.length === 0) continue;
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cursor = ensureDir(cursor, parts[i]!);
    }
    if (!cursor.children) cursor.children = new Map();
    cursor.children.set(parts[parts.length - 1]!, {
      name: parts[parts.length - 1]!,
      size: file.size,
    });
  }

  const bundleRoot = toBundleNode(root);

  return {
    source: 'folder',
    root: bundleRoot,
    totalSize: bundleRoot.size,
    moduleCount: countLeaves(bundleRoot),
    meta: { fileCount: files.length },
  };
}
