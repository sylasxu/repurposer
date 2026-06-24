import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Upload, Wand2, FileText, Trash2, Play } from 'lucide-react'

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
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
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

      const [speakerRes, assetsRes, clipsRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/speakers/${projectData.speaker_id}`),
        fetch(`${API_URL}/api/v1/projects/${id}/assets`),
        fetch(`${API_URL}/api/v1/projects/${id}/clips`),
      ])

      if (speakerRes.ok) setSpeaker(await speakerRes.json())
      if (assetsRes.ok) setAssets(await assetsRes.json())
      if (clipsRes.ok) setClips(await clipsRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

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
        body: JSON.stringify({ clip_count: 3, outputs: ['clips'], target_language: targetLanguage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Generation failed')
      setMessage(t('projectDetail.msgGenerated', { count: data.clip_count }))
      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  if (loading && !project) {
    return <div className="p-6">{t('common.loading')}</div>
  }

  if (!project) {
    return <div className="p-6 text-red-600">{error || t('projectDetail.notFound')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('projectDetail.back')}
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          {project.event_name && <p className="text-sm text-gray-500">{project.event_name}</p>}
        </div>
      </div>

      {(message || error) && (
        <div
          className={`p-4 rounded-lg ${
            error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">{t('projectDetail.status')}</p>
            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 mt-1">
              {project.status}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t('projectDetail.speaker')}</p>
            <p className="mt-1">{speaker?.name || t('projectDetail.unknown')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t('projectDetail.persona')}</p>
            <p className="mt-1 text-sm text-gray-600">
              {speaker?.persona?.emotional_tone || t('projectDetail.notGenerated')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('projectDetail.sourceMaterials')}</h2>
          <div className="flex items-center gap-3">
            <Select value={targetLanguage} onValueChange={(v) => setTargetLanguage(v ?? 'en')}>
              <SelectTrigger className="h-8 w-auto gap-2 text-xs">
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
            <button
              onClick={handleGenerate}
              disabled={generating || assets.length === 0}
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              {generating ? t('projectDetail.generating') : t('projectDetail.generateClips')}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            {uploading ? t('projectDetail.uploading') : t('projectDetail.uploadTranscript')}
            <input
              type="file"
              onChange={(e) => handleFileUpload(e, 'transcript')}
              disabled={uploading}
              accept=".txt,.md,.pdf"
              className="hidden"
            />
          </label>
          <span className="text-sm text-gray-500">{t('projectDetail.uploadHint')}</span>
        </div>

        {assets.length === 0 ? (
          <div className="text-gray-500 text-center py-8">{t('projectDetail.noMaterials')}</div>
        ) : (
          <div className="divide-y">
            {assets.map((asset) => (
              <div key={asset.id} className="py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {asset.file_url?.split('/').pop() || t('common.untitled')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {asset.extracted_text
                        ? t('projectDetail.charsExtracted', { count: asset.extracted_text.length })
                        : t('projectDetail.noText')}
                    </p>
                    <p className="text-xs text-gray-400">{t('projectDetail.uploadedAt', { type: asset.type, date: new Date(asset.created_at).toLocaleString() })}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {clips.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
          <h2 className="text-lg font-semibold">{t('projectDetail.generatedClips', { count: clips.length })}</h2>

          <div className="space-y-6">
            {clips.map((clip, index) => (
              <div key={clip.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <h3 className="font-semibold text-lg">{clip.hook}</h3>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                      <span>{clip.duration}s</span>
                      <span>·</span>
                      <span>BGM: {clip.music_mood}</span>
                      <span>·</span>
                      <span>Score: {clip.script.virality_score || '-'}</span>
                    </div>
                  </div>
                  <button className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800">
                    <Play className="w-4 h-4" />
                    {t('projectDetail.preview')}
                  </button>
                </div>

                {clip.title_options.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">{t('projectDetail.titleOptions')}</p>
                    <div className="flex flex-wrap gap-2">
                      {clip.title_options.map((title, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{t('projectDetail.scriptShots')}</p>
                  <div className="space-y-2">
                    {clip.script.shots.map((shot, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                          <span className="font-medium">{shot.time_range}</span>
                          <span>·</span>
                          <span>{shot.mood}</span>
                        </div>
                        <p className="text-gray-900">{shot.subtitle}</p>
                        <p className="text-sm text-gray-500 mt-1">{t('projectDetail.visual', { value: shot.visual })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
