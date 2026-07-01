# Brand-template Music Panel + Music Library Management

> **Project docs map** — if you are new to Repurposer, read these in order:
>
> | Doc | Purpose |
> |:---|:---|
> | `README.md` | Project overview, core capabilities, tech stack, directory structure, quick start. Read this first. |
> | `CLAUDE.md` | Frontend conventions and AI collaboration rules: shadcn/base-ui (`render` prop, not `asChild`), Tailwind, lucide icons, i18n workflow, Sidebar/Composer patterns. Read before writing UI code. |
> | `docs/ARCHITECTURE.md` | System architecture, data flow, agent pipeline, brand-template → render_spec flow. Read to understand where this task fits. |
> | `docs/PRD.md` | Product requirements and user stories. Read when you need product context. |
> | `docs/API.md` | API contract. Read when you add or change endpoints. |
> | `docs/VIDEO_EDITOR.md` | Clip-spec contract and renderer-agnostic design. Read for anything touching `render_spec`, captions, music, or video output. |
> | `docs/DECISIONS.md` | ADRs. Read ADR-013 (i18n), ADR-016 (video editor), ADR-017 (queue), and ADR-019 (music library) for why key choices were made. |
> | `docs/DATABASE_MIGRATIONS.md` | How to write and run Alembic migrations. Read when you change DB schema. |
> | `docs/SCHEDULE.md` | Current roadmap and milestones. Read to know what is in/out of scope right now. |
>
> The rest of this file is the specific task brief for the brand-template music panel.

## Why we need this

Background music is part of the final rendered clip. The backend already supports it: `services/brand.py:music_from_template` reads the brand-template's `musicMood` and bakes a track URL into `render_spec.music`. The renderer (`packages/clip/src/Clip.tsx`) then plays that track via Remotion `Audio`.

The problem is that the actual music library is empty. The `data/music/` directory only contains `.gitkeep` and a `README.md`. The `/brand-template` page lets the user pick a `musicMood` from a dropdown, but they cannot:

- See which tracks are actually available.
- Preview what a track sounds like.
- Upload or delete tracks.
- View or maintain licensing sources.

So the brand-template music setting is currently blind. This task makes it usable.

## How this fits into the main flow

BrandTemplate is not a prompt organizer. It is a **render-style preset**.

In the main flow:

1. The user configures a brand template at `/brand-template`.
2. When generating a clip, the system reads `BrandTemplate.config`.
3. `services/brand.py` resolves the config into `ClipBrand` and `ClipMusic` objects.
4. These objects are baked into each clip's `render_spec`.
5. The renderer (`packages/clip/src/Clip.tsx`) reads `render_spec.brand` and `render_spec.music` directly, without touching the database.

This separation exists so that the renderer is a replaceable black box and so that preview and final render are pixel-identical.

For music specifically, the chain is:

```
BrandTemplate.config.musicMood = "calm"
    ↓
music_from_template(config) → ClipMusic(track_id="calm", url="/api/v1/music/calm", enabled=true)
    ↓
render_spec.music = ClipMusic
    ↓
Clip.tsx renders <Audio src="/api/v1/music/calm" />
    ↓
Backend serves data/music/calm.mp3
```

The template stores the **result** (a mood that maps to a file), not a generation prompt. If AI-generated music is added later, the prompt is used once to produce a file; the template continues to reference the resulting mood/file.

## Current implementation

- **Storage**: Tracks are expected at `data/music/{mood}.mp3`.
- **Backend serving**: `GET /api/v1/music/{mood}` in `apps/api/app/routers/files.py` serves the track with Range support.
- **Resolution**: `apps/api/app/services/storage.py:resolve_music_safe` finds the file by mood stem, supporting `.mp3`, `.m4a`, `.aac`, `.ogg`, `.wav`.
- **Brand mapping**: `apps/api/app/services/brand.py:music_from_template` maps `BrandTemplate.config.musicMood` to a `ClipMusic` block.
- **Frontend selector**: `apps/web/src/routes/brand-template.tsx` has a `musicMood` Select with hardcoded options `calm`, `uplifting`, `corporate`, `none`.
- **Renderer**: `packages/clip/src/Clip.tsx` plays `spec.music.url` when enabled.
- **Preview**: The brand-template preview intentionally disables music to avoid 404s when no track file exists.

There is no API to list, upload, or delete tracks. There is no UI to preview tracks.

## What we want

