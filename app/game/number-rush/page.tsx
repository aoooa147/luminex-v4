'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { signMessageWithMiniKit } from '@/lib/game/auth';
import { getDeviceFingerprint } from '@/lib/utils/deviceFingerprint';
import { GameStatsCard } from '@/components/game/GameStatsCard';
import { GameButton } from '@/components/game/GameButton';
import { TronCard, TronPanel } from '@/components/tron';
import { Volume2, VolumeX } from 'lucide-react';

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
  const [deviceId, setDeviceId] = useState<string>('');
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const waitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const a = sessionStorage.getItem('verifiedAddress') || '';
    setAddress(a);
    
    // Get device fingerprint
    try {
      const fingerprint = getDeviceFingerprint();
      setDeviceId(fingerprint);
    } catch (error) {
      console.warn('Failed to get device fingerprint:', error);
    }
    
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
      // Silent error handling
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
        body: JSON.stringify({ address, gameId: GAME_ID, score, deviceId })
      });
      const rewardData = await rewardRes.json();
      
      if (rewardData.ok) {
        setLuxReward(rewardData.luxReward);
      }

      // Update cooldown status
      setIsOnCooldown(true);
      await checkCooldown();
    } catch (e) {
      // Silent error handling
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
    <div className="min-h-screen text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold font-orbitron bg-gradient-to-r from-tron-red via-tron-red-bright to-tron-red bg-clip-text text-transparent neon-text">
            ⚡ Speed Reaction
          </h1>
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg border border-tron-red/30 bg-tron-red/10 text-tron-red hover:bg-tron-red/20 transition-colors"
            style={{ boxShadow: '0 0 10px rgba(255, 26, 42, 0.4)' }}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <GameStatsCard label="Score" value={score.toLocaleString()} icon="🎯" color="blue" />
          <GameStatsCard label="Combo" value={combo} icon="🔥" color="orange" />
          <GameStatsCard label="Lives" value={`${lives}/3`} icon="❤️" color="red" />
          <GameStatsCard label="Avg RT" value={`${avgReactionTime}ms`} icon="⚡" color="red" />
        </div>

        {/* Cooldown Message */}
        {isOnCooldown && gameState === 'idle' && (
          <TronPanel status="danger" padding="md" className="text-center">
            <p className="text-tron-orange font-bold font-orbitron">
              ⏰ You must wait {cooldownRemaining.hours} hours {cooldownRemaining.minutes} minutes
            </p>
          </TronPanel>
        )}

        {gameState === 'idle' && (
          <TronCard glowColor="primary" className="text-center">
            <div className="text-6xl mb-4">⚡</div>
            <h2 className="text-3xl font-bold mb-4 font-orbitron text-white">Test your speed!</h2>
            <p className="text-gray-300 mb-6 font-orbitron">
              Tap the button that appears as fast as possible!
            </p>
            <div className="space-y-2 text-sm text-gray-400 mb-6 font-orbitron">
              <p>✨ You have 3 lives</p>
              <p>🔥 Build combos for higher scores</p>
              <p>⚡ Buttons disappear very quickly!</p>
              <p>💎 Reward: 0-5 LUX (very rare to get 5!)</p>
            </div>
            <GameButton
              onClick={startGame}
              disabled={isOnCooldown}
              variant="primary"
              size="lg"
              className="w-full"
            >
              ▶ Start Playing
            </GameButton>
          </TronCard>
        )}

        {(gameState === 'waiting' || gameState === 'playing') && (
          <TronCard glowColor="cyan" className="relative h-96 overflow-hidden p-0">
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
            <TronPanel padding="sm" className="absolute bottom-4 left-4 right-4 text-center">
              <p className="text-gray-300 text-lg font-bold font-orbitron">
                {gameState === 'waiting' ? '👀 Waiting for button...' : '⚡ Tap as fast as possible!'}
              </p>
            </TronPanel>
          </TronCard>
        )}

        {gameState === 'gameover' && (
          <TronCard glowColor="cyan" className="text-center space-y-6">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold font-orbitron text-white mb-4">Game Over!</h2>
            <div className="space-y-3 text-lg font-orbitron">
              <p className="text-gray-300">🎯 Final score: <b className="text-tron-orange">{score.toLocaleString()}</b></p>
              <p className="text-gray-300">🔥 Highest combo: <b className="text-tron-orange">{maxCombo}</b></p>
              <p className="text-gray-300">⚡ Average reaction time: <b className="text-tron-blue">{avgReactionTime}ms</b></p>
              {luxReward !== null && (
                <div className={`font-bold text-2xl ${luxReward === 5 ? 'text-yellow-400 animate-pulse' : 'text-tron-purple'}`}>
                  {luxReward === 5 ? '🎉 EXTREME RARE! ' : '💰 '}Earned {luxReward} LUX!
                </div>
              )}
            </div>
            <GameButton
              onClick={resetGame}
              variant="primary"
              size="lg"
              className="w-full"
            >
              Back to Home
            </GameButton>
          </TronCard>
        )}
      </div>
    </div>
  );
}
