import { useCallback, useRef, useState } from 'react';
import { FileJson, FolderOpen, Loader2, Upload } from 'lucide-react';
import { walkDirectoryEntry, type WalkedFolder } from '../lib/folder-walker';

export interface DroppedFile {
  name: string;
  size: number;
  text: string;
}

export type DroppedPayload =
  | { kind: 'file'; file: DroppedFile }
  | { kind: 'folder'; folder: WalkedFolder };

interface DropZoneProps {
  onPayload: (payload: DroppedPayload) => void;
  onError?: (message: string) => void;
  /** Optional caption shown under the headline (used in compare mode). */
  caption?: string;
  /** Compact variant for inline/compare slots. */
  compact?: boolean;
}

const ACCEPTED_EXT = ['.json', '.html'];
const MAX_SIZE_MB = 50;

function isAccepted(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED_EXT.some((ext) => lower.endsWith(ext));
}

type FsEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
};

export default function DropZone({ onPayload, onError, caption, compact }: DropZoneProps) {
  const [isDragging, setDragging] = useState(false);
  const [isWalking, setWalking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!isAccepted(file.name)) {
        onError?.(
          `Unsupported file type: ${file.name}. Drop a stats.json from rollup-plugin-visualizer, webpack-bundle-analyzer, or a Next.js \`.next/analyze\` JSON.`,
        );
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        onError?.(`File too large (>${MAX_SIZE_MB} MB). Try a smaller report.`);
        return;
      }
      try {
        const text = await file.text();
        onPayload({
          kind: 'file',
          file: { name: file.name, size: file.size, text },
        });
      } catch (err) {
        onError?.(
          `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [onPayload, onError],
  );

  const handleDirectory = useCallback(
    async (entry: unknown) => {
      setWalking(true);
      try {
        // Cast through unknown - the FileSystemDirectoryEntry interface is not
        // fully typed in lib.dom for older targets, but the shape we use is
        // standard.
        const folder = await walkDirectoryEntry(entry as never);
        if (folder.files.length === 0) {
          onError?.(
            `Folder "${folder.name}" looks empty. Drop the build output folder (\`dist/\` / \`.next/\`).`,
          );
          return;
        }
        onPayload({ kind: 'folder', folder });
      } catch (err) {
        onError?.(
          `Failed to read folder: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setWalking(false);
      }
    },
    [onPayload, onError],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);

      // Prefer items API so we can detect directories; fall back to files.
      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const item = items[0];
        const getEntry = (item as DataTransferItem & {
          webkitGetAsEntry?: () => FsEntryLike | null;
        }).webkitGetAsEntry;
        const entry = getEntry ? getEntry.call(item) : null;
        if (entry?.isDirectory) {
          void handleDirectory(entry);
          return;
        }
      }

      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleDirectory, handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  }, []);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Drop a stats.json file or a build folder, or click to browse"
      className={[
        'group relative flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed text-center transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        compact ? 'max-w-md p-6' : 'max-w-2xl p-12',
        isDragging
          ? 'border-accent bg-accent/5 shadow-glow'
          : 'border-border hover:border-accent/60 hover:bg-zinc-50 dark:border-border-dark dark:hover:border-accent/60 dark:hover:bg-bg-dark-subtle',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.html,application/json,text/html"
        className="hidden"
        onChange={onPick}
      />
      <div
        className={[
          'grid place-items-center rounded-xl transition-colors',
          compact ? 'h-10 w-10' : 'h-14 w-14',
          isDragging
            ? 'bg-accent text-white'
            : 'bg-zinc-100 text-zinc-500 group-hover:bg-accent/10 group-hover:text-accent dark:bg-bg-dark-subtle dark:text-zinc-400',
        ].join(' ')}
      >
        {isWalking ? (
          <Loader2 size={compact ? 18 : 22} className="animate-spin" />
        ) : isDragging ? (
          <Upload size={compact ? 18 : 22} />
        ) : (
          <FolderOpen size={compact ? 18 : 22} />
        )}
      </div>
      <div className="space-y-1">
        <p className={['font-medium', compact ? 'text-xs' : 'text-sm'].join(' ')}>
          {isWalking
            ? 'Reading folder...'
            : isDragging
              ? 'Release to load'
              : 'Drop stats.json or a build folder'}
        </p>
        <p className={['text-zinc-500 dark:text-zinc-400', compact ? 'text-[11px]' : 'text-xs'].join(' ')}>
          {caption ?? (
            <>
              or <span className="text-accent">click to browse</span> · Vite,
              Next.js, Webpack, or any <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] dark:bg-bg-dark-subtle">dist/</code>
            </>
          )}
        </p>
      </div>
      {!compact && (
        <ul className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
          <li className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 dark:border-border-dark/60">
            <FileJson size={11} /> rollup-plugin-visualizer
          </li>
          <li className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 dark:border-border-dark/60">
            <FileJson size={11} /> webpack-bundle-analyzer
          </li>
          <li className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 dark:border-border-dark/60">
            <FileJson size={11} /> .next/analyze
          </li>
          <li className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 dark:border-border-dark/60">
            <FolderOpen size={11} /> dist/ folder
          </li>
        </ul>
      )}
    </div>
  );
}
