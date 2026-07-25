import React from "react"
import { useEditor } from "@/context/EditorContext"
import { Monitor, Clock, Download, PackageOpen } from "lucide-react"
import JSZip from "jszip"

export function SettingsPanel() {
  const { 
    canvasWidth, setCanvasWidth,
    canvasHeight, setCanvasHeight,
    fps, setFps,
    duration, setDuration,
    onionPrev, setOnionPrev,
    onionNext, setOnionNext,
    skeleton, currentAnimation
  } = useEditor()

  const handleExportZip = async () => {
    if (!skeleton) return;
    
    const zip = new JSZip();
    const manifest = {
      type: "id-animate-project",
      version: "1.0",
      content: ["skeleton", "animations", "images"],
      timestamp: new Date().toISOString()
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    const imagesFolder = zip.folder("images");
    if (!imagesFolder) return;
    
    // Extract base data
    const skeletonData = JSON.parse(skeleton.exportToJSON());
    const animData = currentAnimation ? JSON.parse(currentAnimation.exportToJSON()) : null;

    let imageCounter = 1;

    // Helper to recursively find and extract images
    const extractImages = (boneObj: any) => {
      if (boneObj.assetType === "image" && boneObj.assetData && boneObj.assetData.startsWith("data:image")) {
        try {
          const parts = boneObj.assetData.split(',');
          const mime = parts[0].match(/:(.*?);/)[1];
          const ext = mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "png";
          const base64Data = parts[1];
          
          const safeName = boneObj.name ? boneObj.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : "img";
          const filename = `${safeName}_${imageCounter++}.${ext}`;
          
          imagesFolder.file(filename, base64Data, {base64: true});
          
          // Replace base64 data with reference url
          boneObj.assetUrl = `images/${filename}`;
          delete boneObj.assetData;
        } catch(e) {
          console.error("Failed to extract image", e);
        }
      }
      if (boneObj.children && Array.isArray(boneObj.children)) {
        boneObj.children.forEach(extractImages);
      }
    };

    if (skeletonData.bones) {
      extractImages(skeletonData.bones);
    }
    
    // Save modified JSONs
    zip.file("skeleton.json", JSON.stringify(skeletonData, null, 2));
    if (animData) {
      zip.file("animation.json", JSON.stringify(animData, null, 2));
    }

    // Generate zip
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "id-animate-project.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Canvas Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-300">
          <Monitor className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Canvas / Bounding Box</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Width</label>
            <div className="relative">
              <input 
                type="number" 
                value={canvasWidth} 
                onChange={(e) => setCanvasWidth(Math.max(1, Number(e.target.value) || 800))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="absolute right-3 top-2 text-xs text-gray-600 font-bold">PX</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Height</label>
            <div className="relative">
              <input 
                type="number" 
                value={canvasHeight} 
                onChange={(e) => setCanvasHeight(Math.max(1, Number(e.target.value) || 600))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition-colors"
              />
              <span className="absolute right-3 top-2 text-xs text-gray-600 font-bold">PX</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setCanvasWidth(1920); setCanvasHeight(1080); }} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold text-gray-400 hover:text-white transition-colors">1920x1080 (HD)</button>
          <button onClick={() => { setCanvasWidth(1080); setCanvasHeight(1080); }} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold text-gray-400 hover:text-white transition-colors">1080x1080 (Square)</button>
          <button onClick={() => { setCanvasWidth(512); setCanvasHeight(512); }} className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-bold text-gray-400 hover:text-white transition-colors">512x512 (Sprite)</button>
        </div>
      </div>

      <div className="w-full h-px bg-white/5" />

      {/* Animation Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Animation Timing</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">FPS</label>
            <div className="relative">
              <input 
                type="number" 
                value={fps} 
                onChange={(e) => {
                  const newFps = Math.max(1, Math.min(120, Number(e.target.value) || 8))
                  const totalFrames = Math.round(duration * fps)
                  setFps(newFps)
                  setDuration(totalFrames / newFps)
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-purple-400 font-mono focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-[10px] text-gray-500 italic mb-2">Total durasi klip otomatis menyesuaikan jumlah kartu frame yang ada di Timeline.</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-4">
          <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Onion Skinning</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={onionPrev} 
              onChange={(e) => setOnionPrev(e.target.checked)}
              className="rounded bg-black/40 border-white/10 text-purple-500 focus:ring-purple-500/50"
            />
            <span className="text-sm text-gray-300">Show Previous Frame</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={onionNext} 
              onChange={(e) => setOnionNext(e.target.checked)}
              className="rounded bg-black/40 border-white/10 text-purple-500 focus:ring-purple-500/50"
            />
            <span className="text-sm text-gray-300">Show Next Frame</span>
          </label>
        </div>
      </div>

      <div className="w-full h-px bg-white/5" />

      {/* Export Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-gray-300">
          <PackageOpen className="w-4 h-4" />
          <h3 className="text-sm font-bold uppercase tracking-widest">Project Export</h3>
        </div>
        <p className="text-xs text-gray-400">
          Export the complete Rig/Skeleton and Animation data as a structured .ZIP file. Images are separated into an "images" folder.
        </p>
        <button 
          onClick={handleExportZip}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
        >
          <Download className="w-4 h-4" />
          Export Project (.ZIP)
        </button>
      </div>

    </div>
  )
}
