'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { signMessageWithMiniKit } from '@/lib/game/auth';

type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
type GameState = 'idle' | 'showing' | 'playing' | 'gameover' | 'victory';

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const COLOR_CONFIG: Record<Color, { name: string; emoji: string; bg: string; light: string; border: string }> = {
  red: { name: 'แดง', emoji: '🔴', bg: 'from-red-500 to-red-600', light: 'bg-red-400', border: 'border-red-400' },
  blue: { name: 'น้ำเงิน', emoji: '🔵', bg: 'from-blue-500 to-blue-600', light: 'bg-blue-400', border: 'border-blue-400' },
  green: { name: 'เขียว', emoji: '🟢', bg: 'from-green-500 to-green-600', light: 'bg-green-400', border: 'border-green-400' },
  yellow: { name: 'เหลือง', emoji: '🟡', bg: 'from-yellow-500 to-yellow-600', light: 'bg-yellow-400', border: 'border-yellow-400' },
  purple: { name: 'ม่วง', emoji: '🟣', bg: 'from-purple-500 to-purple-600', light: 'bg-purple-400', border: 'border-purple-400' },
  orange: { name: 'ส้ม', emoji: '🟠', bg: 'from-orange-500 to-orange-600', light: 'bg-orange-400', border: 'border-orange-400' },
};

const INITIAL_SEQUENCE_LENGTH = 3;
const GAME_ID = 'color-tap';

