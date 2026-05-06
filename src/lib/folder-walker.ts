/**
 * Walk a dropped folder using the File System Access API
 * (`DataTransferItem.webkitGetAsEntry()`).
 *
 * Returns a flat list of files with their relative paths inside the dropped
 * folder, file sizes, and -- for known bundle-report filenames -- their text
 * contents (we read text lazily and only for candidates to keep this cheap on
 * directories with thousands of files).
 */

export interface WalkedFile {
  /** Relative path inside the dropped folder, using forward slashes. */
  path: string;
  /** Bytes on disk. */
  size: number;
  /** Populated only for files whose names match a known report pattern. */
  text?: string;
}

export interface WalkedFolder {
  /** Folder name as dropped. */
  name: string;
  files: WalkedFile[];
}

const REPORT_FILENAME_RE =
  /(^|\/)(stats|client|nodejs|edge|bundle|report)\.json$/i;

function isReportFile(path: string): boolean {
  return REPORT_FILENAME_RE.test(path);
}

interface FsEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
  file?: (cb: (file: File) => void, err?: (e: unknown) => void) => void;
  createReader?: () => {
    readEntries: (
      cb: (entries: FsEntry[]) => void,
      err?: (e: unknown) => void,
    ) => void;
  };
}

function readDirectory(entry: FsEntry): Promise<FsEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = entry.createReader?.();
    if (!reader) {
      resolve([]);
      return;
    }
    const all: FsEntry[] = [];
    const readBatch = () => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve(all);
            return;
          }
          all.push(...entries);
          // readEntries returns at most ~100 entries per call; keep draining.
          readBatch();
        },
        (err) => reject(err),
      );
    };
    readBatch();
  });
}

function getFile(entry: FsEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!entry.file) {
      reject(new Error(`Entry has no file accessor: ${entry.name}`));
      return;
    }
    entry.file(resolve, reject);
  });
}

async function walk(
  entry: FsEntry,
  prefix: string,
  out: WalkedFile[],
): Promise<void> {
  if (entry.isFile) {
    try {
      const file = await getFile(entry);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const record: WalkedFile = { path: rel, size: file.size };
      if (isReportFile(rel)) {
        try {
          record.text = await file.text();
        } catch {
          // ignore unreadable report - we'll fall through to size-only mode
        }
      }
      out.push(record);
    } catch {
      // ignore permission errors on individual files
    }
    return;
  }
  if (entry.isDirectory) {
    const children = await readDirectory(entry);
    const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Walk children in parallel but in modest batches to avoid runaway
    // concurrency on huge trees.
    const BATCH = 16;
    for (let i = 0; i < children.length; i += BATCH) {
      await Promise.all(
        children.slice(i, i + BATCH).map((c) => walk(c, nextPrefix, out)),
      );
    }
  }
}

/**
 * Walk a dropped directory entry and return all files inside (recursively).
 * The root folder name is stripped from `path`s in the result.
 */
export async function walkDirectoryEntry(entry: FsEntry): Promise<WalkedFolder> {
  const files: WalkedFile[] = [];
  const children = await readDirectory(entry);
  const BATCH = 16;
  for (let i = 0; i < children.length; i += BATCH) {
    await Promise.all(children.slice(i, i + BATCH).map((c) => walk(c, '', files)));
  }
  return { name: entry.name, files };
}

/** Pick the most likely bundle report from a list of walked files. */
export function pickReport(files: WalkedFile[]): WalkedFile | null {
  // Priority: stats.json > client.json > nodejs.json > edge.json > anything else.
  const order = ['stats.json', 'client.json', 'nodejs.json', 'edge.json'];
  for (const want of order) {
    const found = files.find(
      (f) => f.text !== undefined && f.path.toLowerCase().endsWith(want),
    );
    if (found) return found;
  }
  // Fallback: first file with text that matches the regex.
  return (
    files.find((f) => f.text !== undefined && REPORT_FILENAME_RE.test(f.path)) ?? null
  );
}
