import React, { useState, useEffect } from "react"
import { ArrowLeft, ListTree, MousePointer2, PenTool, Circle, Square, Image as ImageIcon, SlidersHorizontal, Plus, Minus, Maximize, Move, Undo2, Redo2, Play, Pause, ChevronLeft, ChevronRight, Video, RotateCw, Shrink, Crosshair } from "lucide-react"
import { useFigureEditor } from "@/context/FigureEditorContext"
import { FigureAnimation } from "@/core/nodes/FigureAnimation"
import { FigureCanvasArea } from "@/components/nodes/FigureCanvasArea"
import { SegmentInspector } from "@/components/nodes/SegmentInspector"
import { FigureHierarchyPanel } from "@/components/nodes/FigureHierarchyPanel"
import { FloatingSidebar } from "@/components/layout/FloatingSidebar"
import { SidebarButton } from "@/components/layout/SidebarButton"
import { SideDrawer } from "@/components/layout/SideDrawer"

export function FigureEditorPage({ onBack }: { onBack: () => void }) {
  const {
    figure, activeTool, setActiveTool,
    editorMode, setEditorMode,
    forceUpdate, pushHistory,
    undo, redo, canUndo, canRedo,
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    fps, duration, setDuration,
    currentAnimation, setCurrentAnimation,
  } = useFigureEditor()

  const [activeLeftTab, setActiveLeftTab] = useState<string | null>(null)
  const [activeRightTab, setActiveRightTab] = useState<string | null>(null)

  const currentFrameIndex = Math.round(currentTime * fps)
  const totalFrames = Math.max(1, Math.round(duration * fps) + 1)
  const isFigureMode = editorMode === 'figure'

  useEffect(() => {
    if (editorMode === 'animate' && !currentAnimation) {
      const anim = new FigureAnimation('Animation')
      setCurrentAnimation(anim)
    }
  }, [editorMode])

  const setFrame = (f: number) => setCurrentTime(f / fps)

  const handleAddSegment = (type: string) => {
    if (editorMode === 'animate') return
    setActiveTool(type as any)
  }

  const handleModeChange = (mode: 'figure' | 'animate') => {
    setEditorMode(mode)
    if (mode === 'figure') {
      setActiveTool('select')
      setCurrentTime(0)
    }
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    const newTime = Math.max(0, Math.min(pct * duration, duration))
    setCurrentTime(newTime)
  }

  const timelineRef = React.useRef<HTMLDivElement>(null)

  return (
    <div className="relative w-full h-screen bg-neutral-950 overflow-hidden font-poppins text-white select-none">
      <FigureCanvasArea />

      {/* Back + Top Controls */}
      <div className="absolute top-1 left-1 z-[100]">
        <button
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onBack() }}
          className="w-10 h-10 rounded-full bg-[#15151a]/80 backdrop-blur-xl border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all shadow-2xl flex items-center justify-center pointer-events-auto cursor-pointer"
        ><ArrowLeft className="w-4 h-4" /></button>
      </div>

      <div className="absolute top-1 left-12 z-[80] flex items-center gap-1">
        {/* Undo/Redo */}
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button onClick={undo} disabled={!canUndo} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"><Undo2 className="w-4 h-4" /></button>
          <button onClick={redo} disabled={!canRedo} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"><Redo2 className="w-4 h-4" /></button>
        </div>

        {/* Select/Point Tools */}
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button
            onClick={() => setActiveTool('select')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'select' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Select/Move"
          ><MousePointer2 className="w-4 h-4" /></button>
          <button
            onClick={() => setActiveTool('point')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'point' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Edit Points (FK - moves connected chain)"
          ><Move className="w-4 h-4" /></button>
          <button
            onClick={() => setActiveTool('modify')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'modify' ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Modify Point (single point, no FK)"
          ><Crosshair className="w-4 h-4" /></button>
          <button
            onClick={() => setActiveTool('rotate')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'rotate' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Rotate (drag point to rotate connected segments)"
          ><RotateCw className="w-4 h-4" /></button>
          <button
            onClick={() => setActiveTool('stretch')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'stretch' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Stretch (drag point to stretch connected segments)"
          ><Shrink className="w-4 h-4" /></button>
        </div>

        {/* Add Segment Tools (disabled in animate mode) */}
        <div className={`flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5 transition-opacity ${!isFigureMode ? 'opacity-40' : ''}`}>
          <button
            onClick={() => handleAddSegment('line')}
            disabled={!isFigureMode}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'line' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Add Line Segment"
          ><PenTool className="w-4 h-4" /></button>
          <button
            onClick={() => handleAddSegment('circle')}
            disabled={!isFigureMode}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'circle' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Add Circle Segment"
          ><Circle className="w-4 h-4" /></button>
          <button
            onClick={() => handleAddSegment('image')}
            disabled={!isFigureMode}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'image' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Add Image Segment"
          ><ImageIcon className="w-4 h-4" /></button>
        </div>

        {/* Camera Controls */}
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button onClick={() => window.dispatchEvent(new CustomEvent('zoom-step', { detail: -1 }))} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"><Minus className="w-4 h-4" /></button>
          <span id="zoom-indicator" className="text-[10px] font-mono font-bold text-gray-300 w-10 text-center select-none">100%</span>
          <button onClick={() => window.dispatchEvent(new CustomEvent('zoom-step', { detail: 1 }))} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"><Plus className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button onClick={() => window.dispatchEvent(new CustomEvent('reset-camera'))} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"><Maximize className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Top Right: Mode Switch */}
      <div className="absolute top-1 right-12 z-[80] flex items-center gap-1">
        <div className="flex items-center bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isFigureMode ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => handleModeChange('figure')}
            title="Figure Editor Mode"
          ><Square className="w-4 h-4" /></button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${!isFigureMode ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => handleModeChange('animate')}
            title="Animate Mode"
          ><Video className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Bottom Timeline Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[80] bg-[#15151a]/90 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Frame Navigation */}
          <button
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
            onClick={() => setFrame(Math.max(0, currentFrameIndex - 1))}
            disabled={currentFrameIndex <= 0}
          ><ChevronLeft className="w-4 h-4" /></button>

          <div className="text-xs font-mono font-bold text-gray-300 w-14 text-center">
            {currentFrameIndex + 1}/{totalFrames}
          </div>

          {currentFrameIndex >= totalFrames - 1 ? (
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
              onClick={() => {
                const newDur = duration + 1 / fps
                setDuration(newDur)
                setFrame(currentFrameIndex + 1)
              }}
            ><Plus className="w-4 h-4" /></button>
          ) : (
            <button
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              onClick={() => setFrame(Math.min(totalFrames - 1, currentFrameIndex + 1))}
            ><ChevronRight className="w-4 h-4" /></button>
          )}

          <button
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isPlaying ? 'text-red-400' : 'text-purple-400 hover:text-purple-300'}`}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={totalFrames <= 1}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Timeline Scrubber */}
          <div
            ref={timelineRef}
            className="flex-1 h-8 bg-black/40 rounded-lg relative cursor-pointer overflow-hidden"
            onClick={handleTimelineClick}
          >
            {/* Keyframe markers */}
            {currentAnimation?.tracks.map(track =>
              track.keyframes.map((kf, i) => {
                const pct = duration > 0 ? (kf.time / duration) * 100 : 0
                return (
                  <div
                    key={`${track.pointIndex}-${i}`}
                    className="absolute top-1 w-1.5 h-1.5 rounded-full bg-yellow-400"
                    style={{ left: `${pct}%`, top: '4px' }}
                  />
                )
              })
            )}
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 pointer-events-none"
              style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            {/* Frame markers */}
            {Array.from({ length: Math.min(totalFrames, 60) }).map((_, i) => {
              const pct = totalFrames > 1 ? (i / (totalFrames - 1)) * 100 : 0
              return (
                <div
                  key={i}
                  className="absolute bottom-0 w-px h-2"
                  style={{ left: `${pct}%`, background: i % 5 === 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}
                />
              )
            })}
          </div>

          {/* FPS Display */}
          <span className="text-[10px] text-gray-500 font-mono w-10 text-right">{fps} FPS</span>
        </div>
      </div>

      {/* Left Sidebar */}
      <FloatingSidebar side="left">
        <SidebarButton
          active={activeLeftTab === "hierarchy"}
          onClick={() => setActiveLeftTab(activeLeftTab === "hierarchy" ? null : "hierarchy")}
          title="Segments List"
          icon={ListTree}
        />
      </FloatingSidebar>

      <SideDrawer side="left" activeTab={activeLeftTab} onClose={() => setActiveLeftTab(null)}>
        {activeLeftTab === "hierarchy" && <FigureHierarchyPanel />}
      </SideDrawer>

      {/* Right Sidebar */}
      <FloatingSidebar side="right">
        <SidebarButton
          active={activeRightTab === "inspector"}
          onClick={() => setActiveRightTab(activeRightTab === "inspector" ? null : "inspector")}
          title="Inspector"
          icon={SlidersHorizontal}
          activeColorClass="bg-purple-600 hover:bg-purple-500 shadow-purple-500/30"
        />
      </FloatingSidebar>

      <SideDrawer side="right" activeTab={activeRightTab} onClose={() => setActiveRightTab(null)}>
        {activeRightTab === "inspector" && <SegmentInspector />}
      </SideDrawer>
    </div>
  )
}
