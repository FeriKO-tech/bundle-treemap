import { Moon, Sun } from 'lucide-react';

interface ThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:border-accent/60 hover:text-accent dark:border-border-dark dark:bg-bg-dark-subtle dark:text-zinc-300"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? <Moon size={15} /> : <Sun size={15} />}
      {isDark ? 'Dark' : 'Light'}
    </button>
  );
}
