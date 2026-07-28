import { useFigureEditor } from "@/context/FigureEditorContext"
import { Circle, Square, Image as ImageIcon, PenTool, GripVertical, ArrowLeftRight, PaintBucket, Minus, ChevronDown } from "lucide-react"
import React from "react"

export function FigureHierarchyPanel() {
  const { figure, selectedSegmentId, setSelectedSegmentId, setSelectedPointIndex, forceUpdate, pushHistory } = useFigureEditor()

  if (!figure) return null

  const sorted = [...figure.segments].sort((a, b) => a.layer - b.layer)
  const selectedSeg = selectedSegmentId ? figure.getSegment(selectedSegmentId) : null

  const handleFlip = () => {
    if (!selectedSeg) return
    const p1 = selectedSeg.getPoint1(figure)
    const p2 = selectedSeg.getPoint2(figure)
    if (!p1 || !p2) return
    const mx = (p1.x + p2.x) / 2
    const my = (p1.y + p2.y) / 2
    const dx = p1.x - mx
    const dy = p1.y - my
    p1.x = mx - dx
    p1.y = my - dy
    p2.x = mx + dx
    p2.y = my + dy
    forceUpdate()
    pushHistory()
  }

  const cycleLineCap = () => {
    if (!selectedSeg) return
    const caps: Array<'round' | 'square' | 'butt'> = ['round', 'square', 'butt']
    const idx = caps.indexOf(selectedSeg.lineCap)
    selectedSeg.lineCap = caps[(idx + 1) % caps.length]
    forceUpdate()
    pushHistory()
  }

  return (
    <div className="flex flex-col px-2 pb-4 min-h-[200px]">
      {sorted.length === 0 ? (
        <div className="text-gray-500/70 text-[10px] text-center mt-6 uppercase tracking-widest pointer-events-none">
          ( Kosong )
        </div>
      ) : (
        <>
          {sorted.map(seg => {
            const isSelected = seg.id === selectedSegmentId
            const Icon = seg.type === 'line' ? PenTool : seg.type === 'circle' ? Circle : ImageIcon
            return (
              <div
                key={seg.id}
                className={`px-2 py-1.5 rounded-md border mb-[2px] cursor-pointer transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-blue-600/20 border-blue-500/50 text-white"
                    : "bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => {
                  setSelectedSegmentId(seg.id)
                  setSelectedPointIndex(null)
                }}
              >
                <GripVertical className="w-3 h-3 text-gray-600 flex-shrink-0" />
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-gray-500"}`} />
                <span className="text-xs font-medium truncate flex-1 capitalize">{seg.type} #{figure.segments.indexOf(seg) + 1}</span>
                <span className="text-[9px] text-gray-600">L{seg.layer}</span>
              </div>
            )
          })}

          {selectedSeg && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 justify-center">
              <button
                onClick={handleFlip}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all"
                title="Flip segment"
              ><ArrowLeftRight className="w-4 h-4" /></button>

              <div className="relative">
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 transition-all overflow-hidden"
                  title="Change color"
                >
                  <input
                    type="color"
                    value={selectedSeg.color}
                    onChange={(e) => {
                      selectedSeg.color = e.target.value
                      forceUpdate()
                      pushHistory()
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: selectedSeg.color }} />
                </button>
              </div>

              <button
                onClick={cycleLineCap}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all text-[10px] font-bold uppercase"
                title={`Line cap: ${selectedSeg.lineCap}`}
              >
                {selectedSeg.lineCap === 'round' ? 'R' : selectedSeg.lineCap === 'square' ? 'S' : 'B'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
