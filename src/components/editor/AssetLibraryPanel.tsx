import { Square, Circle, Triangle, Image as ImageIcon, Briefcase, Layers, Bone as BoneIcon } from "lucide-react"
import { useEditor } from "@/context/EditorContext"
import { useState, useEffect } from "react"
import { Bone } from "@/core/Bone.js"

export function AssetLibraryPanel() {
  const { selectedBoneId, skeleton, forceUpdate, setSelectedBoneId, pushHistory } = useEditor()

  // Find the selected bone to update its asset
  const getSelectedBone = () => {
    if (!skeleton || !selectedBoneId) return null
    let found: any = null
    const findBone = (bone: any) => {
      if (bone.id === selectedBoneId) found = bone
      bone.children.forEach(findBone)
    }
    findBone(skeleton.root)
    return found
  }

  const selectedBone = getSelectedBone()

  const [savedRigs, setSavedRigs] = useState<any[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("assetLibrary")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.categories) {
          // Extract all items from all categories for simplicity, or just 'char' and 'weap'
          let allItems: any[] = []
          parsed.categories.forEach((cat: any) => {
            if (cat.items) {
              allItems = [...allItems, ...cat.items]
            }
          })
          setSavedRigs(allItems)
        }
      }
    } catch (e) {
      console.error("Failed to load saved rigs", e)
    }
  }, [])

  const addShape = (type: "square" | "circle" | "triangle") => {
    if (!skeleton) return
    const newBone = new Bone(`Shape ${type}`)
    newBone.assetType = "shape"
    newBone.shapeType = type
    newBone.localTransform.y = -50
    if (selectedBone) {
      selectedBone.addChild(newBone)
    } else {
      skeleton.root.addChild(newBone)
    }
    setSelectedBoneId(newBone.id)
    skeleton.root.updateWorldTransform()
    forceUpdate()
    pushHistory()
  }

  const addBasicBone = () => {
    if (!skeleton) return
    const newBone = new Bone(`Bone ${Math.floor(Math.random() * 1000)}`)
    newBone.localTransform.y = -50
    if (selectedBone) {
      selectedBone.addChild(newBone)
    } else {
      skeleton.root.addChild(newBone)
    }
    skeleton.root.updateWorldTransform()
    forceUpdate()
    pushHistory()
    setSelectedBoneId(newBone.id)
  }

  return (
    <div className="flex flex-col gap-6 pb-20 p-4">
      {/* Basic Bone */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Basic Rig</h3>
        <button 
          onClick={addBasicBone}
          className="w-full flex items-center justify-center p-4 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl transition-all gap-2 text-blue-400"
        >
          <BoneIcon className="w-5 h-5" />
          <span className="text-xs font-bold">Add Basic Bone</span>
        </button>
      </div>



      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Custom Images</h3>
        <label 
          className="w-full flex items-center justify-center p-4 bg-black/20 hover:bg-white/10 border border-white/10 border-dashed rounded-xl transition-all gap-2 text-gray-400 hover:text-white mb-6 cursor-pointer"
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-xs font-medium">Upload Image Asset</span>
          <input 
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file || !skeleton) return

              const reader = new FileReader()
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string
                const img = new Image()
                img.onload = () => {
                  const bone = new Bone(`Image_${Math.floor(Math.random() * 1000)}`)
                  bone.assetType = 'image'
                  bone.assetData = dataUrl
                  bone.assetWidth = 100
                  bone.assetHeight = "auto"
                  bone.imageObj = img // Attach the image object for immediate rendering
                  
                  bone.localTransform.x = 0
                  bone.localTransform.y = 0
                  bone.setupTransform = bone.localTransform.clone()
                  
                  if (selectedBone) {
                    selectedBone.addChild(bone)
                  } else {
                    skeleton.root.addChild(bone)
                  }
                  
                  skeleton.root.updateWorldTransform()
                  forceUpdate()
                  pushHistory()
                  setSelectedBoneId(bone.id)
                }
                img.src = dataUrl
              }
              reader.readAsDataURL(file)
              e.target.value = '' 
            }}
          />
        </label>
      </div>

      {savedRigs.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-purple-400" />
            My Saved Rigs
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {savedRigs.map((item) => (
              <button 
                key={item.id}
                onClick={() => {
                  if (!skeleton) return
                  const importedBone = Bone.fromJSON(item.data)
                  if (selectedBone) {
                    selectedBone.addChild(importedBone)
                  } else {
                    skeleton.root.addChild(importedBone)
                  }
                  skeleton.root.updateWorldTransform()
                  forceUpdate()
                }}
                className="flex flex-col items-center justify-center p-3 bg-purple-900/20 hover:bg-purple-800/40 border border-purple-500/20 rounded-xl transition-all gap-2"
              >
                <Layers className="w-6 h-6 text-purple-300" />
                <span className="text-[10px] text-purple-200 truncate w-full text-center">{item.name}</span>
                <span className="text-[9px] text-purple-400/60">{item.bonesCount} Bones</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
