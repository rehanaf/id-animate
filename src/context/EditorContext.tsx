import React, { createContext, useContext, useState } from "react";
import { Skeleton } from "@/core/Skeleton.js";
import { Animation } from "@/core/Animation.js";
import { Bone } from "@/core/Bone.js";
import JSZip from "jszip";
import { AppStorage } from "@/core/Storage";

interface EditorContextType {
  skeleton: Skeleton | null;
  setSkeleton: (s: Skeleton | null) => void;
  selectedBoneId: string | null;
  setSelectedBoneId: (id: string | null) => void;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  selectMode: "move" | "rotate" | "scale";
  setSelectMode: (mode: "move" | "rotate" | "scale") => void;
  activeShape: "square" | "circle" | "triangle";
  setActiveShape: (shape: "square" | "circle" | "triangle") => void;
  editorMode: "rig" | "animate" | "path";
  setEditorMode: (mode: "rig" | "animate" | "path") => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentAnimation: Animation | null;
  setCurrentAnimation: (anim: Animation | null) => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  fps: number;
  setFps: (fps: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  onionPrev: boolean;
  setOnionPrev: (enabled: boolean) => void;
  onionNext: boolean;
  setOnionNext: (enabled: boolean) => void;
  canvasWidth: number;
  setCanvasWidth: (w: number) => void;
  canvasHeight: number;
  setCanvasHeight: (h: number) => void;
  revision: number;
  forceUpdate: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  handleExportZip: () => Promise<void>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [skeleton, setSkeleton] = useState<Skeleton | null>(null);
  const [selectedBoneId, setSelectedBoneId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>("select");
  const [selectMode, setSelectMode] = useState<"move" | "rotate" | "scale">("rotate");
  const [activeShape, setActiveShape] = useState<"square" | "circle" | "triangle">("square");
  const [editorMode, setEditorMode] = useState<"rig" | "animate" | "path">("rig");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<Animation | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [fps, setFps] = useState(8);
  const [duration, setDuration] = useState(0); // default 0 seconds (only frame 0)
  const [onionPrev, setOnionPrev] = useState(true);
  const [onionNext, setOnionNext] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [revision, setRevision] = useState(0);

  // Undo / Redo History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  React.useEffect(() => {
    if (!skeleton) {
      const loadWorkspace = async () => {
        const defaultSkel = new Skeleton();
        defaultSkel.root.localTransform.x = 0;
        defaultSkel.root.localTransform.y = 0;
        
        let finalSkel = defaultSkel;
        let finalAnim: any = null;
        try {
          const savedRig = await AppStorage.getItem("rig_workspace");
          let parsed = null;
          if (savedRig) parsed = Skeleton.fromJSON(savedRig);
          
          if (parsed && parsed.root.children.length > 0) {
            finalSkel = parsed;
            const savedAnim = await AppStorage.getItem("anim_workspace");
            if (savedAnim) finalAnim = Animation.fromJSON(savedAnim);
          }
        } catch (e) {
          console.error("Failed to load rig_workspace:", e);
        }

        setSkeleton(finalSkel);
        if (finalAnim) {
          setCurrentAnimation(finalAnim);
          if (finalAnim.duration > 0) setDuration(finalAnim.duration);
        }
      };
      loadWorkspace();
    }
  }, [skeleton, canvasWidth, canvasHeight]);

  React.useEffect(() => {
    const saveWorkspace = async () => {
      if (skeleton) await AppStorage.setItem("rig_workspace", skeleton.exportToJSON());
      if (currentAnimation) await AppStorage.setItem("anim_workspace", currentAnimation.exportToJSON());
    };
    saveWorkspace();
  }, [revision, skeleton, currentAnimation]);

  const forceUpdate = () => setRevision(r => r + 1);

  const pushHistory = () => {
    if (!skeleton) return;
    const jsonStr = skeleton.exportToJSON();
    
    // Only push if different from current
    if (historyIndex >= 0 && historyIndex < history.length) {
      if (history[historyIndex] === jsonStr) return;
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(jsonStr);
    
    // Limit history to 50 states to prevent memory issues
    if (newHistory.length > 50) newHistory.shift();
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const restored = Skeleton.fromJSON(history[newIndex]);
      setSkeleton(restored);
      forceUpdate();
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const restored = Skeleton.fromJSON(history[newIndex]);
      setSkeleton(restored);
      forceUpdate();
    }
  };

  // Push initial state once when skeleton is first created
  React.useEffect(() => {
    if (skeleton && history.length === 0) {
      pushHistory();
    }
  }, [skeleton]);

  // Auto-keyframe wrapper could be placed here or used contextually
  React.useEffect(() => {
    if (!currentAnimation && skeleton) {
      setCurrentAnimation(new Animation("Clip 1", 0))
    }
  }, [currentAnimation, skeleton])

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
    
    zip.file("skeleton.json", JSON.stringify(skeletonData, null, 2));
    if (animData) {
      zip.file("animation.json", JSON.stringify(animData, null, 2));
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    
    const projectName = skeleton.name ? skeleton.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : "id-animate-project";
    a.download = `${projectName}.zip`;
    
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <EditorContext.Provider value={{
      skeleton, setSkeleton,
      selectedBoneId, setSelectedBoneId,
      activeTool,
      setActiveTool,
      selectMode,
      setSelectMode,
      activeShape, setActiveShape,
      editorMode, setEditorMode,
      isPlaying, setIsPlaying,
      currentAnimation, setCurrentAnimation,
      currentTime, setCurrentTime,
      fps, setFps,
      duration, setDuration,
      onionPrev, setOnionPrev,
      onionNext, setOnionNext,
      canvasWidth, setCanvasWidth,
      canvasHeight, setCanvasHeight,
      revision, forceUpdate,
      pushHistory, undo,
      redo,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
      handleExportZip
    }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
