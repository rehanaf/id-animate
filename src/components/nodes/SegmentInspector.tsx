import React from "react"
import { useFigureEditor } from "@/context/FigureEditorContext"
import { Trash2, EyeOff, Eye, ChevronDown, ChevronRight } from "lucide-react"
import ColorPicker from 'react-best-gradient-color-picker'

const AccordionItem = ({ title, children, defaultOpen = true }: any) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
      <button
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        {isOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
      </button>
      {isOpen && <div className="p-3 border-t border-white/5 space-y-4">{children}</div>}
    </div>
  )
}

export function SegmentInspector() {
  const { figure, selectedSegmentId, setSelectedSegmentId, setSelectedPointIndex, forceUpdate, pushHistory, editorMode } = useFigureEditor()

  if (!figure || !selectedSegmentId) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Pilih segment di canvas untuk melihat properti
      </div>
    )
  }

  const seg = figure.getSegment(selectedSegmentId)
  if (!seg) {
    return <div className="p-4 text-sm text-gray-500">Segment tidak ditemukan</div>
  }

  const handleChange = (field: string, value: any) => {
    ;(seg as any)[field] = value
    if (field === 'imageData' && typeof value === 'string') {
      seg.imageObj = new Image()
      seg.imageObj.src = value
    }
    forceUpdate()
    pushHistory()
  }

  const handleDelete = () => {
    figure.removeSegment(selectedSegmentId)
    setSelectedSegmentId(null)
    setSelectedPointIndex(null)
    forceUpdate()
    pushHistory()
  }

  const isAnimating = editorMode === 'animate'

  return (
    <div className="p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-200 truncate capitalize">{seg.type} Segment</h2>
        <div className="flex items-center gap-1">
          <button
            title={seg.hidden ? "Show" : "Hide"}
            onClick={() => handleChange("hidden", !seg.hidden)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
          >
            {seg.hidden ? <EyeOff className="w-4 h-4 text-orange-400" /> : <Eye className="w-4 h-4" />}
          </button>
          <button
            title="Delete"
            onClick={handleDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AccordionItem title="Segment Type">
        <select
          value={seg.type}
          onChange={(e) => handleChange("type", e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          disabled={isAnimating}
        >
          <option value="line">Line</option>
          <option value="circle">Circle</option>
          <option value="image">Image</option>
        </select>
      </AccordionItem>

      <AccordionItem title="Appearance">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 font-bold uppercase">Color</label>
          <button
            disabled={isAnimating}
            className="w-full h-8 rounded-lg cursor-pointer border border-white/10"
          >
            <div
              className="w-full h-full rounded-lg pointer-events-none"
              style={{ background: seg.color }}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'color'
                input.value = seg.color
                input.oninput = () => handleChange("color", input.value)
                input.click()
              }}
            />
          </button>
        </div>

        {seg.type === 'line' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Line Width</label>
              <input
                type="number"
                min="1"
                max="50"
                value={seg.width}
                onChange={(e) => handleChange("width", Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                disabled={isAnimating}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Line Cap</label>
              <select
                value={seg.lineCap}
                onChange={(e) => handleChange("lineCap", e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                disabled={isAnimating}
              >
                <option value="round">Round</option>
                <option value="square">Square</option>
                <option value="butt">Butt</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Curved</label>
              <input
                type="checkbox"
                checked={seg.curved}
                onChange={(e) => handleChange("curved", e.target.checked)}
                disabled={isAnimating}
              />
            </div>

            {seg.curved && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-500 font-bold uppercase">Curvature</label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.01"
                  value={seg.curvature}
                  onChange={(e) => handleChange("curvature", parseFloat(e.target.value))}
                  className="w-full"
                  disabled={isAnimating}
                />
              </div>
            )}
          </>
        )}

        {seg.type === 'image' && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase">Image</label>
            <label className="w-full text-center bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg cursor-pointer transition-colors border border-white/5">
              {seg.imageData ? "Replace Image" : "Upload Image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    handleChange("imageData", ev.target?.result as string)
                  }
                  reader.readAsDataURL(file)
                  e.target.value = ''
                }}
                disabled={isAnimating}
              />
            </label>
            <div className="flex gap-2 mt-1">
              <div className="flex-1">
                <label className="text-[9px] text-gray-500">Width</label>
                <input
                  type="number"
                  value={seg.imageWidth}
                  onChange={(e) => handleChange("imageWidth", parseFloat(e.target.value) || 100)}
                  className="w-full bg-black/40 border border-white/10 rounded px-1 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  disabled={isAnimating}
                />
              </div>
              <div className="flex-1">
                <label className="text-[9px] text-gray-500">Height</label>
                <input
                  type="text"
                  value={seg.imageHeight}
                  onChange={(e) => handleChange("imageHeight", e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded px-1 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  disabled={isAnimating}
                />
              </div>
            </div>
          </div>
        )}

        {seg.type === 'circle' && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Filled</label>
              <input
                type="checkbox"
                checked={seg.filled !== false}
                onChange={(e) => handleChange("filled", e.target.checked)}
                disabled={isAnimating}
              />
            </div>
            <label className="text-[10px] text-gray-500 font-bold uppercase">Line Width</label>
            <input
              type="number"
              min="1"
              max="50"
              value={seg.width}
              onChange={(e) => handleChange("width", Math.max(1, parseFloat(e.target.value) || 1))}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              disabled={isAnimating}
            />
          </div>
        )}
      </AccordionItem>

      <AccordionItem title="Layer">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 font-bold uppercase">Z-Index (Layer)</label>
          <input
            type="number"
            value={seg.layer}
            onChange={(e) => handleChange("layer", parseInt(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            disabled={isAnimating}
          />
        </div>
      </AccordionItem>

      <AccordionItem title="Points">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Point 1:</span>
            <span className="text-gray-200 font-mono">
              ({Math.round(figure.points[seg.point1Index]?.x || 0)}, {Math.round(figure.points[seg.point1Index]?.y || 0)})
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Point 2:</span>
            <span className="text-gray-200 font-mono">
              ({Math.round(figure.points[seg.point2Index]?.x || 0)}, {Math.round(figure.points[seg.point2Index]?.y || 0)})
            </span>
          </div>
        </div>
      </AccordionItem>
    </div>
  )
}
