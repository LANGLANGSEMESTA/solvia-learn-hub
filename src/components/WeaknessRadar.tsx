import { useEffect, useState } from "react"
import { getWeaknessData } from "@/lib/solve.functions"

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6"]

const TOPIC_LABELS: Record<string, string> = {
  trigonometry: "Trigonometry",
  calculus: "Calculus",
  statistics: "Statistics",
  geometry: "Geometry",
  algebra: "Algebra",
  arithmetic: "Arithmetic",
}

const TOPIC_LABELS_ID: Record<string, string> = {
  trigonometry: "Trigonometri",
  calculus: "Kalkulus",
  statistics: "Statistika",
  geometry: "Geometri",
  algebra: "Aljabar",
  arithmetic: "Aritmatika",
}

export function WeaknessRadar() {
  const [data, setData] = useState<{ topic: string; attempts: number }[] | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setData(getWeaknessData())
  }, [])

  if (!data || data.every(d => d.attempts === 0)) return null

  const isID = navigator.language?.toLowerCase().startsWith("id")
  const labels = isID ? TOPIC_LABELS_ID : TOPIC_LABELS
  const getLabel = (topic: string) => labels[topic] ?? topic

  const uiTitle = isID ? "Profil Belajar" : "Learning Profile"
  const uiFooter = isID ? "soal diselesaikan · data tersimpan di perangkat ini" : "problems solved · data stored on this device"

  const total = data.reduce((sum, d) => sum + d.attempts, 0)
  const sorted = [...data].sort((a, b) => b.attempts - a.attempts)
  const top = sorted[0]

  const size = 200
  const center = size / 2
  const radius = 70
  const n = data.length
  const angleStep = (2 * Math.PI) / n
  const maxAttempts = Math.max(...data.map(d => d.attempts), 1)

  const points = data.map((d, i) => {
    const angle = i * angleStep - Math.PI / 2
    const r = (d.attempts / maxAttempts) * radius
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
      labelX: center + (radius + 20) * Math.cos(angle),
      labelY: center + (radius + 20) * Math.sin(angle),
      topic: d.topic,
      attempts: d.attempts,
    }
  })

  const gridPoints = (scale: number) =>
    data.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2
      return `${center + scale * radius * Math.cos(angle)},${center + scale * radius * Math.sin(angle)}`
    }).join(" ")

  const dataPolygon = points.map(p => `${p.x},${p.y}`).join(" ")

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <span>{uiTitle}</span>
          <span className="text-xs text-muted-foreground font-normal">
            — <span className="font-semibold text-foreground">{getLabel(top.topic)}</span>
          </span>
        </div>
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div className="flex justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {[0.25, 0.5, 0.75, 1].map(scale => (
                <polygon key={scale} points={gridPoints(scale)} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={1} />
              ))}
              {points.map((p, i) => (
                <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(i * angleStep - Math.PI / 2)} y2={center + radius * Math.sin(i * angleStep - Math.PI / 2)} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
              ))}
              <polygon points={dataPolygon} fill="#6366f1" fillOpacity={0.2} stroke="#6366f1" strokeWidth={2} />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6366f1" />
              ))}
              {points.map((p, i) => (
                <text key={i} x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="currentColor" fillOpacity={0.7}>
                  {getLabel(p.topic)}
                </text>
              ))}
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {sorted.map((d, i) => (
              <div key={d.topic} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-foreground/70">{getLabel(d.topic)}</span>
                <span className="text-xs font-semibold ml-auto">{d.attempts}x</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {total} {uiFooter}
          </p>
        </div>
      )}
    </div>
  )
}