import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type ExplorerNode = {
  index: number
  id: string
  name: string
  author: string | null
  description: string
  category: string
  kind: string | null
  stars: number
  cluster: string
  influence: number
  x: number
  y: number
  neighbors: Array<{ index: number; similarity: number }>
}

export type ExplorerData = {
  generatedAt: string
  world: { width: number; height: number }
  clusters: Array<{
    id: string
    label: string
    color: string
    count: number
    center: { x: number; y: number }
  }>
  nodes: Array<ExplorerNode>
  edges: Array<{ source: number; target: number; similarity: number }>
  growth: Array<{ date: string; total: number; added: number }>
  release?: { date: string; label: string }
}

type View = { x: number; y: number; scale: number }

const BG = '#101117'
const EDGE = 'rgba(148, 163, 205, 0.10)'
const EDGE_HOT = 'rgba(200, 247, 154, 0.55)'
const LABEL = 'rgba(200, 208, 245, 0.5)'

function nodeRadius(node: ExplorerNode) {
  return 2 + Math.sqrt(Math.max(node.influence, 1)) * 0.55
}

/**
 * The plugin galaxy: every listed plugin positioned by similarity, colored by
 * cluster. Canvas-rendered with pan/zoom; redraws only when the view, hover,
 * or highlight set changes (never on a timer), so an idle map costs nothing.
 */
