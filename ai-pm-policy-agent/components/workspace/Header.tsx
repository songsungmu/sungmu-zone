export function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center gap-3">
        <span className="size-2.5 rounded-[3px] bg-primary" aria-hidden />
        <span className="text-[15px] font-semibold tracking-[-0.02em] whitespace-nowrap">
          Internal Policy Agent
        </span>
        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
        <span className="hidden text-[13px] text-muted-foreground sm:inline">
          Policy Review Console
        </span>
      </div>

      <span className="font-mono text-[11px] text-muted-foreground">v0.1.0</span>
    </header>
  );
}
