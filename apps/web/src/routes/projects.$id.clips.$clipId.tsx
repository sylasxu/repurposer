import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Player } from '@remotion/player'
import {
  Clip as ClipComposition,
  ASPECT_DIMENSIONS,
  COMPOSITION_FPS,
  totalDurationSeconds,
  type ClipSpec,
} from '@repurposer/clip'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface Clip {
  id: string
  hook: string
  render_spec: ClipSpec | null
  render_status: string | null
  video_url: string | null
  srt_url: string | null
}

export const Route = createFileRoute('/projects/$id/clips/$clipId')({
  component: ClipEditorPage,
})

/** Absolutize the spec's source URL (stored relative via the storage seam). */
function withAbsoluteSource(spec: ClipSpec): ClipSpec {
  const url = spec.source.url
  if (url && url.startsWith('/')) {
    return { ...spec, source: { ...spec.source, url: API_URL + url } }
  }
  return spec
}

function ClipEditorPage() {
  const { id, clipId } = Route.useParams()
  const { t } = useTranslation()

  const [clip, setClip] = useState<Clip | null>(null)
  const [error, setError] = useState('')
  // Remotion Player is browser-only — render it after mount to stay SSR-safe.
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/api/v1/clips/${clipId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Clip not found'))))
      .then(setClip)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load clip'))
  }, [clipId])

  const spec = clip?.render_spec ? withAbsoluteSource(clip.render_spec) : null

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('clipEditor.back')}
          render={<Link to="/projects/$id" params={{ id }} />}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-xl font-bold tracking-tight">
          {clip?.hook || t('clipEditor.title')}
        </h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Preview (left) */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border shadow-xl">
            {mounted && spec ? (
              <Player
                component={ClipComposition}
                inputProps={{ spec }}
                durationInFrames={Math.max(
                  1,
                  Math.round(totalDurationSeconds(spec) * COMPOSITION_FPS),
                )}
                fps={COMPOSITION_FPS}
                compositionWidth={ASPECT_DIMENSIONS[spec.aspect].width}
                compositionHeight={ASPECT_DIMENSIONS[spec.aspect].height}
                style={{ width: '100%', aspectRatio: spec.aspect === '1:1' ? '1 / 1' : '9 / 16' }}
                controls
              />
            ) : (
              <div className="flex aspect-[9/16] items-center justify-center text-sm text-white/60">
                {clip && !spec
                  ? t('clipEditor.noRenderSpec')
                  : t('common.loading')}
              </div>
            )}
          </div>
        </div>

        {/* Panels (right) — transcript / style / export land here in later steps. */}
        <div className="rounded-xl bg-card p-6 ring-1 ring-border">
          <p className="text-sm text-muted-foreground">{t('clipEditor.panelsSoon')}</p>
        </div>
      </div>
    </div>
  )
}
