export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border/60 dark:border-border-dark/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 grid-cols-2 grid-rows-2 gap-0.5">
              <div className="rounded-sm bg-accent" />
              <div className="rounded-sm bg-accent-glow" />
              <div className="rounded-sm bg-accent-glow/60" />
              <div className="rounded-sm bg-accent" />
            </div>
            <h1 className="font-semibold tracking-tight">Bundle Treemap</h1>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            v0.1.0
          </span>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Project scaffold ready. Drop zone and treemap coming next.
        </p>
      </main>
    </div>
  );
}
