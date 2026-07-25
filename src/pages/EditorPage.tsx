import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ListTree, MousePointer2, SplinePointer, SquareDashedMousePointer, PenTool, Circle, Square, Triangle, BoxSelect, SlidersHorizontal, Layers, Plus, Video, Play, Pause, ChevronRight, Settings, Undo2, Redo2, Download, RotateCw, Move, Maximize } from "lucide-react"

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
    editorMode,
    activeTool, setActiveTool, 
    selectMode, setSelectMode,
    activeShape, setActiveShape,
    currentTime, setCurrentTime,
    duration, fps,
    isPlaying, setIsPlaying,
    undo, redo, canUndo, canRedo,
    handleExportZip
  } = useEditor()
  
  const [activeLeftTab, setActiveLeftTab] = useState<string | null>(null)
  const [activeRightTab, setActiveRightTab] = useState<string | null>(null)
  const [activeBottomTab, setActiveBottomTab] = useState<string | null>(null)
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false)
  const [showEditMenu, setShowEditMenu] = useState<boolean>(false)

  const currentFrame = Math.round(currentTime * fps)
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
          className="w-12 h-12 rounded-full bg-[#15151a]/80 backdrop-blur-xl border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all shadow-2xl" 
          title="Back to Menu"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Left Toolbar (Undo, Redo, Transform Tools) */}
      <div className="absolute top-1 left-14 z-[80]">
        <div className="flex bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button 
            onClick={undo}
            disabled={!canUndo}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" 
            title="Undo"
          ><Undo2 className="w-4 h-4" /></button>
          
          <button 
            onClick={redo}
            disabled={!canRedo}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" 
            title="Redo"
          ><Redo2 className="w-4 h-4" /></button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button 
            onClick={() => { setSelectMode("move"); setActiveTool("select"); }}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${selectMode === "move" ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:text-white hover:bg-white/5"}`} 
            title="Move Tool"
          ><Move className="w-4 h-4" /></button>
          
          <button 
            onClick={() => { setSelectMode("rotate"); setActiveTool("select"); }}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${selectMode === "rotate" ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:text-white hover:bg-white/5"}`} 
            title="Rotate Tool"
          ><RotateCw className="w-4 h-4" /></button>
          
          <button 
            onClick={() => { setSelectMode("scale"); setActiveTool("select"); }}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${selectMode === "scale" ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:text-white hover:bg-white/5"}`} 
            title="Scale Tool"
          ><Maximize className="w-4 h-4" /></button>
          
          <div className="w-px h-6 bg-white/10 mx-1" />
          
        </div>
      </div>


      {/* Top Right: Animation Controls (Moved to right-14) */}
      <div className="absolute top-1 right-14 z-[80]">
        <div className="flex items-center bg-[#15151a]/80 backdrop-blur-xl border border-white/10 p-1 rounded-full shadow-2xl gap-0.5">
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" 
            title="Prev Frame"
            onClick={() => setFrame(Math.max(0, currentFrame - 1))}
            disabled={currentFrame <= 0}
          ><ChevronLeft className="w-5 h-5" /></button>
          
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30 disabled:pointer-events-none" 
            title="Next Frame"
            onClick={() => setFrame(Math.min(totalFrames - 1, currentFrame + 1))}
            disabled={currentFrame >= totalFrames - 1}
          ><ChevronRight className="w-5 h-5" /></button>
          
          <button 
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
              isPlaying ? "text-red-400 hover:text-red-300 hover:bg-red-500/20" : "text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
            }`}
            title={isPlaying ? "Pause" : "Play"}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
        </div>
      </div>

      {/* Top Right: Export Button */}
      <div className="absolute top-1 right-1 z-[80]">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleExportZip} 
          className="w-12 h-12 rounded-full bg-blue-600/90 backdrop-blur-xl border border-white/20 text-white hover:bg-blue-500 hover:scale-105 transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)]" 
          title="Export Project (.ZIP)"
        >
          <Download className="w-5 h-5" />
        </Button>
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
              setShowEditMenu(!showEditMenu); 
              setShowShapeMenu(false); 
              setActiveLeftTab(null); 
              if (activeTool !== "edit" && activeTool !== "edit_mesh") {
                setActiveTool("edit_mesh");
              }
            }}
            title="Edit Tools"
            icon={activeTool === "edit" ? SplinePointer : SquareDashedMousePointer}
          />
          
          {showEditMenu && (
            <div className="absolute left-10 top-0 ml-2 bg-[#15151a]/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-1 py-1 gap-1 z-[75] shadow-2xl animate-in slide-in-from-left-2 fade-in duration-200">
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
            onClick={() => { setActiveTool("shape"); setShowShapeMenu(!showShapeMenu); setShowEditMenu(false); }}
            title="Shapes"
            icon={activeShape === "circle" ? Circle : activeShape === "triangle" ? Triangle : Square}
          />
          
          {showShapeMenu && (
            <div className="absolute left-10 top-0 ml-2 bg-[#15151a]/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center px-1 py-1 gap-1 z-[75] shadow-2xl animate-in slide-in-from-left-2 fade-in duration-200">
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
