import React from "react"
import { Copy, Trash2, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react"
import { useEditor } from "@/context/EditorContext"
import ColorPicker from 'react-best-gradient-color-picker'

const CustomColorPicker = ({ color, onChange, disabled }: any) => {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div 
        className={`w-full h-8 rounded-lg cursor-pointer border border-white/10 checkerboard-bg ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        <div className="w-full h-full rounded-lg" style={{ background: color || '#d1d5db' }} />
      </div>
      {open && (
        <div className="absolute right-0 top-10 z-[100] bg-[#1a1a24] p-3 rounded-xl shadow-2xl border border-white/10 w-[300px]">
          <ColorPicker value={color || '#d1d5db'} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

const AccordionItem = ({ title, children, defaultOpen = true, extra }: any) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
      <button 
        className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider hover:bg-white/5 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2">
          {title}
          {extra}
        </span>
        {isOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
      </button>
      {isOpen && <div className="p-3 border-t border-white/5 space-y-4">{children}</div>}
    </div>
  )
}

export function InspectorPanel() {
  const { skeleton, selectedBoneId, setSelectedBoneId, forceUpdate, editorMode, currentAnimation, currentTime, pushHistory } = useEditor()

  if (!skeleton || !selectedBoneId) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Pilih tulang di Hierarchy atau Canvas untuk melihat propertinya.
      </div>
    )
  }

  // Find the selected bone
  let selectedBone: any = null
  const findBone = (bone: any) => {
    if (bone.id === selectedBoneId) {
      selectedBone = bone
      return
    }
    bone.children.forEach(findBone)
  }
  if (skeleton.root) findBone(skeleton.root)

  if (!selectedBone) {
    return <div className="p-4 text-sm text-gray-500">Tulang tidak ditemukan.</div>
  }

  // Use local state for live updates during dragging
  const [localTransform, setLocalTransform] = React.useState({
    x: selectedBone.localTransform.x,
    y: selectedBone.localTransform.y,
    rotation: selectedBone.localTransform.rotation,
    scaleX: selectedBone.localTransform.scaleX,
    scaleY: selectedBone.localTransform.scaleY,
  })

  // Poll for changes so it updates live when dragging on canvas
  React.useEffect(() => {
    let animId: number
    const loop = () => {
      setLocalTransform(prev => {
        const x = selectedBone.localTransform.x
        const y = selectedBone.localTransform.y
        const rotation = selectedBone.localTransform.rotation
        const scaleX = selectedBone.localTransform.scaleX
        const scaleY = selectedBone.localTransform.scaleY
        if (prev.x !== x || prev.y !== y || prev.rotation !== rotation || prev.scaleX !== scaleX || prev.scaleY !== scaleY) {
          return { x, y, rotation, scaleX, scaleY }
        }
        return prev
      })
      animId = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(animId)
  }, [selectedBone])

  const handleTransformChange = (field: string, value: number) => {
    selectedBone.localTransform[field] = value
    if (editorMode === "rig") {
      selectedBone.setupTransform[field] = value
    } else if (editorMode === "animate" && currentAnimation) {
      currentAnimation.setBonePose(
        currentTime, 
        selectedBone.name, 
        field, 
        value, 
        selectedBone.setupTransform[field]
      )
    }
    skeleton.root.updateWorldTransform()
    pushHistory()
    forceUpdate()
  }

  const handleBonePropertyChange = (field: string, value: string | number | null | boolean) => {
    selectedBone[field] = value
    pushHistory()
    forceUpdate()
  }

  const handleDelete = () => {
    if (selectedBone.name === 'root') {
      alert("Root bone cannot be deleted.")
      return
    }
    if (window.confirm("Delete this item and all its children?")) {
      if (selectedBone.parent) {
        selectedBone.parent.children = selectedBone.parent.children.filter((b: any) => b.id !== selectedBone.id)
        setSelectedBoneId(null)
        skeleton.root.updateWorldTransform()
        pushHistory()
        forceUpdate()
      }
    }
  }

  const handleCopy = () => {
    if (selectedBone.name === 'root') return
    
    // In JS, if .clone() isn't reliable, let's create it inline if needed, but Bone.js usually has clone() if it's a standard rig system. Wait, I wrote Bone.js, let me check if clone() exists.
    // If not, I can just warn or use a workaround. Let's assume clone() is implemented, if not I'll handle it.
    try {
      if (typeof selectedBone.clone === 'function') {
        const newBone = selectedBone.clone()
        newBone.name = selectedBone.name + "_copy"
        selectedBone.parent.addChild(newBone)
        skeleton.root.updateWorldTransform()
        setSelectedBoneId(newBone.id)
        pushHistory()
        forceUpdate()
      } else {
        alert("Copy not supported on this bone type yet.")
      }
    } catch(e) { console.error(e); alert("Error copying"); }
  }

  const isAnimateMode = editorMode === "animate"

  return (
    <div className="p-3 flex flex-col gap-3">
      
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-gray-200 truncate">{selectedBone.name}</h2>
        <div className="flex items-center gap-1">
          <button 
            title={selectedBone.hidden ? "Show" : "Hide"}
            onClick={() => handleBonePropertyChange("hidden", !selectedBone.hidden)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
          >
            {selectedBone.hidden ? <EyeOff className="w-4 h-4 text-orange-400" /> : <Eye className="w-4 h-4" />}
          </button>
          {selectedBone.name !== 'root' && (
            <>
              <button 
                title="Copy"
                onClick={handleCopy}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button 
                title="Delete"
                onClick={handleDelete}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <AccordionItem 
        title="Transform" 
        extra={isAnimateMode && <span className="text-[9px] text-red-400 border border-red-500/30 px-1 rounded bg-red-500/10 normal-case tracking-normal">REC</span>}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase">Position X</label>
            <input 
              type="number" 
              step="1"
              value={Number(localTransform.x.toFixed(2))}
              onChange={(e) => handleTransformChange("x", parseFloat(e.target.value) || 0)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase">Position Y</label>
            <input 
              type="number" 
              step="1"
              value={Number(localTransform.y.toFixed(2))}
              onChange={(e) => handleTransformChange("y", parseFloat(e.target.value) || 0)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 font-bold uppercase">Rotation (Deg)</label>
          <input 
            type="number" 
            step="1"
            value={Number(localTransform.rotation.toFixed(2))}
            onChange={(e) => handleTransformChange("rotation", parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase">Scale X</label>
            <input 
              type="number" 
              step="0.1"
              value={Number(localTransform.scaleX.toFixed(2))}
              onChange={(e) => handleTransformChange("scaleX", parseFloat(e.target.value) || 0)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase">Scale Y</label>
            <input 
              type="number" 
              step="0.1"
              value={Number(localTransform.scaleY.toFixed(2))}
              onChange={(e) => handleTransformChange("scaleY", parseFloat(e.target.value) || 0)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </AccordionItem>

      <AccordionItem title="Asset Settings">
        <div className="flex flex-col gap-1 mb-3">
          <label className="text-[10px] text-gray-500 font-bold uppercase">Asset Type</label>
          <select 
            value={selectedBone.assetType || "none"}
            onChange={(e) => {
              const newType = e.target.value
              handleBonePropertyChange("assetType", newType === "none" ? null : newType)
            }}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            disabled={isAnimateMode}
          >
            <option value="none">None (Bone Only)</option>
            <option value="shape">Basic Shape</option>
            <option value="image">Image</option>
            <option value="path">Vector Path</option>
          </select>
        </div>

        {selectedBone.assetType === "image" && (
          <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
            <label 
              className="w-full text-center bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg cursor-pointer transition-colors border border-white/5"
            >
              Replace Image
              <input 
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    const dataUrl = event.target?.result as string
                    const img = new Image()
                    img.onload = () => {
                      handleBonePropertyChange("assetData", dataUrl)
                      selectedBone.imageObj = img // Update rendering directly
                    }
                    img.src = dataUrl
                  }
                  reader.readAsDataURL(file)
                  e.target.value = '' 
                }}
              />
            </label>
          </div>
        )}
        
        {selectedBone.assetType === "shape" && (
          <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Shape Type</label>
              <select
                value={selectedBone.shapeType || "square"}
                onChange={(e) => handleBonePropertyChange("shapeType", e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                disabled={isAnimateMode}
              >
                <option value="square">Square</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Fill Color / Gradient</label>
              <CustomColorPicker 
                color={selectedBone.shapeColor} 
                onChange={(c: string) => handleBonePropertyChange("shapeColor", c)}
                disabled={isAnimateMode}
              />
            </div>
          </div>
        )}
        
        {selectedBone.assetType === "path" && (
          <div className="flex flex-col gap-3 pt-2 border-t border-white/5">
            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Fill Color / Gradient</label>
              <CustomColorPicker 
                color={selectedBone.shapeColor} 
                onChange={(c: string) => handleBonePropertyChange("shapeColor", c)}
                disabled={isAnimateMode}
              />
            </div>
            <div className="flex flex-col gap-1 relative">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Path Fill Stroke Thickness (Outline)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={selectedBone.pathThickness !== undefined ? selectedBone.pathThickness : 3}
                onChange={(e) => handleBonePropertyChange("pathThickness", parseFloat(e.target.value) || 0)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                disabled={isAnimateMode}
              />
            </div>
          </div>
        )}

        {/* Global Stroke Settings */}
        {selectedBone.assetType && (
          <div className="flex flex-col gap-3 pt-3 mt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-300 font-bold uppercase">Stroke Outline</label>
              <input 
                type="checkbox" 
                checked={selectedBone.strokeEnabled || false} 
                onChange={(e) => handleBonePropertyChange("strokeEnabled", e.target.checked)} 
                disabled={isAnimateMode}
              />
            </div>
            {selectedBone.strokeEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1 relative">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">Color</label>
                  <CustomColorPicker 
                    color={selectedBone.strokeColor} 
                    onChange={(c: string) => handleBonePropertyChange("strokeColor", c)}
                    disabled={isAnimateMode}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">Width</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={selectedBone.strokeWidth !== undefined ? selectedBone.strokeWidth : 2}
                    onChange={(e) => handleBonePropertyChange("strokeWidth", parseFloat(e.target.value) || 0)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                    disabled={isAnimateMode}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Shadow Settings */}
        {selectedBone.assetType && (
          <div className="flex flex-col gap-3 pt-3 mt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-gray-300 font-bold uppercase">Drop Shadow</label>
              <input 
                type="checkbox" 
                checked={selectedBone.shadowEnabled || false} 
                onChange={(e) => handleBonePropertyChange("shadowEnabled", e.target.checked)} 
                disabled={isAnimateMode}
              />
            </div>
            {selectedBone.shadowEnabled && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 relative">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Color</label>
                    <CustomColorPicker 
                      color={selectedBone.shadowColor} 
                      onChange={(c: string) => handleBonePropertyChange("shadowColor", c)}
                      disabled={isAnimateMode}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Blur</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={selectedBone.shadowBlur !== undefined ? selectedBone.shadowBlur : 10}
                      onChange={(e) => handleBonePropertyChange("shadowBlur", parseFloat(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                      disabled={isAnimateMode}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Offset X</label>
                    <input
                      type="number"
                      step="1"
                      value={selectedBone.shadowOffsetX !== undefined ? selectedBone.shadowOffsetX : 5}
                      onChange={(e) => handleBonePropertyChange("shadowOffsetX", parseFloat(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                      disabled={isAnimateMode}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Offset Y</label>
                    <input
                      type="number"
                      step="1"
                      value={selectedBone.shadowOffsetY !== undefined ? selectedBone.shadowOffsetY : 5}
                      onChange={(e) => handleBonePropertyChange("shadowOffsetY", parseFloat(e.target.value) || 0)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                      disabled={isAnimateMode}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </AccordionItem>

      {selectedBone.assetType && (
        <AccordionItem title="Asset Transform">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Offset X</label>
              <input 
                type="number" 
                step="1"
                value={Number((selectedBone.assetOffset?.x || 0).toFixed(2))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const offset = selectedBone.assetOffset || { x: 0, y: 0 };
                  handleBonePropertyChange("assetOffset", { ...offset, x: val });
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Offset Y</label>
              <input 
                type="number" 
                step="1"
                value={Number((selectedBone.assetOffset?.y || 0).toFixed(2))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  const offset = selectedBone.assetOffset || { x: 0, y: 0 };
                  handleBonePropertyChange("assetOffset", { ...offset, y: val });
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1 mb-3">
            <label className="text-[10px] text-gray-500 font-bold uppercase">Rotation (Deg)</label>
            <input 
              type="number" 
              step="1"
              value={Number((selectedBone.assetRotation || 0).toFixed(2))}
              onChange={(e) => handleBonePropertyChange("assetRotation", parseFloat(e.target.value) || 0)}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end gap-2 pt-2 border-t border-white/5">
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-gray-500 font-bold uppercase">Width</label>
                <label className="text-[9px] text-gray-400 flex items-center gap-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedBone.assetWidth === "auto"} 
                    onChange={(e) => handleBonePropertyChange("assetWidth", e.target.checked ? "auto" : 100)} 
                    disabled={isAnimateMode}
                  />
                  Auto
                </label>
              </div>
              {selectedBone.assetWidth === "auto" ? (
                <div className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-sm text-gray-600 font-mono text-center">auto</div>
              ) : (
                <input 
                  type="number" 
                  step="1"
                  value={Number(selectedBone.assetWidth) || 0}
                  onChange={(e) => handleBonePropertyChange("assetWidth", parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  disabled={isAnimateMode}
                />
              )}
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-gray-500 font-bold uppercase">Height</label>
                <label className="text-[9px] text-gray-400 flex items-center gap-1 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedBone.assetHeight === "auto"} 
                    onChange={(e) => handleBonePropertyChange("assetHeight", e.target.checked ? "auto" : 100)} 
                    disabled={isAnimateMode}
                  />
                  Auto
                </label>
              </div>
              {selectedBone.assetHeight === "auto" ? (
                <div className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-sm text-gray-600 font-mono text-center">auto</div>
              ) : (
                <input 
                  type="number" 
                  step="1"
                  value={Number(selectedBone.assetHeight) || 0}
                  onChange={(e) => handleBonePropertyChange("assetHeight", parseFloat(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  disabled={isAnimateMode}
                />
              )}
            </div>
          </div>
        </AccordionItem>
      )}

      <AccordionItem title="Bone Properties">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-gray-500 font-bold uppercase">Length</label>
          <input 
            type="number" 
            step="1"
            value={Number(selectedBone.length.toFixed(2))}
            onChange={(e) => handleBonePropertyChange("length", parseFloat(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            disabled={isAnimateMode}
          />
        </div>
      </AccordionItem>
      
    </div>
  )
}
