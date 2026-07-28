import React, { useRef, useEffect } from "react"
import { useFigureEditor } from "@/context/FigureEditorContext"
import { FigureAnimation } from "@/core/nodes/FigureAnimation"
import { Segment } from "@/core/nodes/Segment"

export function FigureCanvasArea() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    figure, setFigure,
    selectedSegmentId, setSelectedSegmentId,
    selectedPointIndex, setSelectedPointIndex,
    activeTool, setActiveTool,
    forceUpdate, pushHistory,
    editorMode, isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    fps, duration, setDuration,
    currentAnimation, setCurrentAnimation,
  } = useFigureEditor()

  const dragState = useRef({
    isDragging: false, isPoint: false, pointIndex: -1,
    isSegment: false, segmentId: null as string | null,
    isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
    startX: 0, startY: 0, startPointX: 0, startPointY: 0,
    isCreating: false, anchorX: 0, anchorY: 0,
    isRotate: false, isStretch: false,
    pivotIdx: -1, connectedPoints: [] as number[],
    initialAngles: [] as number[], initialDists: [] as number[],
    startAngle: 0, startDist: 0,
    childOffsets: [] as {dx: number, dy: number}[],
    fkParent: {} as Record<number, number>,
    fkLocal: {} as Record<number, {angle: number, dist: number}>,
    fkMoveInit: {} as Record<number, {x: number, y: number}>,
  })

  const defaultDrag = () => ({
    isDragging: false, isPoint: false, pointIndex: -1,
    isSegment: false, segmentId: null as string | null,
    isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
    startX: 0, startY: 0, startPointX: 0, startPointY: 0,
    isCreating: false, anchorX: 0, anchorY: 0,
    isRotate: false, isStretch: false,
    pivotIdx: -1, connectedPoints: [] as number[],
    initialAngles: [] as number[], initialDists: [] as number[],
    startAngle: 0, startDist: 0,
    childOffsets: [] as {dx: number, dy: number}[],
    fkParent: {} as Record<number, number>,
    fkLocal: {} as Record<number, {angle: number, dist: number}>,
    fkMoveInit: {} as Record<number, {x: number, y: number}>,
  })

  const setDrag = (partial: Partial<typeof dragState.current>) => {
    Object.assign(dragState.current, defaultDrag(), partial)
  }
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 })

  const activeToolRef = useRef(activeTool)
  const figureRef = useRef(figure)
  const selectedSegIdRef = useRef(selectedSegmentId)
  const selectedPtRef = useRef(selectedPointIndex)
  const editorModeRef = useRef(editorMode)
  const isPlayingRef = useRef(isPlaying)
  const currentTimeRef = useRef(currentTime)
  const fpsRef = useRef(fps)
  const durationRef = useRef(duration)
  const currentAnimRef = useRef(currentAnimation)
  const pushHistoryRef = useRef(pushHistory)
  const forceUpdateRef = useRef(forceUpdate)
  const setCurrentTimeRef = useRef(setCurrentTime)
  const setDurationRef = useRef(setDuration)
  const setCurrentAnimationRef = useRef(setCurrentAnimation)
  const setIsPlayingRef2 = useRef(setIsPlaying)

  const savedPointsRef = useRef<{x: number, y: number}[] | null>(null)

  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { figureRef.current = figure }, [figure])
  useEffect(() => { selectedSegIdRef.current = selectedSegmentId }, [selectedSegmentId])
  useEffect(() => { selectedPtRef.current = selectedPointIndex }, [selectedPointIndex])
  useEffect(() => { editorModeRef.current = editorMode }, [editorMode])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { fpsRef.current = fps }, [fps])
  useEffect(() => { durationRef.current = duration }, [duration])
  useEffect(() => { currentAnimRef.current = currentAnimation }, [currentAnimation])
