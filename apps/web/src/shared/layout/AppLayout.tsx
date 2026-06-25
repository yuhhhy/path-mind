import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">PathMind</h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}
