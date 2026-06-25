import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toPng } from 'html-to-image'
import { ArrowLeft, Upload, Wand2, FileText, Trash2, Play, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const OUTPUT_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
]

interface Project {
  id: string
  title: string
  event_name: string | null
  status: string
  language: string
  speaker_id: string
  created_at: string
}

interface Speaker {
  id: string
  name: string
  persona: {
    emotional_tone: string
    sentence_style: string
  } | null
}

interface Asset {
  id: string
  type: string
  file_url: string | null
  extracted_text: string | null
  created_at: string
}

interface Shot {
  time_range: string
  visual: string
  subtitle: string
  mood: string
}

interface ClipScript {
  hook: string
  duration_seconds: number
  shots: Shot[]
  title_options: string[]
  music_mood: string
  virality_score: number | null
}

interface Clip {
  id: string
  hook: string
  script: ClipScript
  title_options: string[]
  music_mood: string
  duration: number
  created_at: string
}

interface Derivative {
  id: string
  type: string
  content: {
    content?: string
    hashtags?: string[]
    quotes?: { quote: string; attribution: string }[]
    tldr?: string
    key_points?: string[]
    full?: string
    title?: string
  }
  language: string
  created_at: string
}

interface Job {
  id: string
  status: string
  current_step: string | null
  progress: number
  error: string | null
}

interface BrandConfig {
  captionColor?: string
  logoUrl?: string
  cta?: string
}

