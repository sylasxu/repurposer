# API Specification

> Status: Draft, updated iteratively as development progresses.

## 1. Basics

- **Base URL**: `http://localhost:8000`
- **API Prefix**: `/api/v1`
- **Content-Type**: `application/json`
- **Authentication**: Not implemented in this phase; JWT or session-based auth will be added later.

## 2. Main Flow Call Sequence

The homepage input box is the main entry point. After the user clicks Generate, the frontend calls the following endpoints in sequence:

```
POST /api/v1/projects
  → Create Project
  → Returns { id, title, ... }

POST /api/v1/projects/{project_id}/assets
  → Upload raw material (file or prompt text)
  → Returns { id, type, processing_status: "pending", ... }

POST /api/v1/projects/{project_id}/generate
  → Trigger async generation
  → Returns { job_id, status: "pending" }
```

After that, the frontend navigates to the project detail page and polls the following endpoints to check results:

```
GET /api/v1/projects/{project_id}
GET /api/v1/projects/{project_id}/assets
GET /api/v1/projects/{project_id}/clips
GET /api/v1/projects/{project_id}/derivatives
GET /api/v1/projects/{project_id}/jobs/{job_id}
```

When rendering a video, call:

```
POST /api/v1/clips/{clip_id}/render
```

## 3. File Streaming

Source video uploads, rendered outputs, and built-in music tracks are all served through HTTP Range-enabled endpoints for browser playback, seeking, and renderer fetching:

```http
GET /api/v1/files/{file_path}
GET /api/v1/outputs/{file_path}
GET /api/v1/music/{mood}        # Built-in mood library, e.g. calm / uplifting / corporate
```

