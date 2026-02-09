import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { DEFAULT_SOUND_ID, getSoundById } from '@/constants/metronome';

type TickCallback = (beat: number) => void;

class MetronomeService {
  private static instance: MetronomeService | null = null;
  private hiPlayer: AudioPlayer | null = null;
  private loPlayer: AudioPlayer | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentSoundId: string = DEFAULT_SOUND_ID;
  private beatCount = 0;
  private tempo = 100;
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

    this.hiPlayer = createAudioPlayer(sound.hi);
    this.loPlayer = createAudioPlayer(sound.lo);
  }

  private removePlayers(): void {
    if (this.hiPlayer) {
      this.hiPlayer.remove();
      this.hiPlayer = null;
    }
    if (this.loPlayer) {
      this.loPlayer.remove();
      this.loPlayer = null;
    }
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

    const msPerBeat = 60000 / tempo;

    // Play first beat immediately
    this.playBeat();

    this.intervalId = setInterval(() => {
      this.beatCount++;
      this.playBeat();
    }, msPerBeat);
  }

  private playBeat(): void {
    const isAccent = this.beatCount % 4 === 0; // Beat 1 of 4/4

    if (!this._isMuted) {
      try {
        const player = isAccent ? this.hiPlayer : this.loPlayer;
        if (player) {
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
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._isPlaying = false;
    this.beatCount = 0;
    this.onTick = null;
  }

  setTempo(tempo: number): void {
    this.tempo = tempo;
    if (this._isPlaying) {
      // Restart with new tempo
      const cb = this.onTick;
      this.stop();
      this.start(tempo, cb ?? undefined);
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
