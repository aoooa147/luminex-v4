'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/game/sounds';
import { antiCheat, getRandomDifficulty, getDifficultyMultiplier } from '@/lib/game/anticheat';
import { signMessageWithMiniKit } from '@/lib/game/auth';

type PatternType = 'number' | 'shape' | 'color' | 'direction';
type GameState = 'idle' | 'playing' | 'gameover';

type Pattern = {
  type: PatternType;
  value: number | string;
  display: string;
  emoji: string;
};

const PATTERN_TYPES: PatternType[] = ['number', 'shape', 'color', 'direction'];
const SHAPES = ['🔵', '🔴', '🟢', '🟡', '🟣', '🟠'];
const COLORS = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣'];
const DIRECTIONS = ['⬆️', '➡️', '⬇️', '⬅️', '↗️', '↘️', '↙️', '↖️'];

const GAME_ID = 'math-quiz';

function generatePattern(type: PatternType, index: number, base: number): Pattern {
  switch (type) {
    case 'number':
      return {
        type: 'number',
        value: base + index,
        display: String(base + index),
        emoji: '🔢',
      };
    case 'shape':
      const shapeIndex = (base + index) % SHAPES.length;
      return {
        type: 'shape',
        value: shapeIndex,
        display: SHAPES[shapeIndex],
        emoji: SHAPES[shapeIndex],
      };
    case 'color':
      const colorIndex = (base + index) % COLORS.length;
      return {
        type: 'color',
        value: colorIndex,
        display: COLORS[colorIndex],
        emoji: COLORS[colorIndex],
      };
    case 'direction':
      const dirIndex = (base + index) % DIRECTIONS.length;
      return {
        type: 'direction',
        value: dirIndex,
        display: DIRECTIONS[dirIndex],
        emoji: DIRECTIONS[dirIndex],
      };
  }
}

function generateSequence(type: PatternType, length: number, base: number): Pattern[] {
  const seq: Pattern[] = [];
  for (let i = 0; i < length; i++) {
    seq.push(generatePattern(type, i, base));
  }
  return seq;
}

