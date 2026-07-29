import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Figure } from "@/core/nodes/Figure.js";
import { Segment } from "@/core/nodes/Segment.js";
import { FigureAnimation } from "@/core/nodes/FigureAnimation.js";
import { AppStorage } from "@/core/Storage";

interface FigureEditorContextType {
  figure: Figure | null;
  setFigure: (f: Figure | null) => void;
  selectedSegmentId: string | null;
  setSelectedSegmentId: (id: string | null) => void;
  selectedPointIndex: number | null;
  setSelectedPointIndex: (idx: number | null) => void;
  pointModes: Record<number, 'dynamic' | 'static'>;
  setPointModes: (m: Record<number, 'dynamic' | 'static'>) => void;
  togglePointMode: (idx: number) => void;
  editorMode: "figure" | "animate";
  setEditorMode: (mode: "figure" | "animate") => void;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  revision: number;
  forceUpdate: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  fps: number;
  setFps: (f: number) => void;
  duration: number;
  setDuration: (d: number) => void;
  currentAnimation: FigureAnimation | null;
  setCurrentAnimation: (a: FigureAnimation | null) => void;
}

const FigureEditorContext = createContext<FigureEditorContextType | undefined>(undefined);

export function FigureEditorProvider({ children, initialMode }: { children: React.ReactNode; initialMode?: "figure" | "animate" }) {
  const [figure, setFigure] = useState<Figure | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<"figure" | "animate">(initialMode || "figure");
  const [activeTool, setActiveTool] = useState("select");
  const [revision, setRevision] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [fps, setFps] = useState(12);
  const [duration, setDuration] = useState(0);
  const [currentAnimation, setCurrentAnimation] = useState<FigureAnimation | null>(null);
  const [pointModes, setPointModes] = useState<Record<number, 'dynamic' | 'static'>>({});
  const manualOverrideRef = useRef(new Set<number>())

  const detectCyclePoints = useCallback((fig: Figure): Set<number> => {
    const n = fig.points.length
    if (n < 3) return new Set()
    const adj: number[][] = Array.from({ length: n }, () => [])
    for (const seg of fig.segments) {
      adj[seg.point1Index].push(seg.point2Index)
      adj[seg.point2Index].push(seg.point1Index)
    }
    const visited = new Array(n).fill(false)
    const parent = new Array(n).fill(-1)
    const inStack = new Array(n).fill(false)
    const cyclePoints = new Set<number>()

    function dfs(node: number) {
      visited[node] = true
      inStack[node] = true
      for (const nb of adj[node]) {
        if (!visited[nb]) {
          parent[nb] = node
          dfs(nb)
        } else if (inStack[nb] && nb !== parent[node]) {
          let curr = node
          const cycle: number[] = [nb]
          while (curr !== nb) {
            cycle.push(curr)
            curr = parent[curr]
          }
          const hub = Math.min(...cycle)
          for (const pt of cycle) {
            if (pt !== hub) cyclePoints.add(pt)
          }
        }
      }
      inStack[node] = false
    }

    for (let i = 0; i < n; i++) {
      if (!visited[i]) dfs(i)
    }
    return cyclePoints
  }, [])

  const updatePointModes = useCallback((fig: Figure) => {
    const staticPts = detectCyclePoints(fig)
    const modes: Record<number, 'dynamic' | 'static'> = {}
    for (let i = 0; i < fig.points.length; i++) {
      if (manualOverrideRef.current.has(i)) continue
      if (staticPts.has(i)) modes[i] = 'static'
    }
    setPointModes(prev => {
      const next = { ...prev }
      for (let i = 0; i < fig.points.length; i++) {
        if (manualOverrideRef.current.has(i)) continue
        if (staticPts.has(i)) next[i] = 'static'
        else delete next[i]
      }
      return next
    })
  }, [detectCyclePoints])

  const togglePointMode = useCallback((idx: number) => {
    manualOverrideRef.current.add(idx)
    setPointModes(prev => ({
      ...prev,
      [idx]: prev[idx] === 'static' ? 'dynamic' : 'static'
    }))
  }, [])

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const figKey = initialMode === "animate" ? "anim_figure_workspace" : "figure_workspace"
  const animKey = initialMode === "animate" ? "anim_figure_anim_workspace" : "figure_anim_workspace"

  React.useEffect(() => {
    if (!figure) {
      const loadWorkspace = async () => {
        const defaultFig = new Figure();
        let finalFig = defaultFig;
        let finalAnim: FigureAnimation | null = null;
        try {
          const saved = await AppStorage.getItem(figKey);
          if (saved) {
            const parsed = Figure.fromJSONString(saved);
            if (parsed.segments.length > 0) finalFig = parsed;
          }
          const savedAnim = await AppStorage.getItem(animKey);
          if (savedAnim) {
            finalAnim = FigureAnimation.fromJSONString(savedAnim);
          }
        } catch (e) {
          console.error("Failed to load figure workspace:", e);
        }
        setFigure(finalFig);
        updatePointModes(finalFig);
        if (finalAnim) {
          setCurrentAnimation(finalAnim);
          if (finalAnim.duration > 0) setDuration(finalAnim.duration);
        }
      };
      loadWorkspace();
    }
  }, [figure, figKey, animKey]);

  React.useEffect(() => {
    if (figure) {
      AppStorage.setItem(figKey, figure.exportToJSON());
    }
  }, [revision, figure, figKey]);

  React.useEffect(() => {
    if (figure) updatePointModes(figure);
  }, [revision, figure, updatePointModes]);

  React.useEffect(() => {
    if (currentAnimation) {
      AppStorage.setItem(animKey, currentAnimation.exportToJSON());
    }
  }, [revision, currentAnimation, animKey]);

  const forceUpdate = useCallback(() => setRevision(r => r + 1), []);

  const pushHistory = useCallback(() => {
    if (!figure) return;
    const jsonStr = figure.exportToJSON();
    if (historyIndex >= 0 && historyIndex < history.length) {
      if (history[historyIndex] === jsonStr) return;
    }
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(jsonStr);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [figure, history, historyIndex]);

  React.useEffect(() => {
    if (figure && history.length === 0) {
      pushHistory();
    }
  }, [figure]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const restored = Figure.fromJSONString(history[newIndex]);
      setFigure(restored);
      forceUpdate();
    }
  }, [historyIndex, history, forceUpdate]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const restored = Figure.fromJSONString(history[newIndex]);
      setFigure(restored);
      forceUpdate();
    }
  }, [historyIndex, history, forceUpdate]);

  return (
    <FigureEditorContext.Provider value={{
      figure, setFigure,
      selectedSegmentId, setSelectedSegmentId,
      selectedPointIndex, setSelectedPointIndex,
      editorMode, setEditorMode,
      activeTool, setActiveTool,
      revision, forceUpdate,
      pushHistory, undo, redo,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
      isPlaying, setIsPlaying,
      currentTime, setCurrentTime,
      fps, setFps,
      duration, setDuration,
      currentAnimation, setCurrentAnimation,
      pointModes, setPointModes,
      togglePointMode,
    }}>
      {children}
    </FigureEditorContext.Provider>
  );
}

export function useFigureEditor() {
  const context = useContext(FigureEditorContext);
  if (!context) throw new Error("useFigureEditor must be used within FigureEditorProvider");
  return context;
}
