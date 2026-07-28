import React, { createContext, useContext, useState, useCallback } from "react";
import { Figure } from "@/core/nodes/Figure.js";
import { Segment } from "@/core/nodes/Segment.js";
import { AppStorage } from "@/core/Storage";

interface FigureEditorContextType {
  figure: Figure | null;
  setFigure: (f: Figure | null) => void;
  selectedSegmentId: string | null;
  setSelectedSegmentId: (id: string | null) => void;
  selectedPointIndex: number | null;
  setSelectedPointIndex: (idx: number | null) => void;
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
}

const FigureEditorContext = createContext<FigureEditorContextType | undefined>(undefined);

export function FigureEditorProvider({ children }: { children: React.ReactNode }) {
  const [figure, setFigure] = useState<Figure | null>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [editorMode, setEditorMode] = useState<"figure" | "animate">("figure");
  const [activeTool, setActiveTool] = useState("select");
  const [revision, setRevision] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [fps, setFps] = useState(12);
  const [duration, setDuration] = useState(0);

  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  React.useEffect(() => {
    if (!figure) {
      const loadWorkspace = async () => {
        const defaultFig = new Figure();
        let finalFig = defaultFig;
        try {
          const saved = await AppStorage.getItem("figure_workspace");
          if (saved) {
            const parsed = Figure.fromJSONString(saved);
            if (parsed.segments.length > 0) finalFig = parsed;
          }
        } catch (e) {
          console.error("Failed to load figure workspace:", e);
        }
        setFigure(finalFig);
      };
      loadWorkspace();
    }
  }, [figure]);

  React.useEffect(() => {
    if (figure) {
      AppStorage.setItem("figure_workspace", figure.exportToJSON());
    }
  }, [revision, figure]);

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
