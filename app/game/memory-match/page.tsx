'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { signMessageWithMiniKit } from '@/lib/game/auth';

type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
type GameState = 'idle' | 'showing' | 'playing' | 'victory' | 'gameover';

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const COLOR_CONFIG: Record<Color, { bg: string; light: string; emoji: string }> = {
  red: { bg: 'bg-red-500', light: 'bg-red-400', emoji: '🔴' },
  blue: { bg: 'bg-blue-500', light: 'bg-blue-400', emoji: '🔵' },
  green: { bg: 'bg-green-500', light: 'bg-green-400', emoji: '🟢' },
  yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-400', emoji: '🟡' },
  purple: { bg: 'bg-purple-500', light: 'bg-purple-400', emoji: '🟣' },
  orange: { bg: 'bg-orange-500', light: 'bg-orange-400', emoji: '🟠' },
};

const GAME_ID = 'memory-match';

export default function MemoryMatchPage() {
  const [address, setAddress] = useState('');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerSequence, setPlayerSequence] = useState<Color[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [difficulty, setDifficulty] = useState(1);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [actionsCount, setActionsCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState({ hours: 0, minutes: 0 });
  const [highlightedColor, setHighlightedColor] = useState<Color | null>(null);
  const [luxReward, setLuxReward] = useState<number | null>(null);
  
  const sequenceRef = useRef<Color[]>([]);
  const showingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const a = sessionStorage.getItem('verifiedAddress') || '';
    setAddress(a);
    if (a) {
      checkCooldown();
      const randomDiff = getRandomDifficulty(a, GAME_ID, 1, 3);
      setDifficulty(randomDiff);
    }
    setSoundEnabledState(isSoundEnabled());
  }, [address]);

  async function checkCooldown() {
    try {
      const res = await fetch('/api/game/cooldown/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, gameId: GAME_ID })
      });
      const data = await res.json();
      if (data.ok) {
        setIsOnCooldown(data.isOnCooldown);
        setCooldownRemaining({ hours: data.remainingHours, minutes: data.remainingMinutes });
      }
    } catch (e) {
      console.error('Failed to check cooldown:', e);
    }
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
    if (isOnCooldown) {
      alert(`คุณต้องรอ ${cooldownRemaining.hours} ชั่วโมง ${cooldownRemaining.minutes} นาที`);
      return;
    }

    // Start cooldown
    fetch('/api/game/cooldown/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address, gameId: GAME_ID })
    });

    const randomDiff = getRandomDifficulty(address, GAME_ID, 1, 3);
    setDifficulty(randomDiff);
    setGameState('showing');
    setLevel(1);
    setScore(0);
    setLives(3);
    setCurrentIndex(0);
    setPlayerSequence([]);
    setActionsCount(0);
    setGameStartTime(Date.now());
    setLuxReward(null);
    antiCheat.clearHistory(address);

    const initialSeq = generateSequence(3 + randomDiff);
    sequenceRef.current = initialSeq;
    setSequence(initialSeq);
    showSequence(initialSeq);
  }

  function showSequence(seq: Color[]) {
    let index = 0;
    const showNext = () => {
      if (index >= seq.length) {
        setGameState('playing');
        setHighlightedColor(null);
        return;
      }
      setHighlightedColor(seq[index]);
      if (soundEnabled) playSound('click');
      index++;
      if (showingTimeoutRef.current) clearTimeout(showingTimeoutRef.current);
      showingTimeoutRef.current = setTimeout(showNext, 800 - (difficulty * 100));
    };
    showNext();
  }

  function handleColorClick(color: Color) {
    if (gameState !== 'playing') return;

    const cheatCheck = antiCheat.checkAction(address, 'color_click', { color, level });
    if (cheatCheck.suspicious) {
      alert('Suspicious activity detected. Please play normally.');
      return;
    }

    antiCheat.recordAction(address, 'color_click', { color, level });
    setActionsCount(prev => prev + 1);

    if (soundEnabled) playSound('click');

    const expectedColor = sequenceRef.current[playerSequence.length];
    const newPlayerSeq = [...playerSequence, color];
    setPlayerSequence(newPlayerSeq);

    if (color === expectedColor) {
      // Correct!
      if (soundEnabled) playSound('correct');
      antiCheat.recordAction(address, 'correct_color', { correct: true, level });

      if (newPlayerSeq.length === sequenceRef.current.length) {
        // Level complete!
        const difficultyMultiplier = getDifficultyMultiplier(difficulty);
        const levelScore = Math.floor((level * 1000 + (sequenceRef.current.length * 100)) * difficultyMultiplier);
        setScore(prev => prev + levelScore);
        setLevel(prev => prev + 1);
        setPlayerSequence([]);
        setCurrentIndex(0);

        // Show next sequence
        const newSeq = generateSequence(3 + difficulty + level);
        sequenceRef.current = newSeq;
        setSequence(newSeq);
        setGameState('showing');
        showSequence(newSeq);
      }
    } else {
      // Wrong!
      if (soundEnabled) playSound('wrong');
      antiCheat.recordAction(address, 'wrong_color', { correct: false });

      const newLives = lives - 1;
      setLives(newLives);

      if (newLives <= 0) {
        handleGameOver();
      } else {
        // Reset current level
        setPlayerSequence([]);
        setCurrentIndex(0);
        setGameState('showing');
        showSequence(sequenceRef.current);
      }
    }
  }

  async function handleGameOver() {
    setGameState('gameover');
    if (soundEnabled) playSound('gameover');

    try {
      const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
      
      const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount);
      if (scoreCheck.suspicious) {
        alert('Score validation failed.');
        return;
      }

      // Claim LUX reward
      const rewardRes = await fetch('/api/game/reward/lux', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, gameId: GAME_ID, score })
      });
      const rewardData = await rewardRes.json();
      
      if (rewardData.ok) {
        setLuxReward(rewardData.luxReward);
      }

      // Update cooldown status
      setIsOnCooldown(true);
      await checkCooldown();
    } catch (e) {
      console.error('Failed to process game over:', e);
    }
  }

  function resetGame() {
    setGameState('idle');
    setSequence([]);
    setPlayerSequence([]);
    setCurrentIndex(0);
    setLevel(1);
    setScore(0);
    setLives(3);
    setHighlightedColor(null);
    setLuxReward(null);
    if (showingTimeoutRef.current) clearTimeout(showingTimeoutRef.current);
    // Check cooldown status after reset
    checkCooldown();
  }

  function toggleSound() {
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
  }

  useEffect(() => {
    return () => {
      if (showingTimeoutRef.current) clearTimeout(showingTimeoutRef.current);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-purple-950 to-zinc-950 text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            🧠 Color Memory Challenge
          </h1>
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
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
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">🔢 Sequence</div>
            <div className="text-xl font-bold text-blue-400">{sequence.length}</div>
          </div>
        </div>

        {/* Cooldown Message */}
        {isOnCooldown && gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-center"
          >
            <p className="text-red-300 font-bold">
              ⏰ คุณต้องรอ {cooldownRemaining.hours} ชั่วโมง {cooldownRemaining.minutes} นาที
            </p>
          </motion.div>
        )}

        {gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="rounded-2xl p-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 text-center">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-3xl font-bold mb-4 text-white">จำลำดับสีให้ถูกต้อง!</h2>
              <p className="text-white/80 mb-6">
                ดูลำดับสีที่แสดง แล้วกดสีตามลำดับให้ถูกต้อง
              </p>
              <div className="space-y-2 text-sm text-white/70 mb-6">
                <p>✨ คุณมี 3 ชีวิต</p>
                <p>🔥 แต่ละเลเวลจะยาวขึ้นเรื่อยๆ</p>
                <p>💎 รางวัล: 0-5 LUX (ยากมากที่จะได้ 5!)</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                disabled={isOnCooldown}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 font-bold text-xl shadow-2xl shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶ เริ่มเล่น
              </motion.button>
            </div>
          </motion.div>
        )}

        {(gameState === 'showing' || gameState === 'playing') && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-white/70 text-lg">
                {gameState === 'showing' ? '👀 ดูลำดับสีให้ดี...' : '🎮 กดสีตามลำดับ!'}
              </p>
              <p className="text-white/50 text-sm mt-2">
                คุณกดไปแล้ว: {playerSequence.length} / {sequence.length}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {COLORS.map((color) => {
                const config = COLOR_CONFIG[color];
                const isHighlighted = highlightedColor === color;
                return (
                  <motion.button
                    key={color}
                    whileHover={{ scale: gameState === 'playing' ? 1.1 : 1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleColorClick(color)}
                    disabled={gameState === 'showing'}
                    className={`aspect-square rounded-xl border-4 flex items-center justify-center text-6xl transition-all ${
                      isHighlighted
                        ? `${config.light} border-white shadow-2xl scale-110`
                        : gameState === 'playing'
                        ? `${config.bg} border-white/30 hover:border-white cursor-pointer`
                        : `${config.bg} border-white/20 opacity-50 cursor-not-allowed`
                    }`}
                  >
                    {config.emoji}
                  </motion.button>
                );
              })}
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
              {luxReward !== null && (
                <div className={`font-bold text-2xl ${luxReward === 5 ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>
                  {luxReward === 5 ? '🎉 EXTREME RARE! ' : '💰 '}ได้รับ {luxReward} LUX!
                </div>
              )}
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