useEffect(() => { pushHistoryRef.current = pushHistory }, [pushHistory])
useEffect(() => { forceUpdateRef.current = forceUpdate }, [forceUpdate])
useEffect(() => { setCurrentTimeRef.current = setCurrentTime }, [setCurrentTime])
useEffect(() => { setDurationRef.current = setDuration }, [setDuration])
useEffect(() => { setCurrentAnimationRef.current = setCurrentAnimation }, [setCurrentAnimation])
useEffect(() => { setIsPlayingRef2.current = setIsPlaying }, [setIsPlaying])

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
      if (dragState.current.isDragging || dragState.current.isPanning) {
        const wasCreating = dragState.current.isCreating
        dragState.current.isDragging = false
        dragState.current.isPanning = false
        dragState.current.isPoint = false
        dragState.current.isSegment = false
        dragState.current.isRotate = false
        dragState.current.isStretch = false
        dragState.current.segmentId = null
        if (wasCreating) {
          pushHistoryRef.current()
        }
      }
    }
    window.addEventListener('pointerup', globalUp)
    window.addEventListener('pointercancel', globalUp)

    let animId: number
    let lastTime = performance.now()

    const render = (now: number) => {
      animId = requestAnimationFrame(render)
      const fig = figureRef.current
      if (!fig || !canvas) return

      const dt = (now - lastTime) / 1000
      lastTime = now

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

      // Animation playback
      if (editorModeRef.current === "animate" && currentAnimRef.current) {
        if (isPlayingRef.current) {
          let newTime = currentTimeRef.current + dt
          if (durationRef.current > 0) {
            if (newTime > durationRef.current) {
              newTime %= durationRef.current
            }
          }
          if (!dragState.current.isDragging) {
            setCurrentTimeRef.current(newTime)
            savedPointsRef.current = null
          }
        }
        if (!dragState.current.isDragging) {
          const anim = currentAnimRef.current
          if (anim) {
            savedPointsRef.current = fig.points.map(p => ({ x: p.x, y: p.y }))
            anim.applyToFigure(fig, currentTimeRef.current)
          }
        }
      }

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
          ctx.lineWidth = seg.width || 3
          ctx.strokeStyle = seg.color || '#d1d5db'
          ctx.lineCap = seg.lineCap as CanvasLineCap || 'round'
          if (seg.filled !== false) {
            ctx.fillStyle = seg.color || '#d1d5db'
            ctx.beginPath()
            ctx.arc(mx, my, Math.max(radius, 1), 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.beginPath()
          ctx.arc(mx, my, Math.max(radius, 1), 0, Math.PI * 2)
          ctx.stroke()
          if (isSelected) {
            ctx.strokeStyle = '#3b82f6'
            ctx.lineWidth = (seg.width || 3) + 4
            ctx.globalAlpha = 0.3
            ctx.beginPath()
            ctx.arc(mx, my, Math.max(radius, 1), 0, Math.PI * 2)
            ctx.stroke()
          }
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
      fig.points.forEach((pt, i) => {
        const isPointSelected = i === selectedPtRef.current
        const isRoot = i === 0
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, (isPointSelected ? 7 : 5) / z, 0, Math.PI * 2)
        ctx.fillStyle = isPointSelected ? '#facc15' : isRoot ? '#ef4444' : '#0ea5e9'
        ctx.lineWidth = 1.5 / z
        ctx.strokeStyle = '#ffffff'
        ctx.stroke()
        ctx.fill()
      })

      ctx.restore()
    }
    render(performance.now())

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

  const findConnectedPoints = (fig: any, pivotIdx: number): number[] => {
    const visited = new Set<number>()
    const queue = [pivotIdx]
    visited.add(pivotIdx)
    while (queue.length > 0) {
      const idx = queue.shift()!
      fig.segments.forEach((s: any) => {
        const other = s.point1Index === idx ? s.point2Index : s.point2Index === idx ? s.point1Index : -1
        if (other >= 0 && !visited.has(other)) {
          visited.add(other)
          queue.push(other)
        }
      })
    }
    const result = Array.from(visited)
    return result.filter(i => i !== pivotIdx)
  }

  const findSubTree = (fig: any, rootIdx: number, excludeIdx: number): number[] => {
    const visited = new Set<number>([rootIdx])
    const queue = [rootIdx]
    while (queue.length > 0) {
      const idx = queue.shift()!
      fig.segments.forEach((s: any) => {
        const other = s.point1Index === idx ? s.point2Index : s.point2Index === idx ? s.point1Index : -1
        if (other >= 0 && !visited.has(other) && other !== excludeIdx) {
          visited.add(other)
          queue.push(other)
        }
      })
    }
    return Array.from(visited).filter(i => i !== rootIdx)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!figureRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    try { canvas.setPointerCapture(e.pointerId) } catch { }

    const world = screenToWorld(e.clientX, e.clientY)
    const fig = figureRef.current

    if (isPlayingRef.current) setIsPlaying(false)

    const rootHit = hitTestPoint(world.x, world.y)
    if (rootHit === 0 && e.button === 0 && activeTool !== 'line' && activeTool !== 'circle' && activeTool !== 'image') {
      const allConnected = findConnectedPoints(fig, 0)
      allConnected.push(0)
      const initPositions: Record<number, {x: number, y: number}> = {}
      allConnected.forEach(i => { initPositions[i] = { x: fig.points[i].x, y: fig.points[i].y } })
      setSelectedPointIndex(0)
      setDrag({
        isDragging: true, isPoint: true, pointIndex: 0,
        startX: world.x, startY: world.y,
        startPointX: fig.points[0].x, startPointY: fig.points[0].y,
        connectedPoints: allConnected,
        fkMoveInit: initPositions,
      })
      forceUpdateRef.current()
      return
    }

    if (e.button === 1) {
      setDrag({ isDragging: false, isPoint: false, pointIndex: -1, isSegment: false, segmentId: null, isPanning: true, startPanX: e.clientX, startPanY: e.clientY, startCamX: cameraRef.current.x, startCamY: cameraRef.current.y, startX: 0, startY: 0, startPointX: 0, startPointY: 0, isCreating: false })
      return
    }

    if (activeTool === 'modify') {
      const ptHit = hitTestPoint(world.x, world.y)
      if (ptHit > 0) {
        setSelectedPointIndex(ptHit)
        setSelectedSegmentId(null)
        setDrag({
          isDragging: true, isPoint: true, pointIndex: ptHit,
          startX: world.x, startY: world.y,
          startPointX: fig.points[ptHit].x, startPointY: fig.points[ptHit].y,
        })
        return
      }
    }

    if (activeTool === 'point' || activeTool === 'select') {
      const ptHit = hitTestPoint(world.x, world.y)
      if (ptHit >= 0) {
        const allConnected = findConnectedPoints(fig, ptHit)
        allConnected.push(ptHit)
        setSelectedPointIndex(ptHit)
        setSelectedSegmentId(null)
        const initPositions: Record<number, {x: number, y: number}> = {}
        allConnected.forEach(i => { initPositions[i] = { x: fig.points[i].x, y: fig.points[i].y } })
        initPositions[ptHit] = { x: fig.points[ptHit].x, y: fig.points[ptHit].y }
        setDrag({
          isDragging: true, isPoint: true, pointIndex: ptHit,
          isSegment: false, segmentId: null,
          isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
          startX: world.x, startY: world.y,
          startPointX: fig.points[ptHit].x, startPointY: fig.points[ptHit].y,
          isCreating: false, anchorX: 0, anchorY: 0,
          isRotate: false, isStretch: false, pivotIdx: -1,
          connectedPoints: allConnected, initialAngles: [], initialDists: [],
          startAngle: 0, startDist: 0, childOffsets: [],
          fkParent: {}, fkLocal: {},
          fkMoveInit: initPositions,
        })
        return
      }
    }

    if (activeTool === 'select') {
      const segHit = hitTestSegment(world.x, world.y)
      if (segHit) {
        setSelectedSegmentId(segHit)
        setSelectedPointIndex(null)
        setDrag({
          isDragging: true, isPoint: false, pointIndex: -1,
          isSegment: true, segmentId: segHit,
          isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
          startX: world.x, startY: world.y,
          startPointX: world.x, startPointY: world.y,
          isCreating: false,
        })
        return
      }
      setSelectedSegmentId(null)
      setSelectedPointIndex(null)
    }

    if (activeTool === 'rotate') {
      const ptHit = hitTestPoint(world.x, world.y)
      if (ptHit < 0) return
      const connectedSeg = fig.segments.find(
        s => (s.point1Index === ptHit || s.point2Index === ptHit)
      )
      if (!connectedSeg) return
      const pivotIdx = connectedSeg.point1Index === ptHit ? connectedSeg.point2Index : connectedSeg.point1Index
      const childPoints = findSubTree(fig, ptHit, pivotIdx).filter(i => i !== 0)
      const parentMap: Record<number, number> = {}
      parentMap[ptHit] = pivotIdx
      const queue = [ptHit]
      const visited = new Set<number>([ptHit])
      while (queue.length > 0) {
        const idx = queue.shift()!
        fig.segments.forEach((s: any) => {
          const other = s.point1Index === idx ? s.point2Index : s.point2Index === idx ? s.point1Index : -1
          if (other >= 0 && !visited.has(other) && other !== pivotIdx) {
            parentMap[other] = idx
            visited.add(other)
            queue.push(other)
          }
        })
      }
      const localData: Record<number, { angle: number; dist: number }> = {}
      const addLocal = (ci: number) => {
        const parent = parentMap[ci]
        if (parent === undefined) return
        const dx = fig.points[ci].x - fig.points[parent].x
        const dy = fig.points[ci].y - fig.points[parent].y
        localData[ci] = {
          angle: Math.atan2(dy, dx),
          dist: Math.sqrt(dx * dx + dy * dy),
        }
      }
      Object.keys(parentMap).forEach(k => addLocal(parseInt(k)))
      setSelectedPointIndex(ptHit)
      setSelectedSegmentId(null)
      setDrag({
        isDragging: true, isPoint: false, pointIndex: -1,
        isSegment: false, segmentId: null,
        isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
        startX: world.x, startY: world.y, startPointX: 0, startPointY: 0,
        isCreating: false, anchorX: fig.points[ptHit].x, anchorY: fig.points[ptHit].y,
        isRotate: true, isStretch: false,
        pivotIdx, connectedPoints: [ptHit, ...childPoints],
        initialAngles: [], initialDists: [],
        startAngle: Math.atan2(world.y - fig.points[pivotIdx].y, world.x - fig.points[pivotIdx].x),
        startDist: 0,
        childOffsets: [],
        fkParent: parentMap, fkLocal: localData,
      })
      forceUpdateRef.current()
      return
    }
    if (activeTool === 'stretch') {
      const ptHit = hitTestPoint(world.x, world.y)
      if (ptHit < 0) return
      setSelectedPointIndex(ptHit)
      setSelectedSegmentId(null)
      const connected = findConnectedPoints(fig, ptHit)
      const initialAngles = connected.map(i => Math.atan2(fig.points[i].y - fig.points[ptHit].y, fig.points[i].x - fig.points[ptHit].x))
      const initialDists = connected.map(i => {
        const dx = fig.points[i].x - fig.points[ptHit].x
        const dy = fig.points[i].y - fig.points[ptHit].y
        return Math.sqrt(dx * dx + dy * dy)
      })
      const startAngle = Math.atan2(world.y - fig.points[ptHit].y, world.x - fig.points[ptHit].x)
      const startDist = Math.sqrt((world.x - fig.points[ptHit].x) ** 2 + (world.y - fig.points[ptHit].y) ** 2)
      setDrag({
        isDragging: true, isPoint: false, pointIndex: -1,
        isSegment: false, segmentId: null,
        isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
        startX: world.x, startY: world.y, startPointX: 0, startPointY: 0,
        isCreating: false, anchorX: 0, anchorY: 0,
        isRotate: false, isStretch: true,
        pivotIdx: ptHit, connectedPoints: connected,
        initialAngles, initialDists,
        startAngle, startDist,
      })
      forceUpdateRef.current()
      return
    }

    if (activeTool === 'line' || activeTool === 'circle' || activeTool === 'image') {
      const ptHit = hitTestPoint(world.x, world.y)
      if (ptHit < 0) {
        if (fig.points.length === 0) fig.addPoint(world.x, world.y)
        return
      }
      const p2Idx = fig.addPoint(world.x, world.y)
      const seg = fig.createSegment(activeTool, ptHit, p2Idx)
      setSelectedSegmentId(seg.id)
      setSelectedPointIndex(p2Idx)
      setDrag({
        isDragging: true, isPoint: true, pointIndex: p2Idx,
        isSegment: false, segmentId: null,
        isPanning: false, startPanX: 0, startPanY: 0, startCamX: 0, startCamY: 0,
        startX: world.x, startY: world.y,
        startPointX: world.x, startPointY: world.y,
        isCreating: true, anchorX: fig.points[ptHit].x, anchorY: fig.points[ptHit].y,
      })
      forceUpdateRef.current()
      return
    }

    if (e.button === 0) {
      setDrag({ isDragging: false, isPoint: false, pointIndex: -1, isSegment: false, segmentId: null, isPanning: true, startPanX: e.clientX, startPanY: e.clientY, startCamX: cameraRef.current.x, startCamY: cameraRef.current.y, startX: 0, startY: 0, startPointX: 0, startPointY: 0, isCreating: false })
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas || !figureRef.current) return
    const world = screenToWorld(e.clientX, e.clientY)
    const d = dragState.current
    const fig = figureRef.current

    if (d.isPanning) {
      cameraRef.current.x = d.startCamX + (e.clientX - d.startPanX)
      cameraRef.current.y = d.startCamY + (e.clientY - d.startPanY)
      return
    }

    if (d.isDragging && d.isPoint && d.pointIndex >= 0 && fig.points[d.pointIndex]) {
      const pt = fig.points[d.pointIndex]
      const dx = world.x - d.startX
      const dy = world.y - d.startY
      const cp = d.connectedPoints
      if (cp && cp.length > 0) {
        cp.forEach(i => {
          const init = d.fkMoveInit[i]
          if (init) {
            fig.points[i].x = init.x + dx
            fig.points[i].y = init.y + dy
          }
        })
      } else {
        pt.x = d.startPointX + dx
        pt.y = d.startPointY + dy
      }

      if (d.isCreating && fig.segments.length > 0) {
        const seg = fig.segments[fig.segments.length - 1]
        const p1 = fig.points[seg.point1Index]
        if (p1) {
          p1.x = d.anchorX
          p1.y = d.anchorY
        }
      }

      if (editorModeRef.current === 'animate' && !d.isCreating) {
        let anim = currentAnimRef.current
        if (!anim) {
          anim = new FigureAnimation('Animation')
          setCurrentAnimationRef.current(anim)
          currentAnimRef.current = anim
        }
        const time = currentTimeRef.current
        anim.setPointPose(time, d.pointIndex, pt.x, pt.y)
        setDurationRef.current(Math.max(durationRef.current, time))
      }

      forceUpdateRef.current()
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
          forceUpdateRef.current()
        }
      }
    }

    if (d.isDragging && d.isRotate && d.pivotIdx >= 0 && d.connectedPoints.length > 0) {
      const px = fig.points[d.pivotIdx].x
      const py = fig.points[d.pivotIdx].y
      const angleDelta = Math.atan2(world.y - py, world.x - px) - d.startAngle
      const newPositions: Record<number, {x: number, y: number}> = {}
      newPositions[d.pivotIdx] = { x: px, y: py }
      d.connectedPoints.forEach((ci) => {
        const parent = d.fkParent[ci]
        if (parent === undefined) return
        const pp = newPositions[parent]
        if (!pp) return
        const local = d.fkLocal[ci]
        if (!local) return
        const newAngle = local.angle + angleDelta
        newPositions[ci] = {
          x: pp.x + Math.cos(newAngle) * local.dist,
          y: pp.y + Math.sin(newAngle) * local.dist,
        }
      })
      Object.entries(newPositions).forEach(([key, pos]) => {
        fig.points[parseInt(key)].x = pos.x
        fig.points[parseInt(key)].y = pos.y
      })
      forceUpdateRef.current()
    }

    if (d.isDragging && d.isStretch && d.pivotIdx >= 0) {
      const px = fig.points[d.pivotIdx].x
      const py = fig.points[d.pivotIdx].y
      const currentDist = Math.sqrt((world.x - px) ** 2 + (world.y - py) ** 2)
      const scale = d.startDist > 0.01 ? currentDist / d.startDist : 1
      d.connectedPoints.forEach((ci, i) => {
        const angle = d.initialAngles[i]
        const newDist = d.initialDists[i] * scale
        fig.points[ci].x = px + Math.cos(angle) * newDist
        fig.points[ci].y = py + Math.sin(angle) * newDist
      })
      forceUpdateRef.current()
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
