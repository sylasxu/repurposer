import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Type, Image, Languages, Save, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

export const Route = createFileRoute("/brand-template")({
  component: BrandTemplatePage,
})

const FONTS = [
  { value: "inter", label: "Inter" },
  { value: "geist", label: "Geist" },
  { value: "playfair", label: "Playfair Display" },
  { value: "source-serif", label: "Source Serif 4" },
]

const TONES = [
  { value: "formal", labelKey: "formal" },
  { value: "casual", labelKey: "casual" },
]

function BrandTemplatePage() {
  const { t } = useTranslation()
  const [saved, setSaved] = useState(false)
  const [template, setTemplate] = useState({
    font: "inter",
    primaryColor: "#6366f1",
    accentColor: "#ec4899",
    logoUrl: "",
    cta: "Read the full talk →",
    tone: "formal",
    includeAttribution: true,
    includeWatermark: false,
  })

  const update = <K extends keyof typeof template>(key: K, value: (typeof template)[K]) => {
    setTemplate((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">{t("brandTemplate.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("brandTemplate.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value="preset-1">
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue placeholder={t("brandTemplate.preset")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="preset-1">{t("brandTemplate.preset")} 1</SelectItem>
              <SelectItem value="preset-2">{t("brandTemplate.preset")} 2</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleSave}>
            {saved ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                {t("common.saved")}
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {t("brandTemplate.save")}
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row">
        {/* Settings panel */}
        <aside className="w-full shrink-0 border-r p-5 lg:w-80">
          <div className="space-y-6">
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Type className="h-4 w-4" />
                {t("brandTemplate.style")}
              </h2>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="font" className="text-xs">{t("brandTemplate.font")}</Label>
                  <Select value={template.font} onValueChange={(v) => update("font", v ?? "inter")}>
                    <SelectTrigger id="font" className="h-8 text-xs">
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
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="primaryColor" className="text-xs">
                    {t("brandTemplate.primaryColor")}
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={template.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="h-8 w-12 cursor-pointer p-1"
                    />
                    <Input
                      value={template.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="h-8 flex-1 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="accentColor" className="text-xs">
                    {t("brandTemplate.accentColor")}
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="accentColor"
                      type="color"
                      value={template.accentColor}
                      onChange={(e) => update("accentColor", e.target.value)}
                      className="h-8 w-12 cursor-pointer p-1"
                    />
                    <Input
                      value={template.accentColor}
                      onChange={(e) => update("accentColor", e.target.value)}
                      className="h-8 flex-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Image className="h-4 w-4" />
                {t("brandTemplate.logo")} & CTA
              </h2>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="logoUrl" className="text-xs">{t("brandTemplate.logo")} URL</Label>
                  <Input
                    id="logoUrl"
                    value={template.logoUrl}
                    onChange={(e) => update("logoUrl", e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cta" className="text-xs">{t("brandTemplate.cta")}</Label>
                  <Input
                    id="cta"
                    value={template.cta}
                    onChange={(e) => update("cta", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Languages className="h-4 w-4" />
                {t("brandTemplate.languageTone")}
              </h2>
              <div className="space-y-4">
                <Select value={template.tone} onValueChange={(v) => update("tone", v ?? "formal")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {t(`brandTemplate.${tone.labelKey}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <label className="flex items-center justify-between text-xs">
                  <span>Include attribution</span>
                  <Switch
                    checked={template.includeAttribution}
                    onCheckedChange={(v) => update("includeAttribution", v)}
                    size="sm"
                  />
                </label>
                <label className="flex items-center justify-between text-xs">
                  <span>Include watermark</span>
                  <Switch
                    checked={template.includeWatermark}
                    onCheckedChange={(v) => update("includeWatermark", v)}
                    size="sm"
                  />
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Preview area */}
        <main className="flex flex-1 items-center justify-center overflow-auto bg-muted/30 p-6">
          <div className="w-full max-w-md space-y-6">
            <Card
              className="overflow-hidden"
              style={{
                borderColor: template.primaryColor,
                fontFamily: template.font === "playfair" ? "serif" : "sans-serif",
              }}
            >
              <div
                className="h-2 w-full"
                style={{ backgroundColor: template.primaryColor }}
              />
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  {template.logoUrl ? (
                    <img
                      src={template.logoUrl}
                      alt="Logo"
                      className="h-6 object-contain"
                    />
                  ) : (
                    <div
                      className="rounded px-2 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: template.primaryColor }}
                    >
                      Repurposer
                    </div>
                  )}
                  {template.includeWatermark && (
                    <span className="text-[10px] text-muted-foreground">Made with Repurposer</span>
                  )}
                </div>

                <blockquote
                  className="text-xl font-medium leading-relaxed"
                  style={{ color: template.primaryColor }}
                >
                  “{t("brandTemplate.exampleQuote")}”
                </blockquote>

                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {template.includeAttribution && (
                      <>
                        <p className="font-semibold text-foreground">Speaker Name</p>
                        <p className="text-xs text-muted-foreground">
                          {t("brandTemplate.exampleAttribution")}
                        </p>
                      </>
                    )}
                  </div>
                  <Button
                    size="sm"
                    style={{
                      backgroundColor: template.accentColor,
                      borderColor: template.accentColor,
                    }}
                  >
                    {template.cta}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardContent className="space-y-4 p-6">
                <div
                  className="w-fit rounded px-2 py-0.5 text-[10px] font-medium text-white"
                  style={{ backgroundColor: template.primaryColor }}
                >
                  LinkedIn post
                </div>
                <p className="text-sm leading-relaxed text-foreground"
 style={{ fontFamily: template.font === "playfair" ? "serif" : "sans-serif" }}
                >
                  Last week I shared why governance frameworks matter more than ever
                  for AI safety. The response made one thing clear: organizations want
                  actionable principles, not abstract commitments.
                </p>
                <p
                  className="text-sm leading-relaxed text-foreground"
                  style={{ fontFamily: template.font === "playfair" ? "serif" : "sans-serif" }}
                >
                  Three takeaways from the talk:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground"
                  style={{ fontFamily: template.font === "playfair" ? "serif" : "sans-serif" }}
                >
                  <li>Map risks to operational roles.</li>
                  <li>Build feedback loops with external reviewers.</li>
                  <li>Document decisions as reusable assets.</li>
                </ul>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    style={{ borderColor: template.accentColor, color: template.accentColor }}
                  >
                    {template.cta}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
