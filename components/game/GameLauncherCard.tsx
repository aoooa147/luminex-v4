'use client';
import Link from 'next/link';
export default function GameLauncherCard() {
  return (
    <div className="rounded-2xl p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 flex items-center justify-between shadow-lg">
      <div>
        <div className="text-lg font-semibold text-white">🪙 Coin Flip Challenge</div>
        <div className="text-sm opacity-70 text-white/80">เดาเหรียญให้ถูกต้อง 10 ครั้งติดต่อกันเพื่อชนะ!</div>
      </div>
      <Link 
        href="/game/coin-flip" 
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 font-medium text-white shadow-lg transition-all"
      >
        เล่นเลย
      </Link>
    </div>
  );
}
