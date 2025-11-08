'use client';

import { TronShell } from '@/components/tron';
import { ArrowLeft } from 'lucide-react';

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <TronShell showEnergyStream={true} showGrid={true}>
      <header className="sticky top-0 z-50 glass-tron border-b border-tron-cyan/30 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.assign('/');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-tron-cyan/30 bg-tron-cyan/10 text-tron-cyan hover:bg-tron-cyan/20 transition-colors font-orbitron text-sm uppercase tracking-wider"
            style={{
              boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-sm font-orbitron text-tron-cyan uppercase tracking-wider">Game</div>
          <div className="w-10" />
        </div>
      </header>
      <div className="mx-auto max-w-3xl p-4">{children}</div>
    </TronShell>
  );
}


