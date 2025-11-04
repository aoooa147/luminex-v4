# Game Update Guide - Sound, Random Difficulty & Anti-Cheat

## ✅ Completed

1. **Sound Library** (`lib/game/sounds.ts`)
   - Shared sound utility using Web Audio API
   - Sound effects: flip, correct, wrong, victory, gameover, click, match, mismatch, etc.
   - Sound preferences stored in localStorage

2. **Anti-Cheat System** (`lib/game/anticheat.ts`)
   - Speed violation detection (minimum 50ms between actions)
   - Pattern detection (repetitive actions)
   - Score validation (score per second, score per action, duration checks)
   - Random difficulty generation per user/game combination

3. **Score Submission API** (`app/api/game/score/submit/route.ts`)
   - Enhanced anti-cheat validation
   - Checks: score per second, score per action, duration validation
   - Server-side validation of gameDuration and actionsCount

4. **Coin Flip Game** (`app/game/coin-flip/page.tsx`)
   - ✅ Sound integration
   - ✅ Random difficulty (1-3)
   - ✅ Anti-cheat checks
   - ✅ Proper score signing with wallet

5. **Memory Match Game** (`app/game/memory-match/page.tsx`)
   - ✅ Imports added
   - ⚠️ Still needs: sound integration, anti-cheat in game logic, score submission update

## 📋 Remaining Work

### For Each Remaining Game (Memory Match, Number Rush, Color Tap, Word Builder, Math Quiz):

1. **Add Sound Effects:**
   - Card flip/click → `playSound('click')`
   - Match → `playSound('match')`
   - Mismatch → `playSound('mismatch')`
   - Victory → `playSound('victory')`
   - Game Over → `playSound('gameover')`
   - Level Up → `playSound('levelup')`
   - Success → `playSound('success')`

2. **Add Random Difficulty:**
   ```typescript
   // In useEffect when address is loaded:
   const randomDiff = getRandomDifficulty(address, GAME_ID, min, max);
   setDifficulty(randomDiff);
   
   // In startGame():
   const randomDiff = getRandomDifficulty(address, GAME_ID, min, max);
   setDifficulty(randomDiff);
   antiCheat.clearHistory(address);
   setActionsCount(0);
   setGameStartTime(Date.now());
   ```

3. **Add Anti-Cheat Checks:**
   ```typescript
   // Before user actions (clicks, moves, etc.):
   const cheatCheck = antiCheat.checkAction(address, 'action_name', { data });
   if (cheatCheck.suspicious) {
     console.warn('Suspicious activity:', cheatCheck.reason);
     alert('Suspicious activity detected. Please play normally.');
     return;
   }
   antiCheat.recordAction(address, 'action_name', { correct: true/false, ... });
   setActionsCount(prev => prev + 1);
   ```

4. **Update Score Calculation with Difficulty Multiplier:**
   ```typescript
   const difficultyMultiplier = getDifficultyMultiplier(difficulty);
   const finalScore = Math.floor(baseScore * difficultyMultiplier);
   ```

5. **Update Score Submission:**
   ```typescript
   async function submitScore() {
     const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
     
     // Anti-cheat validation
     const scoreCheck = antiCheat.validateScore(address, score, gameDuration, actionsCount);
     if (scoreCheck.suspicious) {
       alert('Score validation failed.');
       return;
     }
     
     // Get nonce
     const { nonce } = await fetch('/api/game/score/nonce', {
       method: 'POST',
       headers: { 'content-type': 'application/json' },
       body: JSON.stringify({ address })
     }).then(r => r.json());
     
     // Sign message
     const base = { 
       address, 
       score, 
       ts: Date.now(), 
       nonce, 
       gameId: GAME_ID, 
       gameDuration, 
       actionsCount 
     };
     const message = JSON.stringify(base);
     const signature = await signMessageWithMiniKit(message);
     
     // Submit
     await fetch('/api/game/score/submit', {
       method: 'POST',
       headers: { 'content-type': 'application/json' },
       body: JSON.stringify({ address, payload: base, sig: signature })
     });
   }
   ```

6. **Add State Variables:**
   ```typescript
   const [soundEnabled, setSoundEnabledState] = useState(true);
   const [actionsCount, setActionsCount] = useState(0);
   const [gameStartTime, setGameStartTime] = useState(0);
   ```

## 🎮 Game-Specific Notes

### Memory Match
- Difficulty: 0-2 (index into GRID_SIZES)
- Actions: `flip_card`, `match`, `mismatch`
- Sound on: card flip (click), match (match), mismatch (mismatch), victory (victory)

### Number Rush
- Difficulty: 1-3 (speed levels)
- Actions: `click_number`
- Sound on: click (click), correct sequence (success), wrong (wrong), level up (levelup), victory (victory)

### Color Tap
- Difficulty: 1-3 (sequence length)
- Actions: `tap_color`, `match_sequence`
- Sound on: tap (click), correct (correct), wrong (wrong), complete (complete), victory (victory)

### Word Builder
- Difficulty: 1-3 (word length/time limit)
- Actions: `select_letter`, `submit_word`
- Sound on: letter select (click), word found (success), invalid word (wrong), time warning (timer), victory (victory)

### Math Quiz
- Difficulty: 1-3 (operation complexity)
- Actions: `answer_question`
- Sound on: answer (click), correct (correct), wrong (wrong), level up (levelup), victory (victory)
