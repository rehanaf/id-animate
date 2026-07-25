import { useEditor } from "@/context/EditorContext"
import { GripVertical, ChevronRight, ChevronDown, Bone as BoneIcon, Image as ImageIcon, PenTool, Square, Circle, Triangle } from "lucide-react"
import React, { useState } from "react"

export function LayerPanel() {
  const { skeleton, forceUpdate, pushHistory, selectedBoneId, setSelectedBoneId } = useEditor()
  const [draggedBoneId, setDraggedBoneId] = useState<string | null>(null)
  const [dragOverInfo, setDragOverInfo] = useState<{ id: string, position: 'top' | 'bottom' } | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  
  if (!skeleton) return null;
  
  const rootChildren = skeleton.root.children;

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups(prev => ({ ...prev, [id]: prev[id] === undefined ? false : !prev[id] }));
  }

  // Get flattened descendants for a specific root child
  const getDescendants = (groupBone: any) => {
    const flat: any[] = [];
    const flatten = (b: any) => {
        if (b !== groupBone) flat.push(b);
        b.children.forEach(flatten);
    };
    flatten(groupBone);
    // sort descendants by their global zIndex (descending so highest is first in array/top of UI)
    flat.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)); 
    return flat;
  }

  // Global zIndex normalizer based on UI order
  const saveOrder = (orderedGroups: any[], descendantsMap: Record<string, any[]>) => {
     let currentZ = orderedGroups.reduce((acc, g) => acc + getDescendants(g).length, 0);
     
     // orderedGroups are top to bottom.
     orderedGroups.forEach(g => {
         const desc = descendantsMap[g.id] || [];
         desc.forEach(d => {
             d.zIndex = currentZ--;
         });
     });
     
     forceUpdate();
     pushHistory();
  }

  const handleDragStart = (e: React.DragEvent, boneId: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", boneId);
    setDraggedBoneId(boneId);
  }

  const handleDragOver = (e: React.DragEvent, boneId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (boneId !== draggedBoneId) {
       const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
       const mid = rect.top + rect.height / 2;
       setDragOverInfo({ id: boneId, position: e.clientY < mid ? 'top' : 'bottom' });
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverInfo(null);
  }

  const handleDropGroup = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOverInfo) return;
    const pos = dragOverInfo.position;
    setDragOverInfo(null);
    setDraggedBoneId(null);

    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetGroupId) return;

    const isGroup = rootChildren.some((g: any) => g.id === draggedId);
    if (!isGroup) return;

    const newGroups = [...rootChildren];
    const fromIndex = newGroups.findIndex((g: any) => g.id === draggedId);
    let toIndex = newGroups.findIndex((g: any) => g.id === targetGroupId);

    if (fromIndex !== -1 && toIndex !== -1) {
       if (pos === 'bottom') toIndex++;
       const [moved] = newGroups.splice(fromIndex, 1);
       if (fromIndex < toIndex) toIndex--;
       newGroups.splice(toIndex, 0, moved);
       
       skeleton.root.children = newGroups;
       
       const descMap: Record<string, any[]> = {};
       newGroups.forEach((g: any) => descMap[g.id] = getDescendants(g));
       saveOrder(newGroups, descMap);
    }
  }

  const handleDropChild = (e: React.DragEvent, groupId: string, targetChildId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragOverInfo) return;
    const pos = dragOverInfo.position;
    setDragOverInfo(null);
    setDraggedBoneId(null);

    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetChildId) return;

    const group = rootChildren.find((g: any) => g.id === groupId);
    if (!group) return;

    const descendants = getDescendants(group);
    
    const fromIndex = descendants.findIndex(d => d.id === draggedId);
    let toIndex = descendants.findIndex(d => d.id === targetChildId);
    
    if (fromIndex === -1 || toIndex === -1) return;

    if (pos === 'bottom') toIndex++;

    const [moved] = descendants.splice(fromIndex, 1);
    if (fromIndex < toIndex) toIndex--;
    descendants.splice(toIndex, 0, moved);

    const descMap: Record<string, any[]> = {};
    rootChildren.forEach((g: any) => {
        descMap[g.id] = (g.id === groupId) ? descendants : getDescendants(g);
    });
    saveOrder(rootChildren, descMap);
  }

  return (
    <div className="flex flex-col h-full bg-[#15151a] text-white">
      <div className="flex-1 overflow-y-auto p-2">
         {rootChildren.map((groupBone: any) => {
            const isExpanded = expandedGroups[groupBone.id] !== false; // default true
            const descendants = getDescendants(groupBone);
            
            return (
              <div key={groupBone.id} className="relative mb-2 border border-white/10 rounded-md overflow-hidden bg-black/20">
                 {dragOverInfo?.id === groupBone.id && dragOverInfo?.position === 'top' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />}
                 {dragOverInfo?.id === groupBone.id && dragOverInfo?.position === 'bottom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />}
                 
                 {/* Group Header */}
                 <div 
                   draggable
                   onDragStart={(e) => handleDragStart(e, groupBone.id)}
                   onDragOver={(e) => handleDragOver(e, groupBone.id)}
                   onDragLeave={handleDragLeave}
                   onDrop={(e) => handleDropGroup(e, groupBone.id)}
                   onClick={() => setSelectedBoneId(selectedBoneId === groupBone.id ? null : groupBone.id)}
                   className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-all ${
                     selectedBoneId === groupBone.id ? "bg-blue-600/30 text-white" : "bg-transparent text-gray-300 hover:bg-white/5"
                   } ${draggedBoneId === groupBone.id ? "opacity-50" : "opacity-100"}`}
                 >
                    <div className="flex items-center flex-1 overflow-hidden">
                      <GripVertical className="w-3.5 h-3.5 text-gray-500 mr-2 cursor-grab flex-shrink-0" />
                      <span className="text-xs font-bold truncate flex-1">{groupBone.name}</span>
                      
                      <div onClick={(e) => toggleGroup(groupBone.id, e)} className="ml-1 p-0.5 hover:bg-white/10 rounded cursor-pointer opacity-70 hover:opacity-100">
                         {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                 </div>

                 {/* Group Descendants (Flat) */}
                 {isExpanded && (
                   <div className="flex flex-col">
                      {descendants.map(child => (
                         <div 
                           key={child.id}
                           draggable
                           onDragStart={(e) => handleDragStart(e, child.id)}
                           onDragOver={(e) => handleDragOver(e, child.id)}
                           onDragLeave={handleDragLeave}
                           onDrop={(e) => handleDropChild(e, groupBone.id, child.id)}
                           onClick={() => setSelectedBoneId(selectedBoneId === child.id ? null : child.id)}
                           className={`relative px-3 py-1.5 pl-7 flex items-center justify-between cursor-pointer transition-all ${
                             selectedBoneId === child.id ? "bg-blue-600/20 text-white" : "bg-transparent text-gray-400 hover:bg-white/5"
                           } ${draggedBoneId === child.id ? "opacity-50" : "opacity-100"}`}
                         >
                            {dragOverInfo?.id === child.id && dragOverInfo?.position === 'top' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />}
                            {dragOverInfo?.id === child.id && dragOverInfo?.position === 'bottom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-10" />}
                            
                            <div className="flex items-center flex-1 overflow-hidden">
                              <GripVertical className="w-3 h-3 text-gray-600 mr-2 cursor-grab flex-shrink-0" />
                              
                              {child.assetType === "image" && child.assetUrl ? (
                                 <ImageIcon className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${selectedBoneId === child.id ? "text-blue-400" : "text-purple-400"}`} />
                              ) : child.assetType === "path" ? (
                                 <PenTool className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${selectedBoneId === child.id ? "text-blue-400" : "text-green-400"}`} />
                              ) : child.assetType === "shape" ? (
                                 child.shapeType === "rect" ? <Square className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${selectedBoneId === child.id ? "text-blue-400" : "text-blue-300"}`} /> :
                                 child.shapeType === "circle" ? <Circle className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${selectedBoneId === child.id ? "text-blue-400" : "text-blue-300"}`} /> :
                                 <Triangle className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${selectedBoneId === child.id ? "text-blue-400" : "text-blue-300"}`} />
                              ) : (
                                 <BoneIcon className={`w-3.5 h-3.5 mr-2 flex-shrink-0 ${selectedBoneId === child.id ? "text-blue-400" : "text-gray-500"}`} />
                              )}
                              
                              <span className="text-[11px] truncate">{child.name}</span>
                            </div>
                         </div>
                      ))}
                   </div>
                 )}
              </div>
            )
         })}
      </div>
    </div>
  )
}
