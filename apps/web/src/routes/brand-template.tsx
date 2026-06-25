import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  LayoutTemplate,
  Captions,
  ImagePlus,
  Clapperboard,
  Music,
  Eraser,
  Highlighter,
  Sparkles,
  Undo2,
  Redo2,
  Save,
  Check,
  ChevronRight,
  ChevronLeft,
  Play,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/brand-template")({
  component: BrandTemplatePage,
})

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const FONTS = [
  { value: "lilita", label: "Lilita One", family: "'Lilita One', system-ui, sans-serif" },
  { value: "inter", label: "Inter", family: "'Inter', system-ui, sans-serif" },
  { value: "playfair", label: "Playfair Display", family: "'Playfair Display', serif" },
  { value: "source-serif", label: "Source Serif 4", family: "'Source Serif 4', serif" },
]

const ASPECTS = ["9:16", "1:1", "16:9"] as const
const CAPTION_SIZES = [32, 40, 44, 56] as const
const CAPTION_COLORS = ["#ffffff", "#facc15", "#22c55e", "#ec4899", "#6366f1"]
const MOODS = ["calm", "uplifting", "corporate", "none"] as const

type Template = {
  aspect: (typeof ASPECTS)[number]
  fillMode: "fill" | "fit"
  captionFont: string
  captionSize: number
  captionColor: string
  logoUrl: string
  cta: string
  introEnabled: boolean
  introText: string
  outroEnabled: boolean
  outroText: string
  musicEnabled: boolean
  musicMood: string
  removeFiller: boolean
  keywordHighlighter: boolean
}

const PRESET_1: Template = {
  aspect: "9:16",
  fillMode: "fill",
  captionFont: "lilita",
  captionSize: 44,
  captionColor: "#facc15",
  logoUrl: "",
  cta: "Read the full talk →",
  introEnabled: false,
  introText: "",
  outroEnabled: false,
  outroText: "",
  musicEnabled: false,
  musicMood: "calm",
  removeFiller: false,
  keywordHighlighter: true,
}

const PRESET_2: Template = {
  aspect: "9:16",
  fillMode: "fit",
  captionFont: "inter",
  captionSize: 40,
  captionColor: "#ffffff",
  logoUrl: "",
  cta: "Watch the full keynote →",
  introEnabled: true,
  introText: "This talk is from…",
  outroEnabled: true,
  outroText: "Follow for more insights",
  musicEnabled: true,
  musicMood: "corporate",
  removeFiller: true,
  keywordHighlighter: false,
}

const PRESETS = [
  { id: "1", value: PRESET_1 },
  { id: "2", value: PRESET_2 },
]

type Section = null | "clipLayout" | "caption" | "overlay" | "introOutro" | "music"

const LOAD_STEPS = 7

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
      {children}
    </p>
  )
}

function NavRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: LucideIcon
  label: string
  value?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-accent"
    >
      <Icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm">{label}</span>
      {value && (
        <span className="max-w-[110px] truncate text-xs text-muted-foreground">{value}</span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  )
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: LucideIcon
  label: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5">
      <Icon className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function Segmented({
  options,
  value,
  onChange,
  cols = 3,
}: {
  options: (string | number)[]
  value: string | number
  onChange: (v: string | number) => void
  cols?: 2 | 3 | 4
}) {
  const grid = cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3"
  return (
    <div className={cn("grid gap-1.5", grid)}>
      {options.map((o) => (
        <button
          key={String(o)}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "h-8 rounded-md border text-xs font-medium transition-colors",
            value === o
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function CaptionText({
  text,
  keyword,
  highlight,
  color,
  family,
  size,
}: {
  text: string
  keyword: string
  highlight: boolean
  color: string
  family: string
  size: number
}) {
  const style: React.CSSProperties = {
    color,
    fontFamily: family,
    fontSize: size,
    fontWeight: 800,
    lineHeight: 1.1,
    textShadow: "0 1px 6px rgba(0,0,0,0.6)",
  }
  if (!highlight || !keyword || !text.includes(keyword)) {
    return <span style={style}>{text}</span>
  }
  const idx = text.indexOf(keyword)
  return (
    <span style={style}>
      {text.slice(0, idx)}
      <span
        style={{
          backgroundColor: color,
          color: "#0a0a0a",
          borderRadius: 5,
          padding: "0 5px",
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
        }}
      >
        {keyword}
      </span>
      {text.slice(idx + keyword.length)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function BrandTemplatePage() {
  const { t } = useTranslation()

  const [preset, setPreset] = useState("1")
  const [template, setTemplate] = useState<Template>(PRESET_1)
  const [past, setPast] = useState<Template[]>([])
  const [future, setFuture] = useState<Template[]>([])
  const [section, setSection] = useState<Section>(null)
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [loadStep, setLoadStep] = useState(0)

  const loading = loadStep < LOAD_STEPS
  const pct = Math.round((loadStep / LOAD_STEPS) * 100)

  // Simulated resource loading (matches OpusClip's "Fetching resources" screen).
  useEffect(() => {
    if (loadStep >= LOAD_STEPS) return
    const id = setTimeout(() => setLoadStep((s) => s + 1), 260)
    return () => clearTimeout(id)
  }, [loadStep])

  // Load the saved template (if any) on mount.
  useEffect(() => {
    fetch(`${API_URL}/api/v1/brand-templates`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Array<{ id: string; config: Partial<Template> }>) => {
        if (list.length > 0) {
          setSavedId(list[0].id)
          setTemplate((prev) => ({ ...prev, ...list[0].config }))
        }
      })
      .catch(() => {
        /* offline / no backend — keep the local preset */
      })
  }, [])

  const commit = (next: Template) => {
    setPast((p) => [...p, template])
    setFuture([])
    setTemplate(next)
    setSaved(false)
  }

  const update = <K extends keyof Template>(key: K, value: Template[K]) =>
    commit({ ...template, [key]: value })

  const undo = () => {
    if (past.length === 0) return
    const prev = past[past.length - 1]
    setPast((p) => p.slice(0, -1))
    setFuture((f) => [template, ...f])
    setTemplate(prev)
    setSaved(false)
  }

  const redo = () => {
    if (future.length === 0) return
    const next = future[0]
    setFuture((f) => f.slice(1))
    setPast((p) => [...p, template])
    setTemplate(next)
    setSaved(false)
  }

  const applyPreset = (id: string) => {
    setPreset(id)
    const found = PRESETS.find((p) => p.id === id)
    if (found) commit(found.value)
  }

  const handleSave = async () => {
    try {
      const body = JSON.stringify({
        name: "Brand template",
        config: template,
      })
      const res = await fetch(
        savedId
          ? `${API_URL}/api/v1/brand-templates/${savedId}`
          : `${API_URL}/api/v1/brand-templates`,
        {
          method: savedId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }
      )
      if (!res.ok) return
      const data = await res.json()
      setSavedId(data.id)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      /* save failed — keep editing */
    }
  }

  const fontLabel = FONTS.find((f) => f.value === template.captionFont)?.label ?? template.captionFont
  const fontFamily = FONTS.find((f) => f.value === template.captionFont)?.family ?? "inherit"
  const moodLabel = t(`brandTemplate.music.moods.${template.musicMood}`)

  const previewSize =
    template.aspect === "1:1"
      ? "aspect-square w-[340px]"
      : template.aspect === "16:9"
        ? "aspect-video w-[460px]"
        : "aspect-[9/16] w-[270px]"

  return (
    <div className="flex h-svh flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight">{t("brandTemplate.title")}</h1>
          <p className="hidden text-sm text-muted-foreground md:block">
            {t("brandTemplate.subtitle")}
          </p>
        </div>

        <Select value={preset} onValueChange={(v) => applyPreset(v ?? "1")}>
          <SelectTrigger className="h-9 w-48 justify-between rounded-md text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {t("brandTemplate.preset")} {p.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("brandTemplate.undo")}
            disabled={past.length === 0}
            onClick={undo}
          >
            <Undo2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("brandTemplate.redo")}
            disabled={future.length === 0}
            onClick={redo}
          >
            <Redo2 className="h-5 w-5" />
          </Button>
          <Button onClick={handleSave}>
            {saved ? <Check className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {t("brandTemplate.save")}
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left setting panel */}
        <aside className="w-[360px] shrink-0 overflow-y-auto p-4">
          <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
            <div className="border-b px-4 py-3">
              <h2 className="font-semibold">{t("brandTemplate.setting")}</h2>
            </div>

            <div className="p-2">
              {section === null && (
                <>
                  <GroupLabel>{t("brandTemplate.groups.style")}</GroupLabel>
                  <NavRow
                    icon={LayoutTemplate}
                    label={t("brandTemplate.rows.clipLayout")}
                    value={`${template.aspect} ${t(`brandTemplate.clipLayout.${template.fillMode}`)}`}
                    onClick={() => setSection("clipLayout")}
                  />
                  <NavRow
                    icon={Captions}
                    label={t("brandTemplate.rows.caption")}
                    value={`${fontLabel} ${template.captionSize}`}
                    onClick={() => setSection("caption")}
                  />

                  <GroupLabel>{t("brandTemplate.groups.brand")}</GroupLabel>
                  <NavRow
                    icon={ImagePlus}
                    label={t("brandTemplate.rows.overlay")}
                    onClick={() => setSection("overlay")}
                  />
                  <NavRow
                    icon={Clapperboard}
                    label={t("brandTemplate.rows.introOutro")}
                    onClick={() => setSection("introOutro")}
                  />
                  <NavRow
                    icon={Music}
                    label={t("brandTemplate.rows.music")}
                    value={template.musicEnabled ? moodLabel : undefined}
                    onClick={() => setSection("music")}
                  />

                  <GroupLabel>{t("brandTemplate.groups.ai")}</GroupLabel>
                  <ToggleRow
                    icon={Eraser}
                    label={t("brandTemplate.rows.removeFiller")}
                    checked={template.removeFiller}
                    onCheckedChange={(v) => update("removeFiller", v)}
                  />
                  <ToggleRow
                    icon={Highlighter}
                    label={t("brandTemplate.rows.keywordHighlighter")}
                    checked={template.keywordHighlighter}
                    onCheckedChange={(v) => update("keywordHighlighter", v)}
                  />
                </>
              )}

              {section !== null && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSection(null)}
                    className="flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t(`brandTemplate.rows.${section}`)}
                  </button>

                  <div className="space-y-4 px-1 pb-2">
                    {section === "clipLayout" && (
                      <>
                        <Field label={t("brandTemplate.clipLayout.aspect")}>
                          <Segmented
                            options={[...ASPECTS]}
                            value={template.aspect}
                            onChange={(v) => update("aspect", v as Template["aspect"])}
                          />
                        </Field>
                        <Field label={t("brandTemplate.clipLayout.fillMode")}>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(["fill", "fit"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => update("fillMode", m)}
                                className={cn(
                                  "h-8 rounded-md border text-xs font-medium transition-colors",
                                  template.fillMode === m
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border text-muted-foreground hover:bg-accent"
                                )}
                              >
                                {t(`brandTemplate.clipLayout.${m}`)}
                              </button>
                            ))}
                          </div>
                        </Field>
                      </>
                    )}

                    {section === "caption" && (
                      <>
                        <Field label={t("brandTemplate.caption.font")}>
                          <Select
                            value={template.captionFont}
                            onValueChange={(v) => update("captionFont", v ?? "inter")}
                          >
                            <SelectTrigger className="h-9 w-full rounded-md text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONTS.map((f) => (
                                <SelectItem key={f.value} value={f.value}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field label={t("brandTemplate.caption.size")}>
                          <Segmented
                            options={[...CAPTION_SIZES]}
                            value={template.captionSize}
                            onChange={(v) => update("captionSize", Number(v))}
                            cols={4}
                          />
                        </Field>
                        <Field label={t("brandTemplate.caption.color")}>
                          <div className="flex items-center gap-2">
                            {CAPTION_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                aria-label={c}
                                onClick={() => update("captionColor", c)}
                                style={{ backgroundColor: c }}
                                className={cn(
                                  "h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-card transition-all",
                                  template.captionColor === c ? "ring-primary" : "ring-transparent"
                                )}
                              />
                            ))}
                          </div>
                        </Field>
                      </>
                    )}

                    {section === "overlay" && (
                      <>
                        <Field label={t("brandTemplate.overlay.logo")}>
                          <Input
                            value={template.logoUrl}
                            onChange={(e) => update("logoUrl", e.target.value)}
                            placeholder={t("brandTemplate.overlay.logoPlaceholder")}
                          />
                        </Field>
                        <Field label={t("brandTemplate.overlay.cta")}>
                          <Input
                            value={template.cta}
                            onChange={(e) => update("cta", e.target.value)}
                            placeholder={t("brandTemplate.overlay.ctaPlaceholder")}
                          />
                        </Field>
                      </>
                    )}

                    {section === "introOutro" && (
                      <>
                        <label className="flex items-center justify-between">
                          <span className="text-sm">{t("brandTemplate.introOutro.intro")}</span>
                          <Switch
                            checked={template.introEnabled}
                            onCheckedChange={(v) => update("introEnabled", v)}
                          />
                        </label>
                        {template.introEnabled && (
                          <Field label={t("brandTemplate.introOutro.introText")}>
                            <Input
                              value={template.introText}
                              onChange={(e) => update("introText", e.target.value)}
                              placeholder={t("brandTemplate.introOutro.introPlaceholder")}
                            />
                          </Field>
                        )}
                        <label className="flex items-center justify-between">
                          <span className="text-sm">{t("brandTemplate.introOutro.outro")}</span>
                          <Switch
                            checked={template.outroEnabled}
                            onCheckedChange={(v) => update("outroEnabled", v)}
                          />
                        </label>
                        {template.outroEnabled && (
                          <Field label={t("brandTemplate.introOutro.outroText")}>
                            <Input
                              value={template.outroText}
                              onChange={(e) => update("outroText", e.target.value)}
                              placeholder={t("brandTemplate.introOutro.outroPlaceholder")}
                            />
                          </Field>
                        )}
                      </>
                    )}

                    {section === "music" && (
                      <>
                        <label className="flex items-center justify-between">
                          <span className="text-sm">{t("brandTemplate.music.enable")}</span>
                          <Switch
                            checked={template.musicEnabled}
                            onCheckedChange={(v) => update("musicEnabled", v)}
                          />
                        </label>
                        {template.musicEnabled && (
                          <Field label={t("brandTemplate.music.mood")}>
                            <Select
                              value={template.musicMood}
                              onValueChange={(v) => update("musicMood", v ?? "calm")}
                            >
                              <SelectTrigger className="h-9 w-full rounded-md text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MOODS.map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {t(`brandTemplate.music.moods.${m}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right preview */}
        <main className="flex flex-1 items-center justify-center overflow-hidden p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-7 w-7" />
              </div>
              <Progress value={pct} className="w-64" />
              <p className="text-sm text-muted-foreground">
                {t("brandTemplate.loading")} {loadStep}/{LOAD_STEPS} · {pct}%
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-600 to-zinc-900 ring-1 ring-border shadow-xl",
                previewSize
              )}
            >
              <span className="absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                {t("brandTemplate.demo")}
              </span>

              {template.logoUrl && (
                <img
                  src={template.logoUrl}
                  alt=""
                  className="absolute right-3 top-3 h-6 w-auto object-contain"
                />
              )}

              {template.introEnabled && (
                <div className="absolute inset-x-3 top-10 text-center text-[10px] font-medium text-white/70">
                  {template.introText}
                </div>
              )}

              <div className="absolute inset-x-4 bottom-16 text-center">
                <CaptionText
                  text={t("brandTemplate.preview.caption")}
                  keyword={t("brandTemplate.preview.keyword")}
                  highlight={template.keywordHighlighter}
                  color={template.captionColor}
                  family={fontFamily}
                  size={Math.round(template.captionSize * 0.42)}
                />
              </div>

              {template.cta && (
                <div className="absolute inset-x-3 bottom-9 text-center text-[10px] text-white/80">
                  {template.cta}
                </div>
              )}

              <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
                <Play className="h-3 w-3 fill-white text-white" />
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div className="h-full w-1/3 rounded-full bg-white" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
