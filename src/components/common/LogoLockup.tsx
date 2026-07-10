import { cn } from "../../lib/utils";

// Ledger AI logo lockup: the mark image + wordmark text beside it.
// The text is theme-aware (accent + foreground + muted tagline) so it reads
// well in both light and dark mode.
export function LogoLockup({ className }: Readonly<{ className?: string }>) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src="/logo-light.png" alt="" className="h-10 w-auto object-contain" />
      <span className="flex flex-col leading-none">
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-primary">
          Industry
        </span>
        <span className="text-xl font-bold tracking-tight text-foreground">AI OS</span>
        <span className="mt-1 text-[0.6rem] font-medium text-muted-foreground">
          The OS for accounting.
        </span>
      </span>
    </span>
  );
}
