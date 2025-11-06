'use client';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="min-h-screen bg-black text-white overflow-y-auto"
    >
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.assign('/');
              }
            }}
            className="text-sm opacity-80 hover:opacity-100"
          >
            ← Back
          </button>
          <div className="text-sm opacity-70">Game</div>
          <div className="w-10" />
        </div>
      </header>
      <div className="mx-auto max-w-3xl p-4">{children}</div>
    </div>
  );
}