/** Renders a quote as a downloadable PNG card, styled by the brand template. */
function QuoteCardArt({
  quote,
  attribution,
  brand,
  downloadLabel,
}: {
  quote: string
  attribution: string
  brand: BrandConfig | null
  downloadLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const accent = brand?.captionColor || '#facc15'

  const download = async () => {
    if (!ref.current) return
    const dataUrl = await toPng(ref.current, { pixelRatio: 3, cacheBust: true })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'quote-card.png'
    a.click()
  }

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-950 p-7"
      >
        {brand?.logoUrl ? (
          <img src={brand.logoUrl} alt="" className="h-7 w-auto self-start object-contain" />
        ) : (
          <div className="h-7" />
        )}
        <p className="text-2xl font-bold leading-snug text-white">
          <span style={{ color: accent }}>“</span>
          {quote}
          <span style={{ color: accent }}>”</span>
        </p>
        <div>
          <div className="mb-3 h-0.5 w-10" style={{ backgroundColor: accent }} />
          <p className="text-sm font-medium text-white">{attribution}</p>
          {brand?.cta && <p className="mt-1 text-xs text-white/60">{brand.cta}</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={download}>
        <Download className="h-4 w-4" />
        {downloadLabel}
      </Button>
    </div>
  )
}

export const Route = createFileRoute('/projects/$id')({
  component: ProjectDetailPage,
})

function ProjectDetailPage() {
  const { id } = Route.useParams()
  const { t } = useTranslation()

  const [project, setProject] = useState<Project | null>(null)
  const [speaker, setSpeaker] = useState<Speaker | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [derivatives, setDerivatives] = useState<Derivative[]>([])
  const [brand, setBrand] = useState<BrandConfig | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genKind, setGenKind] = useState<
    'linkedin' | 'quote-cards' | 'summary' | 'blog' | null
  >(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('en')

  const fetchData = async () => {
    setLoading(true)
    try {
      const projectRes = await fetch(`${API_URL}/api/v1/projects/${id}`)
      if (!projectRes.ok) throw new Error('Project not found')
      const projectData = await projectRes.json()
      setProject(projectData)

      const [speakerRes, assetsRes, clipsRes, derivativesRes, jobsRes, brandRes] =
        await Promise.all([
          fetch(`${API_URL}/api/v1/speakers/${projectData.speaker_id}`),
          fetch(`${API_URL}/api/v1/projects/${id}/assets`),
          fetch(`${API_URL}/api/v1/projects/${id}/clips`),
          fetch(`${API_URL}/api/v1/projects/${id}/derivatives`),
          fetch(`${API_URL}/api/v1/projects/${id}/jobs`),
          fetch(`${API_URL}/api/v1/brand-templates`),
        ])

      if (speakerRes.ok) setSpeaker(await speakerRes.json())
      if (assetsRes.ok) setAssets(await assetsRes.json())
      if (clipsRes.ok) setClips(await clipsRes.json())
      if (derivativesRes.ok) setDerivatives(await derivativesRes.json())
      if (jobsRes.ok) {
        const jobs: Job[] = await jobsRes.json()
        setJob(jobs[0] ?? null)
      }
      if (brandRes.ok) {
        const templates: Array<{ config: BrandConfig }> = await brandRes.json()
        setBrand(templates[0]?.config ?? null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  // Poll the active job until it finishes, then refresh results.
  const jobActive = job?.status === 'pending' || job?.status === 'running'
  useEffect(() => {
    if (!job || (job.status !== 'pending' && job.status !== 'running')) return
    const jobId = job.id
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/projects/${id}/jobs/${jobId}`)
        if (!res.ok) return
        const updated: Job = await res.json()
        setJob(updated)
        if (updated.status === 'completed' || updated.status === 'failed') {
          clearInterval(timer)
          fetchData()
        }
      } catch {
        /* transient network error — keep polling */
      }
    }, 2500)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, job?.status, id])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('type', type)
      formData.append('file', file)
      const res = await fetch(`${API_URL}/api/v1/projects/${id}/assets`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      setMessage(t('projectDetail.msgUploaded'))
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm(t('projectDetail.deleteConfirm'))) return
    try {
      const res = await fetch(`${API_URL}/api/v1/projects/${id}/assets/${assetId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      setMessage(t('projectDetail.msgDeleted'))
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`${API_URL}/api/v1/projects/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_count: 3,
          outputs: ['clips', 'linkedin', 'quote_cards'],
          target_language: targetLanguage,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Generation failed')
      // Start tracking the background job; the polling effect takes over.
      setJob({ id: data.job_id, status: 'pending', current_step: 'queued', progress: 0, error: null })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateDerivative = async (
    kind: 'linkedin' | 'quote-cards' | 'summary' | 'blog'
  ) => {
    setGenKind(kind)
    setError('')
    setMessage('')
    try {
      const qs = kind === 'quote-cards' ? '?count=3' : ''
      const res = await fetch(`${API_URL}/api/v1/projects/${id}/${kind}${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_language: targetLanguage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Generation failed')
      const msgKey = {
        linkedin: 'msgLinkedin',
        'quote-cards': 'msgQuotes',
        summary: 'msgSummary',
        blog: 'msgBlog',
      }[kind]
      setMessage(t(`projectDetail.${msgKey}`))
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenKind(null)
    }
  }

  const linkedinPosts = derivatives.filter((d) => d.type === 'linkedin_post')
  const quoteCardSets = derivatives.filter((d) => d.type === 'quote_card')
  const summaries = derivatives.filter((d) => d.type === 'summary')
  const blogs = derivatives.filter((d) => d.type === 'blog')

  if (loading && !project) {
    return <div className="p-8 text-muted-foreground">{t('common.loading')}</div>
  }

  if (!project) {
    return <div className="p-8 text-destructive">{error || t('projectDetail.notFound')}</div>
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('projectDetail.back')}
          render={<Link to="/projects" />}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
          {project.event_name && (
            <p className="text-sm text-muted-foreground">{project.event_name}</p>
          )}
        </div>
      </div>

      {/* Status banner */}
      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-border bg-muted text-foreground'
          }`}
        >
          {error || message}
        </div>
      )}

      {/* Active job progress */}
      {jobActive && (
        <div className="rounded-xl bg-card p-4 ring-1 ring-border">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {t('projectDetail.jobRunning')}
              {job?.current_step ? ` · ${job.current_step}` : ''}
            </span>
            <span className="text-muted-foreground">{job?.progress ?? 0}%</span>
          </div>
          <Progress value={job?.progress ?? 0} className="mt-2" />
        </div>
      )}
      {job?.status === 'failed' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('projectDetail.jobFailed')}
          {job.error ? `: ${job.error}` : ''}
        </div>
      )}

      {/* Meta card */}
      <div className="rounded-xl bg-card p-6 ring-1 ring-border">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('projectDetail.status')}
            </p>
            <Badge variant="secondary" className="mt-1.5 capitalize">
              {project.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('projectDetail.speaker')}
            </p>
            <p className="mt-1.5 text-sm">{speaker?.name || t('projectDetail.unknown')}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('projectDetail.persona')}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {speaker?.persona?.emotional_tone || t('projectDetail.notGenerated')}
            </p>
          </div>
        </div>
      </div>

      {/* Source materials + generation */}
      <div className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('projectDetail.sourceMaterials')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={targetLanguage} onValueChange={(v) => setTargetLanguage(v ?? 'en')}>
              <SelectTrigger className="h-9 w-auto gap-2 rounded-md text-sm">
                <span className="text-muted-foreground">Output:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="h-9 gap-2"
              disabled={jobActive || generating || assets.length === 0}
              onClick={handleGenerate}
            >
              <Wand2 className="h-4 w-4" />
              {jobActive || generating
                ? t('projectDetail.generating')
                : t('projectDetail.generateClips')}
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2"
              disabled={jobActive || genKind !== null || assets.length === 0}
              onClick={() => handleGenerateDerivative('linkedin')}
            >
              <Wand2 className="h-4 w-4" />
              {genKind === 'linkedin'
                ? t('projectDetail.generating')
                : t('projectDetail.generateLinkedin')}
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2"
              disabled={jobActive || genKind !== null || assets.length === 0}
              onClick={() => handleGenerateDerivative('quote-cards')}
            >
              <Wand2 className="h-4 w-4" />
              {genKind === 'quote-cards'
                ? t('projectDetail.generating')
                : t('projectDetail.generateQuotes')}
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2"
              disabled={jobActive || genKind !== null || assets.length === 0}
              onClick={() => handleGenerateDerivative('summary')}
            >
              <Wand2 className="h-4 w-4" />
              {genKind === 'summary'
                ? t('projectDetail.generating')
                : t('projectDetail.generateSummary')}
            </Button>
            <Button
              variant="outline"
              className="h-9 gap-2"
              disabled={jobActive || genKind !== null || assets.length === 0}
              onClick={() => handleGenerateDerivative('blog')}
            >
              <Wand2 className="h-4 w-4" />
              {genKind === 'blog'
                ? t('projectDetail.generating')
                : t('projectDetail.generateBlog')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-muted px-3 text-sm font-medium transition-colors hover:bg-accent">
            <Upload className="h-4 w-4" />
            {uploading ? t('projectDetail.uploading') : t('projectDetail.uploadTranscript')}
            <input
              type="file"
              onChange={(e) => handleFileUpload(e, 'transcript')}
              disabled={uploading}
              accept=".txt,.md,.pdf"
              className="hidden"
            />
          </label>
          <span className="text-sm text-muted-foreground">{t('projectDetail.uploadHint')}</span>
        </div>

        {assets.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t('projectDetail.noMaterials')}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-start justify-between gap-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {asset.file_url?.split('/').pop() || t('common.untitled')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {asset.extracted_text
                        ? t('projectDetail.charsExtracted', { count: asset.extracted_text.length })
                        : t('projectDetail.noText')}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {t('projectDetail.uploadedAt', {
                        type: asset.type,
                        date: new Date(asset.created_at).toLocaleString(),
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t('common.delete')}
                  onClick={() => handleDeleteAsset(asset.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clips */}
      {clips.length > 0 && (
        <div className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-border">
          <h2 className="text-lg font-semibold">
            {t('projectDetail.generatedClips', { count: clips.length })}
          </h2>
          <div className="space-y-4">
            {clips.map((clip, index) => (
              <div key={clip.id} className="space-y-4 rounded-lg border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <h3 className="text-lg font-semibold">{clip.hook}</h3>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>{clip.duration}s</span>
                      <span>·</span>
                      <span>BGM: {clip.music_mood}</span>
                      <span>·</span>
                      <span>Score: {clip.script.virality_score ?? '-'}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1 text-primary">
                    <Play className="h-4 w-4" />
                    {t('projectDetail.preview')}
                  </Button>
                </div>

                {clip.title_options.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">{t('projectDetail.titleOptions')}</p>
                    <div className="flex flex-wrap gap-2">
                      {clip.title_options.map((title, i) => (
                        <Badge key={i} variant="secondary">
                          {title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium">{t('projectDetail.scriptShots')}</p>
                  <div className="space-y-2">
                    {clip.script.shots.map((shot, i) => (
                      <div key={i} className="rounded-md bg-muted p-3">
                        <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-medium">{shot.time_range}</span>
                          <span>·</span>
                          <span>{shot.mood}</span>
                        </div>
                        <p className="text-foreground">{shot.subtitle}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('projectDetail.visual', { value: shot.visual })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LinkedIn posts */}
      {linkedinPosts.length > 0 && (
        <div className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-border">
          <h2 className="text-lg font-semibold">
            {t('projectDetail.linkedinPosts')} ({linkedinPosts.length})
          </h2>
          {linkedinPosts.map((d) => (
            <div key={d.id} className="space-y-3 rounded-lg border border-border p-4">
              <p className="whitespace-pre-wrap text-sm">{d.content.content}</p>
              {d.content.hashtags && d.content.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {d.content.hashtags.map((h, i) => (
                    <Badge key={i} variant="secondary">
                      #{h.replace(/^#/, '')}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground/70">
                {new Date(d.created_at).toLocaleString()} · {d.language}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Quote cards */}
      {quoteCardSets.length > 0 && (
        <div className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-border">
          <h2 className="text-lg font-semibold">{t('projectDetail.quoteCards')}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {quoteCardSets.flatMap((d) =>
              (d.content.quotes ?? []).map((q, i) => (
                <QuoteCardArt
                  key={`${d.id}-${i}`}
                  quote={q.quote}
                  attribution={q.attribution}
                  brand={brand}
                  downloadLabel={t('projectDetail.downloadCard')}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {summaries.length > 0 && (
        <div className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-border">
          <h2 className="text-lg font-semibold">{t('projectDetail.summary')}</h2>
          {summaries.map((d) => (
            <div key={d.id} className="space-y-3 rounded-lg border border-border p-4">
              {d.content.tldr && <p className="font-medium">{d.content.tldr}</p>}
              {d.content.key_points && d.content.key_points.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {d.content.key_points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
              {d.content.full && (
                <p className="whitespace-pre-wrap text-sm">{d.content.full}</p>
              )}
              <p className="text-xs text-muted-foreground/70">
                {new Date(d.created_at).toLocaleString()} · {d.language}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Blog */}
      {blogs.length > 0 && (
        <div className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-border">
          <h2 className="text-lg font-semibold">{t('projectDetail.blog')}</h2>
          {blogs.map((d) => (
            <div key={d.id} className="space-y-2 rounded-lg border border-border p-4">
              {d.content.title && (
                <h3 className="text-base font-semibold">{d.content.title}</h3>
              )}
              <p className="whitespace-pre-wrap text-sm">{d.content.content}</p>
              <p className="text-xs text-muted-foreground/70">
                {new Date(d.created_at).toLocaleString()} · {d.language}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
