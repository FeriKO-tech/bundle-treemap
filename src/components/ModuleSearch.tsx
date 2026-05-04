import { Search, X } from 'lucide-react';

interface ModuleSearchProps {
  value: string;
  matchCount: number;
  onChange: (value: string) => void;
}

export default function ModuleSearch({ value, matchCount, onChange }: ModuleSearchProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="module-search" className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Search modules
      </label>
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          id="module-search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="react, lodash, node_modules..."
          className="h-10 w-full rounded-lg border border-border/70 bg-white pl-9 pr-20 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-border-dark dark:bg-bg-dark-subtle"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 rounded-md p-1 text-zinc-400 transition -translate-y-1/2 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
        {value && (
          <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            {matchCount}
          </span>
        )}
      </div>
    </div>
  );
}
