import Phaser from "phaser";
import { FX, type FxFlags } from "./flags";

/**
 * Tunables. Bloom = threshold -> blur -> ADD onto original (what Phaser.Actions.AddEffectBloom builds).
 * Tuned by eye in Sunny Meadow: clouds, white glints and the diamond halo glow; the sky and grass do not.
 */
export const FX_TUNING = {
  /**
   * Threshold is per colour channel, not luminance: anything with a channel above this blooms.
   * The grass sky is #7ff0a5 (green 0.94), so it must stay above that or the whole sky glows.
   */
  bloomThreshold: 0.95,
  /** Blur quality (0 low, 1 med, 2 high), x/y offsets, strength, steps. */
  bloomBlurQuality: 1,
  bloomBlurX: 2,
  bloomBlurY: 2,
  bloomBlurStrength: 1,
  /** Blend amount of the blurred highlights (0.25-0.4 is subtle). */
  bloomAmount: 0.35,
  /**
   * Vignette: the shader is fully dark OUTSIDE the radius (normalised screen distance from the centre,
   * corners are at 0.71) and darkens by sin(d / radius * PI * strength) inside it. A radius well above
   * 0.71 with a low strength gives a gentle, nearly linear fall-off: ~10% at a quarter of the way
   * out, ~27% in the corners.
   */
  vignetteX: 0.5,
  vignetteY: 0.5,
  vignetteRadius: 2.0,
  vignetteStrength: 0.25,
} as const;

export interface CameraFx {
  bloom?: Phaser.Filters.ParallelFilters;
  vignette?: Phaser.Filters.Vignette;
  setBloom(on: boolean): void;
  setVignette(on: boolean): void;
}

/** Adds bloom (internal, keeps pixel look) and vignette (external, screen-aligned) per flags. */
export function applyCameraFx(camera: Phaser.Cameras.Scene2D.Camera, flags: FxFlags = FX): CameraFx {
  const t = FX_TUNING;

  const makeBloom = (): Phaser.Filters.ParallelFilters => {
    const pf = camera.filters.internal.addParallelFilters();
    pf.top.addThreshold(t.bloomThreshold, 1);
    pf.top.addBlur(t.bloomBlurQuality, t.bloomBlurX, t.bloomBlurY, t.bloomBlurStrength);
    pf.blend.blendMode = Phaser.BlendModes.ADD;
    pf.blend.amount = t.bloomAmount;
    return pf;
  };
  const makeVignette = (): Phaser.Filters.Vignette =>
    camera.filters.external.addVignette(t.vignetteX, t.vignetteY, t.vignetteRadius, t.vignetteStrength);

  const fx: CameraFx = {
    setBloom(on) {
      if (fx.bloom) fx.bloom.active = on;
      else if (on) fx.bloom = makeBloom();
    },
    setVignette(on) {
      if (fx.vignette) fx.vignette.active = on;
      else if (on) fx.vignette = makeVignette();
    },
  };
  fx.setBloom(flags.bloom);
  fx.setVignette(flags.vignette);
  return fx;
}

/** Outer glow on a pickup/lantern. Undefined when disabled or filters unavailable (Canvas). */
export function addGlow(
  obj: Phaser.GameObjects.Components.Filters,
  color: number,
  outerStrength = 2,
  flags: FxFlags = FX,
): Phaser.Filters.Glow | undefined {
  if (!flags.glow) return undefined;
  obj.enableFilters();
  return obj.filters?.internal.addGlow(color, outerStrength, 0, 1);
}
