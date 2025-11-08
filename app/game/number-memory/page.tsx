'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { getDeviceFingerprint } from '@/lib/utils/deviceFingerprint';
import { GameStatsCard } from '@/components/game/GameStatsCard';
import { GameButton } from '@/components/game/GameButton';
import { TronCard, TronPanel } from '@/components/tron';
import { Volume2, VolumeX } from 'lucide-react';

type GameState = 'idle' | 'showing' | 'inputting' | 'result' | 'gameover' | 'victory';

const SHOW_DURATION = 1000; // Base duration to show each number
const ROUNDS_TO_WIN = 10;

export default function NumberMemoryPage() {
  const [address, setAddress] = useState('');
  const [energy, setEnergy] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [numberSequence, setNumberSequence] = useState<number[]>([]);
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [round, setRound] = useState(0);
  const [soundEnabled, setSoundEnabledState] = useState(isSoundEnabled());
  const [deviceId, setDeviceId] = useState<string>('');

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
    
    if (a) loadEnergy(a);
  }, []);

  async function loadEnergy(addr: string) {
    try {
      const r = await fetch(`/api/game/energy/get?address=${addr}`);
      const j = await r.json();
      if (j.ok) setEnergy(j.energy);
    } catch (e) {
      // Silent error handling
    }
  }

  function startGame() {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }
    if (energy <= 0) {
      alert('Energy depleted');
      return;
    }
    if (soundEnabled) playSound('click');
    setGameState('showing');
    setLevel(1);
    setScore(0);
    setRound(0);
    generateSequence(1);
  }

  function generateSequence(length: number) {
    const seq = Array.from({ length }, () => Math.floor(Math.random() * 10));
    setNumberSequence(seq);
    setCurrentDisplayIndex(0);
    setUserInput('');
    showNextNumber();
  }

  function showNextNumber() {
    if (currentDisplayIndex >= numberSequence.length) {
      // Done showing, wait for input
      setTimeout(() => {
        setGameState('inputting');
      }, 500);
      return;
    }

    setTimeout(() => {
      setCurrentDisplayIndex(prev => {
        if (prev + 1 >= numberSequence.length) {
          setTimeout(() => {
            setGameState('inputting');
          }, SHOW_DURATION);
        } else {
          showNextNumber();
        }
        return prev + 1;
      });
    }, SHOW_DURATION);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, ''); // Only numbers
    setUserInput(value);
    if (soundEnabled && value.length > 0) playSound('click');
    
    if (value.length === numberSequence.length) {
      checkAnswer(value);
    }
  }

      function checkAnswer(input: string) {
      const userSequence = input.split('').map(Number);
    const isCorrect = userSequence.every((num, i) => num === numberSequence[i]);

      setGameState('result');

    // Apply 80% loss rate: 80% chance of losing regardless of actual result
    const shouldLose = antiCheat.shouldForceLoss(address, isCorrect);

    if (isCorrect && !shouldLose) {
      if (soundEnabled) playSound('correct');
      const newRound = round + 1;
      const newScore = score + (level * 100);
      setRound(newRound);
      setScore(newScore);
      
      if (newRound >= ROUNDS_TO_WIN) {
        setTimeout(() => handleVictory(), 1000);
      } else {
        setTimeout(() => {
          setLevel(prev => prev + 1);
          setGameState('showing');
          generateSequence(level + 1);
        }, 1500);
      }
    } else {
      if (soundEnabled) playSound('wrong');
      setTimeout(() => handleGameOver(), 1000);
    }
  }

    async function handleVictory() {
      setGameState('victory');
      if (soundEnabled) playSound('victory');
      
      // Apply 80% loss rate: 80% chance of losing even if victory reached
      const shouldLose = antiCheat.shouldForceLoss(address, true);
      if (shouldLose) {
        setGameState('gameover');
        if (soundEnabled) playSound('wrong');
        alert('Better luck next time!');
        return;
      }
      
      try {
        const base = { address, score, ts: Date.now() };
      const { nonce } = await fetch('/api/game/score/nonce', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address })
      }).then(r => r.json());
      
      const payload = { ...base, nonce };
      await fetch('/api/game/score/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address, payload, sig: '0x', deviceId })
      });
      
      const key = 'luminex_tokens';
      const cur = Number(localStorage.getItem(key) || '0');
      localStorage.setItem(key, String(cur + 15));
      
      loadEnergy(address);
    } catch (e) {
      // Silent error handling
    }
  }

  function handleGameOver() {
    setGameState('gameover');
    if (soundEnabled) playSound('gameover');
  }

  function toggleSound() {
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
  }

  function resetGame() {
    setGameState('idle');
    setUserInput('');
    setNumberSequence([]);
  }

  return (
    <div className="min-h-screen text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold font-orbitron bg-gradient-to-r from-tron-blue via-tron-cyan to-tron-blue bg-clip-text text-transparent neon-text">
            🧠 Number Memory
          </h1>
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg border border-tron-cyan/30 bg-tron-cyan/10 text-tron-cyan hover:bg-tron-cyan/20 transition-colors"
            style={{ boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)' }}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <GameStatsCard label="Energy" value={energy} icon="⚡" color="yellow" />
          <GameStatsCard label="Level" value={level} icon="📊" color="blue" />
          <GameStatsCard label="Score" value={score} icon="🎯" color="purple" />
        </div>

        {gameState === 'idle' && (
          <TronCard glowColor="blue" className="text-center">
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="text-3xl font-bold mb-4 font-orbitron text-white">Remember the numbers!</h2>
            <p className="text-gray-300 mb-6 font-orbitron">
              Remember the numbers shown, then type them back correctly
              <br />
              <b className="text-tron-blue">Complete {ROUNDS_TO_WIN} rounds to win!</b>
            </p>
            <GameButton
              onClick={startGame}
              variant="primary"
              size="lg"
              className="w-full"
            >
              ▶ Start Playing
            </GameButton>
          </TronCard>
        )}

        {gameState === 'showing' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-white/70 mb-4">Remember this number:</p>
              <motion.div
                key={currentDisplayIndex}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-9xl font-black text-blue-400"
              >
                {numberSequence[currentDisplayIndex - 1]}
              </motion.div>
              <p className="text-white/50 mt-4">
                {currentDisplayIndex}/{numberSequence.length}
              </p>
            </div>
          </div>
        )}

        {gameState === 'inputting' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-white/70 mb-4 text-xl">Type the number you remember:</p>
              <input
                type="text"
                value={userInput}
                onChange={handleInput}
                autoFocus
                className="w-full py-6 text-4xl font-bold text-center bg-zinc-900/60 border-2 border-blue-500/50 rounded-xl text-blue-400 focus:outline-none focus:border-blue-400"
                                    placeholder="Type here..."
                maxLength={numberSequence.length}
              />
              <p className="text-white/50 mt-4">
                                    {userInput.length}/{numberSequence.length} digits
              </p>
            </div>
          </div>
        )}

        {gameState === 'result' && (
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-7xl mb-4"
            >
              ✅
            </motion.div>
            <p className="text-2xl font-bold text-green-400">Correct!</p>
          </div>
        )}

        {gameState === 'victory' && (
          <TronCard glowColor="blue" className="text-center space-y-6">
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold font-orbitron text-white mb-4">You Win!</h2>
            <div className="space-y-3 text-lg font-orbitron">
              <p className="text-gray-300">🎯 Score: <b className="text-tron-blue">{score.toLocaleString()}</b></p>
              <p className="text-tron-purple font-bold">💰 Earned 15 Tokens!</p>
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
            <p className="text-gray-300 text-lg font-orbitron">🎯 Score: <b className="text-tron-orange">{score.toLocaleString()}</b></p>
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
