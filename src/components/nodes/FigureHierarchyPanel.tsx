import { useFigureEditor } from "@/context/FigureEditorContext"
import { Circle, Square, Image as ImageIcon, PenTool, GripVertical } from "lucide-react"
import React from "react"

export function FigureHierarchyPanel() {
  const { figure, selectedSegmentId, setSelectedSegmentId, setSelectedPointIndex } = useFigureEditor()

  if (!figure) return null

  const sorted = [...figure.segments].sort((a, b) => a.layer - b.layer)

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
                onClick={() => { setSelectedSegmentId(seg.id); setSelectedPointIndex(null) }}
              >
                <GripVertical className="w-3 h-3 text-gray-600 flex-shrink-0" />
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-gray-500"}`} />
                <span className="text-xs font-medium truncate flex-1 capitalize">{seg.type} #{figure.segments.indexOf(seg) + 1}</span>
                <span className="text-[9px] text-gray-600">L{seg.layer}</span>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
