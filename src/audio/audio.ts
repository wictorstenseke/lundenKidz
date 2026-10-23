import type { MusicId } from "../levels/themes";
import { SONGS, type Song } from "./songs";

export type Sfx = "jump" | "diamond" | "stomp" | "hurt" | "heart" | "checkpoint" | "goal" | "death" | "move" | "select" | "pause" | "spring";

const midiToHz = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Procedural chiptune: every sound is synthesised, no audio files. */
class ChipAudio {
  private ctx?: AudioContext;
  private sfxBus?: GainNode;
  private musicBus?: GainNode;
  private master?: GainNode;
  private muted = false;
  private song?: Song;
  /** Requested song; it starts once audio is unlocked. */
  private songId?: MusicId | "title" | "runner";
  private step = 0;
  private nextNoteTime = 0;
  private timer?: number;

  /** Browsers only allow audio after a user gesture; call from an input handler. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.6;
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.5;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.22;
      this.musicBus.connect(this.master);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.songId && this.timer === undefined) this.startSong();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  playMusic(id: MusicId | "title" | "runner"): void {
    if (this.songId === id && this.timer !== undefined) return;
    this.stopMusic();
    this.songId = id;
    if (this.ctx) this.startSong();
  }

  stopMusic(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
    this.songId = undefined;
  }

  private startSong(): void {
    this.song = SONGS[this.songId!];
    this.step = 0;
    this.nextNoteTime = this.ctx!.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  sfx(name: Sfx): void {
    if (!this.ctx || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    const seq = (notes: number[], len: number, wave: OscillatorType = "square") =>
      notes.forEach((n, i) => this.tone(this.sfxBus!, wave, midiToHz(n), t + i * len, len * 0.95, 0.5));
    switch (name) {
      case "jump": this.sweep("square", 320, 640, t, 0.13, 0.35); break;
      case "diamond": seq([88, 93], 0.06); break;
      case "stomp": this.sweep("square", 220, 70, t, 0.14, 0.5); break;
      case "hurt": this.sweep("sawtooth", 440, 110, t, 0.3, 0.45); break;
      case "heart": seq([72, 76, 79, 84], 0.07, "triangle"); break;
      case "checkpoint": seq([76, 79, 83], 0.09); break;
      case "goal": seq([72, 76, 79, 84, 79, 84, 88], 0.11); break;
      case "death": seq([72, 67, 64, 60, 55], 0.14, "triangle"); break;
      case "move": seq([81], 0.04); break;
      case "select": seq([81, 88], 0.06); break;
      case "pause": seq([76, 69], 0.07); break;
      case "spring": this.sweep("triangle", 180, 900, t, 0.3, 0.6); break;
    }
  }

  private schedule(): void {
    if (!this.ctx || !this.song || !this.musicBus) return;
    const eighth = 60 / this.song.bpm / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      const song = this.song;
      const note = song.lead[this.step % song.lead.length];
      if (note !== null) this.tone(this.musicBus, song.leadWave, midiToHz(note), this.nextNoteTime, eighth * 0.9, 0.5);
      if (this.step % 2 === 0) {
        const root = song.bass[Math.floor(this.step / 8) % song.bass.length];
        const octave = this.step % 4 === 0 ? 0 : 12;
        this.tone(this.musicBus, "triangle", midiToHz(root + octave), this.nextNoteTime, eighth * 1.6, 0.9);
      }
      this.nextNoteTime += eighth;
      this.step++;
    }
  }

  private tone(bus: AudioNode, wave: OscillatorType, hz: number, start: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(bus);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private sweep(wave: OscillatorType, from: number, to: number, start: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + dur);
    gain.gain.setValueAtTime(vol, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(this.sfxBus!);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

export const audio = new ChipAudio();
