import { useState } from "react"
import { useEditor } from "@/context/EditorContext"
import { Bone as BoneIcon, ChevronRight, ChevronDown, Square, Circle, Triangle, Image as ImageIcon, PenTool } from "lucide-react"
import React from "react"

function BoneTreeItem({ bone, skeleton }: { bone: any, skeleton: any }) {
  const { selectedBoneId, setSelectedBoneId, forceUpdate, pushHistory } = useEditor()
  const [isExpanded, setIsExpanded] = useState(true)
  const [dragOverInfo, setDragOverInfo] = useState<'top'|'bottom'|'center'|null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(bone.name)

  const isSelected = selectedBoneId === bone.id
  const hasChildren = bone.children.length > 0

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.setData("text/plain", bone.id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    // root cannot be reordered, only dropped into
    if (bone.name === 'root') {
      setDragOverInfo('center');
      return;
    }

    if (y < rect.height * 0.25) {
      setDragOverInfo('top');
    } else if (y > rect.height * 0.75) {
      setDragOverInfo('bottom');
    } else {
      setDragOverInfo('center');
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverInfo(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = dragOverInfo;
    setDragOverInfo(null)
    
    const draggedBoneId = e.dataTransfer.getData("text/plain")
    if (!draggedBoneId || draggedBoneId === bone.id) return
    if (!pos) return;

    // Find dragged bone
    let draggedBone: any = null
    const findBone = (node: any) => {
      if (node.id === draggedBoneId) draggedBone = node
      node.children.forEach(findBone)
    }
    findBone(skeleton.root)

    if (!draggedBone) return

    // Prevent cyclic reparenting
    let isChild = false
    const checkCyclic = (node: any) => {
      if (node.id === bone.id) isChild = true
      node.children.forEach(checkCyclic)
    }
    checkCyclic(draggedBone)
    if (isChild) return 

    // Remove from old parent
    const oldParent = draggedBone.parent;
    const wasRootChild = oldParent?.name === 'root';
    
    // Store old world transform
    skeleton.root.updateWorldTransform();
    const oldWX = draggedBone.worldTransform.x;
    const oldWY = draggedBone.worldTransform.y;
    const oldWR = draggedBone.worldTransform.rotation;
    const oldWSX = draggedBone.worldTransform.scaleX;
    const oldWSY = draggedBone.worldTransform.scaleY;

    if (oldParent) {
      oldParent.children = oldParent.children.filter((b: any) => b.id !== draggedBone.id)
    }
    
    if (pos === 'center') {
      // Add as child
      bone.addChild(draggedBone)
      setIsExpanded(true)
    } else {
      // Add before or after
      if (bone.parent) {
         const index = bone.parent.children.findIndex((b: any) => b.id === bone.id);
         if (index !== -1) {
            draggedBone.parent = bone.parent;
            if (pos === 'top') {
               bone.parent.children.splice(index, 0, draggedBone);
            } else {
               bone.parent.children.splice(index + 1, 0, draggedBone);
            }
         } else {
            bone.parent.addChild(draggedBone); // fallback
         }
      } else {
         // if bone is root (shouldnt happen due to check)
         bone.addChild(draggedBone)
      }
    }
    
    if (wasRootChild) {
       const targetParent = (pos === 'center') ? bone : bone.parent;
       if (targetParent) {
          skeleton.root.updateWorldTransform(); // Ensure target parent's world transform is up to date
          const pWX = targetParent.worldTransform.x;
          const pWY = targetParent.worldTransform.y;
          const pWR = targetParent.worldTransform.rotation;
          
          const rad = -pWR * Math.PI / 180;
          const dx = oldWX - pWX;
          const dy = oldWY - pWY;
          
          const lx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / targetParent.worldTransform.scaleX;
          const ly = (dx * Math.sin(rad) + dy * Math.cos(rad)) / targetParent.worldTransform.scaleY;
          
          draggedBone.localTransform.x = lx;
          draggedBone.localTransform.y = ly;
          draggedBone.localTransform.rotation = oldWR - pWR;
          draggedBone.localTransform.scaleX = oldWSX / targetParent.worldTransform.scaleX;
          draggedBone.localTransform.scaleY = oldWSY / targetParent.worldTransform.scaleY;
       }
    }
    
    skeleton.root.updateWorldTransform();
    forceUpdate()
    pushHistory()
  }

  return (
    <div>
      <div 
        draggable={bone.name !== 'root'}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`px-2 py-1 rounded-md border mb-[2px] cursor-pointer transition-all flex items-center justify-between ${
          dragOverInfo === 'center' ? "bg-green-500/30 border-green-400" :
          isSelected 
            ? "bg-blue-600/20 border-blue-500/50 text-white" 
            : "bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
        } ${dragOverInfo === 'top' ? "border-t-2 border-t-blue-500" : dragOverInfo === 'bottom' ? "border-b-2 border-b-blue-500" : ""}`}
        onClick={() => {
           if (isSelected && !isEditingName && bone.name !== 'root') {
              setIsEditingName(true);
              setEditName(bone.name);
           } else {
              setSelectedBoneId(isSelected ? null : bone.id)
           }
        }}
      >
        <div className="flex items-center flex-1 overflow-hidden">
          {bone.assetType === "image" && bone.assetUrl ? (
             <ImageIcon className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-purple-400"}`} />
          ) : bone.assetType === "path" ? (
             <PenTool className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-green-400"}`} />
          ) : bone.assetType === "shape" ? (
             bone.shapeType === "rect" ? <Square className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-blue-300"}`} /> :
             bone.shapeType === "circle" ? <Circle className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-blue-300"}`} /> :
             <Triangle className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-blue-300"}`} />
          ) : (
             <BoneIcon className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-gray-500"}`} />
          )}
          
          {isEditingName ? (
            <input 
              autoFocus
              className="bg-black/50 text-xs px-1 py-0.5 outline-none border border-blue-500 rounded w-24 flex-1 text-white"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onClick={e => e.stopPropagation()}
              onBlur={() => {
                 bone.name = editName;
                 setIsEditingName(false);
                 forceUpdate();
                 pushHistory();
              }}
              onKeyDown={e => {
                 if (e.key === 'Enter') {
                    bone.name = editName;
                    setIsEditingName(false);
                    forceUpdate();
                    pushHistory();
                 }
              }}
            />
          ) : (
            <span className="text-xs font-medium truncate flex-1">{bone.name}</span>
          )}
        </div>

        {hasChildren && (
          <div 
            className="w-5 h-5 flex items-center justify-center cursor-pointer opacity-70 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </div>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div className="border-l border-white/10 ml-2 pl-2 mt-[2px]">
          {bone.children.map((child: any) => (
            <BoneTreeItem key={child.id} bone={child} skeleton={skeleton} />
          ))}
        </div>
      )}
    </div>
  )
}

export function HierarchyPanel() {
  const { skeleton, forceUpdate, pushHistory } = useEditor()
  const [isRootDragOver, setIsRootDragOver] = useState(false)

  if (!skeleton) return null

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    if (!isRootDragOver) setIsRootDragOver(true)
  }

  const handleRootDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRootDragOver(false)
  }

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRootDragOver(false)
    
    const draggedBoneId = e.dataTransfer.getData("text/plain")
    if (!draggedBoneId) return

    // Find dragged bone
    let draggedBone: any = null
    const findBone = (node: any) => {
      if (node.id === draggedBoneId) draggedBone = node
      node.children.forEach(findBone)
    }
    findBone(skeleton.root)

    if (!draggedBone || draggedBone.parent === skeleton.root) return // Already at root

    // Remove from old parent
    if (draggedBone.parent) {
      draggedBone.parent.children = draggedBone.parent.children.filter((b: any) => b.id !== draggedBone.id)
    }
    
    // Add to root
    skeleton.root.addChild(draggedBone)
    forceUpdate()
    pushHistory()
  }

  return (
    <div 
      className={`flex flex-col px-2 pb-4 min-h-[200px] transition-colors rounded-xl ${isRootDragOver ? "bg-green-500/10" : ""}`}
      onDragOver={handleRootDragOver}
      onDragLeave={handleRootDragLeave}
      onDrop={handleRootDrop}
    >
      {skeleton.root.children.length > 0 ? (
          skeleton.root.children.map((child: any) => (
            <BoneTreeItem key={child.id} bone={child} skeleton={skeleton} />
          ))
        ) : (
          <div className="text-gray-500/70 text-[10px] text-center mt-6 uppercase tracking-widest pointer-events-none">
            ( Kosong )<br/>
            <span className="text-gray-600 font-normal lowercase tracking-normal mt-2 block">Klik tombol + untuk menambah</span>
          </div>
        )}
    </div>
  )
}
