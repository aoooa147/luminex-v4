'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

  useEffect(() => {
    const a = sessionStorage.getItem('verifiedAddress') || localStorage.getItem('user_address') || '';
    setAddress(a);
    if (a) loadEnergy(a);
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

  function startGame() {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }
    if (energy <= 0) {
      alert('Energy depleted');
      return;
    }
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
    
    if (value.length === numberSequence.length) {
      checkAnswer(value);
    }
  }

  function checkAnswer(input: string) {
    const userSequence = input.split('').map(Number);
    const isCorrect = userSequence.every((num, i) => num === numberSequence[i]);
    
    setGameState('result');
    
    if (isCorrect) {
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
      setTimeout(() => handleGameOver(), 1000);
    }
  }

  async function handleVictory() {
    setGameState('victory');
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
        body: JSON.stringify({ address, payload, sig: '0x' })
      });
      
      const key = 'luminex_tokens';
      const cur = Number(localStorage.getItem(key) || '0');
      localStorage.setItem(key, String(cur + 15));
      
      loadEnergy(address);
    } catch (e) {
      console.error('Failed to submit score:', e);
    }
  }

  function handleGameOver() {
    setGameState('gameover');
  }

  function resetGame() {
    setGameState('idle');
    setUserInput('');
    setNumberSequence([]);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-blue-950 to-zinc-950 text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent text-center">
          🧠 Number Memory
        </h1>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">⚡ Energy</div>
            <div className="text-xl font-bold text-yellow-400">{energy}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">📊 Level</div>
            <div className="text-xl font-bold text-blue-400">{level}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">🎯 Score</div>
            <div className="text-xl font-bold text-purple-400">{score}</div>
          </div>
        </div>

        {gameState === 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/30 text-center"
          >
            <div className="text-6xl mb-4">🧠</div>
            <h2 className="text-3xl font-bold mb-4 text-white">Remember the numbers!</h2>
            <p className="text-white/80 mb-6">
              Remember the numbers shown, then type them back correctly
              <br />
              <b className="text-blue-300">Complete {ROUNDS_TO_WIN} rounds to win!</b>
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 font-bold text-xl shadow-2xl shadow-blue-500/50"
            >
              ▶ Start Playing
            </motion.button>
          </motion.div>
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
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-2 border-blue-500/50 text-center space-y-6"
          >
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-white mb-4">You Win!</h2>
            <div className="space-y-3 text-lg">
              <p className="text-white/90">🎯 Score: <b className="text-blue-300">{score.toLocaleString()}</b></p>
              <p className="text-green-400 font-bold">💰 Earned 15 Tokens!</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 font-bold text-xl"
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
            <p className="text-white/90 text-lg">🎯 Score: <b className="text-yellow-300">{score.toLocaleString()}</b></p>
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