Add a **Music** section inside `/brand-template`. Clicking it opens a panel that behaves like the reference screenshot: a track list with preview, selection, upload, delete, and source management.

Specifically:

- Add a `Music` row to the left-side settings list on `/brand-template`.
- Opening Music shows a panel with:
  - A list of tracks currently in `data/music/`.
  - Each track shows mood name, duration, a play/pause button, and a delete button.
  - The currently selected `musicMood` is highlighted.
  - Clicking a track sets it as the active `musicMood`.
  - Clicking play previews the track via `/api/v1/music/{mood}`.
  - An upload button to add new tracks.
  - A simple editor for `data/music/SOURCES.md`.
- Populate the library with 3 default tracks: `calm`, `corporate`, `uplifting`.
- Add a complete `data/music/SOURCES.md` with licensing info for each track.

## Code modules involved

### Backend

| File | What to do |
|:---|:---|
| `apps/api/app/routers/files.py` | Already serves `/api/v1/music/{mood}`. Keep as is. |
| `apps/api/app/routers/brand_templates.py` or a new `music.py` | Add `GET /api/v1/admin/music`, `POST /api/v1/admin/music`, `DELETE /api/v1/admin/music/{mood}`, `GET/PUT /api/v1/admin/music/sources`. |
| `apps/api/app/services/storage.py` | Reuse `resolve_music_safe`, `music_url`. May add helpers for listing music files. |
| `apps/api/app/models/schemas.py` | Add request/response schemas for track listing and upload if needed. |
| `apps/api/app/main.py` | Register the new router. |
| `data/music/` | Add 3 MP3 files and `SOURCES.md`. |

### Frontend

| File | What to do |
|:---|:---|
| `apps/web/src/routes/brand-template.tsx` | Add `Music` to the left settings list. Add the right-side panel. Wire track selection to `musicMood`. |
| `apps/web/src/lib/i18n/locales/zh.ts` / `en.ts` | Add UI copy for Music panel, upload, delete, sources. |
| `apps/web/src/components/ui/` | Reuse `Sheet`, `Dialog`, `Button`, `Table`, `Input` as needed. |

## Docs to read first

- `README.md` — project overview.
- `docs/ARCHITECTURE.md` — especially the brand-template and rendering sections.
- `docs/DECISIONS.md` ADR-019 — built-in mood music library decision.
- `docs/VIDEO_EDITOR.md` — how `render_spec.music` is used.
- `CLAUDE.md` — frontend conventions (shadcn, Tailwind, lucide icons, i18n, no `asChild`).

## Notes and precautions

- **No main flow changes**: Do not modify `services/generation.py`, `services/clip_spec.py`, or `packages/clip/src/Clip.tsx`. The existing mapping from `musicMood` to `render_spec.music` should keep working unchanged.
- **Template stores results, not prompts**: The `musicMood` field references a track file. If AI music generation is added later, the prompt produces a file; the template continues to store the mood.
- **File naming**: Use `{mood}.mp3` in `data/music/`. Keep mood names lowercase and simple.
- **Licensing**: Choose tracks that do not require attribution, such as Pixabay License. Document source, author, and license in `SOURCES.md`.
- **Duration**: If reading MP3 metadata is too much work, skip duration display or estimate from file size. Do not block the rest of the task on this.
- **UI consistency**: Use shadcn/ui components. Icons only from `lucide-react`. All copy through i18n.
- **Preview playback**: Let the user preview a track before selecting it. How to implement the player is up to you; keep it simple and consistent with the rest of the UI.
- **Upload/delete**: Confirm before delete. After upload or delete, refresh the track list.
- **SOURCES.md editor**: A simple textarea is enough. Save via the backend PUT endpoint.
- **No user system**: Do not add login or permissions. This is an internal management UI inside brand-template.
- **Keep it small**: Do not add search, categories, favorites, or playlists. Only list, preview, select, upload, delete, and source editing.

## Possible extensions

Once the core panel works, you can explore generating music directly inside the panel:

- Add a prompt input (e.g. "calm piano for academic talk").
- Call a music generation API such as MiniMax to create a track.
- Save the generated file to `data/music/{mood}.mp3`.
- Append the generation source to `SOURCES.md`.

This is not required for the first version. Solve the upload/preview/selection flow first, then consider AI generation as a stretch goal.

## Commit message examples

```
feat: add music panel and library management to brand-template
assets: add 3 default background tracks and license sources
```
