import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ListTree, MousePointer2, SplinePointer, SquareDashedMousePointer, PenTool, Circle, Square, Triangle, BoxSelect, SlidersHorizontal, Layers, Plus, Minus, Video, Play, Pause, ChevronRight, Settings, Undo2, Redo2, Download, RotateCw, Move, Maximize, MoveDiagonal, MoreVertical, Save, Bone as BoneIcon, Spline } from "lucide-react"

import { useEditor } from "@/context/EditorContext"
import { CanvasArea } from "@/components/editor/CanvasArea"
import { FloatingSidebar } from "@/components/layout/FloatingSidebar"
import { SidebarButton } from "@/components/layout/SidebarButton"
import { SideDrawer } from "@/components/layout/SideDrawer"
import { HierarchyPanel } from "@/components/editor/HierarchyPanel"
import { InspectorPanel } from "@/components/editor/InspectorPanel"
import { AssetLibraryPanel } from "@/components/editor/AssetLibraryPanel"
import { LayerPanel } from "@/components/editor/LayerPanel"
import { TimelinePanel } from "@/components/editor/TimelinePanel"
import { SettingsPanel } from "@/components/editor/SettingsPanel"
import { Bone } from "@/core/Bone.js"

export function EditorPage({ onBack }: { onBack: () => void }) {
  const { 
    skeleton,
    editorMode, setEditorMode,
    activeTool, setActiveTool, 
    selectMode, setSelectMode,
    activeShape, setActiveShape,
    currentTime, setCurrentTime,
    duration, setDuration, fps,
    isPlaying, setIsPlaying,
    currentAnimation, forceUpdate,
    smoothInterpolation, setSmoothInterpolation,
    undo, redo, canUndo, canRedo,
    handleExportZip
  } = useEditor()
  
  const [activeLeftTab, setActiveLeftTab] = useState<string | null>(null)
  const [activeRightTab, setActiveRightTab] = useState<string | null>(null)
  const [activeBottomTab, setActiveBottomTab] = useState<string | null>(null)
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false)
  const [showEditMenu, setShowEditMenu] = useState<boolean>(false)
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false)

  const currentFrameIndex = Math.round(currentTime * fps)
  const totalFrames = Math.max(1, Math.round(duration * fps) + 1)
  
  const setFrame = (f: number) => {
    setCurrentTime(f / fps)
  }

  return (
    <div className="relative w-full h-screen bg-neutral-950 overflow-hidden font-poppins text-white select-none">
      {/* Canvas */}
      <CanvasArea />

      {/* Back Button */}
      <div className="absolute top-1 left-1 z-[80]">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onBack} 
          className="w-10 h-10 rounded-full bg-[#15151a]/80 backdrop-blur-xl border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all shadow-2xl" 
          title="Back to Menu"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Left Toolbar (Undo, Redo, Transform Tools) */}
      <div className="absolute top-1 left-12 z-[80] flex items-center gap-1">
        {/* Undo Redo Bar */}
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button 
            onClick={undo}
            disabled={!canUndo}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" 
            title="Undo"
          ><Undo2 className="w-4 h-4" /></button>
          
          <button 
            onClick={redo}
            disabled={!canRedo}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" 
            title="Redo"
          ><Redo2 className="w-4 h-4" /></button>
        </div>

        {/* Transform Tools Bar */}
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button 
            onClick={() => { setSelectMode("move"); setActiveTool("select"); }}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${selectMode === "move" && activeTool === "select" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "text-gray-400 hover:text-white hover:bg-white/5"}`} 
            title="Move Tool"
          ><Move className="w-4 h-4" /></button>
          
          <button 
            onClick={() => { setSelectMode("rotate"); setActiveTool("select"); }}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${selectMode === "rotate" && activeTool === "select" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "text-gray-400 hover:text-white hover:bg-white/5"}`} 
            title="Rotate Tool"
          ><RotateCw className="w-4 h-4" /></button>
          
          <button 
            onClick={() => { setSelectMode("scale"); setActiveTool("select"); }}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${selectMode === "scale" && activeTool === "select" ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "text-gray-400 hover:text-white hover:bg-white/5"}`} 
            title="Scale Tool"
          ><MoveDiagonal className="w-4 h-4" /></button>
        </div>

        {/* Camera Tools Bar */}
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5 items-center">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('zoom-step', { detail: -1 }))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all" 
            title="Zoom Out"
          ><Minus className="w-4 h-4" /></button>
          
          <span id="zoom-indicator" className="text-[10px] font-mono font-bold text-gray-300 w-10 text-center select-none">100%</span>
          
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('zoom-step', { detail: 1 }))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all" 
            title="Zoom In"
          ><Plus className="w-4 h-4" /></button>

          <div className="w-px h-5 bg-white/10 mx-1" />

          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('reset-camera'))}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all" 
            title="Fit to Screen"
          ><Maximize className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Top Right: Mode Switcher + Animation Controls */}
      <div className="absolute top-1 right-12 z-[80] flex items-center gap-1">
        {/* Mode Switcher Capsule (icon-only) */}
        <div className="flex items-center bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button 
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${editorMode === "rig" ? "bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            onClick={() => setEditorMode("rig")}
            title="Rigging Mode"
          ><BoneIcon className="w-4 h-4" /></button>
          <button 
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${editorMode === "animate" ? "bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
            onClick={() => setEditorMode("animate")}
            title="Animate Mode"
          ><Video className="w-4 h-4" /></button>
        </div>

        {/* Animation Controls Capsule */}
        <div className="flex items-center bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button 
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" 
            title="Prev Frame"
            onClick={() => setFrame(Math.max(0, currentFrameIndex - 1))}
            disabled={currentFrameIndex <= 0}
          ><ChevronLeft className="w-4 h-4" /></button>
          
          <div className="text-xs font-mono font-bold w-12 text-center text-gray-300 select-none flex flex-col justify-center leading-none">
            {currentFrameIndex + 1}/{totalFrames}
          </div>

          {currentFrameIndex >= totalFrames - 1 ? (
             <button 
                className="w-8 h-8 flex items-center justify-center rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all" 
                title="Add New Frame"
                onClick={() => { 
                  const newDur = duration + 1/fps;
                  if (currentAnimation) currentAnimation.duration = newDur;
                  setDuration(newDur); 
                  setFrame(currentFrameIndex + 1);
                  forceUpdate();
                }}
              ><Plus className="w-4 h-4" /></button>
          ) : (
             <button 
               className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" 
               title="Next Frame"
               onClick={() => setFrame(Math.min(totalFrames - 1, currentFrameIndex + 1))}
             ><ChevronRight className="w-4 h-4" /></button>
          )}
          
          <button 
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all disabled:opacity-30 disabled:pointer-events-none ${
              isPlaying ? "text-red-400 hover:text-red-300 hover:bg-red-500/20" : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
            }`}
            title={isPlaying ? "Pause" : "Play"}
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={totalFrames <= 1}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          <div className="w-px h-5 bg-white/10" />

          <button 
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${smoothInterpolation ? "bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
            title={smoothInterpolation ? "Interpolation: Smooth (Linear)" : "Interpolation: Step (Hold)"}
            onClick={() => setSmoothInterpolation(!smoothInterpolation)}
          ><Spline className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Top Right: Export Button */}
      <div className="absolute top-1 right-1 z-[80]">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setShowExportMenu(!showExportMenu)} 
          className="w-10 h-10 rounded-full bg-[#15151a]/80 backdrop-blur-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-all shadow-2xl" 
          title="More Options"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>

        {showExportMenu && (
          <div className="absolute top-12 right-0 bg-[#1a1a24] border border-[#333] rounded-lg shadow-2xl overflow-hidden z-[100] w-56 flex flex-col animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50">
             <button className="flex items-center px-4 py-3 hover:bg-[#2a2a35] text-xs font-medium text-gray-200 transition-colors" onClick={() => { handleExportZip(); setShowExportMenu(false); }}>
                <Download className="w-4 h-4 mr-2 opacity-70" /> Export Project (.ZIP)
             </button>
             <div className="w-full h-px bg-[#333]"></div>
             <button className="flex items-center px-4 py-2 hover:bg-[#2a2a35] text-xs text-gray-400 hover:text-gray-200 transition-colors" onClick={() => { setShowExportMenu(false); }}>
                Export Animation
             </button>
             <button className="flex items-center px-4 py-2 hover:bg-[#2a2a35] text-xs text-gray-400 hover:text-gray-200 transition-colors" onClick={() => { setShowExportMenu(false); }}>
                Export Skeleton
             </button>
             <button className="flex items-center px-4 py-2 hover:bg-[#2a2a35] text-xs text-gray-400 hover:text-gray-200 transition-colors" onClick={() => { setShowExportMenu(false); }}>
                Export Selected Skeleton
             </button>
             <button className="flex items-center px-4 py-2 hover:bg-[#2a2a35] text-xs text-gray-400 hover:text-gray-200 transition-colors" onClick={() => { setShowExportMenu(false); }}>
                Save Selected Skeleton
             </button>
          </div>
        )}
      </div>

      <FloatingSidebar side="left">
        <SidebarButton 
          active={activeLeftTab === "hierarchy"} 
          onClick={() => { setActiveLeftTab(activeLeftTab === "hierarchy" ? null : "hierarchy"); setShowShapeMenu(false); setShowEditMenu(false); }}
          title="Hierarchy"
          icon={ListTree}
        />

        <SidebarButton 
          active={activeTool === "select"} 
          onClick={() => { setActiveTool("select"); setShowShapeMenu(false); setShowEditMenu(false); }}
          title="Select Tool"
          icon={MousePointer2}
        />

        <div className="relative">
          <SidebarButton 
            active={activeTool === "edit" || activeTool === "edit_mesh"} 
            onClick={() => { 
              if (activeTool === "edit" || activeTool === "edit_mesh") {
                setShowEditMenu(!showEditMenu); 
              } else {
                setActiveTool("edit_mesh");
                setShowEditMenu(false);
              }
              setShowShapeMenu(false); 
              setActiveLeftTab(null); 
            }}
            title="Edit Tools"
            icon={activeTool === "edit" ? SplinePointer : SquareDashedMousePointer}
            hasSubMenu={true}
          />
          
          {showEditMenu && (
            <div className="absolute left-10 top-0 bg-[#15151a]/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-1 py-1 gap-1 z-[75] shadow-2xl animate-in slide-in-from-left-2 fade-in duration-200">
              <SidebarButton 
                active={activeTool === "edit"} 
                onClick={() => { setActiveTool("edit"); setShowEditMenu(false); }}
                title="Edit Path Tool"
                icon={SplinePointer}
              />
              <SidebarButton 
                active={activeTool === "edit_mesh"} 
                onClick={() => { setActiveTool("edit_mesh"); setShowEditMenu(false); }}
                title="Edit Mesh Tool"
                icon={SquareDashedMousePointer}
              />
            </div>
          )}
        </div>

        <SidebarButton 
          active={activeTool === "pen"} 
          onClick={() => { setActiveTool("pen"); setShowShapeMenu(false); setShowEditMenu(false); }}
          title="Pen Tool"
          icon={PenTool}
        />

        <div className="relative">
          <SidebarButton 
            active={activeTool === "shape"} 
            onClick={() => { 
              if (activeTool === "shape") {
                setShowShapeMenu(!showShapeMenu); 
              } else {
                setActiveTool("shape");
                setShowShapeMenu(false);
              }
              setShowEditMenu(false); 
            }}
            title="Shapes"
            icon={activeShape === "circle" ? Circle : activeShape === "triangle" ? Triangle : Square}
            hasSubMenu={true}
          />
          
          {showShapeMenu && (
            <div className="absolute left-10 top-0 bg-[#15151a]/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-1 py-1 gap-1 z-[75] shadow-2xl animate-in slide-in-from-left-2 fade-in duration-200">
              <SidebarButton 
                active={activeShape === "square"} 
                onClick={() => { setActiveShape("square"); setActiveTool("shape"); setShowShapeMenu(false); }}
                title="Square"
                icon={Square}
              />
              <SidebarButton 
                active={activeShape === "circle"} 
                onClick={() => { setActiveShape("circle"); setActiveTool("shape"); setShowShapeMenu(false); }}
                title="Circle"
                icon={Circle}
              />
              <SidebarButton 
                active={activeShape === "triangle"} 
                onClick={() => { setActiveShape("triangle"); setActiveTool("shape"); setShowShapeMenu(false); }}
                title="Triangle"
                icon={Triangle}
              />
            </div>
          )}
        </div>
      </FloatingSidebar>

      <SideDrawer 
        side="left" 
        activeTab={activeLeftTab} 
        onClose={() => setActiveLeftTab(null)}
      >
         {activeLeftTab === "hierarchy" && <HierarchyPanel />}
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
        
        <SidebarButton 
          active={activeRightTab === "library"} 
          onClick={() => setActiveRightTab(activeRightTab === "library" ? null : "library")}
          title="Add Asset/Bone"
          icon={Plus}
          activeColorClass="bg-blue-600 hover:bg-blue-500 shadow-blue-500/30"
        />
        
        <SidebarButton 
          active={activeRightTab === "layer"} 
          onClick={() => setActiveRightTab(activeRightTab === "layer" ? null : "layer")}
          title="Layers"
          icon={Layers}
          activeColorClass="bg-blue-600 hover:bg-blue-500 shadow-blue-500/30"
        />
        
        <SidebarButton 
          active={activeBottomTab === "timeline"} 
          onClick={() => setActiveBottomTab(activeBottomTab === "timeline" ? null : "timeline")}
          title="Timeline"
          icon={Video}
          activeColorClass="bg-blue-600 hover:bg-blue-500 shadow-blue-500/30"
        />

        <SidebarButton 
          active={activeRightTab === "settings"} 
          onClick={() => setActiveRightTab(activeRightTab === "settings" ? null : "settings")}
          title="Settings"
          icon={Settings}
          activeColorClass="bg-purple-600 hover:bg-purple-500 shadow-purple-500/30"
        />
      </FloatingSidebar>

      <SideDrawer side="right" activeTab={activeRightTab} onClose={() => setActiveRightTab(null)}>
         {activeRightTab === "library" && <AssetLibraryPanel />}
         {activeRightTab === "inspector" && <InspectorPanel />}
         {activeRightTab === "settings" && <SettingsPanel />}
         {activeRightTab === "layer" && <LayerPanel />}
      </SideDrawer>

      {/* Bottom Drawer */}
      <SideDrawer side="bottom" activeTab={activeBottomTab} onClose={() => setActiveBottomTab(null)}>
         {activeBottomTab === "timeline" && <TimelinePanel />}
      </SideDrawer>
    </div>
  )
}
