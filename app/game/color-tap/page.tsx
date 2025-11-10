'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { signMessageWithMiniKit } from '@/lib/game/auth';
import { getDeviceFingerprint } from '@/lib/utils/deviceFingerprint';
import { GameStatsCard } from '@/components/game/GameStatsCard';
import { GameButton } from '@/components/game/GameButton';
import { TronCard, TronPanel, TronProgressBar } from '@/components/tron';
import { Volume2, VolumeX } from 'lucide-react';
import { useMiniKit } from '@/hooks/useMiniKit';
import { MiniKit } from '@worldcoin/minikit-js';
import { STAKING_CONTRACT_ADDRESS } from '@/lib/utils/constants';
import { ethers } from 'ethers';

type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
type GameState = 'idle' | 'showing' | 'playing' | 'gameover' | 'victory';

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const COLOR_CONFIG: Record<Color, { name: string; emoji: string; bg: string; light: string; border: string }> = {
  red: { name: 'Red', emoji: '🔴', bg: 'from-red-500 to-red-600', light: 'bg-red-400', border: 'border-red-400' },
  blue: { name: 'Blue', emoji: '🔵', bg: 'from-blue-500 to-blue-600', light: 'bg-blue-400', border: 'border-blue-400' },
  green: { name: 'Green', emoji: '🟢', bg: 'from-green-500 to-green-600', light: 'bg-green-400', border: 'border-green-400' },
  yellow: { name: 'Yellow', emoji: '🟡', bg: 'from-yellow-500 to-yellow-600', light: 'bg-yellow-400', border: 'border-yellow-400' },
  purple: { name: 'Purple', emoji: '🟣', bg: 'from-purple-500 to-purple-600', light: 'bg-purple-400', border: 'border-purple-400' },
  orange: { name: 'Orange', emoji: '🟠', bg: 'from-orange-500 to-orange-600', light: 'bg-orange-400', border: 'border-orange-400' },
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
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState({ hours: 0, minutes: 0 });
  const [luxReward, setLuxReward] = useState<number | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      loadEnergy(a);
      checkCooldown();
      const randomDiff = getRandomDifficulty(a, GAME_ID, 1, 3);
      setDifficulty(randomDiff);
    }
    setSoundEnabledState(isSoundEnabled());
  }, []);

  async function checkCooldown() {
    if (!address) {
      console.log('Skipping cooldown check - no address');
      return;
    }
    
    try {
      console.log('Checking cooldown:', { address, gameId: GAME_ID });
      const res = await fetch('/api/game/cooldown/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, gameId: GAME_ID })
      });
      
      if (!res.ok) {
        console.error('Cooldown check failed:', res.status, await res.text().catch(() => ''));
        return;
      }
      
      const data = await res.json();
      console.log('Cooldown check response:', data);
      
      if (data.ok) {
        setIsOnCooldown(data.isOnCooldown);
        setCooldownRemaining({ hours: data.remainingHours, minutes: data.remainingMinutes });
      }
    } catch (e) {
      console.error('Cooldown check error:', e);
      // Silent error handling - don't block UI
    }
  }

  async function loadEnergy(addr: string) {
    try {
      const r = await fetch(`/api/game/energy/get?address=${addr}`);
      const j = await r.json();
      if (j.ok) setEnergy(j.energy);
    } catch (e) {
      // Silent error handling
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
      alert('Please connect your wallet first');
      return;
    }
    if (energy <= 0) {
      alert('Insufficient energy!');
      return;
    }
    if (isOnCooldown) {
      alert(`You can only play one game every 24 hours. You need to wait ${cooldownRemaining.hours} hours ${cooldownRemaining.minutes} minutes before playing any game.`);
      return;
    }

    // Don't start cooldown here - it will be started after reward is given
    
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
        if (cheatCheck.blocked) {
          alert('Cheating detected. Access blocked.');
          setGameState('gameover');
          return;
        }
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

    // UI shows actual result - no shouldForceLoss here!
    if (isCorrect) {
      // Correct color - show correct in UI
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
      // Wrong color - show wrong in UI
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
      const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount, GAME_ID);
      if (scoreCheck.suspicious || scoreCheck.blocked) {
        alert('Score validation failed. Please try again.');
        setLuxReward(0);
        setIsOnCooldown(true);
        await checkCooldown();
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
        alert('Failed to sign score. Please try again.');
        return;
      }
      
      const payload = { ...base };
      
      // Submit score first
      console.log('Submitting score:', { address, score, gameId: GAME_ID, gameDuration, actionsCount });
      const scoreRes = await fetch('/api/game/score/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, payload, sig: signature, deviceId })
      });
      
      const scoreData = await scoreRes.json();
      console.log('Score submit response:', scoreData);
      
      if (!scoreRes.ok || !scoreData.ok) {
        console.error('Score submit failed:', scoreData);
        alert(scoreData.error || scoreData.message || 'Failed to submit score. Please try again.');
        return;
      }
      
      // Calculate reward (color-tap gives 0-5 LUX based on score)
      console.log('Requesting reward:', { address, gameId: GAME_ID, score, deviceId });
      const rewardRes = await fetch('/api/game/reward/lux', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, gameId: GAME_ID, score, deviceId })
      });
      const rewardData = await rewardRes.json();
      
      console.log('Reward API response:', rewardData);
      
      if (rewardData.ok) {
        // Validate reward amount from API
        const rewardAmount = rewardData.luxReward;
        if (!rewardAmount || rewardAmount === 0 || !Number.isFinite(rewardAmount)) {
          console.error('Invalid reward amount from API:', rewardAmount);
          alert(`Invalid reward amount received: ${rewardAmount}. Please try again.`);
          setLuxReward(0);
          return;
        }
        
        // Give full reward as calculated
        console.log('Setting luxReward to:', rewardAmount);
        setLuxReward(rewardAmount);
        setRewardClaimed(false); // User needs to claim manually
      } else {
        // If cooldown or error, show message
        console.error('Reward API error:', rewardData.error);
        if (rewardData.error === 'COOLDOWN_ACTIVE') {
          alert('You are still on cooldown. Please wait 24 hours.');
          setLuxReward(0);
        } else {
          alert(rewardData.error || 'Failed to calculate reward. Please try again.');
          setLuxReward(0);
        }
      }
      
      loadEnergy(address);
      
      // Update cooldown status
      setIsOnCooldown(true);
      await checkCooldown();
    } catch (e) {
      // Silent error handling
    }
  }

  const { sendTransaction } = useMiniKit();

  async function handleClaimReward() {
    console.log('handleClaimReward called with:', { address, luxReward, rewardClaimed, isClaimingReward });
    
    if (!address || !luxReward || luxReward === 0 || rewardClaimed || isClaimingReward) {
      console.error('Cannot claim reward:', { address, luxReward, rewardClaimed, isClaimingReward });
      return;
    }
    
    if (!MiniKit.isInstalled()) {
      alert('World App is required to claim rewards. Please open this app in World App.');
      return;
    }
    
    // Validate luxReward before sending - use the actual value from state
    const rewardAmount = typeof luxReward === 'number' ? luxReward : Number(luxReward);
    
    console.log('Validating reward amount:', { luxReward, rewardAmount, type: typeof luxReward });
    
    if (!rewardAmount || rewardAmount <= 0 || !Number.isFinite(rewardAmount)) {
      console.error('Invalid luxReward value:', { luxReward, rewardAmount, type: typeof luxReward });
      alert(`Invalid reward amount: ${luxReward}. Please refresh and try again.`);
      return;
    }
    
    console.log('Sending claim request with amount:', rewardAmount);
    
    setIsClaimingReward(true);
    try {
      // Step 1: Initialize transaction and get reference
      const initRes = await fetch('/api/game/reward/init', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          address, 
          gameId: GAME_ID, 
          amount: rewardAmount 
        })
      });
      
      console.log('Init API response status:', initRes.status);
      
      const initData = await initRes.json();
      
      console.log('Init API response:', initData);
      
      if (!initData.ok || !initData.reference) {
        console.error('Init API failed:', initData);
        alert(initData.error || 'Failed to initialize reward transaction. Please try again.');
        setIsClaimingReward(false);
        return;
      }

      const reference = initData.reference;
      
      // Step 2: Show transaction popup using MiniKit pay
      let payload: any = null;
      try {
        // Use sendTransaction to show "Authorize Transaction" instead of "Pay"
        const transactionData = '0x'; // Empty data - just for authorization
        payload = await sendTransaction(
          STAKING_CONTRACT_ADDRESS as `0x${string}`,
          transactionData,
          '0' // 0 value - user is receiving reward, not paying
        );
      } catch (e: any) {
        if (e?.type === 'user_cancelled') {
          setIsClaimingReward(false);
          return;
        }
        throw e;
      }

      // Step 3: Confirm transaction
      if (!payload?.transaction_id) {
        alert('Transaction was cancelled. Please try again.');
        setIsClaimingReward(false);
        return;
      }

      const confirmRes = await fetch('/api/game/reward/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 
          payload: {
            reference,
            transaction_id: payload.transaction_id
          }
        })
      });
      
      const confirmData = await confirmRes.json();
      
      if (confirmData.ok) {
        setRewardClaimed(true);
        alert(`Successfully claimed ${luxReward} LUX!`);
      } else {
        alert(confirmData.error || 'Failed to claim reward. Please try again.');
      }
    } catch (error: any) {
      console.error('Claim reward error:', error);
      alert(error?.message || 'Failed to claim reward. Please try again.');
    } finally {
      setIsClaimingReward(false);
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
    // Check cooldown status after reset
    checkCooldown();
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
    <div className="min-h-screen text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold font-orbitron bg-gradient-to-r from-tron-red via-tron-red-bright to-tron-red bg-clip-text text-transparent neon-text">
            🎨 Color Tap
          </h1>
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg border border-tron-red/30 bg-tron-red/10 text-tron-red hover:bg-tron-red/20 transition-colors"
            aria-label="Toggle sound"
            style={{ boxShadow: '0 0 10px rgba(255, 26, 42, 0.4)' }}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <GameStatsCard label="Energy" value={energy} icon="⚡" color="yellow" />
          <GameStatsCard label="Level" value={level} icon="📊" color="purple" />
          <GameStatsCard label="Lives" value={`${lives}/3`} icon="❤️" color="red" />
          <GameStatsCard label="Score" value={score.toLocaleString()} icon="🎯" color="red" />
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
          <TronCard glowColor="purple" className="text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-3xl font-bold mb-4 font-orbitron text-white">Remember the color sequence!</h2>
            <p className="text-gray-300 mb-6 font-orbitron">
              Watch the color sequence shown, then tap the colors in the correct order
            </p>
            <div className="space-y-2 text-sm text-gray-400 mb-6 font-orbitron">
              <p>✨ You have 3 lives</p>
              <p>🔥 Each level gets longer</p>
              <p>💎 Score increases with level!</p>
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

        {(gameState === 'showing' || gameState === 'playing') && (
          <div className="space-y-6">
            {/* Status Message */}
            <TronPanel padding="md" className="text-center">
              <p className="text-gray-300 text-lg font-bold font-orbitron">
                {gameState === 'showing' ? '👀 Watch the sequence carefully...' : '🎮 Tap the colors in order!'}
              </p>
              {gameState === 'playing' && (
                <p className="text-gray-400 text-sm mt-2 font-orbitron">
                  Progress: {currentProgress} / {totalSequence}
                </p>
              )}
            </TronPanel>

            {/* Progress Bar */}
            {gameState === 'playing' && (
              <TronProgressBar
                value={currentProgress}
                max={totalSequence}
                label="Progress"
                showValue={true}
              />
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
                <TronPanel
                  status={showFeedback === 'correct' ? 'success' : 'danger'}
                  padding="md"
                  className="text-center"
                >
                  <p className="font-bold text-xl font-orbitron">
                    {showFeedback === 'correct' ? (
                      <span className="text-tron-purple">✅ Correct!</span>
                    ) : (
                      <span className="text-tron-orange">❌ Wrong! -1 life</span>
                    )}
                  </p>
                </TronPanel>
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
          <TronCard glowColor="purple" className="text-center space-y-6">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold font-orbitron text-white mb-4">Game Over!</h2>
            <div className="space-y-3 text-lg font-orbitron">
              <p className="text-gray-300">🎯 Final Score: <b className="text-tron-orange">{score.toLocaleString()}</b></p>
              <p className="text-gray-300">📊 Highest level: <b className="text-tron-purple">{level}</b></p>
              {luxReward !== null && (
                <div className="space-y-3">
                  <div className={`font-bold text-2xl ${luxReward === 5 ? 'text-yellow-400 animate-pulse' : 'text-tron-purple'}`}>
                    {luxReward === 5 ? '🎉 EXTREME RARE! ' : '💰 '}Earned {luxReward} LUX!
                  </div>
                  {!rewardClaimed && (
                    <GameButton
                      onClick={handleClaimReward}
                      variant="primary"
                      size="lg"
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-600"
                      disabled={isClaimingReward}
                    >
                      {isClaimingReward ? (
                        <>⏳ Claiming...</>
                      ) : (
                        <>🎁 Claim {luxReward} LUX Reward</>
                      )}
                    </GameButton>
                  )}
                  {rewardClaimed && (
                    <div className="text-green-400 font-bold text-lg">
                      ✅ Reward Claimed Successfully!
                    </div>
                  )}
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
