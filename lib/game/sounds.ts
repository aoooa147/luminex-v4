/**
 * Shared Sound Utility Library for Games
 * Uses Web Audio API to generate sound effects
 */

type SoundType = 'sine' | 'square' | 'sawtooth' | 'triangle';
type GameSound =
  | 'flip' | 'correct' | 'wrong' | 'victory' | 'gameover'
  | 'click' | 'match' | 'mismatch' | 'complete' | 'timer'
  | 'success' | 'error' | 'levelup' | 'powerup' | 'bonus';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

  constructor() {
    if (typeof window !== 'undefined') {
      // Load sound preference from localStorage
      const savedPref = localStorage.getItem('game_sound_enabled');
      this.enabled = savedPref !== 'false';
      
      const savedVolume = localStorage.getItem('game_sound_volume');
      if (savedVolume) {
        this.volume = parseFloat(savedVolume) || 0.3;
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error('Failed to create AudioContext:', e);
        return null;
      }
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
    
    return this.audioContext;
  }

  private playTone(
    frequency: number,
    duration: number,
    type: SoundType = 'sine',
    volume: number = this.volume,
    startTime?: number,
    endFrequency?: number
  ) {
    if (!this.enabled) return;
    
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      if (endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + duration);
      }
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      oscillator.start(ctx.currentTime + (startTime || 0));
      oscillator.stop(ctx.currentTime + (startTime || 0) + duration);
    } catch (e) {
      console.error('Failed to play tone:', e);
    }
  }

  private playChord(frequencies: number[], duration: number, type: SoundType = 'sine') {
    frequencies.forEach((freq, index) => {
      this.playTone(freq, duration, type, this.volume * 0.6, index * 0.05);
    });
  }

  // Game-specific sounds
  play(sound: GameSound) {
    switch (sound) {
      // Coin Flip
      case 'flip':
        this.playTone(300, 0.1, 'sine');
        setTimeout(() => this.playTone(400, 0.1, 'sine'), 50);
        setTimeout(() => this.playTone(500, 0.1, 'sine'), 100);
        break;

      // Correct/Match
      case 'correct':
      case 'match':
        this.playChord([523, 659, 784], 0.3, 'sine'); // C major chord
        break;

      // Wrong/Mismatch
      case 'wrong':
      case 'mismatch':
        this.playTone(200, 0.3, 'sawtooth');
        setTimeout(() => this.playTone(150, 0.3, 'sawtooth'), 100);
        break;

      // Victory/Complete
      case 'victory':
      case 'complete':
        this.playTone(523, 0.2, 'sine'); // C
        setTimeout(() => this.playTone(659, 0.2, 'sine'), 150); // E
        setTimeout(() => this.playTone(784, 0.2, 'sine'), 300); // G
        setTimeout(() => this.playTone(1047, 0.5, 'sine'), 450); // C (high)
        break;

      // Game Over
      case 'gameover':
        this.playTone(200, 0.5, 'sawtooth');
        setTimeout(() => this.playTone(150, 0.5, 'sawtooth'), 200);
        setTimeout(() => this.playTone(100, 0.5, 'sawtooth'), 400);
        break;

      // Click
      case 'click':
        this.playTone(800, 0.05, 'square', this.volume * 0.5);
        break;

      // Success
      case 'success':
        this.playChord([523, 659], 0.2, 'sine');
        break;

      // Error
      case 'error':
        this.playTone(150, 0.3, 'sawtooth');
        break;

      // Level Up
      case 'levelup':
        this.playTone(440, 0.15, 'sine');
        setTimeout(() => this.playTone(554, 0.15, 'sine'), 100);
        setTimeout(() => this.playTone(659, 0.3, 'sine'), 200);
        break;

      // Powerup/Bonus
      case 'powerup':
      case 'bonus':
        this.playTone(440, 0.1, 'sine', this.volume * 0.7);
        setTimeout(() => this.playTone(554, 0.1, 'sine', this.volume * 0.7), 80);
        setTimeout(() => this.playTone(659, 0.1, 'sine', this.volume * 0.7), 160);
        setTimeout(() => this.playTone(784, 0.2, 'sine', this.volume * 0.7), 240);
        break;

      // Timer (tick)
      case 'timer':
        this.playTone(1000, 0.05, 'square', this.volume * 0.3);
        break;
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('game_sound_enabled', String(enabled));
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (typeof window !== 'undefined') {
      localStorage.setItem('game_sound_volume', String(this.volume));
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSound = (sound: GameSound) => soundManager.play(sound);
export const setSoundEnabled = (enabled: boolean) => soundManager.setEnabled(enabled);
export const setSoundVolume = (volume: number) => soundManager.setVolume(volume);
export const isSoundEnabled = () => soundManager.isEnabled();
export const getSoundVolume = () => soundManager.getVolume();
