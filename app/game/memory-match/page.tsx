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
import { Volume2, VolumeX, Coins } from 'lucide-react';
import { useMiniKit } from '@/hooks/useMiniKit';
import { MiniKit } from '@worldcoin/minikit-js';
import { STAKING_CONTRACT_ADDRESS } from '@/lib/utils/constants';

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
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  
  const sequenceRef = useRef<Color[]>([]);
  const showingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // Validate score (but don't force loss for UI - let user see their result)
      const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount, GAME_ID);
      if (scoreCheck.suspicious || scoreCheck.blocked) {
        alert('Score validation failed.');
        setLuxReward(0); // No reward for suspicious score
        setIsOnCooldown(true);
        await checkCooldown();
        return;
      }

      // Calculate reward (don't claim yet - user needs to click button)
      const rewardRes = await fetch('/api/game/reward/lux', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, gameId: GAME_ID, score, deviceId })
      });
      const rewardData = await rewardRes.json();
      
      if (rewardData.ok) {
        // Give full reward as calculated
        setLuxReward(rewardData.luxReward);
        setRewardClaimed(false); // User needs to claim manually
      } else {
        // If cooldown or error, show message
        if (rewardData.error === 'COOLDOWN_ACTIVE') {
          alert('You are still on cooldown. Please wait 24 hours.');
          setLuxReward(0);
        }
      }

      // Update cooldown status
      setIsOnCooldown(true);
      await checkCooldown();
    } catch (e) {
      // Silent error handling
    }
  }

  const { pay } = useMiniKit();

  async function handleClaimReward() {
    if (!address || !luxReward || luxReward === 0 || rewardClaimed || isClaimingReward) {
      console.error('Cannot claim reward:', { address, luxReward, rewardClaimed, isClaimingReward });
      return;
    }
    
    if (!MiniKit.isInstalled()) {
      alert('World App is required to claim rewards. Please open this app in World App.');
      return;
    }
    
    // Validate luxReward before sending
    const rewardAmount = Number(luxReward);
    if (!rewardAmount || rewardAmount <= 0 || !Number.isFinite(rewardAmount)) {
      console.error('Invalid luxReward value:', luxReward);
      alert(`Invalid reward amount: ${luxReward}. Please try again.`);
      return;
    }
    
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
      
      const initData = await initRes.json();
      
      if (!initData.ok || !initData.reference) {
        alert(initData.error || 'Failed to initialize reward transaction. Please try again.');
        setIsClaimingReward(false);
        return;
      }

      const reference = initData.reference;
      
      // Step 2: Show transaction popup using MiniKit pay
      // Note: We're using a dummy payment to trigger the popup
      // In production, this should call the contract's distributeGameReward function
      // For now, we'll use a 0 WLD payment to show the transaction confirmation
      let payload: any = null;
      try {
        // Use pay with 0 WLD to show transaction confirmation popup
        // The actual LUX reward will be distributed by the backend after confirmation
        payload = await pay(
          reference,
          STAKING_CONTRACT_ADDRESS as `0x${string}`,
          '0', // 0 WLD - just for transaction confirmation
          'WLD'
        );
      } catch (e: any) {
        // Handle user cancellation
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
    setGameState('idle');
    setSequence([]);
    setPlayerSequence([]);
    setCurrentIndex(0);
    setLevel(1);
    setScore(0);
    setLives(3);
    setHighlightedColor(null);
    setLuxReward(null);
    setRewardClaimed(false);
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
    <div className="min-h-screen text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold font-orbitron bg-gradient-to-r from-tron-red via-tron-red-bright to-tron-red bg-clip-text text-transparent neon-text">
            🧠 Color Memory Challenge
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
          <GameStatsCard label="Level" value={level} icon="📊" color="purple" />
          <GameStatsCard label="Lives" value={`${lives}/3`} icon="❤️" color="red" />
          <GameStatsCard label="Score" value={score.toLocaleString()} icon="🎯" color="cyan" />
          <GameStatsCard label="Sequence" value={sequence.length} icon="🔢" color="blue" />
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
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="text-3xl font-bold mb-4 font-orbitron text-white">Remember the color sequence!</h2>
            <p className="text-gray-300 mb-6 font-orbitron">
              Watch the color sequence shown, then tap the colors in the correct order
            </p>
            <div className="space-y-2 text-sm text-gray-400 mb-6 font-orbitron">
              <p>✨ You have 3 lives</p>
              <p>🔥 Each level gets longer</p>
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

        {(gameState === 'showing' || gameState === 'playing') && (
          <div className="space-y-6">
            <TronPanel padding="md" className="text-center">
              <p className="text-gray-300 text-lg font-bold font-orbitron">
                {gameState === 'showing' ? '👀 Watch the sequence carefully...' : '🎮 Tap the colors in order!'}
              </p>
              <p className="text-gray-400 text-sm mt-2 font-orbitron">
                Progress: {playerSequence.length} / {sequence.length}
              </p>
            </TronPanel>

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
          <TronCard glowColor="purple" className="text-center space-y-6">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold font-orbitron text-white mb-4">Game Over!</h2>
            <div className="space-y-3 text-lg font-orbitron">
              <p className="text-gray-300">🎯 Final score: <b className="text-tron-orange">{score.toLocaleString()}</b></p>
              <p className="text-gray-300">📊 Highest level: <b className="text-tron-purple">{level}</b></p>
              {luxReward !== null && (
                <div className="space-y-3">
                  {luxReward > 0 ? (
                    <>
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
              Back to Home
            </GameButton>
          </TronCard>
        )}
      </div>
    </div>
  );
}