export function ExploreMap({
  data,
  highlightIds,
  focusCluster,
}: {
  data: ExplorerData
  highlightIds: Set<string> | null
  focusCluster: string | null
}) {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<View>({ x: 0, y: 0, scale: 0.2 })
  const hoverRef = useRef<ExplorerNode | null>(null)
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const rafRef = useRef<number>(0)
  const [hovered, setHovered] = useState<ExplorerNode | null>(null)

  const clusterColor = useMemo(
    () => new Map(data.clusters.map((c) => [c.id, c.color])),
    [data],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0

    function fitView() {
      const scale = Math.min(
        width / data.world.width,
        height / data.world.height,
      )
      viewRef.current = {
        scale,
        x: (width - data.world.width * scale) / 2,
        y: (height - data.world.height * scale) / 2,
      }
    }

    function resize() {
      const rect = wrap!.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.round(width * dpr)
      canvas!.height = Math.round(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      fitView()
      scheduleDraw()
    }

    function draw() {
      const view = viewRef.current
      const hover = hoverRef.current
      ctx!.fillStyle = BG
      ctx!.fillRect(0, 0, width, height)
      ctx!.save()
      ctx!.translate(view.x, view.y)
      ctx!.scale(view.scale, view.scale)

      const dimming = Boolean(focusCluster) || Boolean(highlightIds)

      // Edges: skip when zoomed far out unless a node is hovered
      if (view.scale > 0.28) {
        ctx!.lineWidth = 1 / view.scale
        ctx!.strokeStyle = EDGE
        ctx!.beginPath()
        for (const edge of data.edges) {
          const a = data.nodes[edge.source]
          const b = data.nodes[edge.target]
          ctx!.moveTo(a.x, a.y)
          ctx!.lineTo(b.x, b.y)
        }
        ctx!.stroke()
      }

      // Hovered node's neighbor edges, always
      if (hover) {
        ctx!.lineWidth = 1.5 / view.scale
        ctx!.strokeStyle = EDGE_HOT
        ctx!.beginPath()
        for (const n of hover.neighbors) {
          const b = data.nodes[n.index]
          ctx!.moveTo(hover.x, hover.y)
          ctx!.lineTo(b.x, b.y)
        }
        ctx!.stroke()
      }

      // Nodes: sharp squares, sized by influence, colored by cluster
      for (const node of data.nodes) {
        const r = nodeRadius(node)
        const active =
          (!focusCluster || node.cluster === focusCluster) &&
          (!highlightIds || highlightIds.has(node.id))
        ctx!.globalAlpha = dimming && !active ? 0.12 : 0.92
        ctx!.fillStyle = clusterColor.get(node.cluster) ?? '#9ece6a'
        ctx!.fillRect(node.x - r, node.y - r, r * 2, r * 2)
      }
      ctx!.globalAlpha = 1

      if (hover) {
        const r = nodeRadius(hover) + 3 / view.scale
        ctx!.lineWidth = 1.5 / view.scale
        ctx!.strokeStyle = '#c8f79a'
        ctx!.strokeRect(hover.x - r, hover.y - r, r * 2, r * 2)
      }

      // Cluster labels once zoomed out enough to need orientation
      ctx!.font = `600 ${13 / view.scale}px "JetBrains Mono Variable"`
      ctx!.textAlign = 'center'
      ctx!.fillStyle = LABEL
      for (const cluster of data.clusters) {
        if (focusCluster && cluster.id !== focusCluster) continue
        ctx!.fillText(
          cluster.label.toUpperCase(),
          cluster.center.x,
          cluster.center.y,
        )
      }
      ctx!.restore()
    }

    function scheduleDraw() {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(draw)
    }

    function toWorld(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect()
      const view = viewRef.current
      return {
        x: (clientX - rect.left - view.x) / view.scale,
        y: (clientY - rect.top - view.y) / view.scale,
      }
    }

    function hitTest(clientX: number, clientY: number) {
      const p = toWorld(clientX, clientY)
      const threshold = 10 / viewRef.current.scale
      let best: ExplorerNode | null = null
      let bestDist = threshold
      for (const node of data.nodes) {
        const d = Math.hypot(node.x - p.x, node.y - p.y)
        if (d < bestDist + nodeRadius(node)) {
          best = node
          bestDist = d
        }
      }
      return best
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const view = viewRef.current
      const factor = Math.exp(-e.deltaY * 0.0015)
      const next = Math.min(3, Math.max(0.08, view.scale * factor))
      const rect = canvas!.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      view.x = cx - ((cx - view.x) / view.scale) * next
      view.y = cy - ((cy - view.y) / view.scale) * next
      view.scale = next
      scheduleDraw()
    }

    function onPointerDown(e: PointerEvent) {
      canvas!.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, y: e.clientY, moved: false }
    }

    function onPointerMove(e: PointerEvent) {
      const drag = dragRef.current
      if (drag) {
        const dx = e.clientX - drag.x
        const dy = e.clientY - drag.y
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
        viewRef.current.x += dx
        viewRef.current.y += dy
        drag.x = e.clientX
        drag.y = e.clientY
        scheduleDraw()
        return
      }
      const hit = hitTest(e.clientX, e.clientY)
      if (hit !== hoverRef.current) {
        hoverRef.current = hit
        setHovered(hit)
        canvas!.style.cursor = hit ? 'pointer' : 'grab'
        scheduleDraw()
      }
    }

    function onPointerUp(e: PointerEvent) {
      const drag = dragRef.current
      dragRef.current = null
      if (drag && !drag.moved) {
        const hit = hitTest(e.clientX, e.clientY)
        if (hit) {
          navigate({ to: '/plugins/$pluginId/', params: { pluginId: hit.id } })
        }
      }
    }

    function onPointerLeave() {
      dragRef.current = null
      if (hoverRef.current) {
        hoverRef.current = null
        setHovered(null)
        scheduleDraw()
      }
    }

    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)
    resize()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [data, clusterColor, focusCluster, highlightIds, navigate])

  return (
    <div
      ref={wrapRef}
      className="dark-scope relative h-[60vh] min-h-96 overflow-hidden border border-border-subtle"
      style={{ background: BG, touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Map of all marketplace plugins, positioned by similarity and colored by cluster. Drag to pan, scroll to zoom, click a point to open its plugin."
        role="img"
        style={{ cursor: 'grab', display: 'block' }}
      />
      {hovered ? (
        <div
          className={cn(
            'ring-elevation pointer-events-none absolute bottom-3 left-3 max-w-xs bg-surface p-3.5',
          )}
        >
          <p className="font-sans text-sm font-medium text-text">
            {hovered.name}
          </p>
          <p className="mt-0.5 font-mono text-xs text-text-muted">
            {hovered.author ?? 'unknown'} - {hovered.category}
            {hovered.stars > 0 ? ` - ${hovered.stars}★` : ''}
          </p>
          <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-text-secondary">
            {hovered.description}
          </p>
        </div>
      ) : null}
      <p className="pointer-events-none absolute top-3 right-3 font-mono text-xs text-text-muted select-none">
        drag to pan - scroll to zoom - click to open
      </p>
    </div>
  )
}
