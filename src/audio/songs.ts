import type { MusicId } from "../levels/themes";

export interface Song {
  bpm: number;
  /** One MIDI note (or null for rest) per eighth note. */
  lead: (number | null)[];
  /** Bass root per bar (8 eighths), looped alongside the lead. */
  bass: number[];
  leadWave: OscillatorType;
}

const _ = null;

export const SONGS: Record<MusicId | "title" | "runner", Song> = {
  title: {
    bpm: 132,
    leadWave: "square",
    lead: [72, _, 79, _, 76, 79, 84, _, 83, _, 79, _, 76, _, 74, _, 72, _, 76, _, 79, 76, 81, _, 79, _, 77, 76, 74, _, _, _],
    bass: [48, 52, 53, 55],
  },
  meadow: {
    bpm: 140,
    leadWave: "square",
    lead: [72, _, 76, 79, 77, 76, 74, _, 72, _, 76, 79, 81, 79, 77, _, 76, _, 77, 79, 81, _, 79, 77, 76, 74, 72, 74, 76, _, _, _],
    bass: [48, 53, 55, 48],
  },
  cave: {
    bpm: 108,
    leadWave: "triangle",
    lead: [69, _, 72, _, 71, _, 67, _, 69, _, 72, 76, 74, _, _, _, 72, _, 71, _, 69, _, 64, _, 65, _, 67, _, 69, _, _, _],
    bass: [45, 43, 41, 40],
  },
  snow: {
    bpm: 120,
    leadWave: "triangle",
    lead: [77, 81, 84, 81, 79, _, 76, _, 77, 81, 84, 89, 88, _, _, _, 86, 84, 81, 84, 82, _, 79, _, 77, _, 76, _, 77, _, _, _],
    bass: [41, 46, 48, 41],
  },
  sky: {
    bpm: 150,
    leadWave: "triangle",
    lead: [79, 84, 88, 84, 91, _, 88, _, 86, 83, 79, 83, 86, _, _, _, 81, 84, 88, 84, 89, _, 88, 86, 84, _, 83, _, 84, _, _, _],
    bass: [48, 43, 45, 41],
  },
  runner: {
    bpm: 168,
    leadWave: "square",
    lead: [76, _, 76, 79, _, 76, 81, _, 79, _, 76, _, 74, 76, _, _, 72, _, 72, 76, _, 72, 79, _, 77, _, 76, 74, 72, _, 74, _],
    bass: [45, 41, 43, 40],
  },
  castle: {
    bpm: 126,
    leadWave: "square",
    lead: [62, _, 65, _, 69, _, 68, 69, 70, _, 69, _, 65, _, _, _, 62, _, 65, 69, 74, _, 73, _, 70, 69, 67, 65, 64, _, 61, _],
    bass: [38, 34, 36, 33],
  },
};
