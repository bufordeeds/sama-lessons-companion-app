import { Audio } from 'expo-av';
import { DEFAULT_SOUND_ID, getSoundById, type MetronomeSound } from '@/constants/metronome';

type TickCallback = (beat: number) => void;

class MetronomeService {
  private static instance: MetronomeService | null = null;
  private hiSound: Audio.Sound | null = null;
  private loSound: Audio.Sound | null = null;
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

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    await this.loadSounds(soundId ?? this.currentSoundId);
    this.isInitialized = true;
  }

  private async loadSounds(soundId: string): Promise<void> {
    // Unload previous sounds
    await this.unloadSounds();

    const sound = getSoundById(soundId);
    this.currentSoundId = sound.id;

    const [{ sound: hi }, { sound: lo }] = await Promise.all([
      Audio.Sound.createAsync(sound.hi),
      Audio.Sound.createAsync(sound.lo),
    ]);

    this.hiSound = hi;
    this.loSound = lo;
  }

  private async unloadSounds(): Promise<void> {
    if (this.hiSound) {
      await this.hiSound.unloadAsync();
      this.hiSound = null;
    }
    if (this.loSound) {
      await this.loSound.unloadAsync();
      this.loSound = null;
    }
  }

  async changeSound(soundId: string): Promise<void> {
    if (soundId === this.currentSoundId) return;
    await this.loadSounds(soundId);
  }

  /** Play a single click (for preview in sound picker) */
  async playPreview(soundId: string, accent: boolean = true): Promise<void> {
    const sound = getSoundById(soundId);
    const { sound: preview } = await Audio.Sound.createAsync(accent ? sound.hi : sound.lo);
    await preview.playAsync();
    // Cleanup after playback
    preview.setOnPlaybackStatusUpdate((status) => {
      if ('didJustFinish' in status && status.didJustFinish) {
        preview.unloadAsync();
      }
    });
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

  private async playBeat(): Promise<void> {
    const isAccent = this.beatCount % 4 === 0; // Beat 1 of 4/4

    if (!this._isMuted) {
      try {
        const player = isAccent ? this.hiSound : this.loSound;
        if (player) {
          await player.setPositionAsync(0);
          await player.playAsync();
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

  async cleanup(): Promise<void> {
    this.stop();
    await this.unloadSounds();
    this.isInitialized = false;
  }
}

export const metronome = MetronomeService.getInstance();
