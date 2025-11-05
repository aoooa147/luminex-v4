'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { signMessageWithMiniKit } from '@/lib/game/auth';

type CoinSide = 'heads' | 'tails';
type GameState = 'idle' | 'playing' | 'flipping' | 'result' | 'gameover' | 'victory';

const MAX_LIVES = 3;
const TARGET_STREAK = 10; // Need 10 correct in a row to win
const FLIP_ANIMATION_DURATION = 1500;
const RESULT_SHOW_DURATION = 1500;
const DIFFICULTY_INCREASE_AT = [3, 6, 9]; // Increase difficulty at these streaks
const GAME_ID = 'coin-flip';

export default function CoinFlipPage() {
  const [address, setAddress] = useState('');
  const [energy, setEnergy] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [lives, setLives] = useState(MAX_LIVES);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [currentCoin, setCurrentCoin] = useState<CoinSide>('heads');
  const [flipResult, setFlipResult] = useState<CoinSide | null>(null);
  const [playerGuess, setPlayerGuess] = useState<CoinSide | null>(null);
  const [flipRotation, setFlipRotation] = useState(0);
  const [difficulty, setDifficulty] = useState(1); // 1 = normal, 2 = fast, 3 = very fast
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [actionsCount, setActionsCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState({ hours: 0, minutes: 0 });
  
  const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreMultiplier = Math.floor(streak / 3) + 1;

  useEffect(() => {
    const a = sessionStorage.getItem('verifiedAddress') || localStorage.getItem('user_address') || '';
    setAddress(a);
    if (a) {
      loadEnergy(a);
      checkCooldown();
      // Initialize random difficulty for this user
      const randomDiff = getRandomDifficulty(a, GAME_ID, 1, 3);
      setDifficulty(randomDiff);
    }
    
    // Check sound preference
    setSoundEnabledState(isSoundEnabled());
  }, []);

  async function checkCooldown() {
    if (!address) return;
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

  function startGame() {
    if (!address) {
      alert('Please connect your wallet before starting the game');
      return;
    }
    if (energy <= 0) {
      alert('Insufficient energy! Please wait or recharge your energy');
      return;
    }
    if (isOnCooldown) {
      alert(`You can only play one game every 24 hours. You need to wait ${cooldownRemaining.hours} hours ${cooldownRemaining.minutes} minutes before playing any game.`);
      return;
    }

    // Start cooldown
    fetch('/api/game/cooldown/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address, gameId: GAME_ID })
    });

    // Initialize random difficulty for this user
    const randomDiff = getRandomDifficulty(address, GAME_ID, 1, 3);
    setGameState('playing');
    setLives(MAX_LIVES);
    setStreak(0);
    setScore(0);
    setConsecutiveCorrect(0);
    setDifficulty(randomDiff);
    setActionsCount(0);
    setGameStartTime(Date.now());
    antiCheat.clearHistory(address); // Clear previous game history
    generateNewCoin();
  }

  function generateNewCoin(): CoinSide {
    const side = Math.random() < 0.5 ? 'heads' : 'tails';
    setCurrentCoin(side);
    return side;
  }

  function guessCoin(side: CoinSide) {
    if (gameState !== 'playing') return;
    
    // Anti-cheat: Check action speed
    const cheatCheck = antiCheat.checkAction(address, 'guess_coin', { side });
    if (cheatCheck.suspicious) {
      console.warn('Suspicious activity detected:', cheatCheck.reason);
      if (cheatCheck.blocked) {
        alert('Cheating detected. Access blocked.');
        setGameState('gameover');
        return;
      }
      alert('Suspicious activity detected. Please play normally.');
      return;
    }
    
    // Record action
    antiCheat.recordAction(address, 'guess_coin', { side, timestamp: Date.now() });
    
    setPlayerGuess(side);
    setGameState('flipping');
    setFlipRotation(0);
    setActionsCount(prev => prev + 1);
    
    // Play flip sound
    if (soundEnabled) {
      playSound('flip');
    }
    
    // Start flip animation
    let rotation = 0;
    const interval = setInterval(() => {
      rotation += 15;
      setFlipRotation(rotation);
      if (rotation >= 1440) { // 4 full rotations
        clearInterval(interval);
      }
    }, 10);

    // Generate result after animation
    if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
    flipTimeoutRef.current = setTimeout(() => {
      clearInterval(interval);
      const result = generateNewCoin();
      setFlipResult(result);
      checkResult(side, result);
    }, FLIP_ANIMATION_DURATION);
  }

    function checkResult(guess: CoinSide, result: CoinSide) {
    setGameState('result');

    const actualWin = guess === result;
    
    // Apply 80% loss rate: 80% chance of losing regardless of actual result
    const shouldLose = antiCheat.shouldForceLoss(address, actualWin);
    
    if (actualWin && !shouldLose) {
      // Correct AND passed 80% loss check (20% chance)
      if (soundEnabled) {
        playSound('correct');
      }

      // Record correct action
      antiCheat.recordAction(address, 'correct_guess', { correct: true, isPerfect: true });

      const newStreak = streak + 1;
      const newConsecutive = consecutiveCorrect + 1;
      setStreak(newStreak);
      setConsecutiveCorrect(newConsecutive);

      // Calculate score with multiplier and difficulty
      const difficultyMultiplier = getDifficultyMultiplier(difficulty);
      const baseScore = 100;
      const streakBonus = Math.floor(newStreak / 2) * 50;
      const multiplierBonus = baseScore * (scoreMultiplier - 1);
      const points = Math.floor((baseScore + streakBonus + multiplierBonus) * difficultyMultiplier);
      setScore(prev => prev + points);

      // Increase difficulty at certain streaks
      if (DIFFICULTY_INCREASE_AT.includes(newStreak)) {
        setDifficulty(prev => Math.min(prev + 1, 3));
      }

      // Check for victory
      if (newStreak >= TARGET_STREAK) {
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = setTimeout(() => {
            handleVictory();
        }, RESULT_SHOW_DURATION);
        return;
      }

      // Continue to next round
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      resultTimeoutRef.current = setTimeout(() => {
        setGameState('playing');
        setFlipResult(null);
        setPlayerGuess(null);
      }, RESULT_SHOW_DURATION);
    } else {
      // Wrong!
      if (soundEnabled) {
        playSound('wrong');
      }
      
      // Record incorrect action
      antiCheat.recordAction(address, 'wrong_guess', { correct: false });
      
      const newLives = lives - 1;
      setLives(newLives);
      setConsecutiveCorrect(0);
      
      if (newLives <= 0) {
        // Game over
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
                  resultTimeoutRef.current = setTimeout(() => {
            handleGameOver();
        }, RESULT_SHOW_DURATION);
      } else {
        // Continue with less lives
        if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = setTimeout(() => {
          setGameState('playing');
          setFlipResult(null);
          setPlayerGuess(null);
          setStreak(0); // Reset streak on wrong guess
        }, RESULT_SHOW_DURATION);
      }
    }
  }

  async function handleVictory() {
    setGameState('victory');
    if (soundEnabled) {
      playSound('victory');
    }
    
    try {
      const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
      
      // Apply 80% loss rate before victory: 80% chance of losing even if victory reached
      const shouldLose = antiCheat.shouldForceLoss(address, true);
      if (shouldLose) {
        // Force loss even though victory was reached
        setGameState('gameover');
        if (soundEnabled) {
          playSound('wrong');
        }
        return;
      }

      // Anti-cheat: Validate score
      const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount, GAME_ID);
      if (scoreCheck.suspicious || scoreCheck.blocked) {
        console.warn('Suspicious score detected:', scoreCheck.reason);
        alert('Score validation failed. Please try again.');
        setGameState('gameover');
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
      localStorage.setItem(key, String(cur + 10)); // 10 tokens reward
      
              loadEnergy(address);
        
        // Update cooldown status
        setIsOnCooldown(true);
        await checkCooldown();
      } catch (e) {
        console.error('Failed to submit score:', e);
      }
    }

  function handleGameOver() {
    setGameState('gameover');
    if (soundEnabled) {
      playSound('gameover');
    }
  }

  function resetGame() {
    setGameState('idle');
    setFlipResult(null);
    setPlayerGuess(null);
    setFlipRotation(0);
    if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
    if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    // Check cooldown status after reset
    checkCooldown();
  }

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);

  const isCorrect = flipResult !== null && playerGuess === flipResult;
  const showResult = gameState === 'result' || gameState === 'flipping';

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-purple-950 to-zinc-950 text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
            🪙 Coin Flip Challenge
          </h1>
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            aria-label="Toggle sound"
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">⚡ Energy</div>
            <div className="text-xl font-bold text-yellow-400">{energy}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">🔥 Streak</div>
            <div className="text-xl font-bold text-orange-400">{streak}/{TARGET_STREAK}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">❤️ Lives</div>
            <div className="text-xl font-bold text-red-400">{lives}/{MAX_LIVES}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">🎯 Score</div>
            <div className="text-xl font-bold text-purple-400">{score.toLocaleString()}</div>
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
                ⏰ You need to wait {cooldownRemaining.hours} hours {cooldownRemaining.minutes} minutes
              </p>
            </motion.div>
          )}

        {gameState === 'idle' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="rounded-2xl p-8 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/30 text-center">
              <div className="text-6xl mb-4">🪙</div>
                            <h2 className="text-3xl font-bold mb-4 text-white">Ready to challenge!</h2>
              <p className="text-white/80 mb-6">
                Guess the coin correctly <b className="text-yellow-300">{TARGET_STREAK} times in a row</b> to win!        
              </p>
              <div className="space-y-2 text-sm text-white/70 mb-6">
                <p>✨ You have {MAX_LIVES} lives</p>
                <p>🔥 Build a streak to increase your score</p>
                <p>⚡ Score increases with multiplier!</p>
              </div>
                              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startGame}
                  disabled={isOnCooldown}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 font-bold text-xl shadow-2xl shadow-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ▶ Start Playing
                </motion.button>
            </div>
          </motion.div>
        )}

        {(gameState === 'playing' || gameState === 'flipping' || gameState === 'result') && (
          <div className="space-y-6">
            {/* Coin Display */}
            <div className="relative h-64 flex items-center justify-center">
              <motion.div
                animate={{
                  rotateY: showResult ? flipRotation : 0,
                  scale: showResult ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: showResult ? FLIP_ANIMATION_DURATION / 1000 : 0.3,
                  ease: 'easeInOut',
                }}
                className="relative w-48 h-48"
                style={{
                  transformStyle: 'preserve-3d',
                  perspective: '1000px',
                }}
              >
                {/* Coin */}
                <div
                  className="absolute inset-0 rounded-full border-4 border-yellow-400 shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${
                      (showResult && flipResult) ? (flipResult === 'heads' ? '#FFD700, #FFA500' : '#C0C0C0, #808080') : '#FFD700, #FFA500'
                    })`,
                    transform: `rotateY(${flipRotation}deg)`,
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl">
                      {showResult && flipResult
                        ? flipResult === 'heads' ? '👑' : '⚜️'
                        : '🪙'}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Result Message */}
            <AnimatePresence>
              {gameState === 'result' && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`text-center py-4 rounded-xl font-bold text-2xl ${
                    isCorrect
                      ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                      : 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                  }`}
                >
                  {isCorrect ? (
                    <span>✅ Correct! +{100 * scoreMultiplier} points</span>
                  ) : (
                    <span>❌ Wrong! -1 life</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Guess Buttons */}
            {gameState === 'playing' && (
              <div className="grid grid-cols-2 gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => guessCoin('heads')}
                  className="py-8 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 font-bold text-2xl shadow-2xl shadow-yellow-500/50 border-2 border-yellow-300/50"
                >
                  👑 Heads
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => guessCoin('tails')}
                  className="py-8 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 hover:from-gray-300 hover:to-gray-500 font-bold text-2xl shadow-2xl shadow-gray-400/50 border-2 border-gray-300/50"
                >
                  ⚜️ Tails
                </motion.button>
              </div>
            )}

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/70">
                <span>Progress</span>
                <span>{streak}/{TARGET_STREAK}</span>
              </div>
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(streak / TARGET_STREAK) * 100}%` }}
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                />
              </div>
            </div>

            {/* Lives Display */}
            <div className="flex justify-center gap-2">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <div
                  key={i}
                  className={`text-3xl transition-all ${
                    i < lives ? 'opacity-100 scale-100' : 'opacity-30 scale-75 grayscale'
                  }`}
                >
                  ❤️
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState === 'victory' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500/50 text-center space-y-6"
          >
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-white mb-4">You Win!</h2>
            <div className="space-y-3 text-lg">
              <p className="text-white/90">🎯 Final Score: <b className="text-yellow-300">{score.toLocaleString()}</b></p>
              <p className="text-white/90">🔥 Highest Streak: <b className="text-orange-300">{streak}</b></p>
              <p className="text-green-400 font-bold">💰 Earned 10 Tokens!</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 font-bold text-xl"
            >
              Play Again
            </motion.button>
          </motion.div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-red-500/20 to-pink-500/20 border-2 border-red-500/30 text-center space-y-6"
          >
            <div className="text-7xl mb-4">😢</div>
            <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
            <div className="space-y-3 text-lg">
              <p className="text-white/90">🎯 Final Score: <b className="text-yellow-300">{score.toLocaleString()}</b></p>
              <p className="text-white/90">🔥 Highest Streak: <b className="text-orange-300">{streak}</b></p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 font-bold text-xl"
            >
              Try Again
            </motion.button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