export default function MathQuizPage() {
  const [address, setAddress] = useState('');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [currentPatternType, setCurrentPatternType] = useState<PatternType>('number');
  const [sequence, setSequence] = useState<Pattern[]>([]);
  const [options, setOptions] = useState<Pattern[]>([]);
  const [correctAnswer, setCorrectAnswer] = useState<Pattern | null>(null);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [difficulty, setDifficulty] = useState(1);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [actionsCount, setActionsCount] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState({ hours: 0, minutes: 0 });
  const [luxReward, setLuxReward] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<Pattern | null>(null);

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
      // Silent error handling
    }
  }

  function generateQuestion() {
    // Select random pattern type
    const patternType = PATTERN_TYPES[Math.floor(Math.random() * PATTERN_TYPES.length)];
    setCurrentPatternType(patternType);

    // Generate sequence length based on level and difficulty
    const sequenceLength = 3 + difficulty + Math.floor(level / 2);
    const base = Math.floor(Math.random() * 10);
    
    // Generate full sequence (including answer)
    const fullSequence = generateSequence(patternType, sequenceLength + 1, base);
    
    // Show all but last (the answer)
    const shownSequence = fullSequence.slice(0, sequenceLength);
    setSequence(shownSequence);
    
    // Get correct answer
    const correct = fullSequence[sequenceLength];
    setCorrectAnswer(correct);
    
    // Generate options (1 correct + 3 wrong)
    const wrongOptions: Pattern[] = [];
    while (wrongOptions.length < 3) {
      let wrong: Pattern;
      if (patternType === 'number') {
        wrong = generatePattern(patternType, sequenceLength + Math.floor(Math.random() * 5) + 1, base);
      } else {
        const wrongIndex = (correct.value as number + Math.floor(Math.random() * 5) + 1) % 
          (patternType === 'shape' ? SHAPES.length : patternType === 'color' ? COLORS.length : DIRECTIONS.length);
        wrong = generatePattern(patternType, wrongIndex, 0);
      }
      // Make sure wrong options are different from correct
      if (wrong.display !== correct.display && !wrongOptions.some(o => o.display === wrong.display)) {
        wrongOptions.push(wrong);
      }
    }
    
    // Shuffle options
    const allOptions = [correct, ...wrongOptions].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
    setSelectedOption(null);
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
    setGameState('playing');
    setLevel(1);
    setScore(0);
    setLives(3);
    setActionsCount(0);
    setGameStartTime(Date.now());
    setLuxReward(null);
    antiCheat.clearHistory(address);

    generateQuestion();
  }

  function handleOptionClick(option: Pattern) {
    if (gameState !== 'playing' || selectedOption) return;

    const cheatCheck = antiCheat.checkAction(address, 'pattern_answer', { level, patternType: currentPatternType });
    if (cheatCheck.suspicious) {
      alert('Suspicious activity detected. Please play normally.');
      return;
    }

    setSelectedOption(option);
    antiCheat.recordAction(address, 'pattern_answer', { level, patternType: currentPatternType });
    setActionsCount(prev => prev + 1);

    const isCorrect = option.display === correctAnswer?.display;

    // Apply 80% loss rate: 80% chance of losing regardless of actual result
    const shouldLose = antiCheat.shouldForceLoss(address, isCorrect);

    if (isCorrect && !shouldLose) {
      // Correct AND passed 80% loss check (20% chance)
      if (soundEnabled) playSound('correct');
      antiCheat.recordAction(address, 'correct_pattern', { correct: true, level });

      const difficultyMultiplier = getDifficultyMultiplier(difficulty);
      const baseScore = level * 500;
      const timeBonus = Math.max(0, 1000 - (Date.now() - gameStartTime) / 10);
      const points = Math.floor((baseScore + timeBonus) * difficultyMultiplier);
      
      setScore(prev => prev + points);
      setLevel(prev => prev + 1);

      // Next question after delay
      setTimeout(() => {
        generateQuestion();
        setSelectedOption(null);
      }, 1500);
    } else {
      // Wrong!
      if (soundEnabled) playSound('wrong');
      antiCheat.recordAction(address, 'wrong_pattern', { correct: false });

      const newLives = lives - 1;
      setLives(newLives);

      setTimeout(() => {
        if (newLives <= 0) {
          handleGameOver();
        } else {
          // Continue with same level
          generateQuestion();
          setSelectedOption(null);
        }
      }, 1500);
    }
  }

  async function handleGameOver() {
    setGameState('gameover');
    if (soundEnabled) playSound('gameover');

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
      // Silent error handling
    }
  }

  function resetGame() {
    setGameState('idle');
    setSequence([]);
    setOptions([]);
    setCorrectAnswer(null);
    setLevel(1);
    setScore(0);
    setLives(3);
    setSelectedOption(null);
    setLuxReward(null);
    // Check cooldown status after reset
    checkCooldown();
  }

  function toggleSound() {
    const newState = !soundEnabled;
    setSoundEnabledState(newState);
    setSoundEnabled(newState);
  }

  const isCorrect = selectedOption && selectedOption.display === correctAnswer?.display;
  const isWrong = selectedOption && selectedOption.display !== correctAnswer?.display;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-orange-950 to-zinc-950 text-white p-4 pb-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 bg-clip-text text-transparent">
            🧩 Pattern Puzzle
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
            <div className="text-xl font-bold text-orange-400">{level}</div>
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
            <div className="text-xs text-white/60 mb-1">🎨 Type</div>
            <div className="text-xl font-bold text-purple-400">
              {currentPatternType === 'number' ? '🔢' : 
               currentPatternType === 'shape' ? '🔵' :
               currentPatternType === 'color' ? '🎨' : '🧭'}
            </div>
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
            <div className="rounded-2xl p-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/30 text-center">
              <div className="text-6xl mb-4">🧩</div>
              <h2 className="text-3xl font-bold mb-4 text-white">Solve the pattern puzzle!</h2>
              <p className="text-white/80 mb-6">
                Look at the pattern given, then select the correct next sequence
              </p>
              <div className="space-y-2 text-sm text-white/70 mb-6">
                <p>✨ You have 3 lives</p>
                <p>🔥 Each level gets harder</p>
                <p>🧩 Patterns: numbers, shapes, colors, directions</p>
                <p>💎 Reward: 0-5 LUX (very rare to get 5!)</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                disabled={isOnCooldown}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 font-bold text-xl shadow-2xl shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶ Start Playing
              </motion.button>
            </div>
          </motion.div>
        )}

        {gameState === 'playing' && (
          <div className="space-y-6">
            {/* Sequence Display */}
            <div className="bg-zinc-900/60 rounded-2xl p-6 border border-zinc-800">
              <div className="text-center mb-4">
                <p className="text-white/70 text-lg mb-2">Look at this pattern:</p>
                <p className="text-white/50 text-sm">Select the correct next sequence</p>
              </div>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {sequence.map((pattern, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center text-4xl border-2 border-white/20"
                  >
                    {pattern.display}
                  </motion.div>
                ))}
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-16 h-16 bg-zinc-700 rounded-xl flex items-center justify-center text-4xl border-2 border-dashed border-white/30"
                >
                  ?
                </motion.div>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              {options.map((option, index) => {
                const isSelected = selectedOption?.display === option.display;
                return (
                  <motion.button
                    key={index}
                    whileHover={{ scale: selectedOption ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!selectedOption}
                    className={`py-6 rounded-xl border-4 flex items-center justify-center text-6xl font-bold transition-all ${
                      isSelected && isCorrect
                        ? 'bg-green-500/30 border-green-400 shadow-2xl shadow-green-500/50'
                        : isSelected && isWrong
                        ? 'bg-red-500/30 border-red-400 shadow-2xl shadow-red-500/50'
                        : selectedOption
                        ? 'bg-zinc-800 border-zinc-700 opacity-50 cursor-not-allowed'
                        : 'bg-zinc-900/60 border-zinc-700 hover:border-orange-500/50 cursor-pointer'
                    }`}
                  >
                    {option.display}
                  </motion.button>
                );
              })}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {isCorrect && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-green-500/20 border-2 border-green-500/50 rounded-xl p-4 text-center"
                >
                  <p className="text-green-400 font-bold text-xl">✅ Correct!</p>
                </motion.div>
              )}
              {isWrong && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-4 text-center"
                >
                  <p className="text-red-400 font-bold text-xl">❌ Wrong! -1 life</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {gameState === 'gameover' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-orange-500/30 to-red-500/30 border-2 border-orange-500/50 text-center space-y-6"
          >
            <div className="text-7xl mb-4">🎉</div>
            <h2 className="text-4xl font-bold text-white mb-4">Game Over!</h2>
            <div className="space-y-3 text-lg">
              <p className="text-white/90">🎯 Final score: <b className="text-yellow-300">{score.toLocaleString()}</b></p>
              <p className="text-white/90">📊 Highest level: <b className="text-orange-300">{level}</b></p>
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
              className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 font-bold text-xl"
            >
              Back to Home
            </motion.button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
