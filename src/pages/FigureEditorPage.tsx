import React, { useState } from "react"
import { ArrowLeft, ListTree, MousePointer2, PenTool, Circle, Square, Image as ImageIcon, SlidersHorizontal, Plus, Minus, Maximize, Move, Undo2, Redo2, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react"
import { useFigureEditor } from "@/context/FigureEditorContext"
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
    selectedSegmentId, setSelectedSegmentId,
    selectedPointIndex, setSelectedPointIndex,
    forceUpdate, pushHistory,
    undo, redo, canUndo, canRedo,
    isPlaying, setIsPlaying,
    currentTime, setCurrentTime,
    fps, duration, setDuration,
  } = useFigureEditor()

  const [activeLeftTab, setActiveLeftTab] = useState<string | null>(null)
  const [activeRightTab, setActiveRightTab] = useState<string | null>(null)
  const [showToolMenu, setShowToolMenu] = useState(false)

  const currentFrameIndex = Math.round(currentTime * fps)
  const totalFrames = Math.max(1, Math.round(duration * fps) + 1)

  const setFrame = (f: number) => setCurrentTime(f / fps)

  // Camera zoom/pas events handled by FigureCanvasArea

  const handleAddSegment = (type: string) => {
    setActiveTool(type as any)
    setShowToolMenu(false)
  }

  return (
    <div className="relative w-full h-screen bg-neutral-950 overflow-hidden font-poppins text-white select-none">
      <FigureCanvasArea />

      <div className="absolute top-1 left-1 z-[100]">
        <button
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onBack() }}
          className="w-10 h-10 rounded-full bg-[#15151a]/80 backdrop-blur-xl border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all shadow-2xl flex items-center justify-center pointer-events-auto cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Top Left: Undo/Redo + Tools */}
      <div className="absolute top-1 left-12 z-[80] flex items-center gap-1">
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button onClick={undo} disabled={!canUndo} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"><Undo2 className="w-4 h-4" /></button>
          <button onClick={redo} disabled={!canRedo} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"><Redo2 className="w-4 h-4" /></button>
        </div>

        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button
            onClick={() => setActiveTool('select')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'select' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Select/Move"
          ><MousePointer2 className="w-4 h-4" /></button>

          <button
            onClick={() => setActiveTool('point')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'point' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Edit Points"
          ><Move className="w-4 h-4" /></button>
        </div>

        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button
            onClick={() => handleAddSegment('line')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'line' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Add Line"
          ><PenTool className="w-4 h-4" /></button>
          <button
            onClick={() => handleAddSegment('circle')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'circle' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Add Circle"
          ><Circle className="w-4 h-4" /></button>
          <button
            onClick={() => handleAddSegment('image')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${activeTool === 'image' ? 'bg-green-600 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            title="Add Image"
          ><ImageIcon className="w-4 h-4" /></button>
        </div>

        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('zoom-step', { detail: -1 }))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          ><Minus className="w-4 h-4" /></button>
          <span id="zoom-indicator" className="text-[10px] font-mono font-bold text-gray-300 w-10 text-center select-none">100%</span>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('zoom-step', { detail: 1 }))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          ><Plus className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('reset-camera'))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          ><Maximize className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Top Right: Mode + Animation */}
      <div className="absolute top-1 right-12 z-[80] flex items-center gap-1">
        <div className="flex items-center bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${editorMode === 'figure' ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => setEditorMode('figure')}
            title="Figure Editor Mode"
          ><Square className="w-4 h-4" /></button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${editorMode === 'animate' ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            onClick={() => setEditorMode('animate')}
            title="Animate Mode"
          ><Play className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            onClick={() => setFrame(Math.max(0, currentFrameIndex - 1))}
            disabled={currentFrameIndex <= 0}
          ><ChevronLeft className="w-4 h-4" /></button>
          <div className="text-xs font-mono font-bold w-12 text-center text-gray-300 select-none">
            {currentFrameIndex + 1}/{totalFrames}
          </div>
          {currentFrameIndex >= totalFrames - 1 ? (
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all"
              onClick={() => {
                const newDur = duration + 1 / fps
                setDuration(newDur)
                setFrame(currentFrameIndex + 1)
              }}
            ><Plus className="w-4 h-4" /></button>
          ) : (
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
              onClick={() => setFrame(Math.min(totalFrames - 1, currentFrameIndex + 1))}
            ><ChevronRight className="w-4 h-4" /></button>
          )}
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isPlaying ? 'text-red-400 hover:text-red-300' : 'text-purple-400 hover:text-purple-300'}`}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={totalFrames <= 1}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
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
