/**
 * TypeScript mirror of the backend `ClipSpec` Pydantic contract
 * (apps/api/app/models/schemas.py — see docs/VIDEO_EDITOR.md §4).
 *
 * This is the renderer-agnostic render contract. Keep it in lockstep with the
 * Python model; it carries no Remotion/React concepts so the renderer behind it
 * stays swappable.
 */

export type Aspect = "9:16" | "1:1";

export type CaptionStylePreset = "clean-bottom" | "karaoke-highlight";

export interface ClipSource {
  asset_id: string;
  /** Browser-playable URL via the storage seam (api Range endpoint or S3). */
  url: string;
  fps: number;
}

export interface ClipSegment {
  start: number;
  end: number;
  /** Non-destructive delete (transcript "delete sentence"). Skipped on render. */
  hidden: boolean;
}

export interface ClipCrop {
  /** Normalized center + scale; applied via CSS transform (not object-position). */
  x: number;
  y: number;
  scale: number;
}

export interface CaptionCue {
  start: number;
  end: number;
  text: string;
  lang: string;
}

export interface ClipTitle {
  text: string;
  enabled: boolean;
}

export interface ClipMusic {
  track_id: string | null;
  enabled: boolean;
  gain_db: number;
}

export interface ClipSpec {
  source: ClipSource;
  aspect: Aspect;
  segments: ClipSegment[];
  crop: ClipCrop;
  caption_track: CaptionCue[];
  caption_style_preset: CaptionStylePreset;
  title: ClipTitle;
  music: ClipMusic;
  brand_ref: string | null;
  target_language: string;
}

export const ASPECT_DIMENSIONS: Record<Aspect, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

/** Composition timeline fps (independent of the source's fps). */
export const COMPOSITION_FPS = 30;

/** Non-hidden segments in order. */
export const keptSegments = (spec: ClipSpec): ClipSegment[] =>
  spec.segments.filter((s) => !s.hidden);

/** Total kept duration in seconds (>= a single frame). */
export const totalDurationSeconds = (spec: ClipSpec): number => {
  const total = keptSegments(spec).reduce((acc, s) => acc + Math.max(0, s.end - s.start), 0);
  return total > 0 ? total : 1 / COMPOSITION_FPS;
};
