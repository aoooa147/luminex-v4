'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { signMessageWithMiniKit } from '@/lib/game/auth';

type GameState = 'idle' | 'waiting' | 'playing' | 'gameover';
type ButtonPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

const BUTTON_POSITIONS: ButtonPosition[] = ['top', 'bottom', 'left', 'right', 'center'];
const BUTTON_CONFIG: Record<ButtonPosition, { label: string; emoji: string; gradient: string }> = {
  top: { label: '↑', emoji: '⬆️', gradient: 'from-red-500 to-pink-500' },
  bottom: { label: '↓', emoji: '⬇️', gradient: 'from-blue-500 to-cyan-500' },
  left: { label: '←', emoji: '⬅️', gradient: 'from-green-500 to-emerald-500' },
  right: { label: '→', emoji: '➡️', gradient: 'from-yellow-500 to-orange-500' },
  center: { label: '⚡', emoji: '⚡', gradient: 'from-purple-500 to-pink-500' },
};

const GAME_ID = 'number-rush';

export default function NumberRushPage() {
  const [address, setAddress] = useState('');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentPosition, setCurrentPosition] = useState<ButtonPosition | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [reactionTime, setReactionTime] = useState<number[]>([]);
  const [lives, setLives] = useState(3);
  const [difficulty, setDifficulty] = useState(1);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [actionsCount, setActionsCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState({ hours: 0, minutes: 0 });
  const [buttonAppearTime, setButtonAppearTime] = useState(0);
  const [luxReward, setLuxReward] = useState<number | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  function startGame() {
    if (!address) {
      alert('Please connect your wallet first');
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

    const randomDiff = getRandomDifficulty(address, GAME_ID, 1, 3);
    setDifficulty(randomDiff);
    setGameState('waiting');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setReactionTime([]);
    setLives(3);
    setActionsCount(0);
    setGameStartTime(Date.now());
    setLuxReward(null);
    antiCheat.clearHistory(address);

    // Start first round
    scheduleNextButton();
  }

  function scheduleNextButton() {
    if (gameState === 'gameover') return;

    // Random wait time (difficulty affects speed)
    const waitTime = Math.random() * (2000 - difficulty * 300) + 500; // 500-1700ms based on difficulty
    
    waitTimeoutRef.current = setTimeout(() => {
      if (gameState === 'waiting' || gameState === 'playing') {
        showButton();
      }
    }, waitTime);
  }

  function showButton() {
    const position = BUTTON_POSITIONS[Math.floor(Math.random() * BUTTON_POSITIONS.length)];
    setCurrentPosition(position);
    setButtonAppearTime(Date.now());
    setGameState('playing');

    // Button disappears if not clicked in time
    const timeLimit = 1500 - (difficulty * 200); // 900-1300ms based on difficulty
    timeoutRef.current = setTimeout(() => {
      if (gameState === 'playing' && currentPosition === position) {
        handleMiss();
      }
    }, timeLimit);

    if (soundEnabled) playSound('timer');
  }

  function handleButtonClick(position: ButtonPosition) {
    if (gameState !== 'playing' || currentPosition !== position) return;

    const cheatCheck = antiCheat.checkAction(address, 'button_click', { position, combo });
    if (cheatCheck.suspicious) {
      alert('Suspicious activity detected. Please play normally.');
      return;
    }

    antiCheat.recordAction(address, 'button_click', { position, combo });
    setActionsCount(prev => prev + 1);

    const reaction = Date.now() - buttonAppearTime;
    const newReactionTimes = [...reactionTime, reaction];
    setReactionTime(newReactionTimes);

    // Calculate score based on reaction time and combo
    const baseScore = Math.max(100, 1000 - reaction);
    const comboBonus = combo * 50;
    const difficultyMultiplier = getDifficultyMultiplier(difficulty);
    const points = Math.floor((baseScore + comboBonus) * difficultyMultiplier);
    
    setScore(prev => prev + points);
    setCombo(prev => {
      const newCombo = prev + 1;
      if (newCombo > maxCombo) setMaxCombo(newCombo);
      return newCombo;
    });

    if (soundEnabled) {
      if (reaction < 300) {
        playSound('bonus'); // Very fast!
      } else {
        playSound('correct');
      }
    }

    // Clear timeout and prepare next button
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentPosition(null);
    setGameState('waiting');
    scheduleNextButton();
  }

  function handleMiss() {
    if (soundEnabled) playSound('wrong');

    antiCheat.recordAction(address, 'miss', { correct: false });

    const newCombo = 0;
    setCombo(newCombo);
    
    const newLives = lives - 1;
    setLives(newLives);

    if (newLives <= 0) {
      handleGameOver();
    } else {
      // Continue but reset combo
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setCurrentPosition(null);
      setGameState('waiting');
      scheduleNextButton();
    }
  }

  async function handleGameOver() {
    setGameState('gameover');
    if (soundEnabled) playSound('gameover');

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
    setCurrentPosition(null);

    try {
      const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
      
      // Apply 80% loss rate: 80% chance of losing even if game completed
      const shouldLose = antiCheat.shouldForceLoss(address, true);
      if (shouldLose) {
        alert('Better luck next time!');
        return;
      }

      const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount, GAME_ID);
      if (scoreCheck.suspicious || scoreCheck.blocked) {
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
    setCurrentPosition(null);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setReactionTime([]);
    setLives(3);
    setLuxReward(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
    };
  }, []);

  const avgReactionTime = reactionTime.length > 0
    ? Math.round(reactionTime.reduce((a, b) => a + b, 0) / reactionTime.length)
    : 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950 to-zinc-950 text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
            ⚡ Speed Reaction
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
            <div className="text-xs text-white/60 mb-1">🎯 Score</div>
            <div className="text-xl font-bold text-blue-400">{score.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">🔥 Combo</div>
            <div className="text-xl font-bold text-orange-400">{combo}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">❤️ Lives</div>
            <div className="text-xl font-bold text-red-400">{lives}/3</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">⚡ Avg RT</div>
            <div className="text-xl font-bold text-green-400">{avgReactionTime}ms</div>
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
              ⏰ You must wait {cooldownRemaining.hours} hours {cooldownRemaining.minutes} minutes
            </p>
          </motion.div>
        )}

        {gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="rounded-2xl p-8 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/30 text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h2 className="text-3xl font-bold mb-4 text-white">Test your speed!</h2>
              <p className="text-white/80 mb-6">
                Tap the button that appears as fast as possible!
              </p>
              <div className="space-y-2 text-sm text-white/70 mb-6">
                <p>✨ You have 3 lives</p>
                <p>🔥 Build combos for higher scores</p>
                <p>⚡ Buttons disappear very quickly!</p>
                <p>💎 Reward: 0-5 LUX (very rare to get 5!)</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                disabled={isOnCooldown}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 font-bold text-xl shadow-2xl shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶ Start Playing
              </motion.button>
            </div>
          </motion.div>
        )}

        {(gameState === 'waiting' || gameState === 'playing') && (
          <div className="relative h-96 bg-zinc-900/40 rounded-2xl border-2 border-zinc-800 overflow-hidden">
            {/* Button Grid */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-4 p-4">
              {/* Top */}
              <div className="col-start-2" />
              {currentPosition === 'top' && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleButtonClick('top')}
                  className={`col-start-2 row-start-1 bg-gradient-to-r ${BUTTON_CONFIG.top.gradient} rounded-xl border-4 border-white shadow-2xl text-6xl font-bold`}
                >
                  {BUTTON_CONFIG.top.emoji}
                </motion.button>
              )}

              {/* Left */}
              {currentPosition === 'left' && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleButtonClick('left')}
                  className={`col-start-1 row-start-2 bg-gradient-to-r ${BUTTON_CONFIG.left.gradient} rounded-xl border-4 border-white shadow-2xl text-6xl font-bold`}
                >
                  {BUTTON_CONFIG.left.emoji}
                </motion.button>
              )}

              {/* Center */}
              {currentPosition === 'center' && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleButtonClick('center')}
                  className={`col-start-2 row-start-2 bg-gradient-to-r ${BUTTON_CONFIG.center.gradient} rounded-xl border-4 border-white shadow-2xl text-6xl font-bold`}
                >
                  {BUTTON_CONFIG.center.emoji}
                </motion.button>
              )}

              {/* Right */}
              {currentPosition === 'right' && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleButtonClick('right')}
                  className={`col-start-3 row-start-2 bg-gradient-to-r ${BUTTON_CONFIG.right.gradient} rounded-xl border-4 border-white shadow-2xl text-6xl font-bold`}
                >
                  {BUTTON_CONFIG.right.emoji}
                </motion.button>
              )}

              {/* Bottom */}
              {currentPosition === 'bottom' && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleButtonClick('bottom')}
                  className={`col-start-2 row-start-3 bg-gradient-to-r ${BUTTON_CONFIG.bottom.gradient} rounded-xl border-4 border-white shadow-2xl text-6xl font-bold`}
                >
                  {BUTTON_CONFIG.bottom.emoji}
                </motion.button>
              )}
            </div>

            {/* Status Message */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white/70 text-lg">
                {gameState === 'waiting' ? '👀 Waiting for button...' : '⚡ Tap as fast as possible!'}
              </p>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-2 border-blue-500/50 text-center space-y-6"
          >
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
            <div className="space-y-3 text-lg">
              <p className="text-white/90">🎯 Final score: <b className="text-yellow-300">{score.toLocaleString()}</b></p>
              <p className="text-white/90">🔥 Highest combo: <b className="text-orange-300">{maxCombo}</b></p>
              <p className="text-white/90">⚡ Average reaction time: <b className="text-blue-300">{avgReactionTime}ms</b></p>
              {luxReward !== null && (
                <div className={`font-bold text-2xl ${luxReward === 5 ? 'text-yellow-400 animate-pulse' : 'text-green-400'}`}>
                  {luxReward === 5 ? '🎉 EXTREME RARE! ' : '💰 '}Earned {luxReward} LUX!
                </div>
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 font-bold text-xl"
            >
              Back to Home
            </motion.button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
