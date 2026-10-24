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
  // Bright, open, a bit of a yodel leap.
  alpine: {
    bpm: 136,
    leadWave: "square",
    lead: [67, _, 71, 74, 79, _, 74, _, 76, _, 74, 71, 72, _, _, _, 69, _, 72, 76, 81, _, 76, _, 79, 78, 76, 74, 71, _, _, _],
    bass: [43, 48, 45, 50],
  },
  // Slow and heavy, minor, like distant thunder.
  storm: {
    bpm: 112,
    leadWave: "triangle",
    lead: [64, _, _, 67, 71, _, 70, _, 67, _, 64, _, _, _, _, _, 62, _, _, 65, 69, _, 68, _, 65, _, 64, _, 62, _, _, _],
    bass: [40, 38, 36, 35],
  },
  // Wandering harmonic-minor desert tune.
  desert: {
    bpm: 128,
    leadWave: "square",
    lead: [69, _, 70, _, 73, _, 70, 69, 67, _, 69, _, _, _, _, _, 72, _, 73, _, 76, _, 73, 72, 70, _, 69, _, 68, _, 69, _],
    bass: [45, 41, 43, 44],
  },
  // Low, slow and echoing.
  tomb: {
    bpm: 100,
    leadWave: "triangle",
    lead: [57, _, _, _, 60, _, 59, _, 57, _, 55, _, _, _, _, _, 62, _, _, _, 60, _, 59, 57, 56, _, 57, _, _, _, _, _],
    bass: [33, 31, 29, 32],
  },
  // Bouncy pentatonic drums-in-the-trees.
  jungle: {
    bpm: 144,
    leadWave: "square",
    lead: [67, 70, 72, _, 70, 67, 65, _, 67, 70, 72, 75, 74, _, 72, _, 70, 72, 74, _, 72, 70, 67, _, 65, 67, 70, _, 67, _, _, _],
    bass: [43, 43, 41, 46],
  },
  // Creeping waltz-ish minor line.
  haunted: {
    bpm: 104,
    leadWave: "triangle",
    lead: [64, _, _, 67, _, _, 71, _, 70, _, _, 67, _, _, 64, _, 65, _, _, 68, _, _, 72, _, 71, _, _, 68, _, 65, _, _],
    bass: [40, 36, 41, 35],
  },
  // Heavy, driving, phrygian.
  volcano: {
    bpm: 150,
    leadWave: "square",
    lead: [62, _, 63, _, 62, 60, 58, _, 62, _, 63, 65, 67, _, 65, _, 63, _, 62, _, 60, _, 58, _, 57, _, 58, 60, 62, _, _, _],
    bass: [38, 38, 37, 36],
  },
  // Cool night-time groove.
  rooftops: {
    bpm: 118,
    leadWave: "triangle",
    lead: [69, _, 72, _, 76, _, 74, 72, 71, _, 69, _, _, _, 67, _, 69, _, 72, _, 77, _, 76, 74, 72, _, 71, _, 69, _, _, _],
    bass: [45, 41, 43, 40],
  },
  // Slow, wide and floaty.
  space: {
    bpm: 96,
    leadWave: "triangle",
    lead: [72, _, _, _, 79, _, _, _, 77, _, 76, _, _, _, _, _, 74, _, _, _, 81, _, _, _, 79, _, 77, _, 76, _, _, _],
    bass: [48, 45, 41, 43],
  },
};
