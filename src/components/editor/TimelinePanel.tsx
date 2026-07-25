import React, { useEffect, useState, useRef } from "react"
import { useEditor } from "@/context/EditorContext"
import { Animation } from "@/core/Animation.js"
import { Plus } from "lucide-react"
import { generateFrameThumbnail } from "@/core/ThumbnailGenerator"

export function TimelinePanel() {
  const { 
    currentTime, setCurrentTime,
    duration, setDuration,
    fps,
    currentAnimation, setCurrentAnimation,
    skeleton,
    forceUpdate
  } = useEditor()

  // Auto-initialize animation if missing
  useEffect(() => {
    if (!currentAnimation && skeleton) {
      setCurrentAnimation(new Animation("Clip 1", 0))
    }
  }, [currentAnimation, skeleton, setCurrentAnimation])

  const currentFrame = Math.round(currentTime * fps)
  const totalFrames = Math.max(1, Math.round(duration * fps) + 1) // +1 because frame 0 is included

  const setFrame = (frame: number) => {
    setCurrentTime(frame / fps)
  }
  
  // We need an array from 0 to totalFrames - 1
  const frames = Array.from({ length: totalFrames }, (_, i) => i)

  const [thumbnails, setThumbnails] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!skeleton || !currentAnimation) return;
    let active = true;

    const generateAll = async () => {
      for (const f of frames) {
        if (!active) break;
        // Use a small canvas size for faster timeline preview generation
        try {
          const t = await generateFrameThumbnail(skeleton, currentAnimation, f / fps, 400, 300);
          if (t && active) {
             setThumbnails(prev => ({...prev, [f]: t}));
          }
        } catch(e) {}
      }
    };

    // only clear if the active project animation changed entirely, otherwise keep old ones while generating
    generateAll();
    return () => { active = false; };
  }, [skeleton, currentAnimation, totalFrames, fps]);

  return (
    <div className="w-full flex flex-col">
      <div className="w-full overflow-x-auto flex items-center pt-3 pb-2 px-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <div className="flex w-max space-x-2">
          {frames.map((frame) => {
            const isActive = frame === currentFrame
            return (
              <button
                key={frame}
                onClick={() => setFrame(frame)}
                className={`relative overflow-hidden flex flex-col items-center justify-center w-32 aspect-[3/2] h-auto rounded-xl border transition-all shrink-0 group ${
                  isActive 
                    ? "bg-purple-600/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]" 
                    : "bg-black/40 border-white/5 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {thumbnails[frame] && (
                  <img 
                    src={thumbnails[frame]} 
                    alt={`Frame ${frame}`} 
                    className={`absolute inset-0 w-full h-full object-contain ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-opacity`}
                  />
                )}
                
                <span className={`z-10 text-sm font-bold px-2 py-0.5 rounded backdrop-blur-md bg-black/40 ${isActive ? "text-purple-300" : "text-gray-300"}`}>
                  {frame}
                </span>
                
                {/* Active Indicator Dot */}
                {isActive && (
                  <div className="absolute z-10 top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                )}
              </button>
            )
          })}

          <button 
            className="flex flex-col items-center justify-center w-32 aspect-[3/2] h-auto rounded-xl border border-dashed border-white/20 bg-black/20 hover:bg-white/10 hover:border-white/40 text-gray-500 hover:text-white transition-all shrink-0 ml-4"
            title="Add New Frame"
            onClick={() => {
              const nextFrame = totalFrames
              if (currentAnimation) {
                currentAnimation.duration = nextFrame / fps;
              }
              setDuration(nextFrame / fps)
              setFrame(nextFrame)
              // Trigger auto-save via context
              forceUpdate();
            }}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
