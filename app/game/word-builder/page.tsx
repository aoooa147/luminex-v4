'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { signMessageWithMiniKit } from '@/lib/game/auth';

const WORDS = [
  ['G', 'A', 'M', 'E'], // GAME
  ['W', 'O', 'R', 'D'], // WORD
  ['P', 'L', 'A', 'Y'], // PLAY
  ['F', 'U', 'N'], // FUN
  ['W', 'I', 'N'], // WIN
  ['L', 'O', 'V', 'E'], // LOVE
  ['C', 'O', 'D', 'E'], // CODE
  ['H', 'A', 'P', 'P', 'Y'], // HAPPY
  ['S', 'T', 'A', 'R'], // STAR
  ['M', 'O', 'O', 'N'], // MOON
];

const TIME_LIMIT = 60;
const GAME_ID = 'word-builder';

export default function WordBuilderPage() {
  const [address, setAddress] = useState('');
  const [energy, setEnergy] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [currentWord, setCurrentWord] = useState<string[]>([]);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState(1);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [actionsCount, setActionsCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [lastHintTime, setLastHintTime] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [currentTargetWord, setCurrentTargetWord] = useState<string>('');
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState({ hours: 0, minutes: 0 });
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const a = sessionStorage.getItem('verifiedAddress') || '';
    setAddress(a);
    if (a) {
      loadEnergy(a);
      checkCooldown();
      const randomDiff = getRandomDifficulty(a, GAME_ID, 1, 3);
      setDifficulty(randomDiff);
    }
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
      // Silent error handling
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

  function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function getNewWord() {
    const unused = WORDS.filter(w => !usedWords.has(w.join('')));
    if (unused.length === 0) {
      // Reset if all words used
      setUsedWords(new Set());
      return WORDS[Math.floor(Math.random() * WORDS.length)];
    }
    return unused[Math.floor(Math.random() * unused.length)];
  }

  function showHintAuto() {
    // Auto show hint after 10 seconds without solving
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => {
      if (gameState === 'playing' && currentWord.length === 0) {
        setShowHint(true);
        if (soundEnabled) playSound('click');
        setTimeout(() => setShowHint(false), 3000);
      }
    }, 10000 - (difficulty * 2000)); // Harder difficulty = less time before hint
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

    // Start cooldown
    fetch('/api/game/cooldown/start', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address, gameId: GAME_ID })
    });
    
    const randomDiff = getRandomDifficulty(address, GAME_ID, 1, 3);
    setDifficulty(randomDiff);
    setGameState('playing');
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setUsedWords(new Set());
    setCurrentWord([]);
    setActionsCount(0);
    setGameStartTime(Date.now());
    setFeedback(null);
    setShowHint(false);
    antiCheat.clearHistory(address);
    
    const word = getNewWord();
    setCurrentTargetWord(word.join(''));
    setAvailableLetters(shuffleArray([...word]));
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    showHintAuto();
  }

  function addLetter(letter: string, index: number) {
    if (gameState !== 'playing') return;
    
    // Anti-cheat: Check action speed
    const now = Date.now();
    if (now - lastHintTime < 100) {
      const cheatCheck = antiCheat.checkAction(address, 'add_letter', { letter, time: now });
      if (cheatCheck.suspicious) {
        alert('Suspicious activity detected. Please play normally.');
        return;
      }
    }
    
    setLastHintTime(now);
    antiCheat.recordAction(address, 'add_letter', { letter, timestamp: now });
    setActionsCount(prev => prev + 1);
    
    if (soundEnabled) playSound('click');
    
    setCurrentWord(prev => [...prev, letter]);
    setAvailableLetters(prev => prev.filter((_, i) => i !== index));
    
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    showHintAuto();
  }

  function removeLetter(index: number) {
    if (gameState !== 'playing') return;
    
    if (soundEnabled) playSound('click');
    
    const removed = currentWord[index];
    setCurrentWord(prev => prev.filter((_, i) => i !== index));
    setAvailableLetters(prev => [...prev, removed]);
  }

  function checkWord() {
    if (currentWord.length < 3) return;
    
    const word = currentWord.join('');
    const foundWord = WORDS.find(w => w.join('') === word.toUpperCase());
    
    antiCheat.recordAction(address, 'check_word', { word: word.toUpperCase(), timestamp: Date.now() });
    
    if (foundWord && !usedWords.has(word.toUpperCase())) {
      // Correct word!
      if (soundEnabled) playSound('correct');
      setFeedback('correct');
      
      const difficultyMultiplier = getDifficultyMultiplier(difficulty);
      const basePoints = word.length * 50;
      const timeBonus = Math.floor(timeLeft / 5) * 10;
      const points = Math.floor((basePoints + timeBonus) * difficultyMultiplier);
      
      setScore(prev => prev + points);
      setUsedWords(prev => new Set([...prev, word.toUpperCase()]));
      setCurrentWord([]);
      
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 1000);
      
      // Get new word
      const newWord = getNewWord();
      setCurrentTargetWord(newWord.join(''));
      const usedLetters = foundWord.length;
      
      // Add back unused letters and new word letters
      const newLetters = [...availableLetters.slice(usedLetters), ...newWord];
      setAvailableLetters(shuffleArray(newLetters));
      
      // Reset hint timer
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      showHintAuto();
    } else {
      // Wrong word - clear
      if (soundEnabled) playSound('wrong');
      setFeedback('wrong');
      
      const letters = [...currentWord];
      setCurrentWord([]);
      setAvailableLetters(prev => [...prev, ...letters]);
      
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 1000);
    }
  }

  async function handleGameOver() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    setGameState('gameover');
    if (soundEnabled) playSound('gameover');
    
    try {
      const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
      
      // Anti-cheat: Validate score
      // Apply 80% loss rate: 80% chance of losing even if game completed
      const shouldLose = antiCheat.shouldForceLoss(address, true);
      if (shouldLose) {
        alert('Better luck next time!');
        return;
      }

      const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount, GAME_ID);
      if (scoreCheck.suspicious || scoreCheck.blocked) {
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
      
      // Update cooldown status
      setIsOnCooldown(true);
      await checkCooldown();
    } catch (e) {
      // Silent error handling
    }
  }

  function resetGame() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setGameState('idle');
    setCurrentWord([]);
    setAvailableLetters([]);
    setScore(0);
    setTimeLeft(TIME_LIMIT);
    setUsedWords(new Set());
    setFeedback(null);
    setShowHint(false);
    // Check cooldown status after reset
    checkCooldown();
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // Get hint word (current target word)
  const hintWord = currentTargetWord;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-indigo-950 to-zinc-950 text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            📝 Word Builder
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
            <div className="text-xs text-white/60 mb-1">⏱️ Time</div>
            <div className={`text-xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
              {timeLeft}s
            </div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">🎯 Score</div>
            <div className="text-xl font-bold text-green-400">{score.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-900/60 rounded-xl p-3 text-center border border-zinc-800">
            <div className="text-xs text-white/60 mb-1">📚 Words</div>
            <div className="text-xl font-bold text-purple-400">{usedWords.size}</div>
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
            <div className="rounded-2xl p-8 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/30 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-3xl font-bold mb-4 text-white">Build words from letters!</h2>
              <p className="text-white/80 mb-6">
                Select letters from the given set to build correct words
              </p>
              <div className="space-y-2 text-sm text-white/70 mb-6">
                <p>✨ You have 60 seconds</p>
                <p>🔥 3-letter word: 150 points</p>
                <p>🔥 4-letter word: 200 points</p>
                <p>🔥 5-letter word: 250 points</p>
                <p>💡 Hint will appear automatically after 10 seconds</p>
              </div>
                             <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={startGame}
                 disabled={isOnCooldown}
                 className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 font-bold text-xl shadow-2xl shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 ▶ Start Playing
               </motion.button>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-6">
            {/* Hint */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-yellow-500/20 border-2 border-yellow-500/50 rounded-xl p-4 text-center"
                >
                  <p className="text-yellow-300 font-bold">
                    💡 Hint: The word to find is <span className="text-2xl">{hintWord}</span>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feedback */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  className={`text-center py-3 rounded-xl font-bold text-xl ${
                    feedback === 'correct'
                      ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                      : 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                  }`}
                >
                  {feedback === 'correct' ? (
                    <span>✅ Correct word!</span>
                  ) : (
                    <span>❌ Incorrect word, try again</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Current Word */}
            <div className="rounded-2xl p-6 bg-zinc-900/60 border border-zinc-800">
              <div className="text-sm text-white/60 mb-3">Your word:</div>
              <div className="flex flex-wrap gap-2 min-h-[80px] items-center justify-center">
                {currentWord.length === 0 ? (
                  <span className="text-white/30">Drag letters here to build a word...</span>
                ) : (
                  currentWord.map((letter, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => removeLetter(idx)}
                      className="px-5 py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-2xl shadow-lg hover:shadow-xl transition-all"
                    >
                      {letter}
                    </motion.button>
                  ))
                )}
              </div>
              {currentWord.length >= 3 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={checkWord}
                  className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 font-bold text-lg shadow-lg"
                >
                  ✅ Check Word
                </motion.button>
              )}
            </div>

            {/* Available Letters */}
            <div className="rounded-2xl p-6 bg-zinc-900/60 border border-zinc-800">
              <div className="text-sm text-white/60 mb-4">Available letters:</div>
              <div className="flex flex-wrap gap-3 justify-center">
                {availableLetters.map((letter, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.15, rotate: 10 }}
                    whileTap={{ scale: 0.9, rotate: -10 }}
                    onClick={() => addLetter(letter, idx)}
                    className="px-7 py-5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-2xl shadow-lg hover:shadow-2xl transition-all"
                  >
                    {letter}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Used Words */}
            {usedWords.size > 0 && (
              <div className="rounded-2xl p-4 bg-green-500/10 border border-green-500/30">
                <div className="text-sm text-green-400 mb-3 font-bold">✅ Words found ({usedWords.size} words):</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(usedWords).map((word, idx) => (
                    <motion.span
                      key={idx}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="px-4 py-2 rounded-lg bg-green-500/20 text-green-300 text-base font-bold shadow-lg"
                    >
                      {word}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Time Progress Bar */}
            <div className="space-y-2">
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className={`h-full ${
                    timeLeft <= 10
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : timeLeft <= 20
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border-2 border-indigo-500/50 text-center space-y-6"
          >
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
            <div className="space-y-3 text-lg">
              <p className="text-white/90">🎯 Final score: <b className="text-yellow-300">{score.toLocaleString()}</b></p>
              <p className="text-white/90">📚 Words found: <b className="text-indigo-300">{usedWords.size}</b> words</p>
              <p className="text-green-400 font-bold">💰 Earned 5 Tokens!</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetGame}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 font-bold text-xl"
            >
              Back to Home
            </motion.button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
