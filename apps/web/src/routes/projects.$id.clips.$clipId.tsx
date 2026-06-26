import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Player } from '@remotion/player'
import {
  Clip as ClipComposition,
  ASPECT_DIMENSIONS,
  COMPOSITION_FPS,
  removeRange,
  totalDurationSeconds,
  type CaptionCue,
  type ClipSpec,
} from '@repurposer/clip'
import { ArrowLeft, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const WORDS_PER_LINE = 7

interface Clip {
  id: string
  hook: string
  render_spec: ClipSpec | null
  render_status: string | null
}

export const Route = createFileRoute('/projects/$id/clips/$clipId')({
  component: ClipEditorPage,
})

function withAbsoluteSource(spec: ClipSpec): ClipSpec {
  const url = spec.source.url
  if (url && url.startsWith('/')) {
    return { ...spec, source: { ...spec.source, url: API_URL + url } }
  }
  return spec
}

/** Group the caption track into readable lines, keeping each cue's global index. */
function toLines(cues: CaptionCue[]): { cue: CaptionCue; index: number }[][] {
  const lines: { cue: CaptionCue; index: number }[][] = []
  for (let i = 0; i < cues.length; i += WORDS_PER_LINE) {
    lines.push(cues.slice(i, i + WORDS_PER_LINE).map((cue, j) => ({ cue, index: i + j })))
  }
  return lines
}

function ClipEditorPage() {
  const { id, clipId } = Route.useParams()
  const { t } = useTranslation()

  const [clip, setClip] = useState<Clip | null>(null)
  const [spec, setSpec] = useState<ClipSpec | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    fetch(`${API_URL}/api/v1/clips/${clipId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Clip not found'))))
      .then((c: Clip) => {
        setClip(c)
        setSpec(c.render_spec)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load clip'))
  }, [clipId])

  const previewSpec = useMemo(() => (spec ? withAbsoluteSource(spec) : null), [spec])
  const lines = spec ? toLines(spec.caption_track) : []

  const editWord = (index: number, text: string) => {
    setSpec((prev) =>
      prev
        ? {
            ...prev,
            caption_track: prev.caption_track.map((c, i) => (i === index ? { ...c, text } : c)),
          }
        : prev,
    )
    setDirty(true)
  }

  const deleteLine = (line: { cue: CaptionCue; index: number }[]) => {
    if (!spec || line.length === 0) return
    const start = line[0].cue.start
    const end = line[line.length - 1].cue.end
    setSpec(removeRange(spec, start, end))
    setDirty(true)
  }

  const save = async () => {
    if (!spec) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/v1/clips/${clipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ render_spec: spec }),
      })
      if (!res.ok) throw new Error('Save failed')
      setDirty(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
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
        <Button className="h-9" disabled={!dirty || saving} onClick={save}>
          {saving ? t('common.saving') : t('clipEditor.save')}
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
        {/* Preview (left) — reflects edits live */}
        <div className="overflow-hidden rounded-xl bg-black ring-1 ring-border shadow-xl self-start">
          {mounted && previewSpec ? (
            <Player
              component={ClipComposition}
              inputProps={{ spec: previewSpec }}
              durationInFrames={Math.max(
                1,
                Math.round(totalDurationSeconds(previewSpec) * COMPOSITION_FPS),
              )}
              fps={COMPOSITION_FPS}
              compositionWidth={ASPECT_DIMENSIONS[previewSpec.aspect].width}
              compositionHeight={ASPECT_DIMENSIONS[previewSpec.aspect].height}
              style={{
                width: '100%',
                aspectRatio: previewSpec.aspect === '1:1' ? '1 / 1' : '9 / 16',
              }}
              controls
            />
          ) : (
            <div className="flex aspect-[9/16] items-center justify-center text-sm text-white/60">
              {clip && !spec ? t('clipEditor.noRenderSpec') : t('common.loading')}
            </div>
          )}
        </div>

        {/* Transcript panel (right) — click a word to fix it, delete a line to cut */}
        <div className="space-y-3 rounded-xl bg-card p-6 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t('clipEditor.transcript')}</h2>
            <span className="text-xs text-muted-foreground">{t('clipEditor.transcriptHint')}</span>
          </div>

          {!spec ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('clipEditor.noCaptions')}</p>
          ) : (
            <div className="space-y-2">
              {lines.map((line, li) => (
                <div key={li} className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
                  <div className="flex flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-relaxed">
                    {line.map(({ cue, index }) =>
                      editingIdx === index ? (
                        <Input
                          key={index}
                          autoFocus
                          defaultValue={cue.text}
                          onBlur={(e) => {
                            editWord(index, e.target.value)
                            setEditingIdx(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          }}
                          className="h-7 w-28 px-2 py-0"
                        />
                      ) : (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setEditingIdx(index)}
                          className="rounded px-0.5 hover:bg-primary/15"
                        >
                          {cue.text}
                        </button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                    aria-label={t('clipEditor.deleteLine')}
                    onClick={() => deleteLine(line)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
