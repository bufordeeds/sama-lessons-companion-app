import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { DEFAULT_SOUND_ID, getSoundById } from '@/constants/metronome';

type TickCallback = (beat: number) => void;

class MetronomeService {
  private static instance: MetronomeService | null = null;
  private hiPlayers: AudioPlayer[] = [];
  private loPlayers: AudioPlayer[] = [];
  private hiIndex = 0;
  private loIndex = 0;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private nextTickTime = 0;
  private currentSoundId: string = DEFAULT_SOUND_ID;
  private beatCount = 0;
  private tempo = 100;
  private _subdivision: 1 | 2 = 1; // 1 = quarter notes, 2 = eighth notes
  private _isPlaying = false;
  private _isMuted = false;
  private isInitialized = false;
  private onTick: TickCallback | null = null;

  static getInstance(): MetronomeService {
    if (!MetronomeService.instance) {
      MetronomeService.instance = new MetronomeService();
    }
    return MetronomeService.instance;
  }

  async initialize(soundId?: string): Promise<void> {
    if (this.isInitialized) return;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });

    await this.loadSounds(soundId ?? this.currentSoundId);
    this.isInitialized = true;
  }

  private async loadSounds(soundId: string): Promise<void> {
    this.removePlayers();

    const sound = getSoundById(soundId);
    this.currentSoundId = sound.id;

    // Double-buffer: 2 players per sound so one can seek while the other plays
    this.hiPlayers = [createAudioPlayer(sound.hi), createAudioPlayer(sound.hi)];
    this.loPlayers = [createAudioPlayer(sound.lo), createAudioPlayer(sound.lo)];
    this.hiIndex = 0;
    this.loIndex = 0;
  }

  private removePlayers(): void {
    for (const p of this.hiPlayers) p.remove();
    for (const p of this.loPlayers) p.remove();
    this.hiPlayers = [];
    this.loPlayers = [];
  }

  async changeSound(soundId: string): Promise<void> {
    if (soundId === this.currentSoundId) return;
    await this.loadSounds(soundId);
  }

  /** Play a single click (for preview in sound picker) */
  async playPreview(soundId: string, accent: boolean = true): Promise<void> {
    const sound = getSoundById(soundId);
    const preview = createAudioPlayer(accent ? sound.hi : sound.lo);
    preview.seekTo(0);
    preview.play();
    // Remove after a short delay to allow playback
    setTimeout(() => preview.remove(), 2000);
  }

  start(tempo: number, onTick?: TickCallback): void {
    this.stop();
    this.tempo = tempo;
    this.beatCount = 0;
    this._isPlaying = true;
    this.onTick = onTick ?? null;

    // Play first beat immediately
    this.playBeat();

    // Use drift-compensating setTimeout for accurate timing
    this.nextTickTime = performance.now() + this.msPerClick;
    this.scheduleTick();
  }

  private get msPerClick(): number {
    return 60000 / (this.tempo * this._subdivision);
  }

  private scheduleTick(): void {
    const now = performance.now();
    const delay = Math.max(0, this.nextTickTime - now);

    this.timeoutId = setTimeout(() => {
      if (!this._isPlaying) return;
      this.beatCount++;
      this.playBeat();

      // Schedule next tick relative to ideal time (not actual time) to prevent drift
      this.nextTickTime += this.msPerClick;
      this.scheduleTick();
    }, delay);
  }

  private playBeat(): void {
    const clicksPerMeasure = 4 * this._subdivision;
    const isAccent = this.beatCount % clicksPerMeasure === 0; // Beat 1 of 4/4

    if (!this._isMuted) {
      try {
        if (isAccent && this.hiPlayers.length > 0) {
          const player = this.hiPlayers[this.hiIndex];
          this.hiIndex = (this.hiIndex + 1) % this.hiPlayers.length;
          player.seekTo(0);
          player.play();
        } else if (!isAccent && this.loPlayers.length > 0) {
          const player = this.loPlayers[this.loIndex];
          this.loIndex = (this.loIndex + 1) % this.loPlayers.length;
          player.seekTo(0);
          player.play();
        }
      } catch {
        // Ignore playback errors
      }
    }

    this.onTick?.(this.beatCount);
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this._isPlaying = false;
    this.beatCount = 0;
    this.onTick = null;
  }

  setTempo(tempo: number): void {
    this.tempo = tempo;
    if (this._isPlaying) {
      const cb = this.onTick;
      this.stop();
      this.start(tempo, cb ?? undefined);
    }
  }

  setSubdivision(sub: 1 | 2): void {
    this._subdivision = sub;
    if (this._isPlaying) {
      const cb = this.onTick;
      this.stop();
      this.start(this.tempo, cb ?? undefined);
    }
  }

  mute(): void {
    this._isMuted = true;
  }

  unmute(): void {
    this._isMuted = false;
  }

  toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    return this._isMuted;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  get soundId(): string {
    return this.currentSoundId;
  }

  get currentTempo(): number {
    return this.tempo;
  }

  get subdivision(): 1 | 2 {
    return this._subdivision;
  }

  get currentBeat(): number {
    return this.beatCount;
  }

  cleanup(): void {
    this.stop();
    this.removePlayers();
    this.isInitialized = false;
  }
}

export const metronome = MetronomeService.getInstance();
