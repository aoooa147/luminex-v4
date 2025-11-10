'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
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
import { STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_NETWORK } from '@/lib/utils/constants';
import { ethers } from 'ethers';

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
  const [luxReward, setLuxReward] = useState<number | null>(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  
  const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreMultiplier = Math.floor(streak / 3) + 1;

  useEffect(() => {
    const a = sessionStorage.getItem('verifiedAddress') || localStorage.getItem('user_address') || '';
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
      // Initialize random difficulty for this user
      const randomDiff = getRandomDifficulty(a, GAME_ID, 1, 3);
      setDifficulty(randomDiff);
    }
    
    // Check sound preference
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

    // Don't start cooldown here - it will be started after reward is given

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
    
    // UI shows actual result - no shouldForceLoss here!
    if (actualWin) {
      // Correct guess - show win in UI
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
      // Wrong guess - show loss in UI
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
      
      // Anti-cheat: Validate score
      const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount, GAME_ID);
      if (scoreCheck.suspicious || scoreCheck.blocked) {
        alert('Score validation failed. Please try again.');
        setGameState('gameover');
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
      
      // Calculate reward (coin-flip gives 10 LUX fixed)
      console.log('Requesting reward:', { address, gameId: GAME_ID, score, deviceId, fixedAmount: 10 });
      const rewardRes = await fetch('/api/game/reward/lux', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, gameId: GAME_ID, score, deviceId, fixedAmount: 10 })
      });
      const rewardData = await rewardRes.json();
      
      console.log('Reward API response:', rewardData);
      
      if (rewardData.ok) {
        // Validate reward amount from API
        const rewardAmount = rewardData.luxReward || 10;
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

  const { receiveReward } = useMiniKit();

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
      
      // Step 2: Show transaction popup using MiniKit receiveReward
      // This will display "Authorize Transaction" popup with token amount (like "รับ 7 SUSHI")
      let payload: any = null;
      try {
        // Use receiveReward to show token amount in popup
        // The popup will display the amount of LUX tokens to receive
        payload = await receiveReward(
          reference,
          STAKING_CONTRACT_ADDRESS as `0x${string}`,
          rewardAmount.toString(), // Amount to display in popup
          'WLD' // Use WLD format (MiniKit may not support LUX directly, but amount will be displayed)
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
    setLuxReward(null);
    setRewardClaimed(false);
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
    <div className="min-h-screen text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold font-orbitron bg-gradient-to-r from-tron-red via-tron-red-bright to-tron-red bg-clip-text text-transparent neon-text">
            🪙 Coin Flip Challenge
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

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3">
          <GameStatsCard label="Energy" value={energy} icon="⚡" color="yellow" />
          <GameStatsCard label="Streak" value={`${streak}/${TARGET_STREAK}`} icon="🔥" color="orange" />
          <GameStatsCard label="Lives" value={`${lives}/${MAX_LIVES}`} icon="❤️" color="red" />
          <GameStatsCard label="Score" value={score.toLocaleString()} icon="🎯" color="purple" />
        </div>

        {/* Cooldown Message */}
        {isOnCooldown && gameState === 'idle' && (
          <TronPanel status="danger" padding="md" className="text-center">
            <p className="text-tron-orange font-bold font-orbitron">
              ⏰ You need to wait {cooldownRemaining.hours} hours {cooldownRemaining.minutes} minutes
            </p>
          </TronPanel>
        )}

        {gameState === 'idle' && (
          <TronCard glowColor="orange" className="text-center">
            <div className="text-6xl mb-4">🪙</div>
            <h2 className="text-3xl font-bold mb-4 font-orbitron text-white">Ready to challenge!</h2>
            <p className="text-gray-300 mb-6 font-orbitron">
              Guess the coin correctly <b className="text-tron-orange">{TARGET_STREAK} times in a row</b> to win!
            </p>
            <div className="space-y-2 text-sm text-gray-400 mb-6 font-orbitron">
              <p>✨ You have {MAX_LIVES} lives</p>
              <p>🔥 Build a streak to increase your score</p>
              <p>⚡ Score increases with multiplier!</p>
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
                <TronPanel
                  status={isCorrect ? 'success' : 'danger'}
                  padding="md"
                  className="text-center"
                >
                  <p className="font-bold text-xl font-orbitron">
                    {isCorrect ? (
                      <span className="text-tron-purple">✅ Correct! +{100 * scoreMultiplier} points</span>
                    ) : (
                      <span className="text-tron-orange">❌ Wrong! -1 life</span>
                    )}
                  </p>
                </TronPanel>
              )}
            </AnimatePresence>

            {/* Guess Buttons */}
            {gameState === 'playing' && (
              <div className="grid grid-cols-2 gap-4">
                <GameButton
                  onClick={() => guessCoin('heads')}
                  variant="primary"
                  size="lg"
                  className="py-8 text-2xl"
                >
                  👑 Heads
                </GameButton>
                <GameButton
                  onClick={() => guessCoin('tails')}
                  variant="secondary"
                  size="lg"
                  className="py-8 text-2xl"
                >
                  ⚜️ Tails
                </GameButton>
              </div>
            )}

            {/* Progress Bar */}
            <TronProgressBar
              value={streak}
              max={TARGET_STREAK}
              label="Progress"
              showValue={true}
            />

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
          <TronCard glowColor="orange" className="text-center space-y-6">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold font-orbitron text-white mb-4">You Win!</h2>
            <div className="space-y-3 text-lg font-orbitron">
              <p className="text-gray-300">🎯 Final Score: <b className="text-tron-orange">{score.toLocaleString()}</b></p>
              <p className="text-gray-300">🔥 Highest Streak: <b className="text-tron-orange">{streak}</b></p>
              {luxReward !== null && (
                <div className="space-y-3">
                  {luxReward > 0 ? (
                    <>
                      <div className="font-bold text-2xl text-tron-purple">
                        💰 Earned {luxReward} LUX!
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
                    </>
                  ) : (
                    <div className="font-bold text-xl text-gray-400">
                      Better luck next time! No reward this round.
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
              Play Again
            </GameButton>
          </TronCard>
        )}

        {gameState === 'gameover' && (
          <TronCard glowColor="orange" className="text-center space-y-6">
            <div className="text-7xl mb-4">😢</div>
            <h2 className="text-4xl font-bold font-orbitron text-white mb-4">Game Over!</h2>
            <div className="space-y-3 text-lg font-orbitron">
              <p className="text-gray-300">🎯 Final Score: <b className="text-tron-orange">{score.toLocaleString()}</b></p>
              <p className="text-gray-300">🔥 Highest Streak: <b className="text-tron-orange">{streak}</b></p>
            </div>
            <GameButton
              onClick={resetGame}
              variant="danger"
              size="lg"
              className="w-full"
            >
              Try Again
            </GameButton>
          </TronCard>
        )}
      </div>
    </div>
  );
}
