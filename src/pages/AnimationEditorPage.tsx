import React, { useState, useEffect } from "react"
import { ArrowLeft, ListTree, MousePointer2, SlidersHorizontal, Plus, Minus, Maximize, Move, Undo2, Redo2, Play, Pause, ChevronLeft, ChevronRight, Video } from "lucide-react"
import { useFigureEditor } from "@/context/FigureEditorContext"
import { FigureAnimation } from "@/core/nodes/FigureAnimation"
import { FigureCanvasArea } from "@/components/nodes/FigureCanvasArea"
import { SegmentInspector } from "@/components/nodes/SegmentInspector"
import { FigureHierarchyPanel } from "@/components/nodes/FigureHierarchyPanel"
import { FloatingSidebar } from "@/components/layout/FloatingSidebar"
import { SidebarButton } from "@/components/layout/SidebarButton"
import { SideDrawer } from "@/components/layout/SideDrawer"

export function AnimationEditorPage({ onBack }: { onBack: () => void }) {
  const {
    activeTool, setActiveTool,
    undo, redo, canUndo, canRedo,
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    fps, duration, setDuration,
    currentAnimation, setCurrentAnimation,
  } = useFigureEditor()

  useEffect(() => {
    if (!currentAnimation) {
      setCurrentAnimation(new FigureAnimation('Animation'))
    }
    setActiveTool('select')
  }, [])

  const timelineRef = React.useRef<HTMLDivElement>(null)
  const [activeLeftTab, setActiveLeftTab] = useState<string | null>(null)
  const [activeRightTab, setActiveRightTab] = useState<string | null>(null)
  const [isScrubbing, setIsScrubbing] = React.useState(false)

  const currentFrameIndex = Math.round(currentTime * fps)
  const totalFrames = Math.max(1, Math.round(duration * fps) + 1)

  const setFrame = (f: number) => setCurrentTime(f / fps)

  const scrubToPointer = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(x / rect.width, 1))
    const newTime = pct * duration
    setCurrentTime(newTime)
  }

  const handleScrubDown = (e: React.PointerEvent) => {
    setIsScrubbing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    scrubToPointer(e)
  }

  const handleScrubMove = (e: React.PointerEvent) => {
    if (isScrubbing) scrubToPointer(e)
  }

  const handleScrubUp = () => {
    setIsScrubbing(false)
  }

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying(!isPlaying)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setFrame(Math.max(0, currentFrameIndex - 1))
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        setFrame(Math.min(totalFrames - 1, currentFrameIndex + 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPlaying, currentFrameIndex, totalFrames])

  return (
    <div className="relative w-full h-screen bg-neutral-950 overflow-hidden font-poppins text-white select-none">
      <FigureCanvasArea />

      <div className="absolute top-1 left-1 z-[100]">
        <button
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onBack() }}
          className="w-10 h-10 rounded-full bg-[#15151a]/80 backdrop-blur-xl border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all shadow-2xl flex items-center justify-center"
        ><ArrowLeft className="w-4 h-4" /></button>
      </div>

      {/* Top Controls */}
      <div className="absolute top-1 left-12 z-[80] flex items-center gap-1">
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button onClick={undo} disabled={!canUndo} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
          <button onClick={redo} disabled={!canRedo} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
        </div>

        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button onClick={() => setActiveTool('select')} className={`w-8 h-8 flex items-center justify-center rounded-full ${activeTool === 'select' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} title="Select"><MousePointer2 className="w-4 h-4" /></button>
          <button onClick={() => setActiveTool('point')} className={`w-8 h-8 flex items-center justify-center rounded-full ${activeTool === 'point' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} title="Point"><Move className="w-4 h-4" /></button>
        </div>

        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button onClick={() => window.dispatchEvent(new CustomEvent('zoom-step', { detail: -1 }))} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5"><Minus className="w-4 h-4" /></button>
          <span id="zoom-indicator" className="text-[10px] font-mono font-bold text-gray-300 w-10 text-center">100%</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('zoom-step', { detail: 1 }))} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5"><Plus className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={() => window.dispatchEvent(new CustomEvent('reset-camera'))} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5"><Maximize className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Top Right: Animation Label */}
      <div className="absolute top-1 right-12 z-[80] flex items-center gap-1">
        <div className="flex items-center bg-[#15151a]/80 backdrop-blur-xl border border-white/10 px-3 py-1 rounded-full shadow-2xl gap-2">
          <Video className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-purple-300">Animation</span>
        </div>
      </div>

      {/* Bottom Timeline */}
      <div className="absolute bottom-0 left-0 right-0 z-[80] bg-[#15151a]/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center gap-2 px-4 py-2">
          <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
            onClick={() => setFrame(Math.max(0, currentFrameIndex - 1))} disabled={currentFrameIndex <= 0}><ChevronLeft className="w-4 h-4" /></button>

          <div className="text-xs font-mono font-bold text-gray-300 w-14 text-center">
            {currentFrameIndex + 1}/{totalFrames}
          </div>

          {currentFrameIndex >= totalFrames - 1 ? (
            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
              onClick={() => { setDuration(duration + 1 / fps); setFrame(currentFrameIndex + 1) }}><Plus className="w-4 h-4" /></button>
          ) : (
            <button className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              onClick={() => setFrame(Math.min(totalFrames - 1, currentFrameIndex + 1))}><ChevronRight className="w-4 h-4" /></button>
          )}

          <button className={`w-7 h-7 flex items-center justify-center rounded-lg ${isPlaying ? 'text-red-400' : 'text-purple-400 hover:text-purple-300'}`}
            onClick={() => setIsPlaying(!isPlaying)} disabled={totalFrames <= 1}>
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <div ref={timelineRef} className="flex-1 h-8 bg-black/40 rounded-lg relative cursor-pointer overflow-hidden"
            onPointerDown={handleScrubDown}
            onPointerMove={handleScrubMove}
            onPointerUp={handleScrubUp}
            onPointerCancel={handleScrubUp}
          >
            {currentAnimation?.tracks.map(track =>
              track.keyframes.map((kf, i) => {
                const pct = duration > 0 ? (kf.time / duration) * 100 : 0
                return <div key={`${track.pointIndex}-${i}`} className="absolute top-1 w-1.5 h-1.5 rounded-full bg-yellow-400" style={{ left: `${pct}%`, top: '4px' }} />
              })
            )}
            <div className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none" style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
            {Array.from({ length: Math.min(totalFrames, 60) }).map((_, i) => {
              const pct = totalFrames > 1 ? (i / (totalFrames - 1)) * 100 : 0
              return <div key={i} className="absolute bottom-0 w-px h-2" style={{ left: `${pct}%`, background: i % 5 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }} />
            })}
          </div>

          <span className="text-[10px] text-gray-500 font-mono w-10 text-right">{fps} FPS</span>
        </div>
      </div>

      {/* Left Sidebar */}
      <FloatingSidebar side="left">
        <SidebarButton active={activeLeftTab === "hierarchy"} onClick={() => setActiveLeftTab(activeLeftTab === "hierarchy" ? null : "hierarchy")} title="Segments List" icon={ListTree} />
      </FloatingSidebar>
      <SideDrawer side="left" activeTab={activeLeftTab} onClose={() => setActiveLeftTab(null)}>
        {activeLeftTab === "hierarchy" && <FigureHierarchyPanel />}
      </SideDrawer>

      {/* Right Sidebar */}
      <FloatingSidebar side="right">
        <SidebarButton active={activeRightTab === "inspector"} onClick={() => setActiveRightTab(activeRightTab === "inspector" ? null : "inspector")} title="Inspector" icon={SlidersHorizontal} activeColorClass="bg-purple-600 hover:bg-purple-500 shadow-purple-500/30" />
      </FloatingSidebar>
      <SideDrawer side="right" activeTab={activeRightTab} onClose={() => setActiveRightTab(null)}>
        {activeRightTab === "inspector" && <SegmentInspector />}
      </SideDrawer>
    </div>
  )
}
