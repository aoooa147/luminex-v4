'use client';
import { useEffect, useState } from 'react';
export default function HUD({ 
  energy, 
  score, 
  secondsRemain, 
  songTitle, 
  difficultyLabel, 
  audioRef,
  combo,
  accuracy
}: {
  energy: number;
  score: number;
  secondsRemain: number;
  songTitle: string;
  difficultyLabel: string;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  combo?: number;
  accuracy?: number;
}) {
  const [muted, setMuted] = useState(false);
  useEffect(() => { 
    const a = audioRef.current; 
    if (a) a.muted = muted; 
  }, [muted, audioRef]);
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
        <div className="flex gap-3 flex-wrap">
          <span className="bg-zinc-900/60 px-3 py-1 rounded-lg border border-zinc-800">
            ⚡ Energy: <b className="text-yellow-400">{energy}</b>
          </span>
          <span className="bg-zinc-900/60 px-3 py-1 rounded-lg border border-zinc-800">
            🎯 Score: <b className="text-purple-400">{score.toLocaleString()}</b>
          </span>
          <span className="bg-zinc-900/60 px-3 py-1 rounded-lg border border-zinc-800">
            ⏱️ Time: <b className="text-blue-400">{secondsRemain}</b>s
          </span>
          {combo !== undefined && (
            <span className="bg-yellow-500/20 px-3 py-1 rounded-lg border border-yellow-500/30">
              🔥 Combo: <b className="text-yellow-400">{combo}</b>
            </span>
          )}
          {accuracy !== undefined && (
            <span className="bg-green-500/20 px-3 py-1 rounded-lg border border-green-500/30">
              🎯 Acc: <b className="text-green-400">{accuracy}%</b>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 opacity-80">
          <span className="hidden md:inline text-xs bg-zinc-900/60 px-2 py-1 rounded border border-zinc-800">{songTitle}</span>
          <span className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs">{difficultyLabel}</span>
          <button 
            onClick={() => setMuted(m => !m)} 
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700" 
            aria-label="toggle-sound"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </div>
  );
}