export default function ColorTapPage() {
  const [address, setAddress] = useState('');
  const [energy, setEnergy] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerSequence, setPlayerSequence] = useState<Color[]>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highlightedColor, setHighlightedColor] = useState<Color | null>(null);
  const [difficulty, setDifficulty] = useState(1);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [actionsCount, setActionsCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const a = sessionStorage.getItem('verifiedAddress') || '';
    setAddress(a);
    if (a) {
      loadEnergy(a);
      const randomDiff = getRandomDifficulty(a, GAME_ID, 1, 3);
      setDifficulty(randomDiff);
    }
    setSoundEnabledState(isSoundEnabled());
  }, []);

  async function loadEnergy(addr: string) {
    try {
      const r = await fetch(`/api/game/energy/get?address=${addr}`);
      const j = await r.json();
      if (j.ok) setEnergy(j.energy);
    } catch (e) {
      console.error('Failed to load energy:', e);
    }
  }

  function toggleSound() {
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
  }

  function generateSequence(length: number): Color[] {
    const seq: Color[] = [];
    for (let i = 0; i < length; i++) {
      seq.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
    }
    return seq;
  }

  function startGame() {
    if (!address) {
      alert('กรุณาเชื่อมต่อ Wallet ก่อน');
      return;
    }
    if (energy <= 0) {
      alert('พลังงานไม่เพียงพอ!');
      return;
    }
    
    const randomDiff = getRandomDifficulty(address, GAME_ID, 1, 3);
    setDifficulty(randomDiff);
    setLevel(1);
    setScore(0);
    setLives(3);
    setActionsCount(0);
    setGameStartTime(Date.now());
    setLastClickTime(0);
    setShowFeedback(null);
    antiCheat.clearHistory(address);
    
    const newSequence = generateSequence(INITIAL_SEQUENCE_LENGTH + randomDiff);
    setSequence(newSequence);
    setPlayerSequence([]);
    showSequence(newSequence);
  }

  function showSequence(seq: Color[]) {
    setGameState('showing');
    let index = 0;
    const showSpeed = Math.max(400, 800 - (difficulty * 150)); // Faster at higher difficulty
    
    function showNext() {
      if (index >= seq.length) {
        setGameState('playing');
        setHighlightedColor(null);
        return;
      }
      
      setHighlightedColor(seq[index]);
      if (soundEnabled) playSound('click');
      
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = setTimeout(() => {
        setHighlightedColor(null);
        index++;
        setTimeout(() => showNext(), 150);
      }, showSpeed);
    }
    
    showNext();
  }

  function handleColorClick(color: Color) {
    if (gameState !== 'playing') return;
    
    // Anti-cheat: Check action speed
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime;
    if (timeSinceLastClick < 100 && lastClickTime > 0) {
      const cheatCheck = antiCheat.checkAction(address, 'color_click', { color, timeSinceLastClick });
      if (cheatCheck.suspicious) {
        alert('Suspicious activity detected. Please play normally.');
        return;
      }
    }
    
    setLastClickTime(now);
    antiCheat.recordAction(address, 'color_click', { color, level, timestamp: now });
    setActionsCount(prev => prev + 1);
    
    const newPlayerSeq = [...playerSequence, color];
    setPlayerSequence(newPlayerSeq);
    
    // Check if correct
    const expectedColor = sequence[newPlayerSeq.length - 1];
    const isCorrect = color === expectedColor;
    
    if (isCorrect) {
      // Correct!
      if (soundEnabled) playSound('correct');
      setShowFeedback('correct');
      antiCheat.recordAction(address, 'correct_color', { correct: true, level });
      
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setShowFeedback(null), 500);
      
      // Check if sequence complete
      if (newPlayerSeq.length === sequence.length) {
        // Level complete!
        const difficultyMultiplier = getDifficultyMultiplier(difficulty);
        const levelScore = Math.floor((level * 200 + (sequence.length * 50)) * difficultyMultiplier);
        setScore(prev => prev + levelScore);
        setLevel(prev => prev + 1);
        setPlayerSequence([]);
        
        // Generate longer sequence
        const newSequence = generateSequence(INITIAL_SEQUENCE_LENGTH + difficulty + level);
        setSequence(newSequence);
        setTimeout(() => showSequence(newSequence), 1000);
        
        if (soundEnabled) playSound('bonus');
      }
    } else {
      // Wrong!
      if (soundEnabled) playSound('wrong');
      setShowFeedback('wrong');
      antiCheat.recordAction(address, 'wrong_color', { correct: false });
      
      const newLives = lives - 1;
      setLives(newLives);
      
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => {
        setShowFeedback(null);
        if (newLives <= 0) {
          handleGameOver();
        } else {
          // Reset current level
          setPlayerSequence([]);
          setGameState('showing');
          showSequence(sequence);
        }
      }, 1000);
    }
  }

  async function handleGameOver() {
    setGameState('gameover');
    if (soundEnabled) playSound('gameover');
    
    try {
      const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
      
      // Anti-cheat: Validate score
      const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount);
      if (scoreCheck.suspicious) {
        console.warn('Suspicious score detected:', scoreCheck.reason);
        alert('Score validation failed. Please try again.');
        return;
      }
      
      // Get nonce
      const { nonce } = await fetch('/api/game/score/nonce', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address })
      }).then(r => r.json());
      
      // Sign message with wallet
      const base = { address, score, ts: Date.now(), nonce, gameId: GAME_ID, gameDuration, actionsCount };
      const message = JSON.stringify(base);
      let signature: string;
      try {
        signature = await signMessageWithMiniKit(message);
      } catch (e: any) {
        console.error('Failed to sign score:', e);
        alert('Failed to sign score. Please try again.');
        return;
      }
      
      const payload = { ...base };
      await fetch('/api/game/score/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, payload, sig: signature })
      });
      
      // Reward
      const key = 'luminex_tokens';
      const cur = Number(localStorage.getItem(key) || '0');
      localStorage.setItem(key, String(cur + 5)); // 5 tokens reward
      
      loadEnergy(address);
    } catch (e) {
      console.error('Failed to submit score:', e);
    }
  }

  function resetGame() {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setGameState('idle');
    setSequence([]);
    setPlayerSequence([]);
    setLevel(1);
    setScore(0);
    setLives(3);
    setHighlightedColor(null);
    setShowFeedback(null);
  }

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const currentProgress = playerSequence.length;
  const totalSequence = sequence.length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-purple-950 to-zinc-950 text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            🎨 Color Tap
          </h1>
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            aria-label="Toggle sound"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">⚡ Energy</div>
            <div className="text-xl font-bold text-yellow-400">{energy}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">📊 Level</div>
            <div className="text-xl font-bold text-purple-400">{level}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">❤️ Lives</div>
            <div className="text-xl font-bold text-red-400">{lives}/3</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">🎯 Score</div>
            <div className="text-xl font-bold text-green-400">{score.toLocaleString()}</div>
          </div>
        </div>

        {gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="rounded-2xl p-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 text-center">
              <div className="text-6xl mb-4">🎨</div>
              <h2 className="text-3xl font-bold mb-4 text-white">จำลำดับสีให้ถูกต้อง!</h2>
              <p className="text-white/80 mb-6">
                ดูลำดับสีที่แสดง แล้วกดสีตามลำดับให้ถูกต้อง
              </p>
              <div className="space-y-2 text-sm text-white/70 mb-6">
                <p>✨ คุณมี 3 ชีวิต</p>
                <p>🔥 แต่ละเลเวลจะยาวขึ้นเรื่อยๆ</p>
                <p>💎 คะแนนสูงขึ้นตามเลเวล!</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 font-bold text-xl shadow-2xl shadow-purple-500/50"
              >
                ▶ เริ่มเล่น
              </motion.button>
            </div>
          </motion.div>
        )}

        {(gameState === 'showing' || gameState === 'playing') && (
          <div className="space-y-6">
            {/* Status Message */}
            <div className="text-center">
              <p className="text-white/70 text-lg font-bold">
                {gameState === 'showing' ? '👀 ดูลำดับสีให้ดี...' : '🎮 กดสีตามลำดับ!'}
              </p>
              {gameState === 'playing' && (
                <p className="text-white/50 text-sm mt-2">
                  คุณกดไปแล้ว: {currentProgress} / {totalSequence}
                </p>
              )}
            </div>

            {/* Progress Bar */}
            {gameState === 'playing' && (
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentProgress / totalSequence) * 100}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                  />
                </div>
              </div>
            )}

            {/* Color Grid */}
            <div className="grid grid-cols-3 gap-4">
              {COLORS.map((color) => {
                const config = COLOR_CONFIG[color];
                const isHighlighted = highlightedColor === color;
                const isClickable = gameState === 'playing';
                
                return (
                  <motion.button
                    key={color}
                    whileHover={{ scale: isClickable ? 1.05 : 1 }}
                    whileTap={{ scale: isClickable ? 0.95 : 1 }}
                    onClick={() => handleColorClick(color)}
                    disabled={!isClickable}
                    className={`aspect-square rounded-2xl border-4 flex flex-col items-center justify-center text-5xl font-bold transition-all relative overflow-hidden ${
                      isHighlighted
                        ? `bg-gradient-to-br ${config.bg} ${config.border} scale-110 shadow-2xl z-10`
                        : isClickable
                        ? `bg-gradient-to-br ${config.bg} ${config.border} opacity-80 hover:opacity-100 cursor-pointer`
                        : `bg-gradient-to-br ${config.bg} ${config.border} opacity-50 cursor-not-allowed`
                    }`}
                  >
                    <span className="relative z-10">{config.emoji}</span>
                    <span className="text-xs mt-2 relative z-10">{config.name}</span>
                    
                    {/* Pulse effect when highlighted */}
                    {isHighlighted && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0.8 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.6, repeat: Infinity }}
                        className="absolute inset-0 bg-white rounded-full"
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  className={`text-center py-4 rounded-xl font-bold text-2xl ${
                    showFeedback === 'correct'
                      ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                      : 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                  }`}
                >
                  {showFeedback === 'correct' ? (
                    <span>✅ ถูกต้อง!</span>
                  ) : (
                    <span>❌ ผิด! -1 ชีวิต</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lives Display */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i < lives ? [1, 1.2, 1] : 0.8,
                    opacity: i < lives ? 1 : 0.3,
                  }}
                  transition={{ duration: 0.3 }}
                  className="text-3xl"
                >
                  ❤️
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500/50 text-center space-y-6"
          >
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-white mb-4">เกมจบ!</h2>
            <div className="space-y-3 text-lg">
              <p className="text-white/90">🎯 คะแนนสุดท้าย: <b className="text-yellow-300">{score.toLocaleString()}</b></p>
              <p className="text-white/90">📊 เลเวลสูงสุด: <b className="text-purple-300">{level}</b></p>
              <p className="text-green-400 font-bold">💰 ได้รับ 5 Tokens!</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 font-bold text-xl"
            >
              กลับไปหน้าแรก
            </motion.button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
