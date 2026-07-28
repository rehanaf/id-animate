import React, { useRef, useEffect } from "react"
import { useFigureEditor } from "@/context/FigureEditorContext"
import { Figure } from "@/core/nodes/Figure.js"
import { Segment } from "@/core/nodes/Segment.js"

export function FigureCanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    figure, setFigure,
    selectedSegmentId, setSelectedSegmentId,
    selectedPointIndex, setSelectedPointIndex,
    activeTool, setActiveTool,
    forceUpdate, pushHistory,
    editorMode, isPlaying,
    currentTime, setCurrentTime,
    fps, duration,
  } = useFigureEditor()

  const dragState = useRef({
    isDragging: false, isPoint: false, pointIndex: -1,
    isSegment: false, segmentId: null as string | null,
    isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
    startX: 0, startY: 0, startPointX: 0, startPointY: 0,
    isCreating: false,
  })
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 })
  const activeToolRef = useRef(activeTool)
  const figureRef = useRef(figure)
  const selectedSegIdRef = useRef(selectedSegmentId)
  const selectedPtRef = useRef(selectedPointIndex)

  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { figureRef.current = figure }, [figure])
  useEffect(() => { selectedSegIdRef.current = selectedSegmentId }, [selectedSegmentId])
  useEffect(() => { selectedPtRef.current = selectedPointIndex }, [selectedPointIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomDelta = 1 - e.deltaY * 0.002
      const rect = canvas.getBoundingClientRect()
      const newZoom = Math.max(0.1, Math.min(cameraRef.current.zoom * zoomDelta, 10))
      const zoomFactor = newZoom / cameraRef.current.zoom
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      cameraRef.current.x = mx - rect.width / 2 - (mx - rect.width / 2 - cameraRef.current.x) * zoomFactor
      cameraRef.current.y = my - rect.height / 2 - (my - rect.height / 2 - cameraRef.current.y) * zoomFactor
      cameraRef.current.zoom = newZoom
    }
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    const handleResetCamera = () => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cw = figureRef.current?.canvasWidth || 800
      const ch = figureRef.current?.canvasHeight || 600
      const paddingW = 40
      const paddingH = 200
      const availW = Math.max(100, rect.width - paddingW)
      const availH = Math.max(100, rect.height - paddingH)
      const fit = Math.min(availW / cw, availH / ch)
      const z = Number(Math.max(0.35, Math.min(fit, 1.0)).toFixed(2))
      cameraRef.current = { x: 0, y: -100, zoom: z }
    }
    window.addEventListener("reset-camera", handleResetCamera)

    const handleZoomStep = (e: any) => {
      let pct = cameraRef.current.zoom * 100
      pct = e.detail > 0 ? Math.ceil((pct + 1) / 5) * 5 : Math.floor((pct - 1) / 5) * 5
      pct = Math.max(5, Math.min(pct, 1000))
      cameraRef.current.zoom = pct / 100
    }
    window.addEventListener("zoom-step", handleZoomStep)

    const globalUp = () => {
      if (dragState.current.isDragging) {
        dragState.current.isDragging = false
        pushHistory()
      }
    }
    window.addEventListener('pointerup', globalUp)
    window.addEventListener('pointercancel', globalUp)

    let animId: number
    const render = () => {
      animId = requestAnimationFrame(render)
      const fig = figureRef.current
      if (!fig || !canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.round(rect.width * dpr)
      const h = Math.round(rect.height * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, rect.width, rect.height)

      const cam = cameraRef.current
      ctx.save()
      ctx.translate(rect.width / 2 + cam.x, rect.height / 2 + cam.y)
      ctx.scale(cam.zoom, cam.zoom)

      const cw = fig.canvasWidth || 800
      const ch = fig.canvasHeight || 600
      ctx.fillStyle = "#1e1e1e"
      ctx.fillRect(-cw / 2, -ch / 2, cw, ch)

      ctx.strokeStyle = "rgba(255,255,255,0.03)"
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = -cw / 2; x <= cw / 2; x += 50) { ctx.moveTo(x, -ch / 2); ctx.lineTo(x, ch / 2) }
      for (let y = -ch / 2; y <= ch / 2; y += 50) { ctx.moveTo(-cw / 2, y); ctx.lineTo(cw / 2, y) }
      ctx.stroke()

      const sortedSegs = [...fig.segments].sort((a, b) => (a.layer || 0) - (b.layer || 0))

      sortedSegs.forEach(seg => {
        if (seg.hidden) return
        const p1 = seg.getPoint1(fig)
        const p2 = seg.getPoint2(fig)
        if (!p1 || !p2) return
        const isSelected = seg.id === selectedSegIdRef.current

        ctx.save()
        if (seg.type === 'line') {
          ctx.strokeStyle = seg.color || '#d1d5db'
          ctx.lineWidth = seg.width || 3
          ctx.lineCap = seg.lineCap as CanvasLineCap || 'round'
          ctx.beginPath()
          if (seg.curved) {
            const mx = (p1.x + p2.x) / 2
            const my = (p1.y + p2.y) / 2
            const dx = p2.x - p1.x
            const dy = p2.y - p1.y
            const nx = -dy * seg.curvature
            const ny = dx * seg.curvature
            ctx.moveTo(p1.x, p1.y)
            ctx.quadraticCurveTo(mx + nx, my + ny, p2.x, p2.y)
          } else {
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
          }
          ctx.stroke()
          if (isSelected) {
            ctx.strokeStyle = "#3b82f6"
            ctx.lineWidth = (seg.width || 3) + 4
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            if (seg.curved) {
              const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2
              const dx = p2.x - p1.x; const dy = p2.y - p1.y
              ctx.moveTo(p1.x, p1.y)
              ctx.quadraticCurveTo(mx + -dy * seg.curvature, my + dx * seg.curvature, p2.x, p2.y)
            } else {
              ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y)
            }
            ctx.stroke()
          }
        } else if (seg.type === 'circle') {
          const mx = (p1.x + p2.x) / 2
          const my = (p1.y + p2.y) / 2
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const radius = Math.sqrt(dx * dx + dy * dy) / 2
          ctx.fillStyle = seg.color || '#d1d5db'
          ctx.beginPath()
          ctx.arc(mx, my, Math.max(radius, 1), 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = isSelected ? '#3b82f6' : 'rgba(255,255,255,0.3)'
          ctx.lineWidth = isSelected ? 3 / cam.zoom : 1
          ctx.stroke()
        } else if (seg.type === 'image' && seg.imageObj && seg.imageObj.complete) {
          const mx = (p1.x + p2.x) / 2
          const my = (p1.y + p2.y) / 2
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx)
          const iw = seg.imageWidth || dist || 100
          const ih = seg.imageHeight === 'auto' ? iw / (seg.imageObj.width / seg.imageObj.height || 1) : Number(seg.imageHeight)
          ctx.save()
          ctx.translate(mx, my)
          ctx.rotate(angle)
          ctx.drawImage(seg.imageObj, -iw / 2, -ih / 2, iw, ih)
          if (isSelected) {
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = 2 / cam.zoom
            ctx.strokeRect(-iw / 2, -ih / 2, iw, ih)
          }
          ctx.restore()
        }
        ctx.restore()
      })

      const z = cam.zoom
      if (activeToolRef.current === 'select' || activeToolRef.current === 'point') {
        fig.points.forEach((pt, i) => {
          const isPointSelected = i === selectedPtRef.current
          const isConnected = fig.segments.some(s => s.point1Index === i || s.point2Index === i)
          if (!isConnected && !isPointSelected) return
          ctx.beginPath()
          ctx.arc(pt.x, pt.y, (isPointSelected ? 7 : 5) / z, 0, Math.PI * 2)
          ctx.fillStyle = isPointSelected ? '#facc15' : '#0ea5e9'
          ctx.lineWidth = 1.5 / z
          ctx.strokeStyle = '#ffffff'
          ctx.stroke()
          ctx.fill()
        })
      }

      ctx.restore()
    }
    render()

    return () => {
      canvas.removeEventListener('wheel', handleWheel)
      window.removeEventListener('reset-camera', handleResetCamera)
      window.removeEventListener('zoom-step', handleZoomStep)
      window.removeEventListener('pointerup', globalUp)
      window.removeEventListener('pointercancel', globalUp)
      cancelAnimationFrame(animId)
    }
  }, [])

  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const mx = clientX - rect.left
    const my = clientY - rect.top
    const cam = cameraRef.current
    return {
      x: (mx - rect.width / 2 - cam.x) / cam.zoom,
      y: (my - rect.height / 2 - cam.y) / cam.zoom,
    }
  }

  const hitTestPoint = (wx: number, wy: number) => {
    const fig = figureRef.current
    if (!fig) return -1
    const z = cameraRef.current.zoom
    const threshold = 15 / z
    for (let i = 0; i < fig.points.length; i++) {
      const dx = fig.points[i].x - wx
      const dy = fig.points[i].y - wy
      if (Math.sqrt(dx * dx + dy * dy) < threshold) return i
    }
    return -1
  }

  const hitTestSegment = (wx: number, wy: number) => {
    const fig = figureRef.current
    if (!fig) return null as string | null
    const z = cameraRef.current.zoom
    const threshold = 10 / z
    for (let i = fig.segments.length - 1; i >= 0; i--) {
      const seg = fig.segments[i]
      if (seg.hidden) continue
      const p1 = seg.getPoint1(fig)
      const p2 = seg.getPoint2(fig)
      if (!p1 || !p2) continue
      if (seg.type === 'line') {
        const dx = p2.x - p1.x
        const dy = p2.y - p1.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 0.01) continue
        const t = Math.max(0, Math.min(1, ((wx - p1.x) * dx + (wy - p1.y) * dy) / (len * len)))
        const px = p1.x + t * dx
        const py = p1.y + t * dy
        const dist = Math.sqrt((wx - px) ** 2 + (wy - py) ** 2)
        if (dist < threshold) return seg.id
      } else if (seg.type === 'circle') {
        const mx = (p1.x + p2.x) / 2
        const my = (p1.y + p2.y) / 2
        const dx2 = p2.x - p1.x
        const dy2 = p2.y - p1.y
        const r = Math.sqrt(dx2 * dx2 + dy2 * dy2) / 2
        const dist = Math.sqrt((wx - mx) ** 2 + (wy - my) ** 2)
        if (Math.abs(dist - r) < threshold) return seg.id
      } else if (seg.type === 'image') {
        const mx = (p1.x + p2.x) / 2
        const my = (p1.y + p2.y) / 2
        const dx2 = p2.x - p1.x
        const dy2 = p2.y - p1.y
        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2)
        const iw = seg.imageWidth || dist || 100
        const ih = seg.imageHeight === 'auto' ? iw : Number(seg.imageHeight)
        if (wx >= mx - iw / 2 && wx <= mx + iw / 2 && wy >= my - ih / 2 && wy <= my + ih / 2) return seg.id
      }
    }
    return null
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!figureRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    try { canvas.setPointerCapture(e.pointerId) } catch { }

    const world = screenToWorld(e.clientX, e.clientY)
    const fig = figureRef.current

    if (e.button === 1) {
      dragState.current = { isDragging: false, isPoint: false, pointIndex: -1, isSegment: false, segmentId: null, isPanning: true, startPanX: e.clientX, startPanY: e.clientY, startCamX: cameraRef.current.x, startCamY: cameraRef.current.y, startX: 0, startY: 0, startPointX: 0, startPointY: 0, isCreating: false }
      return
    }

    if (activeTool === 'point' || activeTool === 'select') {
      const ptHit = hitTestPoint(world.x, world.y)
      if (ptHit >= 0) {
        setSelectedPointIndex(ptHit)
        setSelectedSegmentId(null)
        dragState.current = {
          isDragging: true, isPoint: true, pointIndex: ptHit,
          isSegment: false, segmentId: null,
          isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
          startX: world.x, startY: world.y,
          startPointX: fig.points[ptHit].x, startPointY: fig.points[ptHit].y,
          isCreating: false,
        }
        return
      }
    }

    if (activeTool === 'select') {
      const segHit = hitTestSegment(world.x, world.y)
      if (segHit) {
        setSelectedSegmentId(segHit)
        setSelectedPointIndex(null)
        dragState.current = {
          isDragging: true, isPoint: false, pointIndex: -1,
          isSegment: true, segmentId: segHit,
          isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
          startX: world.x, startY: world.y,
          startPointX: world.x, startPointY: world.y,
          isCreating: false,
        }
        return
      }
      setSelectedSegmentId(null)
      setSelectedPointIndex(null)
    }

    if (activeTool === 'line' || activeTool === 'circle' || activeTool === 'image') {
      const newSeg = fig.addSegment(activeTool)
      const newIdx = fig.segments.length - 1
      const p1 = fig.points[newSeg.point1Index]
      p1.x = world.x
      p1.y = world.y
      const p2 = fig.points[newSeg.point2Index]
      p2.x = world.x + 1
      p2.y = world.y + 1
      setSelectedSegmentId(newSeg.id)
      setSelectedPointIndex(newSeg.point2Index)
      dragState.current = {
        isDragging: true, isPoint: true, pointIndex: newSeg.point2Index,
        isSegment: false, segmentId: null,
        isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
        startX: world.x, startY: world.y,
        startPointX: p2.x, startPointY: p2.y,
        isCreating: true,
      }
      forceUpdate()
      return
    }

    if (e.button === 0) {
      dragState.current = {
        isDragging: false, isPoint: false, pointIndex: -1,
        isSegment: false, segmentId: null,
        isPanning: true, startPanX: e.clientX, startPanY: e.clientY,
        startCamX: cameraRef.current.x, startCamY: cameraRef.current.y,
        startX: 0, startY: 0, startPointX: 0, startPointY: 0,
        isCreating: false,
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !figureRef.current) return
    const world = screenToWorld(e.clientX, e.clientY)
    const d = dragState.current
    const fig = figureRef.current

    if (d.isPanning) {
      const rect = canvas.getBoundingClientRect()
      cameraRef.current.x = d.startCamX + (e.clientX - d.startPanX)
      cameraRef.current.y = d.startCamY + (e.clientY - d.startPanY)
      return
    }

    if (d.isDragging && d.isPoint && d.pointIndex >= 0 && fig.points[d.pointIndex]) {
      fig.points[d.pointIndex].x = d.startPointX + (world.x - d.startX)
      fig.points[d.pointIndex].y = d.startPointY + (world.y - d.startY)
      if (d.isCreating) {
        const otherIdx = d.pointIndex === 0 ? 1 : 0
        if (fig.points[otherIdx]) {
          fig.points[otherIdx].x = d.startPointX
          fig.points[otherIdx].y = d.startPointY
        }
      }
      forceUpdate()
    }

    if (d.isDragging && d.isSegment && d.segmentId) {
      const seg = fig.getSegment(d.segmentId)
      if (seg) {
        const p1 = seg.getPoint1(fig)
        const p2 = seg.getPoint2(fig)
        if (p1 && p2) {
          const dx = world.x - d.startX
          const dy = world.y - d.startY
          p1.x += dx; p1.y += dy
          p2.x += dx; p2.y += dy
          d.startX = world.x; d.startY = world.y
          forceUpdate()
        }
      }
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    />
  )
}