## 4. Error Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Project not found",
    "detail": {}
  }
}
```

## 5. Speaker Management

> **Evolution Note**: The Speaker API is being refactored per ADR-021. The target direction is: Speakers are isolated per user; `speaker_id` is optional at project creation; if not selected, the system auto-creates one. The endpoints below still retain the manual-creation and past-material-to-persona shapes, and will gradually converge toward a unified auto/manual memory model.

### Create Speaker

```http
POST /api/v1/speakers
```

Request:

```json
{
  "name": "熊榆",
  "title": "萨里大学协理副校长",
  "language": "zh",
  "avatar_url": null
}
```

Response:

```json
{
  "id": "uuid",
  "name": "熊榆",
  "title": "萨里大学协理副校长",
  "language": "zh",
  "persona": null,
  "created_at": "2026-06-22T10:00:00Z"
}
```

### List Speakers

```http
GET /api/v1/speakers
```

### Get Speaker Detail

```http
GET /api/v1/speakers/{speaker_id}
```

### Update Speaker

```http
PUT /api/v1/speakers/{speaker_id}
```

### Upload Speaker Past Material

```http
POST /api/v1/speakers/{speaker_id}/materials
Content-Type: multipart/form-data
```

Fields:

- `file`: File
- `type`: `book` | `article` | `speech` | `social_media`

### Generate / Update Speaker Style Persona

```http
POST /api/v1/speakers/{speaker_id}/persona/generate
```

Response:

```json
{
  "core_values": ["人类尊严", "技术校准"],
  "favorite_metaphors": ["火"],
  "sentence_style": "理性、善用类比",
  "emotional_tone": "理性",
  "typical_hooks": ["关键不再是...而是..."],
  "avoid_words": []
}
```

## 4. Project Management

> **Evolution Note**: The `speaker_id` field in project creation is planned to become optional. When omitted, the system will automatically create a Speaker memory and associate it with the project after task processing completes. The current implementation may still require it; refactoring is in progress.

### Create Project

```http
POST /api/v1/projects
```

Request:

```json
{
  "speaker_id": "uuid",
  "title": "2026世界未来科技发展峰会演讲",
  "event_name": "2026世界未来科技发展峰会",
  "language": "zh"
}
```

### List Projects

```http
GET /api/v1/projects?speaker_id=uuid
```

### Get Project Detail

```http
GET /api/v1/projects/{project_id}
```

## 5. Asset Upload

### Upload Asset

```http
POST /api/v1/projects/{project_id}/assets
Content-Type: multipart/form-data
```

Fields:

- `file`: File
- `type`: `video` | `audio` | `transcript` | `slides` | `image` | `voice_sample` | `past_material`

> `voice_sample` can also be attached to a speaker (`POST /api/v1/speakers/{id}/assets`, with `type`) — see "Speaker = User Profile". `image`/`slides` will be processed: images go through M3 vision for key-point extraction; slide PDFs are rendered page-by-page into images.

### List Assets

```http
GET /api/v1/projects/{project_id}/assets
```

### Delete Asset

```http
DELETE /api/v1/projects/{project_id}/assets/{asset_id}
```

## 6. Generation Tasks

### Trigger Generation

```http
POST /api/v1/projects/{project_id}/generate
```

Request:

```json
{
  "clip_count": 3,
  "outputs": ["clips", "linkedin", "quote_cards", "carousel", "summary", "blog"],
  "target_language": "en",
  "brand_template_id": "uuid | null",        // Which brand template to use; defaults to latest if omitted
  "instruction": "聚焦实体机器人角度，hook 要狠",  // User intent, drives the analyzer/script and derivative agents
  "tone_settings": {
    "academic_vs_casual": 0.7,
    "rational_vs_passionate": 0.4,
    "concise_vs_detailed": 0.5,
    "audience": "industry"
  }
}
```

> `outputs` options: `clips | linkedin | quote_cards | carousel | summary | blog`. `clips` is always generated.

Response:

```json
{
  "job_id": "uuid",
  "status": "pending",
  "message": "Generation started"
}
```

### Query Generation Jobs

```http
GET /api/v1/projects/{project_id}/jobs
GET /api/v1/projects/{project_id}/jobs/{job_id}
```

## 7. Clip Management

### List Clips

```http
GET /api/v1/projects/{project_id}/clips
```

### Get Clip Detail

```http
GET /api/v1/clips/{clip_id}
```

### Edit Clip

```http
PUT /api/v1/clips/{clip_id}
```

Request:

```json
{
  "hook": "Your keynote reached 300 people...",
  "script": { "hook": "...", "shots": [...], ... },
  "title_options": ["...", "..."],
  "music_mood": "corporate",
  "render_spec": {
    "source": { "asset_id": "uuid", "kind": "video", "url": "...", "image_urls": [], "fps": 30 },
    "aspect": "9:16",
    "segments": [{ "start": 0, "end": 30, "hidden": false }],
    "caption_track": [{ "start": 0, "end": 1.2, "text": "Hello", "lang": "en" }],
    "caption_style_preset": "clean-bottom",
    "caption_position": { "x": 0.5, "y": 0.84 },
    "title": { "text": "...", "enabled": true, "size": 56, "position": { "x": 0.5, "y": 0.12 } },
    "music": { "track_id": "calm", "url": "...", "enabled": true, "gain_db": -18 },
    "dub": { "url": "...", "enabled": false, "gain_db": 0 },
    "brand": { "logo_url": "...", "cta": "...", "cta_position": { "x": 0.5, "y": 0.92 }, "caption_color": "#ffffff", "fill_mode": "fill" }
  }
}
```

> `source.kind`: `video` (real-person recording) | `stills` (image-audio montage, `image_urls` as base layer + optional `url` for voice). Position points `caption_position`/`title.position`/`brand.cta_position` are normalized `{x,y}`; null means default.

### Trigger Render

```http
POST /api/v1/clips/{clip_id}/render
```

Queued render: returns 202, worker claims `render_status=PENDING` → calls Remotion → writes back `video_url`/`srt_url`.

### Translate Captions

```http
POST /api/v1/clips/{clip_id}/translate-captions
```

Request: `{ "target_language": "fr" }`. Response: updated `Clip` (`caption_track` and `target_language` rewritten).

### Voice Clone Dubbing (dub)

```http
POST /api/v1/clips/{clip_id}/dub
```

Request: `{ "target_language": "fr" }`. Uses the speaker's voice (from persona VOICE_SAMPLE / this session's AUDIO / VIDEO extracted track) via MiniMax voice_clone + T2A to dub the (translated) captions into the target language. Response: updated `Clip`, `render_spec.dub` written (original audio is muted during render, dubbed audio plays).

### Revise Based on Feedback

```http
POST /api/v1/clips/{clip_id}/revise
```

Request: same as `FeedbackRequest`. Response: revised `Clip`.

### Submit Feedback

```http
POST /api/v1/clips/{clip_id}/feedback
```

Request:

```json
{
  "scope": "hook",
  "reason": "hook_not_catchy",
  "detail": "太平淡了，没有冲突感"
}
```

## 8. Derivative Content

### List Derivatives

```http
GET /api/v1/projects/{project_id}/derivatives
```

### Edit Derivative

```http
PUT /api/v1/derivatives/{derivative_id}
```

## 9. Export

### Export All Project Content

```http
POST /api/v1/projects/{project_id}/export
```

Request:

```json
{
  "formats": ["text", "images"]
}
```

Response:

```json
{
  "download_url": "https://storage.example.com/exports/uuid.zip",
  "expires_at": "2026-06-22T12:00:00Z"
}
```

## 10. Brand Template

Brand templates determine the brand overlay elements in the final video. **Full CRUD**; a default is seeded on startup. At generation time, `GenerateRequest.brand_template_id` selects one (defaults to latest), baking `aspect` / caption·title·CTA styles and **position points** / intro/outro / music mood into `render_spec`.

### Create / Update Brand Template

```http
POST /api/v1/brand-templates
PUT /api/v1/brand-templates/{template_id}
```

Request:

```json
{
  "name": "Default",
  "config": {
    "aspect": "9:16",
    "fillMode": "fill",
    "captionFont": "lilita",
    "captionSize": 56,
    "captionColor": "#facc15",
    "captionPosition": { "x": 0.5, "y": 0.84 },
    "titleSize": 58,
    "titlePosition": { "x": 0.5, "y": 0.12 },
    "ctaPosition": { "x": 0.5, "y": 0.92 },
    "logoUrl": "https://.../logo.png",
    "cta": "Read the full talk →",
    "introEnabled": true,
    "introText": "This talk is from…",
    "outroEnabled": true,
    "outroText": "Follow for more insights",
    "musicEnabled": true,
    "musicMood": "corporate"
  }
}
```

### List Brand Templates

```http
GET /api/v1/brand-templates
```

### Get Single Brand Template

```http
GET /api/v1/brand-templates/{template_id}
```

### Delete Brand Template

```http
DELETE /api/v1/brand-templates/{template_id}
```

## 11. Data Models

See the Data Models section in [Architecture Design](./ARCHITECTURE.md).

Core models:

- `Speaker` (= user profile: persona style + voiceprint; see ADR-021)
- `Project`
- `Asset`
- `Clip`
- `Derivative`
- `WorkflowRun`
- `HumanFeedback`
- `BrandTemplate`

Clip-spec related: `ClipSpec` / `ClipSource`(kind/image_urls) / `CaptionCue` / `ClipTitle`(size/position) / `ClipMusic` / `ClipDub` / `ClipBrand`(cta_position) / `Point`.
Requests/derivatives: `GenerateRequest`(carousel/brand_template_id/instruction) / `DubRequest` / `TranslateCaptionsRequest` / `CarouselResponse` / `CarouselSlide`.
