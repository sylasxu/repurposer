import type { CaptionCue } from "@repurposer/clip";

/** Format seconds as an SRT timestamp (HH:MM:SS,mmm). */
function ts(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

/**
 * Build an SRT from the caption track, grouping words into readable lines and
 * rebasing times to the clip's start (so the .srt lines up with the exported
 * MP4, which starts at the first kept segment). This is the hand-off artifact
 * for downstream editing (CapCut/Premiere).
 */
export function captionTrackToSrt(cues: CaptionCue[], clipStart: number, wordsPerLine = 7): string {
  const blocks: string[] = [];
  let index = 1;
  for (let i = 0; i < cues.length; i += wordsPerLine) {
    const line = cues.slice(i, i + wordsPerLine);
    if (line.length === 0) continue;
    const start = ts(line[0].start - clipStart);
    const end = ts(line[line.length - 1].end - clipStart);
    const text = line.map((c) => c.text).join(" ").trim();
    blocks.push(`${index}\n${start} --> ${end}\n${text}\n`);
    index += 1;
  }
  return blocks.join("\n");
}
